import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, MoreVertical } from "lucide-react";
import { toast } from "sonner";
import DashboardShell from "../layouts/DashboardShell";
import { Button } from "../components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../components/ui/dropdown-menu";
import { PlanArchiveModal } from "../components/plan/PlanArchiveModal";
import { PlanDayToggle } from "../components/plan/PlanDayToggle";
import { formatPlanDate, formatPlanStartDate, PLAN_KIND_META } from "../components/plan/planDisplay";
import { useAuth } from "../contexts/AuthContext";
import { track } from "../lib/analytics";
import { localISODate } from "../lib/localCalendar";
import {
  archivePlan,
  getPlanFocus,
  getPlanWithDays,
  getTodayDayNumber,
  groupPlanDaysByWeek,
  planDayISODate,
  setDayStatus,
  type PlanDay,
  type PlanWithDays,
} from "../lib/plans";
import { supabase } from "../config/supabase";

export default function PlanDetailPage() {
  return (
    <DashboardShell requirePro contentClassName="flex-1 px-6 py-8 lg:px-12">
      <PlanDetailBody />
    </DashboardShell>
  );
}

function PlanDetailBody() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [plan, setPlan] = useState<PlanWithDays | null>(null);
  const [strategyTitle, setStrategyTitle] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [archiving, setArchiving] = useState(false);

  const load = useCallback(async () => {
    if (!user?.id || !id) return;
    setLoading(true);
    setError(null);
    try {
      const detail = await getPlanWithDays(id, user.id);
      if (!detail) {
        setPlan(null);
        setError("Plan not found.");
        return;
      }
      setPlan(detail);
      const { data } = await supabase
        .from("strategies")
        .select("id, title")
        .eq("id", detail.strategy_id)
        .eq("user_id", user.id)
        .maybeSingle();
      setStrategyTitle((data as { title?: string } | null)?.title ?? null);
    } catch (err) {
      console.error("[PlanDetail] load failed", err);
      setError("We couldn’t load this plan. Try again in a moment.");
      setPlan(null);
    } finally {
      setLoading(false);
    }
  }, [id, user?.id]);

  useEffect(() => {
    void load();
  }, [load]);

  const todayIso = localISODate();
  const focus = useMemo(
    () => (plan ? getPlanFocus(plan.start_date, plan.length_days, plan.days) : null),
    [plan]
  );
  const todayDayNumber = plan ? getTodayDayNumber(plan.start_date, plan.length_days).dayNumber : 0;
  const doneCount = plan?.days.filter((day) => day.status === "done").length ?? 0;
  const totalCount = plan?.days.length ?? 0;
  const percent = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;
  const weeks = plan ? groupPlanDaysByWeek(plan.days) : [];

  const toggleDay = async (day: PlanDay, done: boolean) => {
    if (!plan) return;
    const previous = day.status;
    setPlan({
      ...plan,
      days: plan.days.map((item) =>
        item.id === day.id ? { ...item, status: done ? "done" : "todo" } : item
      ),
    });
    try {
      const updated = await setDayStatus(day.id, done);
      setPlan((current) =>
        current
          ? { ...current, days: current.days.map((item) => (item.id === updated.id ? updated : item)) }
          : current
      );
      if (done) track("plan_day_done", { location: "plan_page" });
    } catch (err) {
      console.error("[PlanDetail] setDayStatus failed", err);
      setPlan((current) =>
        current
          ? {
              ...current,
              days: current.days.map((item) =>
                item.id === day.id ? { ...item, status: previous } : item
              ),
            }
          : current
      );
      toast.error("Couldn’t save that tick. Try again.");
    }
  };

  const confirmArchive = async () => {
    if (!plan) return;
    setArchiving(true);
    try {
      await archivePlan(plan.id);
      setArchiveOpen(false);
      navigate("/plan");
    } catch (err) {
      console.error("[PlanDetail] archive failed", err);
      toast.error("Couldn’t archive this plan. Try again.");
    } finally {
      setArchiving(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-[720px] space-y-6">
      <Link
        to="/plan"
        className="inline-flex min-h-11 items-center gap-2 font-['Plus_Jakarta_Sans'] text-sm text-foreground/70 hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Plan
      </Link>

      {loading ? (
        <p className="font-['Plus_Jakarta_Sans'] text-sm text-foreground/60">Loading plan…</p>
      ) : error || !plan ? (
        <div className="rounded-[20px] border-2 border-brand-stroke bg-card p-5">
          <p className="font-['Plus_Jakarta_Sans'] text-sm text-foreground/80">
            {error || "Plan not found."}
          </p>
          <Button type="button" className="mt-3" onClick={() => void load()}>
            Try again
          </Button>
        </div>
      ) : (
        <>
          <header className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <h1 className="font-['Fraunces'] text-3xl text-foreground">{plan.title}</h1>
              <p className="mt-2 font-['Plus_Jakarta_Sans'] text-sm text-foreground/65">
                <Link to={`/strategy/${plan.strategy_id}`} className="underline-offset-2 hover:underline">
                  {strategyTitle || "Open strategy"}
                </Link>
                {" · "}
                {plan.length_days} days · starts {formatPlanStartDate(plan.start_date)}
              </p>
            </div>
            {plan.status === "active" ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className="inline-flex h-11 w-11 items-center justify-center rounded-full border-2 border-brand-stroke bg-card"
                    aria-label="Plan actions"
                  >
                    <MoreVertical className="h-4 w-4" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onSelect={() => setArchiveOpen(true)}>
                    Archive plan
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <span className="rounded-full border-2 border-brand-stroke px-2.5 py-1 font-['Plus_Jakarta_Sans'] text-[11px] text-foreground/60">
                Archived
              </span>
            )}
          </header>

          <div>
            <p className="mb-2 font-['Plus_Jakarta_Sans'] text-sm text-foreground/70">
              {doneCount} of {totalCount} days done
            </p>
            <div className="app-progress-track" aria-hidden>
              <div className="app-progress-fill" style={{ width: `${percent}%` }} />
            </div>
          </div>

          <FocusCard focus={focus} onOpen={(n) => navigate(`/plan/${plan.id}/day/${n}`)} />

          <div className="space-y-6">
            {weeks.map((group) => (
              <section key={group.week}>
                <h2 className="mb-3 font-['Fraunces'] text-xl text-foreground">Week {group.week}</h2>
                <ul className="space-y-2">
                  {group.days.map((day) => {
                    const date = planDayISODate(plan.start_date, day.day_number);
                    const isToday = date === todayIso && day.day_number === todayDayNumber;
                    const isPastUndone = date < todayIso && day.status !== "done";
                    const KindIcon = PLAN_KIND_META[day.kind].icon;
                    return (
                      <li key={day.id}>
                        <div
                          className={`flex items-stretch overflow-hidden rounded-[20px] border-2 border-brand-stroke ${
                            day.status === "done"
                              ? "bg-emerald-50 dark:bg-emerald-950/30"
                              : isToday
                                ? "bg-brand-lime/70 text-brand-navy dark:text-foreground"
                                : isPastUndone
                                  ? "bg-card text-foreground/60"
                                  : "bg-card"
                          }`}
                        >
                          <Link
                            to={`/plan/${plan.id}/day/${day.day_number}`}
                            className="flex min-h-11 min-w-0 flex-1 items-center gap-3 px-3 py-2"
                          >
                            <div className="w-14 shrink-0">
                              <p className="font-['Plus_Jakarta_Sans'] text-[11px] font-semibold">
                                Day {day.day_number}
                              </p>
                              <p className="font-['Plus_Jakarta_Sans'] text-[11px] opacity-70">
                                {formatPlanDate(date)}
                              </p>
                            </div>
                            <KindIcon className="h-4 w-4 shrink-0" aria-hidden />
                            <div className="min-w-0 flex-1">
                              <p className="truncate font-['Plus_Jakarta_Sans'] text-sm font-medium">
                                {day.title}
                              </p>
                              <div className="mt-1 flex flex-wrap items-center gap-1.5">
                                {day.channel ? (
                                  <span className="rounded-full border border-brand-stroke px-2 py-0.5 font-['Plus_Jakarta_Sans'] text-[10px]">
                                    {day.channel}
                                  </span>
                                ) : null}
                                {day.format ? (
                                  <span className="rounded-full border border-brand-stroke px-2 py-0.5 font-['Plus_Jakarta_Sans'] text-[10px]">
                                    {day.format}
                                  </span>
                                ) : null}
                                {typeof day.minutes === "number" ? (
                                  <span className="font-['Plus_Jakarta_Sans'] text-[10px] opacity-70">
                                    {day.minutes} min
                                  </span>
                                ) : null}
                                {isPastUndone ? (
                                  <span className="font-['Plus_Jakarta_Sans'] text-[10px] opacity-70">
                                    Catch up when you can
                                  </span>
                                ) : null}
                              </div>
                            </div>
                          </Link>
                          <PlanDayToggle
                            checked={day.status === "done"}
                            label={`Mark day ${day.day_number} done`}
                            onToggle={(done) => void toggleDay(day, done)}
                          />
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))}
          </div>
        </>
      )}

      <PlanArchiveModal
        isOpen={archiveOpen}
        isArchiving={archiving}
        onClose={() => setArchiveOpen(false)}
        onConfirm={() => void confirmArchive()}
      />
    </div>
  );
}

function FocusCard({
  focus,
  onOpen,
}: {
  focus: ReturnType<typeof getPlanFocus> | null;
  onOpen: (dayNumber: number) => void;
}) {
  if (!focus) return null;
  if (focus.kind === "complete") {
    return (
      <article className="rounded-[24px] border-2 border-brand-stroke bg-card p-5">
        <p className="font-['Plus_Jakarta_Sans'] text-xs font-semibold uppercase tracking-wide text-foreground/55">
          Plan complete
        </p>
        <p className="mt-2 font-['Fraunces'] text-2xl text-foreground">That’s the lot.</p>
        <p className="mt-1 font-['Plus_Jakarta_Sans'] text-sm text-foreground/70">
          Every day is done. Come back whenever you want another stretch.
        </p>
      </article>
    );
  }

  const label = focus.kind === "today" ? "Today" : "Next up";
  return (
    <article className="overflow-hidden rounded-[24px] border-2 border-brand-stroke bg-brand-lime/60 p-5 text-brand-navy dark:text-foreground">
      <p className="font-['Plus_Jakarta_Sans'] text-xs font-semibold uppercase tracking-wide">
        {label}
      </p>
      <h2 className="mt-2 font-['Fraunces'] text-2xl">{focus.day.title}</h2>
      <p className="mt-2 font-['Plus_Jakarta_Sans'] text-sm opacity-80">{focus.day.task}</p>
      <Button
        type="button"
        className="mt-4"
        data-track-id="plan_open_day"
        data-track-location="plan_page"
        onClick={() => onOpen(focus.day.day_number)}
      >
        Open day
      </Button>
    </article>
  );
}
