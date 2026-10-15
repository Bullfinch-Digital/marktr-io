import { useEffect, useMemo, useState } from "react";
import { supabase } from "../config/supabase";
import { lastNLocalWeekRanges } from "../lib/localCalendar";
import {
  WEEKLY_PROGRESS_LOOKBACK_WEEKS,
  computeWeeklyProgress,
  type PostLogLike,
} from "../lib/weeklyProgress";
import type { StrategyChannel } from "../types/icpStrategyPayload";

export function useWeeklyProgress(
  userId: string | undefined,
  strategyId: string | undefined,
  channels: StrategyChannel[] | undefined
) {
  const [rows, setRows] = useState<PostLogLike[]>([]);
  const [loaded, setLoaded] = useState(false);
  const weeks = lastNLocalWeekRanges(WEEKLY_PROGRESS_LOOKBACK_WEEKS);
  const rangeStart = weeks[0]?.start;
  const rangeEnd = weeks[weeks.length - 1]?.end;

  useEffect(() => {
    if (!userId || !strategyId || !rangeStart || !rangeEnd) {
      setRows([]);
      setLoaded(false);
      return;
    }
    let cancelled = false;
    const load = async () => {
      const { data, error } = await supabase
        .from("post_log")
        .select("channel, posted_on")
        .eq("user_id", userId)
        .eq("strategy_id", strategyId)
        .gte("posted_on", rangeStart)
        .lte("posted_on", rangeEnd)
        .order("posted_on", { ascending: true });
      if (cancelled) return;
      if (error) {
        console.error("[useWeeklyProgress] load failed", error);
        setRows([]);
        setLoaded(true);
        return;
      }
      setRows((data as PostLogLike[]) ?? []);
      setLoaded(true);
    };
    setLoaded(false);
    void load();
    const onChanged = () => {
      void load();
    };
    window.addEventListener("post_log:changed", onChanged);
    return () => {
      cancelled = true;
      window.removeEventListener("post_log:changed", onChanged);
    };
  }, [userId, strategyId, rangeStart, rangeEnd]);

  const snapshot = useMemo(
    () => computeWeeklyProgress(channels, rows),
    [channels, rows]
  );

  return { loaded, snapshot };
}
