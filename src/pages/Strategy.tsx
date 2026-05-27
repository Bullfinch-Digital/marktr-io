import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { CheckCircle2, Loader2, Target } from "lucide-react";
import DashboardShell from "../layouts/DashboardShell";
import { Button } from "../components/ui/button";
import { usePaywall } from "../contexts/PaywallContext";
import { useICPs } from "../hooks/useICPs";
import { useBrands } from "../hooks/useBrands";
import useSubscription from "../hooks/useSubscription";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../config/supabase";

const PLATFORMS = [
  "Instagram",
  "Facebook",
  "LinkedIn",
  "TikTok",
  "X",
  "YouTube",
  "Email",
  "Pinterest",
] as const;

const GOALS = [
  "Grow audience",
  "Drive leads",
  "Increase sales",
  "Build community",
] as const;

const STRATEGY_LOADING_ITEMS = [
  "Reading your ICP profile",
  "Analysing your platform",
  "Mapping content opportunities",
  "Building your monthly themes",
  "Writing your strategy...",
] as const;

type StrategyTheme = {
  name: string;
  description: string;
  weeklyFocus: string;
};

type StrategyFormat = {
  type: string;
  percentage: number;
  rationale: string;
};

type StrategyOutput = {
  themes: StrategyTheme[];
  postFormats: StrategyFormat[];
  postingFrequency: string;
  hooks: string[];
  openingMonth: string;
};

type ContentStrategyRow = {
  id: string;
  user_id: string;
  brand_id: string | null;
  icp_id: string | null;
  platform: string;
  icp_name: string | null;
  brand_name: string | null;
  themes: StrategyTheme[] | null;
  post_formats: StrategyFormat[] | null;
  posting_frequency: string | null;
  hooks: string[] | null;
  raw_output: string | null;
  status: string | null;
  created_at: string;
  updated_at: string;
};

type StrategyView = {
  id?: string;
  icpId: string | null;
  icpName: string;
  brandId: string | null;
  brandName: string;
  platform: string;
  primaryGoal: string;
  output: StrategyOutput;
  createdAt?: string;
};

function fmtDate(input?: string) {
  if (!input) return "";
  const d = new Date(input);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function parseRowToView(row: ContentStrategyRow): StrategyView | null {
  let output: StrategyOutput | null = null;

  if (row.raw_output) {
    try {
      const parsed = JSON.parse(row.raw_output) as StrategyOutput;
      if (
        Array.isArray(parsed?.themes) &&
        Array.isArray(parsed?.postFormats) &&
        typeof parsed?.postingFrequency === "string" &&
        Array.isArray(parsed?.hooks) &&
        typeof parsed?.openingMonth === "string"
      ) {
        output = parsed;
      }
    } catch {
      // fall back to columns
    }
  }

  if (!output) {
    const themes = row.themes ?? [];
    const postFormats = row.post_formats ?? [];
    const hooks = row.hooks ?? [];
    const postingFrequency = row.posting_frequency ?? "";
    if (
      Array.isArray(themes) &&
      Array.isArray(postFormats) &&
      Array.isArray(hooks) &&
      postingFrequency
    ) {
      output = {
        themes,
        postFormats,
        hooks,
        postingFrequency,
        openingMonth:
          "A focused month of content tailored to your audience and platform.",
      };
    }
  }

  if (!output) return null;

  return {
    id: row.id,
    icpId: row.icp_id,
    icpName: row.icp_name ?? "Untitled ICP",
    brandId: row.brand_id,
    brandName: row.brand_name ?? "Untitled Brand",
    platform: row.platform,
    primaryGoal: "Grow audience",
    output,
    createdAt: row.created_at,
  };
}

export default function Strategy() {
  const { user } = useAuth();
  const { openPaywall } = usePaywall();
  const { icps, isLoading: icpsLoading } = useICPs();
  const { brands } = useBrands();
  const { tier: userTier, trialActive } = useSubscription();

  const [selectedIcpId, setSelectedIcpId] = useState("");
  const [selectedPlatform, setSelectedPlatform] = useState("");
  const [selectedGoal, setSelectedGoal] = useState("Grow audience");

  const [completedCount, setCompletedCount] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);

  const [savedStrategies, setSavedStrategies] = useState<StrategyView[]>([]);
  const [loadingLibrary, setLoadingLibrary] = useState(true);
  const [libraryError, setLibraryError] = useState<string | null>(null);

  const [currentStrategy, setCurrentStrategy] = useState<StrategyView | null>(
    null
  );
  const [showNewStrategy, setShowNewStrategy] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const locked = userTier === "free" && !trialActive;

  const selectedIcp = useMemo(
    () => (icps || []).find((i) => i.id === selectedIcpId) || null,
    [icps, selectedIcpId]
  );

  const selectedBrand = useMemo(() => {
    if (!selectedIcp?.brand_id) return brands?.[0] ?? null;
    return (
      (brands || []).find((b) => b.id === selectedIcp.brand_id) ||
      brands?.[0] ||
      null
    );
  }, [brands, selectedIcp]);

  const canGenerate = Boolean(selectedIcp && selectedPlatform);

  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;

    const run = async () => {
      setLoadingLibrary(true);
      setLibraryError(null);
      try {
        const { data, error: fetchError } = await supabase
          .from("content_strategies")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false });

        if (fetchError) throw fetchError;

        const rows = ((data as ContentStrategyRow[]) || [])
          .map(parseRowToView)
          .filter(Boolean) as StrategyView[];

        if (!cancelled) {
          setSavedStrategies(rows);
          if (rows.length > 0) {
            setCurrentStrategy(rows[0]);
            setShowNewStrategy(false);
          }
        }
      } catch (e) {
        if (!cancelled) {
          setLibraryError(
            e instanceof Error ? e.message : "Failed to load saved strategies."
          );
        }
      } finally {
        if (!cancelled) setLoadingLibrary(false);
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const startNew = () => {
    setShowNewStrategy(true);
    setCurrentStrategy(null);
    setError(null);
    setCompletedCount(0);
  };

  const viewSaved = (strategy: StrategyView) => {
    setCurrentStrategy(strategy);
    setShowNewStrategy(false);
    setError(null);
  };

  const generate = async () => {
    if (!user?.id || !selectedIcp || !selectedPlatform) return;

    setError(null);
    setIsGenerating(true);
    setCompletedCount(0);

    const timers: number[] = [];
    const checklistPromise = new Promise<void>((resolve) => {
      for (let i = 1; i <= STRATEGY_LOADING_ITEMS.length; i += 1) {
        timers.push(
          window.setTimeout(() => {
            setCompletedCount(i);
          }, i * 300)
        );
      }
      timers.push(
        window.setTimeout(() => {
          resolve();
        }, STRATEGY_LOADING_ITEMS.length * 300 + 500)
      );
    });

    const strategyPromise = (async () => {
      const payload = {
        icpName: selectedIcp.name || "Untitled ICP",
        icpSummary: selectedIcp.description || "No ICP summary provided.",
        brandName: selectedBrand?.name || "Untitled Brand",
        brandDescription:
          selectedBrand?.business_description ||
          selectedBrand?.product_or_service ||
          "No brand description provided.",
        platform: selectedPlatform,
        primaryGoal: selectedGoal,
      };

      const { data, error: invokeError } = await supabase.functions.invoke(
        "generate-content-strategy",
        { body: payload }
      );

      if (invokeError) throw invokeError;
      if (
        !data?.themes ||
        !data?.postFormats ||
        !data?.postingFrequency ||
        !data?.hooks ||
        !data?.openingMonth
      ) {
        throw new Error("Strategy response was incomplete.");
      }

      const output = data as StrategyOutput;

      const rowToInsert = {
        user_id: user.id,
        brand_id: selectedBrand?.id ?? null,
        icp_id: selectedIcp.id,
        platform: selectedPlatform,
        icp_name: selectedIcp.name ?? null,
        brand_name: selectedBrand?.name ?? null,
        themes: output.themes,
        post_formats: output.postFormats,
        posting_frequency: output.postingFrequency,
        hooks: output.hooks,
        raw_output: JSON.stringify(output),
        status: "active",
      };

      const { data: inserted, error: insertError } = await supabase
        .from("content_strategies")
        .insert(rowToInsert)
        .select("*")
        .single();

      if (insertError) throw insertError;

      const insertedView = parseRowToView(inserted as ContentStrategyRow);
      if (!insertedView) {
        throw new Error("Saved strategy could not be parsed.");
      }

      return insertedView;
    })();

    try {
      const [saved] = await Promise.all([strategyPromise, checklistPromise]);

      setCurrentStrategy(saved);
      setSavedStrategies((prev) => [
        saved,
        ...prev.filter((x) => x.id !== saved.id),
      ]);
      setShowNewStrategy(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to generate strategy.");
    } finally {
      timers.forEach((t) => window.clearTimeout(t));
      setIsGenerating(false);
    }
  };

  const renderLocked = () => (
    <div className="mx-auto max-w-2xl py-20 text-center">
      <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#FDF0CC]">
        <Target className="h-8 w-8 text-[#0D1833]" />
      </div>
      <h1 className="mb-4 font-['Fraunces'] text-4xl font-bold text-[#0D1833]">
        Content Strategy
      </h1>
      <p className="mx-auto mb-8 max-w-lg font-['DM_Sans'] text-lg text-muted-foreground">
        Generate a tailored 30-day content strategy for each of your ICPs — per
        platform, per goal. Start your free trial to unlock.
      </p>
      <Button
        onClick={() => openPaywall()}
        className="rounded-full bg-primary px-8 py-4 font-['DM_Sans'] text-base font-medium text-primary-foreground hover:opacity-90"
      >
        Start free trial — 14 days
      </Button>
      <p className="mt-4 font-['DM_Sans'] text-sm text-muted-foreground">
        No credit card required
      </p>
    </div>
  );

  const renderLoading = () => (
    <section className="mx-auto flex min-h-screen w-full max-w-3xl flex-col justify-center px-6 py-12">
      <div className="rounded-3xl border border-border bg-white p-8 shadow-sm sm:p-12">
        <h1 className="font-['Fraunces'] text-3xl font-bold leading-tight text-[#0D1833] sm:text-4xl">
          marktr is building your strategy...
        </h1>
        <div className="mt-8 space-y-4">
          {STRATEGY_LOADING_ITEMS.map((item, index) => {
            const done = index < completedCount;
            const active =
              index === completedCount &&
              completedCount < STRATEGY_LOADING_ITEMS.length;
            return (
              <div key={item} className="flex items-center gap-3">
                {done ? (
                  <CheckCircle2 className="h-5 w-5 text-[#E8650A]" />
                ) : active ? (
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                ) : (
                  <Loader2 className="h-5 w-5 text-muted-foreground/40" />
                )}
                <p
                  className={`font-['DM_Sans'] text-sm ${
                    done
                      ? "text-foreground"
                      : active
                      ? "text-muted-foreground"
                      : "text-muted-foreground/60"
                  }`}
                >
                  {item}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );

  const renderLibrary = () => (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="font-['Fraunces'] text-2xl font-bold text-[#0D1833]">
          Strategy library
        </h2>
      </div>

      {loadingLibrary ? (
        <p className="font-['DM_Sans'] text-sm text-muted-foreground">
          Loading saved strategies...
        </p>
      ) : savedStrategies.length === 0 ? (
        <p className="font-['DM_Sans'] text-sm text-muted-foreground">
          No saved strategies yet.
        </p>
      ) : (
        <div className="grid gap-3">
          {savedStrategies.map((s) => (
            <div
              key={s.id ?? `${s.platform}-${s.icpName}-${s.createdAt}`}
              className="flex items-center justify-between rounded-xl border border-border bg-white p-4"
            >
              <div className="min-w-0">
                <div className="mb-1 flex items-center gap-2">
                  <span className="rounded-full border border-primary/40 px-2.5 py-1 font-['DM_Sans'] text-[11px] font-medium text-primary">
                    {s.platform}
                  </span>
                </div>
                <p className="font-['Fraunces'] text-lg text-[#0D1833]">
                  {s.icpName}
                </p>
                <p className="font-['DM_Sans'] text-xs text-muted-foreground">
                  {fmtDate(s.createdAt)}
                </p>
              </div>
              <Button
                variant="outline"
                className="rounded-full border-black font-['DM_Sans'] text-sm"
                onClick={() => viewSaved(s)}
              >
                View →
              </Button>
            </div>
          ))}
        </div>
      )}

      {libraryError && (
        <p className="font-['DM_Sans'] text-sm text-destructive">{libraryError}</p>
      )}
    </section>
  );

  const renderSetup = () => (
    <section className="mx-auto max-w-3xl space-y-8">
      <div>
        <h1 className="font-['Fraunces'] text-4xl font-bold text-[#0D1833]">
          Generate a content strategy
        </h1>
        <p className="mt-2 font-['DM_Sans'] text-muted-foreground">
          Choose an ICP and a platform. marktr will build a 30-day strategy
          tailored to them.
        </p>
      </div>

      <div className="space-y-3">
        <p className="font-['DM_Sans'] text-sm text-[#0D1833]">
          Who are you creating content for?
        </p>

        {(icps || []).length === 0 && !icpsLoading ? (
          <div className="rounded-xl border border-border bg-white p-4">
            <p className="font-['DM_Sans'] text-sm text-muted-foreground">
              You need at least one ICP first.
            </p>
            <Link
              to="/onboarding-build"
              className="mt-2 inline-block font-['DM_Sans'] text-xs text-primary underline"
            >
              Generate ICPs first →
            </Link>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {(icps || []).map((icp) => {
              const selected = selectedIcpId === icp.id;
              return (
                <button
                  type="button"
                  key={icp.id}
                  onClick={() => setSelectedIcpId(icp.id)}
                  className={`rounded-xl border p-4 text-left transition-colors ${
                    selected
                      ? "border-primary bg-primary/5"
                      : "border-border bg-white hover:border-primary/40"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <span
                      className="mt-0.5 inline-block h-8 w-8 rounded-full border border-black/20"
                      style={{ backgroundColor: icp.color || "#EDEDED" }}
                    />
                    <div className="min-w-0">
                      <p className="font-['Fraunces'] text-lg text-[#0D1833]">
                        {icp.name || "Untitled ICP"}
                      </p>
                      <p className="line-clamp-2 font-['DM_Sans'] text-xs text-muted-foreground">
                        {icp.description || "No summary available."}
                      </p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div className="space-y-3">
        <p className="font-['DM_Sans'] text-sm text-[#0D1833]">Which platform?</p>
        <div className="flex flex-wrap gap-2">
          {PLATFORMS.map((platform) => {
            const selected = selectedPlatform === platform;
            return (
              <button
                type="button"
                key={platform}
                onClick={() => setSelectedPlatform(platform)}
                className={`rounded-full border px-4 py-2 font-['DM_Sans'] text-sm transition-colors ${
                  selected
                    ? "border-primary bg-primary text-white"
                    : "border-border bg-white text-foreground hover:border-primary/40"
                }`}
              >
                {platform}
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-3">
        <p className="font-['DM_Sans'] text-sm text-[#0D1833]">
          What&apos;s the main goal?
        </p>
        <div className="flex flex-wrap gap-2">
          {GOALS.map((goal) => {
            const selected = selectedGoal === goal;
            return (
              <button
                type="button"
                key={goal}
                onClick={() => setSelectedGoal(goal)}
                className={`rounded-full border px-4 py-2 font-['DM_Sans'] text-sm transition-colors ${
                  selected
                    ? "border-primary bg-primary text-white"
                    : "border-border bg-white text-foreground hover:border-primary/40"
                }`}
              >
                {goal}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <Button
          disabled={!canGenerate}
          onClick={generate}
          className="rounded-full bg-primary px-8 py-4 font-['DM_Sans'] text-base font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
        >
          Generate my strategy →
        </Button>
      </div>

      {error && <p className="font-['DM_Sans'] text-sm text-destructive">{error}</p>}
    </section>
  );

  const renderResults = (strategy: StrategyView) => (
    <section className="mx-auto max-w-3xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="rounded-full border border-primary/40 px-2.5 py-1 font-['DM_Sans'] text-[11px] font-medium text-primary">
            {strategy.platform}
          </span>
          <span className="font-['Fraunces'] text-lg text-muted-foreground">
            {strategy.icpName}
          </span>
        </div>
        <Button
          variant="outline"
          onClick={startNew}
          className="rounded-full border-black font-['DM_Sans'] text-sm"
        >
          Generate another →
        </Button>
      </div>

      <div className="rounded-2xl bg-[#0D1833] p-6 text-white">
        <p className="font-['DM_Sans'] text-[10px] uppercase tracking-widest text-white/60">
          YOUR STRATEGY
        </p>
        <p className="mt-2 font-['Fraunces'] text-lg leading-relaxed text-white">
          {strategy.output.openingMonth}
        </p>
        <span className="mt-4 inline-flex rounded-full bg-white/20 px-3 py-1 font-['DM_Sans'] text-xs text-white">
          {strategy.output.postingFrequency}
        </span>
      </div>

      <div className="rounded-2xl border border-border bg-white p-6">
        <h2 className="font-['Fraunces'] text-2xl font-bold text-[#0D1833]">
          Monthly themes
        </h2>
        <div className="mt-4 space-y-3">
          {strategy.output.themes.map((theme, idx) => (
            <div key={`${theme.name}-${idx}`} className="rounded-xl border border-border p-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-[#FDF0CC] px-2 py-0.5 font-['DM_Sans'] text-[10px] font-medium text-[#BA7517]">
                  Week {idx + 1}
                </span>
                <p className="font-['DM_Sans'] text-sm font-medium text-[#0D1833]">
                  {theme.name}
                </p>
              </div>
              <p className="mt-2 font-['DM_Sans'] text-xs text-muted-foreground">
                {theme.description}
              </p>
              <span className="mt-3 inline-flex rounded-full bg-primary/10 px-2 py-0.5 font-['DM_Sans'] text-[10px] text-primary">
                {theme.weeklyFocus}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-white p-6">
        <h2 className="font-['Fraunces'] text-2xl font-bold text-[#0D1833]">Content mix</h2>
        <div className="mt-4 space-y-4">
          {strategy.output.postFormats.map((format, idx) => {
            const pct = Math.max(0, Math.min(100, Number(format.percentage) || 0));
            return (
              <div key={`${format.type}-${idx}`}>
                <div className="mb-1 flex items-center justify-between">
                  <p className="font-['DM_Sans'] text-sm font-medium text-[#0D1833]">
                    {format.type}
                  </p>
                  <p className="font-['DM_Sans'] text-xs text-muted-foreground">{pct}%</p>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                  <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
                </div>
                <p className="mt-2 font-['DM_Sans'] text-xs text-muted-foreground">
                  {format.rationale}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      <div className="rounded-2xl bg-[#FDF0CC] p-6">
        <h2 className="font-['Fraunces'] text-2xl font-bold text-[#0D1833]">5 opening hooks</h2>
        <p className="mt-1 font-['DM_Sans'] text-sm text-muted-foreground">
          Use these to open your first posts
        </p>
        <ol className="mt-4 space-y-3">
          {strategy.output.hooks.map((hook, idx) => (
            <li key={`${idx}-${hook.slice(0, 20)}`} className="flex gap-3">
              <span className="font-['DM_Sans'] text-sm text-muted-foreground">{idx + 1}.</span>
              <p className="font-['Fraunces'] text-base italic text-[#0D1833]">{hook}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );

  return (
    <DashboardShell contentClassName="flex-1 px-6 py-8 lg:px-12">
      <div className="mx-auto max-w-5xl space-y-8 pb-10">
        {locked && renderLocked()}
        {!locked && (
          <>
            {renderLibrary()}
            {isGenerating
              ? renderLoading()
              : showNewStrategy || !currentStrategy
              ? renderSetup()
              : renderResults(currentStrategy)}
          </>
        )}
      </div>
    </DashboardShell>
  );
}

