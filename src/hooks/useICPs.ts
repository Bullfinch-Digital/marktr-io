import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "../config/supabase";
import { useAuth } from "../contexts/AuthContext";
import { useBrand } from "../contexts/BrandContext";
import { getCachedICPs, setCachedICPs, addPendingOp, getPendingOps, type PendingOp } from "../lib/localCache";
import { isBrandScopeReady, resolveScopedBrandId } from "../lib/brandScopedReads";
import { attachOrphanIcpsToBrand, resolveBrandIdForIcpWrite } from "../lib/icpBrandAttach";
import {
  applyCurrentIcpFilter,
  fetchCurrentIcpByLineageId,
  insertIcpVersionRpc,
  isPermanentIcpSyncError,
  newGenerationId,
  restoreIcpLineage,
  softDeleteIcpById,
  withVersioningDefaults,
} from "../lib/icpVersioning";

export interface ICP {
  id: string;
  user_id: string;
  brand_id?: string | null;
  // hydrated client-side from joined brands table (see fetchICPs/getICP)
  brandName?: string | null;
  _index?: number;
  name: string;
  description: string;
  industry?: string;
  color?: string | null;
  company_size?: string;
  location?: string;
  pain_points?: string[];
  goals?: string[];
  budget?: string;
  decision_makers?: string[];
  tech_stack?: string[];
  challenges?: string[];
  opportunities?: string[];
  tags?: string[];
  avatar_key?: string | null;
  avatar_gender?: string | null;
  avatar_age_range?: string | null;
  createdAt?: string;
  created_at: string;
  updated_at: string;
  collection_id?: string | null;
  lineage_id?: string;
  generation_id?: string;
  version?: number;
  superseded_at?: string | null;
}

// Helper: build a unique "(Copy)" name for ICP duplicates
export function generateIcpCopyName(originalName: string, existingNames: string[]): string {
  const existing = new Set((existingNames || []).map((n) => (n || "").trim().toLowerCase()));

  const stripCopySuffix = (name: string) => {
    let candidate = (name || "").trim();
    const re = /\s*\(Copy(?:\s+\d+)?\)\s*$/i;
    while (re.test(candidate)) {
      candidate = candidate.replace(re, "").trim();
    }
    return candidate || "Untitled ICP";
  };

  const base = stripCopySuffix(originalName || "Untitled ICP");
  const first = `${base} (Copy)`;
  if (!existing.has(first.toLowerCase())) return first;

  let i = 2;
  while (true) {
    const candidate = `${base} (Copy ${i})`;
    if (!existing.has(candidate.toLowerCase())) return candidate;
    i += 1;
  }
}

// Helper: strip client-only fields from ICP payload before DB insert/update/outbox
export function toDbIcpPayload(input: Partial<ICP>, opts?: { preserveVersioning?: boolean }): any {
  const {
    id,
    _index,
    brandName,
    brands,
    superseded_at,
    ...rest
  } = input as any;

  if (!opts?.preserveVersioning) {
    delete (rest as any).lineage_id;
    delete (rest as any).generation_id;
    delete (rest as any).version;
    delete (rest as any).superseded_at;
  }

  return rest;
}

/**
 * Hook for managing ICP data from Supabase
 * @returns ICPs list and CRUD operations
 */
export function useICPs() {
  const { user, session, loading: authLoading } = useAuth();
  const { activeBrandId, loading: brandLoading, brands } = useBrand();
  const [icps, setICPs] = useState<ICP[]>([]);
  const [isLoading, setIsLoading] = useState(true); // Start as true to wait for auth
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isOffline, setIsOffline] = useState(false);
  const isFetchingRef = useRef(false);
  const pendingRefetchRef = useRef(false);
  const duplicatingRef = useRef<Record<string, boolean>>({});

  // Log loading, user, and session changes
  useEffect(() => {
    console.log('useICPs:', { isLoading, authLoading, user: user?.id, session: !!session });
  }, [isLoading, authLoading, user, session]);

  // Stable fetch function (prevents infinite re-renders)
  const fetchICPs = useCallback(async (force = false) => {
    // Prevent overlapping fetches (especially when force=true).
    // If a forced refetch is requested mid-flight, queue exactly one rerun.
    if (isFetchingRef.current) {
      if (force) pendingRefetchRef.current = true;
      return;
    }
    console.log("useICPs session:", session);
    if (!user?.id) return;

    const scopedBrandId = resolveScopedBrandId(activeBrandId, brands);
    const scopeReady = isBrandScopeReady(brandLoading, brands, scopedBrandId);
    if (!scopeReady) {
      return;
    }

    isFetchingRef.current = true;

    setIsLoading(true);
    setError(null);

    const cacheBrandKey = scopedBrandId;

    // First, try to load from cache for instant display (brand-scoped when active).
    let cachedICPs: ICP[] = [];
    try {
      cachedICPs = await getCachedICPs(user.id, cacheBrandKey);
      if (cachedICPs.length > 0) {
        console.log("useICPs: loaded from cache", cachedICPs.length, {
          scopedBrandId,
        });
        setICPs(cachedICPs);
        setIsLoading(false); // Show cached data immediately
      }
    } catch (err) {
      console.error("Error reading cached ICPs:", err);
    }

    // Then attempt to fetch from Supabase
    try {
      console.log('Fetching ICPs...');

      if (scopedBrandId && brands.length === 1) {
        await attachOrphanIcpsToBrand(user.id, scopedBrandId);
      }
      
      // Ensure we have a valid session before querying
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        console.warn('No session found - auth headers may be missing');
      } else if (import.meta.env.DEV) {
        console.log('✅ Session found - auth headers will be included');
      }
      
      // Build query with filters BEFORE select for correct REST syntax
      let query = supabase
        .from("icps")
        // Join the related brand name so ICP cards can show it everywhere (dashboard/collections/etc.)
        .select("*, brands(name)");
      
      // Apply filters
      query = query.eq("user_id", user.id);
      query = applyCurrentIcpFilter(query);
      if (scopedBrandId) {
        query = query.eq("brand_id", scopedBrandId);
      }

      // Apply ordering
      query = query.order("created_at", { ascending: false });
      
      const { data, error: fetchError } = await query;

      if (fetchError) {
        console.warn("useICPs: fetch error", fetchError);
        setError(fetchError.message ?? "Failed to fetch ICPs");
        // Do not wipe state if we have cached or current data
        setIsOffline(false);
        if (cachedICPs.length === 0) {
          setICPs((prev) => (prev && prev.length ? prev : []));
        }
        return;
      }

      if (!data || data.length === 0) {
        console.log("useICPs: no ICPs found — returning empty array");
        const pendingOps = await getPendingOps(user.id);
        if (pendingOps.length > 0) {
          console.log("useICPs: skip empty cache (pending ops exist)", {
            pendingCount: pendingOps.length,
          });
          setIsOffline(false);
          return;
        }
        setICPs([]);
        setIsOffline(false);
        await setCachedICPs(user.id, [], cacheBrandKey);
        return;
      }

      // Success: update both state and cache
      const currentRows = (data || []) as any[];
      const icpsWithIndex = currentRows.map((icp: any, index: number) => ({
        ...icp,
        // Supabase join returns `brands: { name } | null` (because FK is brands)
        brandName:
          (icp?.brands && typeof icp.brands?.name === "string" ? icp.brands.name : null) ??
          (icp as any)?.brandName ??
          null,
        _index: index,
      }));
      console.log("DIAG: useICPs _index mapping =", icpsWithIndex);
      setICPs(icpsWithIndex);
      setIsOffline(false);
      
      // Update cache in background
      await setCachedICPs(user.id, icpsWithIndex, cacheBrandKey);
    } catch (err) {
      console.error("Error fetching ICPs from Supabase:", err);
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
      
      setError(error instanceof Error ? error.message : "Failed to fetch ICPs");
      
      // Don't clear existing ICPs - keep cached data visible
      // Only set empty array if we have no cached data
      if (cachedICPs.length === 0) {
        setICPs([]);
      }
    } finally {
      setIsLoading(false);
      setHasLoadedOnce(true);
      isFetchingRef.current = false;

      // If something requested a forced refresh while we were fetching,
      // run one more fetch now (but do it async so we don’t recurse synchronously).
      if (pendingRefetchRef.current) {
        pendingRefetchRef.current = false;
        queueMicrotask(() => {
          void fetchICPs(true);
        });
      }
    }
  }, [user?.id, activeBrandId, brandLoading, brands]);

  // ---- Corrected initial load effect ----
  useEffect(() => {
    try {
      if (authLoading) return;
      if (!user?.id) return;
      const scopedBrandId = resolveScopedBrandId(activeBrandId, brands);
      if (!isBrandScopeReady(brandLoading, brands, scopedBrandId)) return;

      fetchICPs();
    } catch (err) {
      console.error("useICPs fatal error", err);
      setIsLoading(false);
    }
  }, [authLoading, brandLoading, brands, activeBrandId, user?.id, fetchICPs]);

  // Listen for global ICP changes (e.g., guest flush completion) and refetch
  useEffect(() => {
    if (!user?.id) return;
    const handler = () => {
      void fetchICPs(true);
    };
    window.addEventListener("icps:changed", handler);
    return () => window.removeEventListener("icps:changed", handler);
  }, [user?.id, fetchICPs]);

  useEffect(() => {
    if (!user?.id) return;
    const handler = () => {
      void fetchICPs(true);
    };
    window.addEventListener("auth:changed", handler);
    return () => window.removeEventListener("auth:changed", handler);
  }, [user?.id, fetchICPs]);

  const getICP = useCallback(async (id: string): Promise<ICP | null> => {
    if (!user?.id) return null;

    // Try in-memory state first
    const existing = icps.find((i) => i.id === id);
    if (existing) {
      console.log("getICP: returning from state");
      return existing;
    }

    // Try cache next
    try {
      const cached = await getCachedICPs(user.id);
      const cachedHit = cached.find((i) => i.id === id);
      if (cachedHit) {
        console.log("getICP: returning from cache");
        return cachedHit;
      }
    } catch (cacheErr) {
      console.warn("getICP: cache read failed", cacheErr);
    }

    // Fallback to Supabase fetch
    console.log("getICP: fetching from Supabase");
    try {
      const { data, error: fetchError } = await supabase
        .from("icps")
        .select("*, brands(name)")
        .eq("id", id)
        .eq("user_id", user.id)
        .single();

      if (fetchError) throw fetchError;
      let row = data as any;
      if (row?.superseded_at && row?.lineage_id) {
        const current = await fetchCurrentIcpByLineageId(user.id, row.lineage_id);
        if (current) row = { ...current, _requestedId: id };
      }
      const hydrated = {
        ...row,
        brandName:
          (row?.brands && typeof row.brands?.name === "string"
            ? row.brands.name
            : null) ?? null,
      } as ICP;
      return hydrated;
    } catch (err) {
      console.error("Error fetching ICP:", err);
      return null;
    }
  }, [user?.id, icps]);

  const createICP = async (data: Partial<ICP>): Promise<ICP | null> => {
    if (!user?.id) return null;

    const dbSafe = toDbIcpPayload(data);
    const preferredBrandId = (dbSafe as any)?.brand_id ?? activeBrandId ?? null;
    let resolvedBrandId: string;
    try {
      resolvedBrandId = await resolveBrandIdForIcpWrite(user.id, preferredBrandId);
    } catch (brandErr) {
      console.error("createICP: brand resolution failed", brandErr);
      return null;
    }
    const generationId = (dbSafe as any)?.generation_id ?? newGenerationId();
    const newICP = withVersioningDefaults(
      {
        ...dbSafe,
        user_id: user.id,
        brand_id: resolvedBrandId,
        name: (dbSafe as any)?.name || "",
        description: (dbSafe as any)?.description || "",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      generationId
    ) as unknown as ICP;

    // Generate temporary ID for offline support
    const tempId = `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const optimisticICP = { ...newICP, id: tempId } as ICP;

    // Optimistic update: update state and cache immediately
    setICPs((prev) => {
      const updated = [optimisticICP, ...prev];
      // Update cache in background
      setCachedICPs(user.id, updated).catch((err) =>
        console.error("Error caching ICPs after create:", err)
      );
      return updated;
    });

    // Add to outbox for sync
    const op: PendingOp = {
      id: `op-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: "create_icp",
      payload: newICP,
      localId: tempId,
      timestamp: Date.now(),
      retryCount: 0,
    };
    await addPendingOp(user.id, op);

    // Then attempt Supabase mutation immediately
    try {
      const { data: created, error: createError } = await supabase
        .from("icps")
        .insert([newICP])
        .select()
        .single();

      if (createError) throw createError;

      // Success: remove from outbox and replace optimistic ICP with real one
      const { removePendingOp } = await import("../lib/localCache");
      await removePendingOp(user.id, op.id);

      // Replace temporary ID with real ID
      setICPs((prev) => {
        const updated = prev.map((icp) =>
          icp.id === tempId ? created : icp
        );
        // Update cache with real data
        setCachedICPs(user.id, updated).catch((err) =>
          console.error("Error caching ICPs after create success:", err)
        );
        return updated;
      });

      setIsOffline(false);
      return created;
    } catch (err) {
      console.error("Error creating ICP in Supabase:", err);
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
      return optimisticICP;
    }
  };

  const updateICP = async (id: string, updates: Partial<ICP>): Promise<ICP | null> => {
    if (!user?.id) return null;

    const updatesWithTimestamp = {
      ...toDbIcpPayload(updates),
      updated_at: new Date().toISOString(),
    };

    const existing = icps.find((icp) => icp.id === id);

    // Optimistic: replace row with merged preview (real id assigned after RPC)
    setICPs((prev) => {
      const updated = prev.map((icp) =>
        icp.id === id ? { ...icp, ...updatesWithTimestamp } : icp
      );
      setCachedICPs(user.id, updated).catch((err) =>
        console.error("Error caching ICPs after update:", err)
      );
      return updated;
    });

    try {
      const versioned = await insertIcpVersionRpc(id, updatesWithTimestamp);

      const hydrated = {
        ...versioned,
        brandName: existing?.brandName ?? null,
      } as ICP;

      setICPs((prev) => {
        const withoutOld = prev.filter((icp) => icp.id !== id);
        const updated = [hydrated, ...withoutOld];
        setCachedICPs(user.id, updated).catch((err) =>
          console.error("Error caching ICPs after version insert:", err)
        );
        return updated;
      });

      setIsOffline(false);
      try {
        window.dispatchEvent(new Event("icps:changed"));
      } catch {}
      return hydrated;
    } catch (err) {
      console.error("Error versioning ICP in Supabase:", err);
      const error = err as any;

      const isNetworkError =
        !error.code ||
        error.code === "ECONNREFUSED" ||
        error.code === "ENOTFOUND" ||
        error.message?.includes("network") ||
        error.message?.includes("fetch");

      if (isNetworkError) {
        const op: PendingOp = {
          id: `op-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          type: "update_icp",
          payload: { id, updates: updatesWithTimestamp },
          timestamp: Date.now(),
          retryCount: 0,
        };
        await addPendingOp(user.id, op);
        setIsOffline(true);
      } else {
        setIsOffline(false);
        if (isPermanentIcpSyncError(error)) {
          // Revert optimistic preview when the server rejected the mutation.
          if (existing) {
            setICPs((prev) => {
              const reverted = prev.map((icp) => (icp.id === id ? existing : icp));
              setCachedICPs(user.id, reverted).catch((cacheErr) =>
                console.error("Error reverting cached ICPs after failed save:", cacheErr)
              );
              return reverted;
            });
          }
        }
      }

      return null;
    }
  };

  const deleteICP = async (id: string): Promise<boolean> => {
    if (!user?.id) return false;

    // Optimistic update: update state and cache immediately
    setICPs((prev) => {
      const updated = prev.filter((icp) => icp.id !== id);
      // Update cache in background
      setCachedICPs(user.id, updated).catch((err) =>
        console.error("Error caching ICPs after delete:", err)
      );
      return updated;
    });

    // Add to outbox for sync
    const op: PendingOp = {
      id: `op-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: "delete_icp",
      payload: { id },
      timestamp: Date.now(),
      retryCount: 0,
    };
    await addPendingOp(user.id, op);

    // Then attempt Supabase mutation immediately
    try {
      await softDeleteIcpById(user.id, id);

      // Success: remove from outbox
      const { removePendingOp } = await import("../lib/localCache");
      await removePendingOp(user.id, op.id);

      setIsOffline(false);
      return true;
    } catch (err) {
      console.error("Error deleting ICP in Supabase:", err);
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
  };

  const duplicateICP = async (id: string): Promise<ICP | null> => {
    if (!user?.id) return null;

    // Prevent duplicate actions for the same ICP concurrently
    if (duplicatingRef.current[id]) {
      return null;
    }
    duplicatingRef.current[id] = true;

    let original = icps.find((icp) => icp.id === id);

    // Fallback fetch if not in local state
    if (!original) {
      const { data, error } = await supabase
        .from("icps")
        .select("*")
        .eq("id", id)
        .eq("user_id", user.id)
        .single();
      if (error) {
        console.error("duplicateICP fetch error", error);
        return null;
      }
      original = data as ICP;
    }

    if (!original) return null;

    const existingNames = icps.map((i) => i.name || "");
    const newName = generateIcpCopyName(original.name || "Untitled ICP", existingNames);

    const duplicate: any = {
      ...original,
      id: undefined, // Let Supabase generate new ID
      _index: undefined,
      brandName: undefined,
      name: newName,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    delete duplicate.id;
    const dbSafe = toDbIcpPayload(duplicate);
    try {
      const created = await createICP(dbSafe);
      if (created?.id) {
        try {
          window.dispatchEvent(new Event("icps:changed"));
        } catch {}
      }
      return created;
    } finally {
      duplicatingRef.current[id] = false;
    }
  };

  const exportICP = async (id: string, format: "pdf" | "json") => {
    const icp = icps.find((i) => i.id === id);
    if (!icp) return;

    if (format === "json") {
      const json = JSON.stringify(icp, null, 2);
      const blob = new Blob([json], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${icp.name.replace(/\s+/g, "-")}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } else {
      // PDF export would require a library like jsPDF
      console.log("PDF export not implemented yet");
    }
  };

  const restoreICP = async (lineageId: string): Promise<boolean> => {
    if (!user?.id || !lineageId) return false;
    try {
      await restoreIcpLineage(lineageId);
      await fetchICPs();
      return true;
    } catch (err) {
      console.error("Error restoring ICP lineage:", err);
      return false;
    }
  };

  return {
    icps,
    isLoading,
    hasLoadedOnce,
    error,
    isOffline,
    fetchICPs,
    getICP,
    createICP,
    updateICP,
    deleteICP,
    restoreICP,
    duplicateICP,
    exportICP,
  };
}
