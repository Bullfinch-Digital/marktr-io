import { Link, Navigate, useLocation } from "react-router-dom";
import { useEffect, useMemo } from "react";
import {
  calculateScores,
  type DimensionScore,
  type HealthCheckInput,
} from "../lib/healthCheckScoring";
import { setGuestHealthCheck } from "../lib/guestHealthCheck";

type LocationState = HealthCheckInput | null;

function getScoreColor(score: number) {
  if (score >= 70) return "text-[#2D7A5F]";
  if (score >= 40) return "text-[#BA7517]";
  return "text-[#E24B4A]";
}

function getBarColor(score: number) {
  if (score >= 70) return "bg-[#2D7A5F]";
  if (score >= 40) return "bg-[#BA7517]";
  return "bg-[#E24B4A]";
}

function extractDomain(url: string) {
  try {
    const prefixed = /^https?:\/\//i.test(url) ? url : `https://${url}`;
    return new URL(prefixed).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function ScoreCard({ dimension }: { dimension: DimensionScore }) {
  return (
    <article className="rounded-2xl border border-border bg-white p-5">
      <p className="font-['DM_Sans'] text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
        {dimension.name}
      </p>
      <p
        className={`mt-2 font-['Fraunces'] text-4xl font-bold leading-none ${getScoreColor(dimension.score)}`}
      >
        {dimension.score}
      </p>
      <p className="mt-3 font-['DM_Sans'] text-xs leading-relaxed text-muted-foreground">
        {dimension.observation}
      </p>
      <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={`h-full rounded-full ${getBarColor(dimension.score)}`}
          style={{ width: `${Math.min(100, dimension.score)}%` }}
        />
      </div>
    </article>
  );
}

export default function HealthCheckResults() {
  const location = useLocation();
  const state = (location.state ?? null) as LocationState;

  if (!state || !state.email?.trim()) {
    return <Navigate to="/health-check" replace />;
  }

  const scores = useMemo(() => calculateScores(state), [state]);

  useEffect(() => {
    if (!state?.email?.trim() || !scores) return;
    setGuestHealthCheck({
      input: {
        websiteUrl: state.websiteUrl,
        instagramHandle: state.instagramHandle,
        facebookUrl: state.facebookUrl,
        linkedinUrl: state.linkedinUrl,
        email: state.email,
      },
      scores: {
        websiteClarity: scores.websiteClarity.score,
        contentConsistency: scores.contentConsistency.score,
        audienceFit: scores.audienceFit.score,
        engagementQuality: scores.engagementQuality.score,
        channelCoverage: scores.channelCoverage.score,
        overall: scores.overall,
        lowestDimension: scores.lowestDimension,
        lowestScore: scores.lowestScore,
      },
      created_at: new Date().toISOString(),
    });
  }, [state, scores]);

  const domain = state.websiteUrl?.trim() ? extractDomain(state.websiteUrl.trim()) : null;

  return (
    <main className="min-h-screen bg-background">
      <section className="mx-auto max-w-3xl px-6 py-12">
        <span className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 font-['DM_Sans'] text-xs font-medium text-primary">
          Your Marketing Health Report
        </span>

        <h1 className="mt-4 font-['Fraunces'] text-4xl font-bold leading-tight text-[#0D1833] sm:text-5xl">
          Here&apos;s how your marketing scores today.
        </h1>

        <p className="mt-4 font-['DM_Sans'] text-base text-muted-foreground">
          {domain
            ? `Based on what marktr could see publicly for ${domain}`
            : "Based on your answers"}
        </p>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <ScoreCard dimension={scores.websiteClarity} />
          <ScoreCard dimension={scores.contentConsistency} />
          <ScoreCard dimension={scores.audienceFit} />
          <ScoreCard dimension={scores.engagementQuality} />
          <ScoreCard dimension={scores.channelCoverage} />
        </div>

        <div className="mt-8 rounded-2xl border border-border bg-white p-6 text-center">
          <p className="font-['Fraunces'] text-5xl font-bold text-[#0D1833] sm:text-6xl">
            {scores.overall}
            <span className="ml-1 font-['DM_Sans'] text-2xl font-medium text-muted-foreground">
              /100
            </span>
          </p>
          <p className="mt-2 font-['DM_Sans'] text-sm text-muted-foreground">Overall marketing health</p>
        </div>

        <div className="mt-8 rounded-2xl bg-[#0D1833] p-8">
          <h2 className="font-['Fraunces'] text-3xl font-bold leading-tight text-white">
            Your {scores.lowestDimension} score is {scores.lowestScore}. Here&apos;s what that means.
          </h2>
          <p className="mt-4 max-w-2xl font-['DM_Sans'] text-base leading-relaxed text-white/70">
            Unlock your full marktr dashboard to see exactly what&apos;s holding you back — and get a
            step-by-step plan to fix it. Completely free for 14 days.
          </p>

          <Link
            to="/icp-results"
            className="mt-8 inline-flex items-center justify-center rounded-full bg-primary px-7 py-3 font-['DM_Sans'] text-sm font-medium text-primary-foreground hover:opacity-90"
          >
            Unlock your full dashboard — free for 14 days
          </Link>

          <p className="mt-3 font-['DM_Sans'] text-xs text-white/50">
            No credit card required · Cancel anytime
          </p>
        </div>
      </section>
    </main>
  );
}
