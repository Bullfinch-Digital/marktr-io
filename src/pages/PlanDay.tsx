import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import DashboardShell from "../layouts/DashboardShell";
import { Button } from "../components/ui/button";
import { Textarea } from "../components/ui/textarea";
import { PlanDayContentGenerator } from "../components/plan/PlanDayContentGenerator";
import { PlanDayToggle } from "../components/plan/PlanDayToggle";
import { formatPlanDate, PLAN_KIND_META } from "../components/plan/planDisplay";
import { useAuth } from "../contexts/AuthContext";
import { track } from "../lib/analytics";
import { getPlanStrategyContext, type PlanStrategyContext } from "../lib/planStrategy";
import {
  buildPlanLearningContext,
  getPlanWithDays,
  listDayContentItems,
  mapPlanFormatToContentType,
  planDayISODate,
  setDayStatus,
  updateDayNotes,
  type PlanDay,
  type PlanWithDays,
} from "../lib/plans";
import type { ContentItemRow, ContentItemType } from "../types/contentItemPayload";

export default function PlanDayPage() {
  return (
    <DashboardShell requirePro contentClassName="flex-1 px-6 py-8 lg:px-12">
      <PlanDayBody />
    </DashboardShell>
  );
}

function PlanDayBody() {
  const { id, n } = useParams<{ id: string; n: string }>();
  const { user } = useAuth();
  const dayNumber = Number(n);
  const [plan, setPlan] = useState<PlanWithDays | null>(null);
  const [day, setDay] = useState<PlanDay | null>(null);
  const [strategy, setStrategy] = useState<PlanStrategyContext | null>(null);
  const [versions, setVersions] = useState<ContentItemRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [results, setResults] = useState("");
  const [brief, setBrief] = useState("");
  const [contentType, setContentType] = useState<ContentItemType>("ig_single");
  const [saved, setSaved] = useState<"idle" | "saving" | "saved">("idle");
  const notesRef = useRef(notes);
  const resultsRef = useRef(results);
  const savedNotes = useRef("");
  const savedResults = useRef("");

  useEffect(() => {
    notesRef.current = notes;
  }, [notes]);
  useEffect(() => {
    resultsRef.current = results;
  }, [results]);

  const load = useCallback(async () => {
    if (!user?.id || !id || !Number.isFinite(dayNumber)) return;
    setLoading(true);
    setError(null);
    try {
      const detail = await getPlanWithDays(id, user.id);
      const match = detail?.days.find((item) => item.day_number === dayNumber) ?? null;
      if (!detail || !match) {
        setPlan(detail);
        setDay(null);
        setStrategy(null);
        setVersions([]);
        setError("Day not found.");
        return;
      }
      setPlan(detail);
      setDay(match);
      setNotes(match.notes);
      setResults(match.results);
      setBrief(match.brief ?? "");
      setContentType(mapPlanFormatToContentType(match.channel, match.format));
      savedNotes.current = match.notes;
      savedResults.current = match.results;

      const [strategyContext, dayItems] = await Promise.all([
        getPlanStrategyContext(detail.strategy_id, user.id),
        listDayContentItems(match.id),
      ]);
      setStrategy(strategyContext);
      setVersions(dayItems);
    } catch (err) {
      console.error("[PlanDay] load failed", err);
      setError("We couldn’t load this day. Try again in a moment.");
    } finally {
      setLoading(false);
    }
  }, [dayNumber, id, user?.id]);

  useEffect(() => {
    void load();
  }, [load]);

  const persistNotes = useCallback(async () => {
    if (!day) return;
    const nextNotes = notesRef.current;
    const nextResults = resultsRef.current;
    if (nextNotes === savedNotes.current && nextResults === savedResults.current) return;
    setSaved("saving");
    try {
      const updated = await updateDayNotes(day.id, { notes: nextNotes, results: nextResults });
      savedNotes.current = updated.notes;
      savedResults.current = updated.results;
      setDay(updated);
      setPlan((current) =>
        current
          ? { ...current, days: current.days.map((item) => (item.id === updated.id ? updated : item)) }
          : current
      );
      setSaved("saved");
      track("plan_notes_saved", { location: "plan_day_page" });
      window.setTimeout(() => setSaved((state) => (state === "saved" ? "idle" : state)), 1600);
    } catch (err) {
      console.error("[PlanDay] updateDayNotes failed", err);
      setSaved("idle");
      toast.error("Couldn’t save your notes. Try again.");
    }
  }, [day]);

  useEffect(() => {
    if (!day) return;
    const timer = window.setTimeout(() => {
      void persistNotes();
    }, 700);
    return () => window.clearTimeout(timer);
  }, [day, notes, persistNotes, results]);

  const toggleDone = async (done: boolean) => {
    if (!day) return;
    const previous = day.status;
    setDay({ ...day, status: done ? "done" : "todo" });
    try {
      const updated = await setDayStatus(day.id, done);
      setDay(updated);
      if (done) track("plan_day_done", { location: "plan_day_page" });
    } catch (err) {
      console.error("[PlanDay] setDayStatus failed", err);
      setDay((current) => (current ? { ...current, status: previous } : current));
      toast.error("Couldn’t save that tick. Try again.");
    }
  };

  const learnedSoFar = useMemo(() => {
    if (!plan || !day) return "";
    const days = plan.days.map((item) =>
      item.id === day.id ? { ...item, notes, results } : item
    );
    return buildPlanLearningContext(days, day.day_number);
  }, [day, notes, plan, results]);

  const showWriter = Boolean(day && (day.kind === "post" || day.brief));
  const totalDays = plan?.length_days ?? plan?.days.length ?? 0;
  const prevNumber = day && day.day_number > 1 ? day.day_number - 1 : null;
  const nextNumber = day && day.day_number < totalDays ? day.day_number + 1 : null;
  const KindIcon = day ? PLAN_KIND_META[day.kind].icon : null;

  return (
    <div className="mx-auto w-full max-w-[720px] space-y-6">
      <Link
        to={id ? `/plan/${id}` : "/plan"}
        className="inline-flex min-h-11 items-center gap-2 font-['Plus_Jakarta_Sans'] text-sm text-foreground/70 hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to plan
      </Link>

      {loading ? (
        <p className="font-['Plus_Jakarta_Sans'] text-sm text-foreground/60">Loading day…</p>
      ) : error || !day || !plan ? (
        <div className="rounded-[20px] border-2 border-brand-stroke bg-card p-5">
          <p className="font-['Plus_Jakarta_Sans'] text-sm text-foreground/80">
            {error || "Day not found."}
          </p>
          <Button type="button" className="mt-3" onClick={() => void load()}>
            Try again
          </Button>
        </div>
      ) : (
        <>
          <header className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              {prevNumber ? (
                <Link
                  to={`/plan/${plan.id}/day/${prevNumber}`}
                  aria-label={`Previous day, day ${prevNumber}`}
                  className="inline-flex h-11 w-11 items-center justify-center rounded-full border-2 border-brand-stroke bg-card"
                >
                  <ChevronLeft className="h-5 w-5" />
                </Link>
              ) : (
                <span className="inline-flex h-11 w-11 items-center justify-center rounded-full border-2 border-brand-stroke/40 text-foreground/30">
                  <ChevronLeft className="h-5 w-5" />
                </span>
              )}
              <p className="text-center font-['Plus_Jakarta_Sans'] text-sm text-foreground/70">
                Day {day.day_number} of {totalDays}
                <span className="mt-0.5 block text-xs text-foreground/55">
                  {formatPlanDate(planDayISODate(plan.start_date, day.day_number))}
                </span>
              </p>
              {nextNumber ? (
                <Link
                  to={`/plan/${plan.id}/day/${nextNumber}`}
                  aria-label={`Next day, day ${nextNumber}`}
                  data-track-id="plan_day_next"
                  data-track-location="plan_day_page"
                  className="inline-flex h-11 w-11 items-center justify-center rounded-full border-2 border-brand-stroke bg-card"
                >
                  <ChevronRight className="h-5 w-5" />
                </Link>
              ) : (
                <span className="inline-flex h-11 w-11 items-center justify-center rounded-full border-2 border-brand-stroke/40 text-foreground/30">
                  <ChevronRight className="h-5 w-5" />
                </span>
              )}
            </div>

            <div>
              <h1 className="font-['Fraunces'] text-3xl text-foreground">{day.title}</h1>
              <div className="mt-3 flex flex-wrap items-center gap-1.5">
                {KindIcon ? (
                  <span className="inline-flex items-center gap-1 rounded-full border-2 border-brand-stroke bg-card px-2.5 py-0.5 font-['Plus_Jakarta_Sans'] text-[11px]">
                    <KindIcon className="h-3.5 w-3.5" />
                    {PLAN_KIND_META[day.kind].label}
                  </span>
                ) : null}
                {day.channel ? (
                  <span className="rounded-full border-2 border-brand-stroke px-2.5 py-0.5 font-['Plus_Jakarta_Sans'] text-[11px]">
                    {day.channel}
                  </span>
                ) : null}
                {day.format ? (
                  <span className="rounded-full border-2 border-brand-stroke px-2.5 py-0.5 font-['Plus_Jakarta_Sans'] text-[11px]">
                    {day.format}
                  </span>
                ) : null}
                {typeof day.minutes === "number" ? (
                  <span className="font-['Plus_Jakarta_Sans'] text-[11px] text-foreground/60">
                    {day.minutes} min
                  </span>
                ) : null}
              </div>
              {day.why ? (
                <p className="mt-3 font-['Plus_Jakarta_Sans'] text-sm text-foreground/75">{day.why}</p>
              ) : null}
            </div>
          </header>

          <section className="rounded-[24px] border-2 border-brand-stroke bg-card p-5 space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <h2 className="font-['Fraunces'] text-xl text-foreground">Your task</h2>
              <PlanDayToggle
                checked={day.status === "done"}
                label={`Mark day ${day.day_number} done`}
                size="lg"
                location="plan_day_page"
                onToggle={(done) => void toggleDone(done)}
              />
            </div>
            <p className="font-['Plus_Jakarta_Sans'] text-sm text-foreground">{day.task}</p>
          </section>

          {showWriter ? (
            strategy ? (
              <PlanDayContentGenerator
                planDayId={day.id}
                brandId={strategy.brandId}
                strategy={strategy}
                brief={brief}
                onBriefChange={setBrief}
                channel={day.channel}
                format={day.format}
                contentType={contentType}
                onContentTypeChange={setContentType}
                learnedSoFar={learnedSoFar}
                versions={versions}
                onVersionsChange={setVersions}
              />
            ) : (
              <div className="rounded-[20px] border-2 border-brand-stroke bg-card p-5">
                <p className="font-['Plus_Jakarta_Sans'] text-sm text-foreground/80">
                  We couldn’t load the strategy for this plan, so content generation is paused.
                </p>
                <Button type="button" className="mt-3" onClick={() => void load()}>
                  Try again
                </Button>
              </div>
            )
          ) : (
            <section className="rounded-[24px] border-2 border-dashed border-brand-stroke bg-card p-5">
              <h2 className="font-['Fraunces'] text-xl text-foreground">Your content for today</h2>
              <p className="mt-2 font-['Plus_Jakarta_Sans'] text-sm text-foreground/70">
                {day.kind === "rest"
                  ? "Nothing to write today. Take the day."
                  : day.kind === "review"
                    ? "Nothing to write today. Capture what you noticed in notes below."
                    : "Nothing to write today. Use notes below for what you prepared."}
              </p>
            </section>
          )}

          <section className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="font-['Fraunces'] text-xl text-foreground">Notes and results</h2>
                <p className="mt-1 font-['Plus_Jakarta_Sans'] text-xs text-foreground/55">
                  Your notes help marktr shape your next round.
                </p>
              </div>
              <p className="font-['Plus_Jakarta_Sans'] text-xs text-foreground/50" aria-live="polite">
                {saved === "saving" ? "Saving…" : saved === "saved" ? "Saved" : ""}
              </p>
            </div>
            <label className="block space-y-1.5">
              <span className="font-['Plus_Jakarta_Sans'] text-xs font-medium text-foreground/60">
                What I did
              </span>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                onBlur={() => void persistNotes()}
                rows={4}
              />
            </label>
            <label className="block space-y-1.5">
              <span className="font-['Plus_Jakarta_Sans'] text-xs font-medium text-foreground/60">
                What happened
              </span>
              <Textarea
                value={results}
                onChange={(e) => setResults(e.target.value)}
                onBlur={() => void persistNotes()}
                rows={4}
              />
            </label>
          </section>
        </>
      )}
    </div>
  );
}
