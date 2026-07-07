import { useState, useEffect, useCallback } from "react";
import { supabase } from "../config/supabase";
import { useAuth } from "../contexts/AuthContext";
import { getCachedCollections, setCachedCollections, addPendingOp, type PendingOp } from "../lib/localCache";
import { applyCurrentIcpFilter } from "../lib/icpVersioning";

export interface Collection {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  color?: string;
  tags?: string[] | null;
  created_at: string;
  updated_at: string;
  // Computed fields
  icpCount?: number;
  isLocked?: boolean;
  _index?: number;
}

export interface CollectionItem {
  collection_id: string;
  lineage_id: string;
}

/**
 * Hook for managing collections from Supabase
 * @returns Collections list and CRUD operations
 */
export function useCollections() {
  const { user, session, loading: authLoading } = useAuth();
  const [collections, setCollections] = useState<Collection[]>([]);
  const [isLoading, setIsLoading] = useState(true); // Start as true to wait for auth
  const [error, setError] = useState<string | null>(null);
  const [isOffline, setIsOffline] = useState(false);

  // Log loading, user, and session changes
  useEffect(() => {
    console.log('useCollections:', { isLoading, authLoading, user: user?.id, session: !!session });
  }, [isLoading, authLoading, user, session]);

  const fetchCollections = useCallback(async () => {
    if (!user?.id) {
      setCollections([]);
      setIsLoading(false);
      setIsOffline(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    // First, try to load from cache for instant display
    let cachedCollections: Collection[] = [];
    try {
      cachedCollections = await getCachedCollections(user.id);
      if (cachedCollections.length > 0) {
        setCollections(cachedCollections);
        setIsLoading(false); // Show cached data immediately
      }
    } catch (err) {
      console.error("Error reading cached Collections:", err);
    }

    // Then attempt to fetch from Supabase
    try {
      // Ensure we have a valid session before querying
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        console.warn('No session found - auth headers may be missing');
      } else if (import.meta.env.DEV) {
        console.log('✅ Session found - auth headers will be included');
      }
      
      // Build query with filters BEFORE select for correct REST syntax
      let query = supabase
        .from("collections")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      
      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;

      // Fetch ICP counts for each collection
      // IMPORTANT: collection_items does NOT have user_id column - only filter by collection_id
      const collectionsWithCounts = await Promise.all(
        (data || []).map(async (collection) => {
          // Create a fresh query for each collection to avoid filter chaining
          const { count } = await supabase
            .from("collection_items")
            .select("*", { count: "exact", head: true })
            .eq("collection_id", collection.id);

          return {
            ...collection,
            icpCount: count || 0,
          };
        })
      );

      setCollections(collectionsWithCounts);
      setIsOffline(false);
      
      // Update cache in background
      await setCachedCollections(user.id, collectionsWithCounts);
    } catch (err) {
      console.error("Error fetching collections from Supabase:", err);
      const error = err as any;
      
      // Only set offline if it's actually a network error, not auth/RLS errors
      const isNetworkError = !error.code || 
                            error.code === "ECONNREFUSED" || 
                            error.code === "ENOTFOUND" ||
                            error.message?.includes("network") ||
                            error.message?.includes("fetch");
      
      if (isNetworkError) {
        console.log('Setting isOffline to true - network error detected');
        setIsOffline(true);
      } else {
        // Auth error or other - connection is fine, just can't fetch
        console.log('Connection OK, but fetch failed (likely auth/RLS issue):', error.code || error.message);
        setIsOffline(false);
      }
      
      setError(error instanceof Error ? error.message : "Failed to fetch collections");
      
      // Don't clear existing collections - keep cached data visible
      // Only set empty array if we have no cached data
      if (cachedCollections.length === 0) {
        setCollections([]);
      }
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    try {
      // Wait for auth to finish loading
      if (authLoading) {
        return;
      }

      if (!user?.id) {
        // User not available - clear collections and stop loading
        setCollections([]);
        setIsLoading(false);
        return;
      }
      
      // User available - fetch collections
      fetchCollections();
    } catch (err) {
      console.error("useCollections fatal error", err);
      setIsLoading(false);
    }
  }, [user?.id, authLoading, fetchCollections]);

  const getCollection = useCallback(async (id: string): Promise<Collection | null> => {
    if (!user?.id) return null;

    try {
      // Build query with filters BEFORE select for correct REST syntax
      let query = supabase
        .from("collections")
        .select("*")
        .eq("id", id)
        .eq("user_id", user.id);
      
      const { data, error: fetchError } = await query.single();

      if (fetchError) throw fetchError;

      // Get ICP count
      // IMPORTANT: collection_items does NOT have user_id column - only filter by collection_id
      const { count } = await supabase
        .from("collection_items")
        .select("*", { count: "exact", head: true })
        .eq("collection_id", id);

      return {
        ...data,
        icpCount: count || 0,
      };
    } catch (err) {
      console.error("Error fetching collection:", err);
      return null;
    }
  }, [user?.id]);

  const createCollection = useCallback(async (data: Partial<Collection>): Promise<Collection | null> => {
    if (!user?.id) return null;

    // Build payload using only real DB columns
    const payload = {
      user_id: user.id,
      name: data.name || "",
      description: data.description ?? "",
      ...(data.color ? { color: data.color } : {}),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Generate temporary ID for offline support (only for React state, not Supabase)
    const tempId = `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const optimisticCollection: Collection = {
      ...payload,
      id: tempId,
      icpCount: 0,
    };

    // Optimistic update: update state and cache immediately
    setCollections((prev) => {
      const updated = [optimisticCollection, ...prev];
      // Update cache in background
      setCachedCollections(user.id, updated).catch((err) =>
        console.error("Error caching Collections after create:", err)
      );
      return updated;
    });

    // Add to outbox for sync (payload only contains real DB columns, no temp ID)
    const op: PendingOp = {
      id: `op-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: "create_collection",
      payload: payload, // Only real DB columns
      localId: tempId, // Track temp ID separately
      timestamp: Date.now(),
      retryCount: 0,
    };
    await addPendingOp(user.id, op);

    // Then attempt Supabase mutation immediately
    try {
      const { data: created, error: createError } = await supabase
        .from("collections")
        .insert([payload])
        .select()
        .single();

      if (createError) throw createError;

      // Success: remove from outbox and replace optimistic collection with real one
      const { removePendingOp } = await import("../lib/localCache");
      await removePendingOp(user.id, op.id);

      // Replace temporary ID with real ID
      const collectionWithCount = {
        ...created,
        icpCount: 0,
      };
      
      setCollections((prev) => {
        const updated = prev.map((col) =>
          col.id === tempId ? collectionWithCount : col
        );
        // Update cache with real data
        setCachedCollections(user.id, updated).catch((err) =>
          console.error("Error caching Collections after create success:", err)
        );
        return updated;
      });

      setIsOffline(false);
      return collectionWithCount;
    } catch (err) {
      console.error("Error creating collection in Supabase:", err);
      const error = err as any;
      
      // Only set offline for actual network errors
      const isNetworkError = !error.code || 
                            error.code === "ECONNREFUSED" || 
                            error.code === "ENOTFOUND" ||
                            error.message?.includes("network") ||
                            error.message?.includes("fetch");
      
      if (isNetworkError) {
        console.log('Setting isOffline to true - network error detected');
        setIsOffline(true);
      } else {
        setIsOffline(false);
      }
      
      // Keep optimistic update - outbox will retry
      return optimisticCollection;
    }
  }, [user?.id]);

  const updateCollection = useCallback(async (id: string, updates: Partial<Collection>): Promise<boolean> => {
    if (!user?.id) return false;

    // Optimistic update: update state and cache immediately
    setCollections((prev) => {
      const updated = prev.map((col) =>
        col.id === id
          ? { ...col, ...updates, updated_at: new Date().toISOString() }
          : col
      );
      // Update cache in background
      setCachedCollections(user.id, updated).catch((err) =>
        console.error("Error caching Collections after update:", err)
      );
      return updated;
    });

    // Add to outbox for sync
    const op: PendingOp = {
      id: `op-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: "update_collection",
      payload: { id, updates },
      timestamp: Date.now(),
      retryCount: 0,
    };
    await addPendingOp(user.id, op);

    // Then attempt Supabase mutation immediately
    try {
      const { error: updateError } = await supabase
        .from("collections")
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq("id", id)
        .eq("user_id", user.id);

      if (updateError) throw updateError;

      // Success: remove from outbox
      const { removePendingOp } = await import("../lib/localCache");
      await removePendingOp(user.id, op.id);

      setIsOffline(false);
      await fetchCollections();
      return true;
    } catch (err) {
      console.error("Error updating collection in Supabase:", err);
      const error = err as any;
      
      // Only set offline for actual network errors
      const isNetworkError = !error.code || 
                            error.code === "ECONNREFUSED" || 
                            error.code === "ENOTFOUND" ||
                            error.message?.includes("network") ||
                            error.message?.includes("fetch");
      
      if (isNetworkError) {
        console.log('Setting isOffline to true - network error detected');
        setIsOffline(true);
      } else {
        setIsOffline(false);
      }
      
      // Keep optimistic update - outbox will retry
      return true; // Return true since local update succeeded
    }
  }, [user?.id, fetchCollections]);

  const deleteCollection = useCallback(async (id: string): Promise<boolean> => {
    if (!user?.id) return false;

    // Optimistic update: update state and cache immediately
    setCollections((prev) => {
      const updated = prev.filter((col) => col.id !== id);
      // Update cache in background
      setCachedCollections(user.id, updated).catch((err) =>
        console.error("Error caching Collections after delete:", err)
      );
      return updated;
    });

    // Add to outbox for sync
    const op: PendingOp = {
      id: `op-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: "delete_collection",
      payload: { id },
      timestamp: Date.now(),
      retryCount: 0,
    };
    await addPendingOp(user.id, op);

    // Then attempt Supabase mutation immediately
    try {
      // Delete collection_items first
      // IMPORTANT: collection_items does NOT have user_id column - only filter by collection_id
      await supabase
        .from("collection_items")
        .delete()
        .eq("collection_id", id);

      // Delete the collection
      const { error: deleteError } = await supabase
        .from("collections")
        .delete()
        .eq("id", id)
        .eq("user_id", user.id);

      if (deleteError) throw deleteError;

      // Success: remove from outbox
      const { removePendingOp } = await import("../lib/localCache");
      await removePendingOp(user.id, op.id);

      setIsOffline(false);
      return true;
    } catch (err) {
      console.error("Error deleting collection in Supabase:", err);
      const error = err as any;
      
      // Only set offline for actual network errors
      const isNetworkError = !error.code || 
                            error.code === "ECONNREFUSED" || 
                            error.code === "ENOTFOUND" ||
                            error.message?.includes("network") ||
                            error.message?.includes("fetch");
      
      if (isNetworkError) {
        console.log('Setting isOffline to true - network error detected');
        setIsOffline(true);
      } else {
        setIsOffline(false);
      }
      
      // Keep optimistic update - outbox will retry
      return true; // Return true since local delete succeeded
    }
  }, [user?.id]);

  const addICPToCollection = useCallback(async (collectionId: string, lineageId: string): Promise<boolean> => {
    if (!user?.id) return false;

    // Skip if collection ID is temporary (wait for collection to be created first)
    const isTempId = typeof collectionId === "string" && collectionId.startsWith("temp-");
    if (isTempId) {
      console.warn("Cannot add ICP to collection with temporary ID - waiting for collection to be created");
      // Still do optimistic update for UI, but don't queue outbox op
      setCollections((prev) => {
        const updated = prev.map((col) =>
          col.id === collectionId
            ? { ...col, icpCount: (col.icpCount || 0) + 1, updated_at: new Date().toISOString() }
            : col
        );
        setCachedCollections(user.id, updated).catch((err) =>
          console.error("Error caching Collections after add ICP:", err)
        );
        return updated;
      });
      return true; // Return true for optimistic UI
    }

    // Optimistic update: update counts immediately
    setCollections((prev) => {
      const updated = prev.map((col) =>
        col.id === collectionId
          ? { ...col, icpCount: (col.icpCount || 0) + 1, updated_at: new Date().toISOString() }
          : col
      );
      // Update cache in background
      setCachedCollections(user.id, updated).catch((err) =>
        console.error("Error caching Collections after add ICP:", err)
      );
      return updated;
    });

    // Add to outbox for sync (only if not temp ID)
    const op: PendingOp = {
      id: `op-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: "add_icp_to_collection",
      payload: { collection_id: collectionId, lineage_id: lineageId },
      timestamp: Date.now(),
      retryCount: 0,
    };
    await addPendingOp(user.id, op);

    // Then attempt Supabase mutation immediately
    try {
      const { data: existing } = await supabase
        .from("collection_items")
        .select("*")
        .eq("collection_id", collectionId)
        .eq("lineage_id", lineageId)
        .maybeSingle();

      if (existing) {
        // Already in collection - remove from outbox
        const { removePendingOp } = await import("../lib/localCache");
        await removePendingOp(user.id, op.id);
        setIsOffline(false);
        return true;
      }

      const { error: insertError } = await supabase
        .from("collection_items")
        .insert([{ collection_id: collectionId, lineage_id: lineageId }]);

      if (insertError) throw insertError;

      // Update collection updated_at
      await supabase
        .from("collections")
        .update({ updated_at: new Date().toISOString() })
        .eq("id", collectionId);

      // Success: remove from outbox
      const { removePendingOp } = await import("../lib/localCache");
      await removePendingOp(user.id, op.id);

      setIsOffline(false);
      // Refetch to update counts accurately
      await fetchCollections();
      return true;
    } catch (err) {
      console.error("Error adding ICP to collection in Supabase:", err);
      const error = err as any;
      
      // Only set offline for actual network errors
      const isNetworkError = !error.code || 
                            error.code === "ECONNREFUSED" || 
                            error.code === "ENOTFOUND" ||
                            error.message?.includes("network") ||
                            error.message?.includes("fetch");
      
      if (isNetworkError) {
        console.log('Setting isOffline to true - network error detected');
        setIsOffline(true);
      } else {
        setIsOffline(false);
      }
      
      // Keep optimistic update - outbox will retry
      return true; // Return true since local update succeeded
    }
  }, [user?.id, fetchCollections]);

  const removeICPFromCollection = useCallback(async (collectionId: string, lineageId: string): Promise<boolean> => {
    if (!user?.id) return false;

    // Optimistic update: update counts immediately
    setCollections((prev) => {
      const updated = prev.map((col) =>
        col.id === collectionId
          ? { ...col, icpCount: Math.max((col.icpCount || 0) - 1, 0), updated_at: new Date().toISOString() }
          : col
      );
      // Update cache in background
      setCachedCollections(user.id, updated).catch((err) =>
        console.error("Error caching Collections after remove ICP:", err)
      );
      return updated;
    });

    // Add to outbox for sync
    const op: PendingOp = {
      id: `op-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: "remove_icp_from_collection",
      payload: { collection_id: collectionId, lineage_id: lineageId },
      timestamp: Date.now(),
      retryCount: 0,
    };
    await addPendingOp(user.id, op);

    // Then attempt Supabase mutation immediately
    try {
      const { error: deleteError } = await supabase
        .from("collection_items")
        .delete()
        .eq("collection_id", collectionId)
        .eq("lineage_id", lineageId);

      if (deleteError) throw deleteError;

      // Update collection updated_at
      await supabase
        .from("collections")
        .update({ updated_at: new Date().toISOString() })
        .eq("id", collectionId);

      // Success: remove from outbox
      const { removePendingOp } = await import("../lib/localCache");
      await removePendingOp(user.id, op.id);

      setIsOffline(false);
      // Refetch to update counts accurately
      await fetchCollections();
      return true;
    } catch (err) {
      console.error("Error removing ICP from collection in Supabase:", err);
      const error = err as any;
      
      // Only set offline for actual network errors
      const isNetworkError = !error.code || 
                            error.code === "ECONNREFUSED" || 
                            error.code === "ENOTFOUND" ||
                            error.message?.includes("network") ||
                            error.message?.includes("fetch");
      
      if (isNetworkError) {
        console.log('Setting isOffline to true - network error detected');
        setIsOffline(true);
      } else {
        setIsOffline(false);
      }
      
      // Keep optimistic update - outbox will retry
      return true; // Return true since local update succeeded
    }
  }, [user?.id, fetchCollections]);

  const getCollectionICPs = useCallback(async (collectionId: string) => {
    if (!user?.id) return [];

    try {
      // Build queries with filters BEFORE select for correct REST syntax
      // IMPORTANT: collection_items does NOT have user_id column - only filter by collection_id
      let itemsQuery = supabase
        .from("collection_items")
        .select("lineage_id")
        .eq("collection_id", collectionId);
      
      const { data: items, error: itemsError } = await itemsQuery;

      if (itemsError) throw itemsError;

      if (!items || items.length === 0) return [];

      const lineageIds = items.map((item) => item.lineage_id).filter(Boolean);

      let icpsQuery = supabase
        .from("icps")
        .select("*, brands(name)")
        .eq("user_id", user.id)
        .in("lineage_id", lineageIds);

      icpsQuery = applyCurrentIcpFilter(icpsQuery);
      
      const { data: icps, error: icpsError } = await icpsQuery;

      if (icpsError) throw icpsError;

      return icps || [];
    } catch (err) {
      console.error("Error fetching collection ICPs:", err);
      return [];
    }
  }, [user?.id]);

  return {
    collections,
    isLoading,
    error,
    isOffline,
    fetchCollections,
    refetch: fetchCollections,
    getCollection,
    createCollection,
    updateCollection,
    deleteCollection,
    addICPToCollection,
    removeICPFromCollection,
    getCollectionICPs,
  };
}
