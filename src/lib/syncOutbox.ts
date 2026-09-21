import { supabase } from "../config/supabase";
import {
  getPendingOps,
  removePendingOp,
  updatePendingOp,
  getCachedICPs,
  setCachedICPs,
  getCachedCollections,
  setCachedCollections,
  outbox,
  type PendingOp,
} from "./localCache";
import { resolveBrandIdForIcpInsertPayload } from "./icpBrandAttach";
import { softDeleteIcpById } from "./icpVersioning";
import { insertIcpVersionRpc, isPermanentIcpSyncError } from "./icpVersioning";

const inFlight = new Map<string, Promise<number>>();

// ---- DB-safe payload helpers (kept in sync with useOutboxSync) ----
const stripKeys = <T extends Record<string, any>>(obj: T, keys: string[]) => {
  const copy: any = { ...obj };
  for (const k of keys) delete copy[k];
  return copy as T;
};

const toDbIcpPayload = (payload: any) => {
  if (!payload || typeof payload !== "object") return payload;
  let p = stripKeys(payload, ["_index", "brandName", "brands"]);
  if ("brands" in p) delete (p as any).brands;
  return p;
};

async function replaceTempIdInPendingOps(
  userId: string,
  oldId: string,
  newId: string
): Promise<void> {
  const ops = await getPendingOps(userId);
  const updated = ops.map((op) => {
    if (op.localId === oldId) {
      return { ...op, localId: newId };
    }
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
  await outbox.setItem(`ops:${userId}`, updated);
}

async function syncOperation(op: PendingOp, userId: string): Promise<boolean> {
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

        if (op.localId && op.localId !== created.id) {
          const cachedICPs = await getCachedICPs(userId);
          const updatedICPs = cachedICPs.map((icp) =>
            icp.id === op.localId ? { ...icp, id: created.id } : icp
          );
          await setCachedICPs(userId, updatedICPs);
          await replaceTempIdInPendingOps(userId, op.localId, created.id);
        }

        return true;
      }

      case "update_icp": {
        await insertIcpVersionRpc(
          op.payload.id,
          toDbIcpPayload(op.payload.updates)
        );
        return true;
      }

      case "delete_icp": {
        await softDeleteIcpById(userId, op.payload.id);
        return true;
      }

      case "create_collection": {
        const { data: created, error } = await supabase
          .from("collections")
          .insert([op.payload])
          .select()
          .single();

        if (error) throw error;

        if (op.localId && op.localId !== created.id) {
          const cachedCollections = await getCachedCollections(userId);
          const updated = cachedCollections.map((col) =>
            col.id === op.localId ? { ...col, id: created.id } : col
          );
          await setCachedCollections(userId, updated);
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
        const collectionId = op.payload.collection_id;
        const isTempId = typeof collectionId === "string" && collectionId.startsWith("temp-");
        if (isTempId) {
          await removePendingOp(userId, op.id);
          return true;
        }

        const { data: existing } = await supabase
          .from("collection_items")
          .select("*")
          .eq("collection_id", collectionId)
          .eq("lineage_id", op.payload.lineage_id)
          .maybeSingle();

        if (existing) return true;

        const { error } = await supabase.from("collection_items").insert([
          {
            collection_id: collectionId,
            lineage_id: op.payload.lineage_id,
          },
        ]);

        if (error) throw error;

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

        await supabase
          .from("collections")
          .update({ updated_at: new Date().toISOString() })
          .eq("id", op.payload.collection_id);

        return true;
      }

      default:
        console.warn("[syncOutbox] unknown op type", op.type);
        return false;
    }
  } catch (err: any) {
    console.error(`[syncOutbox] error syncing ${op.id} (${op.type})`, err);
    if (
      isPermanentIcpSyncError(err) ||
      err?.code === "22P02" ||
      err?.message?.includes("invalid input syntax for type uuid")
    ) {
      await removePendingOp(userId, op.id);
      return true;
    }
    return false;
  }
}

export async function syncOutbox(userId: string): Promise<number> {
  if (!userId) return 0;
  if (inFlight.has(userId)) return inFlight.get(userId) as Promise<number>;

  const promise = (async () => {
    const ops = await getPendingOps(userId);
    console.log("[syncOutbox] start", { userId, pending: ops.length });

    if (!ops.length) {
      return 0;
    }

    let processed = 0;
    for (const op of ops) {
      const success = await syncOperation(op, userId);
      if (success) {
        await removePendingOp(userId, op.id);
        processed += 1;
      } else {
        const retryCount = (op.retryCount || 0) + 1;
        await updatePendingOp(userId, op.id, {
          retryCount,
          lastRetry: Date.now(),
        });
      }
    }

    if (processed > 0) {
      try {
        window.dispatchEvent(new Event("icps:changed"));
        window.dispatchEvent(new Event("collections:changed"));
      } catch {}
    }

    console.log("[syncOutbox] complete", { userId, processed, total: ops.length });
    return processed;
  })().finally(() => {
    inFlight.delete(userId);
  });

  inFlight.set(userId, promise);
  return promise;
}
