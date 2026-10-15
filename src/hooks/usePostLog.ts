import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "../config/supabase";
import { track } from "../lib/analytics";
import { currentLocalWeekDates, localISODate } from "../lib/localCalendar";

export type PostLogRow = {
  id: string;
  channel: string;
  posted_on: string;
};

type InsertedRow = PostLogRow & { created_at?: string };

function isPosted(rows: PostLogRow[], channel: string, postedOn: string): boolean {
  return rows.some((row) => row.channel === channel && row.posted_on === postedOn);
}

function latestMatch(rows: PostLogRow[], channel: string, postedOn: string): PostLogRow | undefined {
  return [...rows].reverse().find((row) => row.channel === channel && row.posted_on === postedOn);
}

export function usePostLog(userId: string | undefined, strategyId: string | undefined) {
  const [rows, setRows] = useState<PostLogRow[]>([]);
  const [pendingKeys, setPendingKeys] = useState<Set<string>>(() => new Set());
  const weekDates = currentLocalWeekDates();
  const weekStart = weekDates[0];
  const weekEnd = weekDates[6];

  useEffect(() => {
    if (!userId || !strategyId) return;
    let cancelled = false;
    const load = async () => {
      const { data, error } = await supabase
        .from("post_log")
        .select("id, channel, posted_on")
        .eq("user_id", userId)
        .eq("strategy_id", strategyId)
        .gte("posted_on", weekStart)
        .lte("posted_on", weekEnd)
        .order("created_at", { ascending: true });
      if (cancelled) return;
      if (error) {
        console.error("[usePostLog] load failed", error);
        toast.error("Could not load your posting log.");
        return;
      }
      setRows((data as PostLogRow[]) ?? []);
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [userId, strategyId, weekStart, weekEnd]);

  const setPending = (key: string, on: boolean) => {
    setPendingKeys((prev) => {
      const next = new Set(prev);
      if (on) next.add(key);
      else next.delete(key);
      return next;
    });
  };

  const insertPost = useCallback(
    async (channel: string, postedOn: string, event: "mark_posted" | "log_extra_post") => {
      if (!userId || !strategyId) return;
      const key = `${event}:${channel}:${postedOn}`;
      const tempId = `temp-${crypto.randomUUID()}`;
      const optimistic: PostLogRow = { id: tempId, channel, posted_on: postedOn };
      setPending(key, true);
      setRows((prev) => [...prev, optimistic]);
      try {
        const { data, error } = await supabase
          .from("post_log")
          .insert({
            user_id: userId,
            strategy_id: strategyId,
            channel,
            posted_on: postedOn,
          })
          .select("id, channel, posted_on")
          .single();
        if (error) throw error;
        const saved = data as InsertedRow;
        setRows((prev) => prev.map((row) => (row.id === tempId ? { id: saved.id, channel: saved.channel, posted_on: saved.posted_on } : row)));
        track("mark_posted", { channel });
      } catch (err) {
        console.error("[usePostLog] insert failed", err);
        setRows((prev) => prev.filter((row) => row.id !== tempId));
        toast.error("Could not mark that post. Try again.");
      } finally {
        setPending(key, false);
      }
    },
    [strategyId, userId]
  );

  const removePost = useCallback(
    async (channel: string, postedOn: string) => {
      if (!userId || !strategyId) return;
      const key = `undo_posted:${channel}:${postedOn}`;
      const removed = latestMatch(rows, channel, postedOn);
      if (!removed) return;
      setPending(key, true);
      setRows((prev) => prev.filter((row) => row.id !== removed.id));
      try {
        const { error } = await supabase.from("post_log").delete().eq("id", removed.id).eq("user_id", userId);
        if (error) throw error;
      } catch (err) {
        console.error("[usePostLog] delete failed", err);
        setRows((prev) => [...prev, removed]);
        toast.error("Could not undo that post. Try again.");
      } finally {
        setPending(key, false);
      }
    },
    [rows, strategyId, userId]
  );

  const togglePosted = useCallback(
    async (channel: string, postedOn: string) => {
      if (isPosted(rows, channel, postedOn)) {
        await removePost(channel, postedOn);
        return;
      }
      await insertPost(channel, postedOn, "mark_posted");
    },
    [insertPost, removePost, rows]
  );

  const logExtraPost = useCallback(
    async (channel: string) => {
      await insertPost(channel, localISODate(), "log_extra_post");
    },
    [insertPost]
  );

  return {
    rows,
    pendingKeys,
    weekDates,
    isPosted: (channel: string, postedOn: string) => isPosted(rows, channel, postedOn),
    togglePosted,
    logExtraPost,
  };
}
