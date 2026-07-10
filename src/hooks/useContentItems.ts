import { useCallback, useEffect, useState } from "react";
import { supabase } from "../config/supabase";
import { useAuth } from "../contexts/AuthContext";
import type {
  ContentItemRow,
  ContentItemStatus,
  ContentItemType,
  ContentPayload,
} from "../types/contentItemPayload";
import { normalizeContentPayload } from "../lib/contentItemPayload";
import {
  attachCompositionToContentItems,
  type ContentComposition,
} from "../lib/contentComposition";
import {
  hardDeleteContentItemLineage,
  insertContentItemVersionRpc,
  restoreContentItemLineage,
  softDeleteContentItemLineage,
} from "../lib/contentItemVersioning";

export type ContentItemWithComposition = ContentItemRow & {
  composition: ContentComposition;
};

export function useContentItems(brandId: string) {
  const { user } = useAuth();
  const [items, setItems] = useState<ContentItemWithComposition[]>([]);
  const [archivedItems, setArchivedItems] = useState<ContentItemWithComposition[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchItems = useCallback(async () => {
    if (!user?.id || !brandId) {
      setItems([]);
      setArchivedItems([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from("content_items")
        .select("*")
        .eq("user_id", user.id)
        .eq("brand_id", brandId)
        .is("superseded_at", null)
        .order("updated_at", { ascending: false });

      if (fetchError) throw fetchError;

      const rows = ((data || []) as ContentItemRow[]).map((row) => ({
        ...row,
        content: normalizeContentPayload(row.type, row.content),
      }));

      const current = rows.filter((r) => !r.deleted_at);
      const archived = rows.filter((r) => !!r.deleted_at);

      const [withComp, archivedWithComp] = await Promise.all([
        attachCompositionToContentItems(user.id, current),
        attachCompositionToContentItems(user.id, archived),
      ]);

      setItems(withComp);
      setArchivedItems(archivedWithComp);
    } catch (err: any) {
      console.error("[useContentItems] fetch failed", err);
      setError(err?.message || "Failed to load content.");
      setItems([]);
      setArchivedItems([]);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id, brandId]);

  useEffect(() => {
    void fetchItems();
  }, [fetchItems]);

  useEffect(() => {
    const onChanged = () => void fetchItems();
    window.addEventListener("content-items:changed", onChanged);
    return () => window.removeEventListener("content-items:changed", onChanged);
  }, [fetchItems]);

  const createContent = useCallback(
    async (input: {
      strategyLineageId: string;
      campaignIdeaId?: string | null;
      icpLineageId: string;
      type: ContentItemType;
      suggestedContentId?: string | null;
    }) => {
      if (!user?.id || !brandId) return null;
      const { data, error: invokeError } = await supabase.functions.invoke("generate-content", {
        body: {
          brandId,
          strategyLineageId: input.strategyLineageId,
          campaignIdeaId: input.campaignIdeaId ?? null,
          icpLineageId: input.icpLineageId,
          type: input.type,
          suggestedContentId: input.suggestedContentId ?? null,
        },
      });

      if (invokeError) throw invokeError;
      if (!data?.record) {
        await fetchItems();
        return null;
      }

      try {
        window.dispatchEvent(new Event("content-items:changed"));
      } catch {}
      await fetchItems();
      return data.record as ContentItemRow;
    },
    [brandId, fetchItems, user?.id]
  );

  const updateContent = useCallback(
    async (
      itemId: string,
      updates: { title?: string; content?: ContentPayload }
    ): Promise<ContentItemRow | null> => {
      if (!user?.id) return null;
      const payload: Record<string, unknown> = {};
      if (updates.title !== undefined) payload.title = updates.title;
      if (updates.content !== undefined) payload.content = updates.content;

      const next = await insertContentItemVersionRpc(itemId, payload);
      try {
        window.dispatchEvent(new Event("content-items:changed"));
      } catch {}
      await fetchItems();
      return next;
    },
    [fetchItems, user?.id]
  );

  /**
   * Status is editorial state, not content — update in place without a version bump.
   */
  const setContentStatus = useCallback(
    async (itemId: string, status: ContentItemStatus): Promise<boolean> => {
      if (!user?.id) return false;
      const { error: updateError } = await supabase
        .from("content_items")
        .update({ status, updated_at: new Date().toISOString() })
        .eq("id", itemId)
        .eq("user_id", user.id)
        .is("superseded_at", null)
        .is("deleted_at", null);

      if (updateError) {
        console.error("[useContentItems] setContentStatus failed", updateError);
        throw updateError;
      }
      try {
        window.dispatchEvent(new Event("content-items:changed"));
      } catch {}
      await fetchItems();
      return true;
    },
    [fetchItems, user?.id]
  );

  const archiveContent = useCallback(
    async (lineageId: string) => {
      await softDeleteContentItemLineage(lineageId);
      try {
        window.dispatchEvent(new Event("content-items:changed"));
      } catch {}
      await fetchItems();
    },
    [fetchItems]
  );

  const restoreContent = useCallback(
    async (lineageId: string) => {
      await restoreContentItemLineage(lineageId);
      try {
        window.dispatchEvent(new Event("content-items:changed"));
      } catch {}
      await fetchItems();
    },
    [fetchItems]
  );

  const hardDeleteContent = useCallback(
    async (lineageId: string) => {
      await hardDeleteContentItemLineage(lineageId);
      try {
        window.dispatchEvent(new Event("content-items:changed"));
      } catch {}
      await fetchItems();
    },
    [fetchItems]
  );

  return {
    items,
    archivedItems,
    isLoading,
    error,
    fetchItems,
    createContent,
    updateContent,
    setContentStatus,
    archiveContent,
    restoreContent,
    hardDeleteContent,
  };
}
