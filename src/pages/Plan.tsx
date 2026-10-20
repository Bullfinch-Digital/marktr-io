import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ChevronDown, ChevronUp, ListChecks, Plus } from "lucide-react";
import DashboardShell from "../layouts/DashboardShell";
import { Button } from "../components/ui/button";
import { CreatePlanModal } from "../components/plan/CreatePlanModal";
import { formatPlanStartDate } from "../components/plan/planDisplay";
import { useAuth } from "../contexts/AuthContext";
import { useBrand } from "../contexts/BrandContext";
import { useBrandStrategies } from "../hooks/useBrandStrategies";
import { supabase } from "../config/supabase";
import { listPlanDayCounts, listPlans, type Plan, type PlanDayCounts } from "../lib/plans";

export default function PlanPage() {
  return (
    <DashboardShell requirePro contentClassName="flex-1 px-6 py-8 lg:px-12">
      <PlanPageBody />
    </DashboardShell>
  );
}

function PlanPageBody() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const { activeBrandId } = useBrand();
  const { strategies, isLoading: strategiesLoading } = useBrandStrategies(activeBrandId || "");
  const [plans, setPlans] = useState<Plan[]>([]);
  const [counts, setCounts] = useState<Record<string, PlanDayCounts>>({});
  const [strategyTitles, setStrategyTitles] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [archivedOpen, setArchivedOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [createStrategyId, setCreateStrategyId] = useState<string | undefined>();

  const strategyIds = useMemo(() => new Set(strategies.map((row) => row.id)), [strategies]);
  const scopedPlans = useMemo(
    () => (activeBrandId ? plans.filter((plan) => strategyIds.has(plan.strategy_id)) : plans),
    [activeBrandId, plans, strategyIds]
  );
  const activePlans = scopedPlans.filter((plan) => plan.status === "active");
  const archivedPlans = scopedPlans.filter((plan) => plan.status === "archived");
  const strategyOptions = strategies.map((row) => ({ id: row.id, title: row.title }));

  useEffect(() => {
    if (searchParams.get("create") !== "1") return;
    const strategy = searchParams.get("strategy");
    setCreateStrategyId(strategy || undefined);
    setCreateOpen(true);
    const next = new URLSearchParams(searchParams);
    next.delete("create");
    next.delete("strategy");
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const rows = await listPlans(user.id);
        const progress = await listPlanDayCounts(
          user.id,
          rows.map((row) => row.id)
        );
        const ids = [...new Set(rows.map((row) => row.strategy_id))];
        const titles: Record<string, string> = {};
        if (ids.length > 0) {
          const { data, error: strategyError } = await supabase
            .from("strategies")
            .select("id, title")
            .eq("user_id", user.id)
            .in("id", ids);
          if (strategyError) throw strategyError;
          for (const row of (data ?? []) as Array<{ id: string; title: string }>) {
            titles[row.id] = row.title;
          }
        }
        if (cancelled) return;
        setPlans(rows);
        setCounts(Object.fromEntries(progress.map((item) => [item.planId, item])));
        setStrategyTitles(titles);
      } catch (err) {
        console.error("[Plan] load failed", err);
        if (!cancelled) setError("We couldn’t load your plans. Try again in a moment.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  return (
    <div className="mx-auto w-full max-w-[720px] space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-['Fraunces'] text-3xl text-foreground">Plan</h1>
          <p className="mt-1 font-['Plus_Jakarta_Sans'] text-sm text-foreground/65">
            One clear task a day, from the strategy you already wrote.
          </p>
        </div>
        {activePlans.length > 0 || archivedPlans.length > 0 ? (
          <Button type="button" onClick={() => setCreateOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Build my plan
          </Button>
        ) : null}
      </div>

      {error ? (
        <div className="rounded-[20px] border-2 border-brand-stroke bg-card p-5">
          <p className="font-['Plus_Jakarta_Sans'] text-sm text-foreground/80">{error}</p>
          <Button type="button" className="mt-3" onClick={() => window.location.reload()}>
            Try again
          </Button>
        </div>
      ) : null}

      {loading || strategiesLoading ? (
        <p className="font-['Plus_Jakarta_Sans'] text-sm text-foreground/60">Loading plans…</p>
      ) : activePlans.length === 0 && archivedPlans.length === 0 ? (
        <div className="rounded-[24px] border-2 border-dashed border-brand-stroke bg-card px-6 py-12 text-center">
          <ListChecks className="mx-auto mb-3 h-8 w-8 text-foreground/35" />
          <p className="mx-auto max-w-md font-['Plus_Jakarta_Sans'] text-sm text-foreground/75">
            Your day-by-day plan turns your strategy into one clear task a day.
          </p>
          <Button type="button" className="mt-5" onClick={() => setCreateOpen(true)}>
            Build my plan
          </Button>
        </div>
      ) : (
        <>
          <ul className="space-y-3">
            {activePlans.map((plan) => (
              <PlanListCard
                key={plan.id}
                plan={plan}
                strategyTitle={strategyTitles[plan.strategy_id]}
                progress={counts[plan.id]}
              />
            ))}
          </ul>

          {archivedPlans.length > 0 ? (
            <div>
              <button
                type="button"
                className="inline-flex min-h-11 items-center gap-2 font-['Plus_Jakarta_Sans'] text-sm text-foreground/70"
                onClick={() => setArchivedOpen((open) => !open)}
                aria-expanded={archivedOpen}
              >
                Archived ({archivedPlans.length})
                {archivedOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </button>
              {archivedOpen ? (
                <ul className="mt-3 space-y-3">
                  {archivedPlans.map((plan) => (
                    <PlanListCard
                      key={plan.id}
                      plan={plan}
                      strategyTitle={strategyTitles[plan.strategy_id]}
                      progress={counts[plan.id]}
                    />
                  ))}
                </ul>
              ) : null}
            </div>
          ) : null}
        </>
      )}

      <CreatePlanModal
        isOpen={createOpen}
        userId={user?.id ?? ""}
        strategies={strategyOptions}
        defaultStrategyId={createStrategyId || strategyOptions[0]?.id}
        onClose={() => setCreateOpen(false)}
        onCreated={(plan) => {
          setCreateOpen(false);
          navigate(`/plan/${plan.id}`);
        }}
      />
    </div>
  );
}

function PlanListCard({
  plan,
  strategyTitle,
  progress,
}: {
  plan: Plan;
  strategyTitle?: string;
  progress?: PlanDayCounts;
}) {
  const done = progress?.done ?? 0;
  const total = progress?.total ?? plan.length_days;
  const percent = total > 0 ? Math.round((done / total) * 100) : 0;

  return (
    <li>
      <Link
        to={`/plan/${plan.id}`}
        className="app-card block p-5 transition-transform hover:-translate-y-px"
      >
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <h2 className="font-['Fraunces'] text-xl text-foreground">{plan.title}</h2>
            <p className="mt-1 font-['Plus_Jakarta_Sans'] text-xs text-foreground/60">
              {plan.length_days} days · starts {formatPlanStartDate(plan.start_date)}
              {strategyTitle ? ` · ${strategyTitle}` : ""}
            </p>
          </div>
          {plan.status === "archived" ? (
            <span className="rounded-full border-2 border-brand-stroke px-2.5 py-0.5 font-['Plus_Jakarta_Sans'] text-[11px] text-foreground/60">
              Archived
            </span>
          ) : null}
        </div>
        <div className="mt-4">
          <div className="mb-1 flex items-center justify-between font-['Plus_Jakarta_Sans'] text-xs text-foreground/65">
            <span>
              {done} of {total} days done
            </span>
            <span>{percent}%</span>
          </div>
          <div className="app-progress-track">
            <div className="app-progress-fill" style={{ width: `${percent}%` }} />
          </div>
        </div>
      </Link>
    </li>
  );
}
