import localforage from "localforage";
import type { ICP } from "../hooks/useICPs";
import type { Collection } from "../hooks/useCollections";

// Configure localforage to use IndexedDB
const cache = localforage.createInstance({
  name: "icp-generator-cache",
  storeName: "user-data",
  description: "Local cache for ICPs and Collections",
});

// Outbox store for pending operations
export const outbox = localforage.createInstance({
  name: "icp-generator-outbox",
  storeName: "pending-ops",
  description: "Outbox queue for offline operations",
});

export interface PendingOp {
  id: string; // uuid
  type:
    | "create_icp"
    | "update_icp"
    | "delete_icp"
    | "create_collection"
    | "update_collection"
    | "delete_collection"
    | "add_icp_to_collection"
    | "remove_icp_from_collection";
  payload: any; // exact fields needed for Supabase
  localId?: string; // for temporary ICP or collection IDs
  timestamp: number;
  retryCount?: number; // track retry attempts for backoff
  lastRetry?: number; // timestamp of last retry attempt
}

/**
 * Get cached ICPs for a specific user
 * @param userId - The user ID
 * @returns Promise resolving to cached ICPs array, or empty array if none found
 */
function icpCacheKey(userId: string, brandId?: string | null) {
  return brandId ? `icps:${userId}:${brandId}` : `icps:${userId}`;
}

export async function getCachedICPs(
  userId: string,
  brandId?: string | null
): Promise<ICP[]> {
  try {
    const cached = await cache.getItem<ICP[]>(icpCacheKey(userId, brandId));
    return cached || [];
  } catch (err) {
    console.error("Error reading cached ICPs:", err);
    return [];
  }
}

/**
 * Cache ICPs for a specific user (optionally scoped to active brand).
 */
export async function setCachedICPs(
  userId: string,
  icps: ICP[],
  brandId?: string | null
): Promise<void> {
  try {
    await cache.setItem(icpCacheKey(userId, brandId), icps);
  } catch (err) {
    console.error("Error caching ICPs:", err);
    // Don't throw - caching failures shouldn't break the app
  }
}

/**
 * Get cached Collections for a specific user
 * @param userId - The user ID
 * @returns Promise resolving to cached Collections array, or empty array if none found
 */
export async function getCachedCollections(userId: string): Promise<Collection[]> {
  try {
    const cached = await cache.getItem<Collection[]>(`collections:${userId}`);
    return cached || [];
  } catch (err) {
    console.error("Error reading cached Collections:", err);
    return [];
  }
}

/**
 * Cache Collections for a specific user
 * @param userId - The user ID
 * @param collections - Array of Collections to cache
 */
export async function setCachedCollections(
  userId: string,
  collections: Collection[]
): Promise<void> {
  try {
    await cache.setItem(`collections:${userId}`, collections);
  } catch (err) {
    console.error("Error caching Collections:", err);
    // Don't throw - caching failures shouldn't break the app
  }
}

/**
 * Clear all cached data for a specific user (useful for logout)
 * @param userId - The user ID
 */
export async function clearUserCache(userId: string): Promise<void> {
  try {
    await cache.removeItem(`icps:${userId}`);
    await cache.removeItem(`collections:${userId}`);
    await outbox.removeItem(`ops:${userId}`);
  } catch (err) {
    console.error("Error clearing user cache:", err);
  }
}

/**
 * Get pending operations for a specific user
 * @param userId - The user ID
 * @returns Promise resolving to array of pending operations
 */
export async function getPendingOps(userId: string): Promise<PendingOp[]> {
  try {
    const ops = await outbox.getItem<PendingOp[]>(`ops:${userId}`);
    return ops || [];
  } catch (err) {
    console.error("Error reading pending operations:", err);
    return [];
  }
}

/**
 * Add a pending operation to the outbox
 * @param userId - The user ID
 * @param op - The operation to add
 */
export async function addPendingOp(userId: string, op: PendingOp): Promise<void> {
  try {
    const ops = await getPendingOps(userId);
    ops.push(op);
    await outbox.setItem(`ops:${userId}`, ops);
  } catch (err) {
    console.error("Error adding pending operation:", err);
    // Don't throw - outbox failures shouldn't break the app
  }
}

/**
 * Remove a pending operation from the outbox
 * @param userId - The user ID
 * @param opId - The operation ID to remove
 */
export async function removePendingOp(userId: string, opId: string): Promise<void> {
  try {
    const ops = await getPendingOps(userId);
    const filtered = ops.filter((op) => op.id !== opId);
    await outbox.setItem(`ops:${userId}`, filtered);
  } catch (err) {
    console.error("Error removing pending operation:", err);
  }
}

/**
 * Clear all pending operations for a specific user
 * @param userId - The user ID
 */
export async function clearPendingOps(userId: string): Promise<void> {
  try {
    await outbox.removeItem(`ops:${userId}`);
  } catch (err) {
    console.error("Error clearing pending operations:", err);
  }
}

/**
 * Update a pending operation (e.g., to update retry count)
 * @param userId - The user ID
 * @param opId - The operation ID to update
 * @param updates - Partial operation updates
 */
export async function updatePendingOp(
  userId: string,
  opId: string,
  updates: Partial<PendingOp>
): Promise<void> {
  try {
    const ops = await getPendingOps(userId);
    const updated = ops.map((op) => (op.id === opId ? { ...op, ...updates } : op));
    await outbox.setItem(`ops:${userId}`, updated);
  } catch (err) {
    console.error("Error updating pending operation:", err);
  }
}

