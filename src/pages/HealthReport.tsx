import { useCallback, useEffect, useRef, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { ChevronDown, ChevronUp, History, Loader2, RotateCcw } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { useBrand } from "../contexts/BrandContext";
import { supabase } from "../config/supabase";
import { isBrandScopeReady, resolveScopedBrandId } from "../lib/brandScopedReads";
import { parseScoreWebsiteResponse } from "../lib/healthCheck";
import { calculateScores } from "../lib/healthCheckScoring";
import { parseStoredScores } from "../lib/healthCheckReportStorage";
import {
  buildHealthCheckInputSnapshot,
  fetchHealthCheckHistory,
  fetchLatestHealthCheck,
  formatHealthCheckDate,
  insertHealthCheckResult,
  inputSnapshotFromRow,
  isHealthCheckRunRecent,
  resolveBrandIdForHealthWrite,
  summarizeHealthCheckRow,
  websiteUrlFromSnapshot,
  type HealthCheckRow,
} from "../lib/healthCheckPersistence";
import { extractDomain, getScoreColor } from "../components/healthCheck/HealthCheckReportView";
import { HealthCheckProgressGraph } from "../components/healthCheck/HealthCheckProgressGraph";
import { HealthCheckReportView } from "../components/healthCheck/HealthCheckReportView";
import { isComparableHealthCheckRow } from "../lib/healthCheckProgressGraph";
import DashboardShell from "../layouts/DashboardShell";
import { Button } from "../components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../components/ui/alert-dialog";

function HistoryScoreChip({ label, score }: { label: string; score: number }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border border-border bg-white px-2 py-0.5 font-['DM_Sans'] text-[10px] ${getScoreColor(score)}`}
    >
      {label} {score}
    </span>
  );
}

export default function HealthReport() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { activeBrandId, activeBrand, loading: brandLoading, brands } = useBrand();

  const [currentRow, setCurrentRow] = useState<HealthCheckRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [reanalysing, setReanalysing] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyRows, setHistoryRows] = useState<HealthCheckRow[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const saveInFlightRef = useRef(false);
  const scopedBrandId = resolveScopedBrandId(activeBrandId, brands);

  const loadCurrent = useCallback(async () => {
    if (!user?.id || !scopedBrandId) return;
    setLoading(true);
    setActionError(null);
    const row = await fetchLatestHealthCheck(user.id, scopedBrandId);
    setCurrentRow(row);
    setLoading(false);
  }, [user?.id, scopedBrandId]);

  const loadHistory = useCallback(async () => {
    if (!user?.id || !scopedBrandId) return;
    setHistoryLoading(true);
    const rows = await fetchHealthCheckHistory(user.id, scopedBrandId);
    setHistoryRows(rows);
    setHistoryLoading(false);
  }, [user?.id, scopedBrandId]);

  useEffect(() => {
    setHistoryRows([]);
    setHistoryOpen(false);
  }, [scopedBrandId]);

  useEffect(() => {
    if (authLoading || brandLoading) return;
    if (!user?.id) {
      setLoading(false);
      return;
    }
    if (!isBrandScopeReady(brandLoading, brands, scopedBrandId)) return;
    void loadCurrent();
  }, [authLoading, brandLoading, user?.id, scopedBrandId, brands, loadCurrent]);

  useEffect(() => {
    if (!user?.id || !scopedBrandId || !currentRow) return;
    void loadHistory();
  }, [user?.id, scopedBrandId, currentRow?.id, loadHistory]);

  useEffect(() => {
    const onRefresh = () => {
      void loadCurrent();
      void loadHistory();
    };
    window.addEventListener("marktr:guest-data-ready", onRefresh);
    return () => window.removeEventListener("marktr:guest-data-ready", onRefresh);
  }, [loadCurrent, loadHistory]);

  const toggleHistory = () => {
    const next = !historyOpen;
    setHistoryOpen(next);
    if (next && historyRows.length === 0) {
      void loadHistory();
    }
  };

  const handleReanalyse = async () => {
    if (!user?.id || !currentRow || reanalysing || saveInFlightRef.current) return;

    const snapshot = inputSnapshotFromRow(currentRow);
    const websiteUrl = websiteUrlFromSnapshot(snapshot);
    if (!websiteUrl) {
      setActionError("Missing website URL on the stored check — run a new health check from scratch.");
      return;
    }

    saveInFlightRef.current = true;
    setReanalysing(true);
    setActionError(null);
    setConfirmOpen(false);

    try {
      const { brandId, source } = await resolveBrandIdForHealthWrite(
        user.id,
        scopedBrandId,
        brands
      );

      if (!brandId) {
        throw new Error("Could not resolve brand for this re-run.");
      }

      console.log("[HealthReport] re-analyse starting", {
        userId: user.id,
        brandId,
        brandSource: source,
        websiteUrl,
      });

      const { data, error: invokeError } = await supabase.functions.invoke("score-website", {
        body: {
          websiteUrl,
          instagramHandle: snapshot.instagram_handle || undefined,
          facebookUrl: snapshot.facebook_url || undefined,
        },
      });

      if (invokeError) throw invokeError;

      const parsed = parseScoreWebsiteResponse(data, {
        websiteUrl,
        instagramHandle: snapshot.instagram_handle,
        facebookUrl: snapshot.facebook_url,
        domain: snapshot.domain || extractDomain(websiteUrl),
      });

      const websiteScore = {
        score: parsed.deterministic.scores.websiteClarity,
        observation: parsed.observation,
        strengths: parsed.strengths,
        gaps: parsed.gaps,
        deterministic: parsed.deterministic,
      };

      const scores = calculateScores({
        websiteUrl,
        instagramHandle: snapshot.instagram_handle,
        facebookUrl: snapshot.facebook_url,
        businessName: snapshot.business_name,
        email: user.email ?? "",
        websiteScore,
      });

      const inputSnapshot = buildHealthCheckInputSnapshot({
        websiteUrl,
        instagramHandle: snapshot.instagram_handle,
        facebookUrl: snapshot.facebook_url,
        businessName: snapshot.business_name,
      });

      const inserted = await insertHealthCheckResult(user.id, brandId, {
        scores,
        websiteScore,
        inputSnapshot,
      });

      if (!inserted) {
        throw new Error("Could not save the new health check.");
      }

      console.log("[HealthReport] re-analyse inserted", {
        rowId: inserted.id,
        brandId: inserted.brand_id,
        overall: inserted.overall_score,
      });

      setCurrentRow(inserted);
      void loadHistory();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Re-analysis failed.");
    } finally {
      saveInFlightRef.current = false;
      setReanalysing(false);
    }
  };

  if (authLoading || brandLoading || loading) {
    return (
      <DashboardShell contentClassName="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </DashboardShell>
    );
  }

  if (!user?.id) {
    return <Navigate to="/" replace />;
  }

  if (!scopedBrandId) {
    return (
      <DashboardShell contentClassName="mx-auto max-w-2xl px-6 py-12">
        <p className="font-['DM_Sans'] text-muted-foreground">
          Select or create a brand to view your digital health check.
        </p>
        <Link
          to="/dashboard"
          className="mt-6 inline-flex rounded-full bg-primary px-6 py-3 font-['DM_Sans'] text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          Go to dashboard
        </Link>
      </DashboardShell>
    );
  }

  if (!currentRow) {
    return (
      <DashboardShell contentClassName="mx-auto max-w-2xl px-6 py-12">
        <span className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 font-['DM_Sans'] text-xs font-medium text-primary">
          Digital Health Check
        </span>
        <h1 className="mt-4 font-['Fraunces'] text-4xl font-bold text-[#0D1833]">
          Run your first health check
        </h1>
        <p className="mt-4 font-['DM_Sans'] text-base text-muted-foreground">
          {activeBrand?.name
            ? `See how ${activeBrand.name}'s website and socials score across clarity, story, content, and presence.`
            : "Score your website and socials across the dimensions that matter most to founders."}
        </p>
        <Button
          type="button"
          className="mt-8 rounded-full bg-primary px-6 py-6 font-['DM_Sans']"
          onClick={() => navigate("/health-check")}
        >
          Run your digital health check →
        </Button>
      </DashboardShell>
    );
  }

  const parsed = parseStoredScores(currentRow.scores);
  if (!parsed) {
    return (
      <DashboardShell contentClassName="mx-auto max-w-2xl px-6 py-12">
        <p className="font-['DM_Sans'] text-muted-foreground">
          We couldn&apos;t read this health check. Try running a new check.
        </p>
        <Button
          type="button"
          className="mt-6 rounded-full"
          onClick={() => navigate("/health-check")}
        >
          Run health check →
        </Button>
      </DashboardShell>
    );
  }

  const snapshot = inputSnapshotFromRow(currentRow);
  const websiteUrl = websiteUrlFromSnapshot(snapshot);
  const recentRun = isHealthCheckRunRecent(currentRow.created_at);
  const displayDomain = snapshot.domain || (websiteUrl ? extractDomain(websiteUrl) : null);

  return (
    <DashboardShell contentClassName="mx-auto max-w-2xl px-6 py-10 lg:py-12">
      {reanalysing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/60">
          <div className="flex flex-col items-center gap-3 rounded-2xl border border-border bg-white px-8 py-6 shadow-lg">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="font-['DM_Sans'] text-sm text-muted-foreground">
              Re-analysing your website and socials…
            </p>
            <p className="font-['DM_Sans'] text-xs text-muted-foreground">
              This usually takes about a minute.
            </p>
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <span className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 font-['DM_Sans'] text-xs font-medium text-primary">
            Digital Health Check
          </span>
          {activeBrand?.name && (
            <p className="mt-2 font-['DM_Sans'] text-xs text-muted-foreground">{activeBrand.name}</p>
          )}
          <h1 className="mt-2 font-['Fraunces'] text-3xl font-bold text-[#0D1833] sm:text-4xl">
            Your digital health
          </h1>
          <p className="mt-2 font-['DM_Sans'] text-xs text-muted-foreground">
            Last run: {formatHealthCheckDate(currentRow.created_at)}
          </p>
          {displayDomain && (
            <p className="mt-1 font-['DM_Sans'] text-xs text-muted-foreground">
              {displayDomain}
              {snapshot.instagram_handle ? ` · @${snapshot.instagram_handle.replace(/^@/, "")}` : ""}
            </p>
          )}
        </div>

        <Button
          type="button"
          variant="outline"
          className="rounded-full border-black font-['DM_Sans'] text-sm"
          onClick={() => setConfirmOpen(true)}
          disabled={reanalysing || !websiteUrl}
        >
          <RotateCcw className="mr-2 h-4 w-4" />
          Re-analyse
        </Button>
      </div>

      <p className="mt-4 font-['DM_Sans'] text-base text-muted-foreground">
        Scores reflect what&apos;s live on your site and socials right now — measured, not guessed.
      </p>

      {actionError && (
        <p className="mt-4 font-['DM_Sans'] text-sm text-destructive">{actionError}</p>
      )}

      <div className="mt-8">
        <HealthCheckReportView
          embedded
          pillarMode
          scores={parsed.scores}
          input={{
            websiteUrl,
            instagramHandle: snapshot.instagram_handle,
            facebookUrl: snapshot.facebook_url,
            websiteScore: parsed.websiteScore,
          }}
          showPaywallUpsell={false}
          showDashboardCta={false}
        />
      </div>

      <HealthCheckProgressGraph rows={historyRows} loading={historyLoading} />

      <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-t border-border pt-6">
        <button
          type="button"
          onClick={toggleHistory}
          className="inline-flex items-center gap-1.5 font-['DM_Sans'] text-xs text-muted-foreground hover:text-foreground"
        >
          <History className="h-3.5 w-3.5" />
          Past checks
          {historyOpen ? (
            <ChevronUp className="h-3.5 w-3.5" />
          ) : (
            <ChevronDown className="h-3.5 w-3.5" />
          )}
        </button>
        <Button
          type="button"
          variant="outline"
          className="rounded-full border-black font-['DM_Sans'] text-sm"
          onClick={() => navigate("/health-check")}
        >
          New health check →
        </Button>
      </div>

      {historyOpen && (
        <div className="mt-4 rounded-xl border border-border bg-muted/30 px-4 py-3">
          {historyLoading ? (
            <p className="font-['DM_Sans'] text-xs text-muted-foreground">Loading…</p>
          ) : historyRows.length === 0 ? (
            <p className="font-['DM_Sans'] text-xs text-muted-foreground">No past checks yet.</p>
          ) : (
            <ul className="space-y-3">
              {historyRows.map((row, index) => {
                const summary = summarizeHealthCheckRow(row);
                if (!summary) return null;
                return (
                  <li
                    key={row.id}
                    className="border-b border-border/60 pb-3 last:border-0 last:pb-0"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-['DM_Sans'] text-xs text-foreground/80">
                        {formatHealthCheckDate(row.created_at)}
                        {index === 0 ? (
                          <span className="ml-2 text-muted-foreground">(latest)</span>
                        ) : null}
                        {!isComparableHealthCheckRow(row) ? (
                          <span className="ml-2 text-muted-foreground/70">
                            measured with a previous method
                          </span>
                        ) : null}
                      </span>
                      <span
                        className={`font-['Fraunces'] text-lg font-bold ${getScoreColor(summary.overall)}`}
                      >
                        {summary.overall}
                      </span>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      <HistoryScoreChip label="Website" score={summary.website} />
                      <HistoryScoreChip label="Story" score={summary.brandStory} />
                      <HistoryScoreChip label="Content" score={summary.content} />
                      <HistoryScoreChip label="Social" score={summary.social} />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}

      <div className="mt-10">
        <Button
          type="button"
          className="rounded-full bg-primary px-6 py-3 font-['DM_Sans'] text-sm"
          onClick={() => navigate("/dashboard")}
        >
          Go to your dashboard →
        </Button>
      </div>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Re-analyse your digital health?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3 font-['DM_Sans'] text-sm text-muted-foreground">
                <p>
                  This re-analyses your live website and socials — takes about a minute. We&apos;ll
                  use the same URLs as your last check
                  {displayDomain ? ` (${displayDomain})` : ""}.
                </p>
                {recentRun && (
                  <p>
                    You ran this recently — re-running won&apos;t change your score unless your site
                    or socials have changed.
                  </p>
                )}
                <p className="text-xs">
                  Each re-run uses a live scan (Apify + AI) and saves a new dated entry.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => void handleReanalyse()}>Run</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardShell>
  );
}
