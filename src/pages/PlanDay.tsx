import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import DashboardShell from "../layouts/DashboardShell";
import { Button } from "../components/ui/button";
import { Textarea } from "../components/ui/textarea";
import { PlanDayToggle } from "../components/plan/PlanDayToggle";
import { formatPlanDate, PLAN_KIND_META } from "../components/plan/planDisplay";
import { useAuth } from "../contexts/AuthContext";
import { track } from "../lib/analytics";
import {
  getPlanWithDays,
  planDayISODate,
  setDayStatus,
  updateDayNotes,
  type PlanDay,
  type PlanWithDays,
} from "../lib/plans";

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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [results, setResults] = useState("");
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
        setError("Day not found.");
        return;
      }
      setPlan(detail);
      setDay(match);
      setNotes(match.notes);
      setResults(match.results);
      savedNotes.current = match.notes;
      savedResults.current = match.results;
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
      setSaved("saved");
      track("plan_notes_saved", { location: "plan_page" });
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
      if (done) track("plan_day_done", { location: "plan_page" });
    } catch (err) {
      console.error("[PlanDay] setDayStatus failed", err);
      setDay((current) => (current ? { ...current, status: previous } : current));
      toast.error("Couldn’t save that tick. Try again.");
    }
  };

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
          <header className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="font-['Plus_Jakarta_Sans'] text-xs text-foreground/55">
                Day {day.day_number} · {formatPlanDate(planDayISODate(plan.start_date, day.day_number))}
              </p>
              <h1 className="mt-1 font-['Fraunces'] text-3xl text-foreground">{day.title}</h1>
              {KindIcon ? (
                <p className="mt-2 inline-flex items-center gap-1.5 font-['Plus_Jakarta_Sans'] text-xs text-foreground/65">
                  <KindIcon className="h-3.5 w-3.5" />
                  {PLAN_KIND_META[day.kind].label}
                </p>
              ) : null}
            </div>
            <PlanDayToggle
              checked={day.status === "done"}
              label={`Mark day ${day.day_number} done`}
              onToggle={(done) => void toggleDone(done)}
            />
          </header>

          <section className="rounded-[24px] border-2 border-brand-stroke bg-card p-5">
            <p className="font-['Plus_Jakarta_Sans'] text-xs font-semibold uppercase tracking-wide text-foreground/55">
              Task
            </p>
            <p className="mt-2 font-['Plus_Jakarta_Sans'] text-sm text-foreground">{day.task}</p>
            {day.brief ? (
              <>
                <p className="mt-4 font-['Plus_Jakarta_Sans'] text-xs font-semibold uppercase tracking-wide text-foreground/55">
                  Brief
                </p>
                <p className="mt-2 font-['Plus_Jakarta_Sans'] text-sm text-foreground/80">{day.brief}</p>
              </>
            ) : null}
            {day.why ? (
              <>
                <p className="mt-4 font-['Plus_Jakarta_Sans'] text-xs font-semibold uppercase tracking-wide text-foreground/55">
                  Why
                </p>
                <p className="mt-2 font-['Plus_Jakarta_Sans'] text-sm text-foreground/80">{day.why}</p>
              </>
            ) : null}
          </section>

          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-['Fraunces'] text-xl text-foreground">Notes</h2>
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
