import { useEffect, useRef, useState } from "react";
import { supabase } from "../config/supabase";
import { useAuth } from "../contexts/AuthContext";
import {
  getPendingOps,
  removePendingOp,
  updatePendingOp,
  setCachedICPs,
  setCachedCollections,
  getCachedICPs,
  getCachedCollections,
  outbox,
  type PendingOp,
} from "../lib/localCache";
import { resolveBrandIdForIcpInsertPayload } from "../lib/icpBrandAttach";
import { insertIcpVersionRpc } from "../lib/icpVersioning";

// ---- DB-safe payload helpers (Outbox hardening) ----
const stripKeys = <T extends Record<string, any>>(obj: T, keys: string[]) => {
  const copy: any = { ...obj };
  for (const k of keys) delete copy[k];
  return copy as T;
};

const toDbIcpPayload = (payload: any) => {
  if (!payload || typeof payload !== "object") return payload;

  // Remove client-only / joined fields that must never hit PostgREST
  let p = stripKeys(payload, ["_index", "brandName", "brands"]);

  // If any nested "brands" slipped in somehow (rare), nuke it
  if ("brands" in p) delete (p as any).brands;

  // Avoid inserting unknown keys that sometimes get attached in UI
  // (If you want to be ultra-safe, you can whitelist instead.)
  return p;
};

// Helper to replace temporary IDs in pending operations
async function replaceTempIdInPendingOps(
  userId: string,
  oldId: string,
  newId: string
): Promise<void> {
  const ops = await getPendingOps(userId);
  const updated = ops.map((op) => {
    // Update operations that reference the old temporary ID
    if (op.localId === oldId) {
      return { ...op, localId: newId };
    }
    // Update payloads that reference the old ID
    if (op.payload?.id === oldId) {
      return { ...op, payload: { ...op.payload, id: newId } };
    }
    if (op.payload?.icp_id === oldId) {
      return { ...op, payload: { ...op.payload, icp_id: newId } };
    }
    if (op.payload?.collection_id === oldId) {
      return { ...op, payload: { ...op.payload, collection_id: newId } };
    }
    return op;
  });
  
  // Save updated operations
  await outbox.setItem(`ops:${userId}`, updated);
}

/**
 * Hook for syncing pending operations to Supabase
 * Runs in the background every 15 seconds
 */
export function useOutboxSync() {
  const { user } = useAuth();
  const [isSyncing, setIsSyncing] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Calculate exponential backoff delay
  const getBackoffDelay = (retryCount: number = 0): number => {
    const delays = [1000, 5000, 10000, 30000]; // 1s, 5s, 10s, 30s
    return delays[Math.min(retryCount, delays.length - 1)];
  };

  // Check if operation should be retried based on backoff
  const shouldRetry = (op: PendingOp): boolean => {
    if (!op.lastRetry) return true; // Never retried, can retry immediately
    const delay = getBackoffDelay(op.retryCount || 0);
    return Date.now() - op.lastRetry >= delay;
  };

  // Sync a single operation
  const syncOperation = async (op: PendingOp, userId: string): Promise<boolean> => {
    try {
      switch (op.type) {
        case "create_icp": {
          const dbPayload = toDbIcpPayload(op.payload);
          const resolvedPayload = await resolveBrandIdForIcpInsertPayload(userId, dbPayload);

          const { data: created, error } = await supabase
            .from("icps")
            .insert([resolvedPayload])
            .select()
            .single();

          if (error) throw error;

          // Replace temporary ID with real ID everywhere
          if (op.localId && op.localId !== created.id) {
            // Update cached ICPs
            const cachedICPs = await getCachedICPs(userId);
            const updatedICPs = cachedICPs.map((icp) =>
              icp.id === op.localId ? { ...icp, id: created.id } : icp
            );
            await setCachedICPs(userId, updatedICPs);

            // Update any pending operations that reference this temporary ID
            await replaceTempIdInPendingOps(userId, op.localId, created.id);
          }

          return true;
        }

        case "update_icp": {
          const versioned = await insertIcpVersionRpc(
            op.payload.id,
            toDbIcpPayload(op.payload.updates)
          );
          if (!versioned) throw new Error("ICP version insert failed");
          return true;
        }

        case "delete_icp": {
          const { data: target, error: fetchError } = await supabase
            .from("icps")
            .select("lineage_id")
            .eq("id", op.payload.id)
            .eq("user_id", userId)
            .single();

          if (fetchError) throw fetchError;

          const lineageId = (target as any)?.lineage_id as string | undefined;

          if (lineageId) {
            await supabase.from("collection_items").delete().eq("lineage_id", lineageId);
            const { error } = await supabase
              .from("icps")
              .delete()
              .eq("lineage_id", lineageId)
              .eq("user_id", userId);
            if (error) throw error;
          } else {
            const { error } = await supabase
              .from("icps")
              .delete()
              .eq("id", op.payload.id)
              .eq("user_id", userId);
            if (error) throw error;
          }

          return true;
        }

        case "create_collection": {
          const { data: created, error } = await supabase
            .from("collections")
            .insert([op.payload])
            .select()
            .single();

          if (error) throw error;

          // Replace temporary ID with real ID
          if (op.localId && op.localId !== created.id) {
            const cachedCollections = await getCachedCollections(userId);
            const updated = cachedCollections.map((col) =>
              col.id === op.localId ? { ...col, id: created.id } : col
            );
            await setCachedCollections(userId, updated);

            // Update any pending operations that reference this temporary ID
            await replaceTempIdInPendingOps(userId, op.localId, created.id);
          }

          return true;
        }

        case "update_collection": {
          const { error } = await supabase
            .from("collections")
            .update(op.payload.updates)
            .eq("id", op.payload.id)
            .eq("user_id", userId);

          if (error) throw error;
          return true;
        }

        case "delete_collection": {
          // Delete collection_items first
          // IMPORTANT: collection_items does NOT have user_id column - only filter by collection_id
          await supabase
            .from("collection_items")
            .delete()
            .eq("collection_id", op.payload.id);

          const { error } = await supabase
            .from("collections")
            .delete()
            .eq("id", op.payload.id)
            .eq("user_id", userId);

          if (error) throw error;
          return true;
        }

        case "add_icp_to_collection": {
          // Skip if collection_id is a temporary ID (invalid UUID)
          const collectionId = op.payload.collection_id;
          const isTempId = typeof collectionId === "string" && collectionId.startsWith("temp-");
          if (isTempId) {
            console.warn(`Skipping add_icp_to_collection with temp ID ${collectionId} - waiting for collection creation`);
            // Remove this invalid op from queue
            await removePendingOp(userId, op.id);
            return true; // Consider it handled (dropped)
          }

          let checkQuery = supabase
            .from("collection_items")
            .select("*")
            .eq("collection_id", collectionId)
            .eq("lineage_id", op.payload.lineage_id);
          
          const { data: existing } = await checkQuery.maybeSingle();

          if (existing) {
            return true; // Already exists, consider it success
          }

          const { error } = await supabase.from("collection_items").insert([
            {
              collection_id: collectionId,
              lineage_id: op.payload.lineage_id,
            },
          ]);

          if (error) throw error;

          // Update collection updated_at
          await supabase
            .from("collections")
            .update({ updated_at: new Date().toISOString() })
            .eq("id", collectionId);

          return true;
        }

        case "remove_icp_from_collection": {
          const { error } = await supabase
            .from("collection_items")
            .delete()
            .eq("collection_id", op.payload.collection_id)
            .eq("lineage_id", op.payload.lineage_id);

          if (error) throw error;

          // Update collection updated_at
          await supabase
            .from("collections")
            .update({ updated_at: new Date().toISOString() })
            .eq("id", op.payload.collection_id);

          return true;
        }

        default:
          console.warn("Unknown operation type:", op.type);
          return false;
      }
    } catch (err: any) {
      console.error(`Error syncing operation ${op.id} (${op.type}):`, err);
      
      // If error is invalid UUID syntax (22P02), remove the op to prevent infinite retries
      if (err?.code === "22P02" || err?.message?.includes("invalid input syntax for type uuid")) {
        console.warn(`Removing operation ${op.id} due to invalid UUID syntax - operation payload is invalid`);
        await removePendingOp(userId, op.id);
        return true; // Consider it handled (dropped)
      }
      
      return false;
    }
  };

  // Process all pending operations
  const processOutbox = async () => {
    if (!user?.id || isSyncing) return;

    setIsSyncing(true);

    try {
      const ops = await getPendingOps(user.id);
      setPendingCount(ops.length);

      if (ops.length === 0) {
        setIsSyncing(false);
        return;
      }

      // Process operations that are ready for retry
      const readyOps = ops.filter(shouldRetry);

      for (const op of readyOps) {
        const success = await syncOperation(op, user.id);

        if (success) {
          // Remove from outbox on success
          await removePendingOp(user.id, op.id);
          setPendingCount((prev) => Math.max(0, prev - 1));
        } else {
          // Update retry count and timestamp
          const retryCount = (op.retryCount || 0) + 1;
          await updatePendingOp(user.id, op.id, {
            retryCount,
            lastRetry: Date.now(),
          });
        }
      }
    } catch (err) {
      console.error("Error processing outbox:", err);
    } finally {
      setIsSyncing(false);
    }
  };

  // Initialize sync interval
  useEffect(() => {
    if (!user?.id) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      setPendingCount(0);
      return;
    }

    // Initial sync
    processOutbox();

    // Set up interval for periodic syncing
    intervalRef.current = setInterval(() => {
      processOutbox();
    }, 15000); // Every 15 seconds

    // Also check pending count periodically
    const checkPending = async () => {
      const ops = await getPendingOps(user.id);
      setPendingCount(ops.length);
    };
    checkPending();
    const pendingInterval = setInterval(checkPending, 5000); // Check every 5 seconds

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      clearInterval(pendingInterval);
    };
  }, [user?.id]);

  return {
    isSyncing,
    pendingCount,
    processOutbox, // Expose for manual trigger if needed
  };
}
