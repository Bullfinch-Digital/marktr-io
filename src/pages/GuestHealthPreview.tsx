import { useMemo } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { isRealUser } from "../utils/isRealUser";
import { getGuestHealthCheck } from "../lib/guestHealthCheck";
import { calculateScores } from "../lib/healthCheckScoring";
import { mergeHealthFindings } from "../lib/healthCheckFindings";
import { GuestPreviewShell } from "../layouts/GuestPreviewShell";
import { usePaywall } from "../contexts/PaywallContext";
import { Button } from "../components/ui/button";
import {
  getBarColor,
  getScoreColor,
} from "../components/healthCheck/HealthCheckReportView";

export default function GuestHealthPreview() {
  const { user } = useAuth();
  const { openPaywall } = usePaywall();
  const guestHealth = getGuestHealthCheck();

  const report = useMemo(() => {
    if (!guestHealth?.scores) return null;

    const fullScores = guestHealth.websiteScore
      ? calculateScores({
          websiteUrl: guestHealth.input.websiteUrl,
          instagramHandle: guestHealth.input.instagramHandle,
          facebookUrl: guestHealth.input.facebookUrl,
          email: guestHealth.input.email,
          websiteScore: guestHealth.websiteScore,
        })
      : null;

    const findings = guestHealth.findings?.length
      ? guestHealth.findings
      : guestHealth.websiteScore
        ? mergeHealthFindings(fullScores!, guestHealth.websiteScore.findings)
        : [
            {
              dimension: "Website Clarity",
              score: guestHealth.scores.websiteClarity,
              finding: `Scored ${guestHealth.scores.websiteClarity}/100 on your last check.`,
            },
            {
              dimension: "Brand Story",
              score: guestHealth.scores.brandStory,
              finding: `Scored ${guestHealth.scores.brandStory}/100 on your last check.`,
            },
            {
              dimension: "Content Consistency",
              score: guestHealth.scores.contentConsistency,
              finding: `Scored ${guestHealth.scores.contentConsistency}/100 on your last check.`,
            },
            {
              dimension: "Social Presence",
              score: guestHealth.scores.socialPresence,
              finding: `Scored ${guestHealth.scores.socialPresence}/100 on your last check.`,
            },
          ];

    return {
      overall: fullScores?.overall ?? guestHealth.scores.overall,
      findings,
    };
  }, [guestHealth]);

  if (isRealUser(user)) {
    return <Navigate to="/health-report" replace />;
  }

  if (!guestHealth?.scores || !report) {
    return <Navigate to="/health-check" replace />;
  }

  return (
    <GuestPreviewShell>
      <section className="mx-auto max-w-3xl">
        <span className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 font-['DM_Sans'] text-xs font-medium text-primary">
          Your Digital Health Report
        </span>

        <h1 className="mt-4 font-['Fraunces'] text-4xl font-bold leading-tight text-[#0D1833] sm:text-5xl">
          Your digital health findings
        </h1>

        <p className="mt-4 font-['DM_Sans'] text-base leading-relaxed text-muted-foreground">
          Here&apos;s the honest snapshot of where your digital presence is right now — the strong
          bits and the gaps. The good news: every one of these is fixable.
        </p>

        <div className="mt-8 flex flex-wrap gap-3">
          <div className="min-w-[120px] flex-[1.2] rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 text-center">
            <p className="font-['DM_Sans'] text-[10px] uppercase tracking-widest text-muted-foreground">
              Overall
            </p>
            <p
              className={`font-['Fraunces'] text-3xl font-bold leading-none ${getScoreColor(report.overall)}`}
            >
              {report.overall}
            </p>
          </div>
          {report.findings.map(({ dimension, score }) => (
            <div
              key={dimension}
              className="min-w-[100px] flex-1 rounded-xl border border-border bg-white px-4 py-3 text-center"
            >
              <p className="font-['DM_Sans'] text-[10px] uppercase tracking-widest text-muted-foreground">
                {dimension.replace("Website Clarity", "Clarity").replace("Content Consistency", "Content")}
              </p>
              <p className={`font-['Fraunces'] text-2xl font-bold leading-none ${getScoreColor(score)}`}>
                {score}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-10 space-y-4">
          {report.findings.map(({ dimension, score, finding }) => (
            <article key={dimension} className="rounded-2xl border border-border bg-white p-6">
              <div className="flex items-start justify-between gap-4">
                <h2 className="font-['Fraunces'] text-xl font-semibold text-[#0D1833]">{dimension}</h2>
                <p className={`font-['Fraunces'] text-3xl font-bold leading-none ${getScoreColor(score)}`}>
                  {score}
                </p>
              </div>
              <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className={`h-full rounded-full ${getBarColor(score)}`}
                  style={{ width: `${score}%` }}
                />
              </div>
              <p className="mt-4 font-['DM_Sans'] text-sm leading-relaxed text-foreground/80">{finding}</p>
            </article>
          ))}
        </div>

        <div className="mt-10 rounded-2xl bg-[#0D1833] p-8">
          <h2 className="font-['Fraunces'] text-2xl font-bold text-white sm:text-3xl">
            Turn these findings into a plan
          </h2>
          <p className="mt-4 font-['DM_Sans'] text-sm leading-relaxed text-white/70">
            Start your free trial to turn these findings into a plan — and watch the scores climb as
            you work through it.
          </p>
          <Button
            type="button"
            onClick={() => openPaywall()}
            className="mt-6 rounded-full bg-primary px-7 py-3 font-['DM_Sans'] text-sm font-medium text-primary-foreground hover:opacity-90"
          >
            Start your 14-day free trial →
          </Button>
        </div>
      </section>
    </GuestPreviewShell>
  );
}
