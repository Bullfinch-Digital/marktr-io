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

const DIMENSION_DETAIL: Record<
  string,
  {
    high: { meaning: string; action: string };
    mid: { meaning: string; action: string };
    low: { meaning: string; action: string };
  }
> = {
  "Website Clarity": {
    high: {
      meaning:
        "Your homepage clearly communicates what you do and who you help. Visitors can understand your value within seconds of arriving.",
      action:
        "Focus on conversion — make sure your primary CTA is prominent above the fold.",
    },
    mid: {
      meaning:
        "Your website communicates the basics but your value proposition could be sharper. Some visitors may not immediately understand what makes you different.",
      action:
        "Rewrite your homepage headline to lead with the outcome you deliver, not what you do.",
    },
    low: {
      meaning:
        "Visitors to your website are likely struggling to understand what you offer and who it's for. This is costing you customers every day.",
      action:
        "Start with a clear headline: who you help, what you do, and why it matters — above the fold.",
    },
  },
  "Content Consistency": {
    high: {
      meaning:
        "You're showing up regularly across your channels. Consistent presence builds trust and keeps your audience engaged over time.",
      action:
        "Now focus on quality and strategy — make sure each post has a clear purpose tied to your ICP.",
    },
    mid: {
      meaning:
        "Your content presence has gaps. Inconsistent posting makes it harder to build an audience and signals uncertainty to potential customers.",
      action:
        "Commit to a minimum posting frequency — even 2x per week consistently beats 10x in bursts.",
    },
    low: {
      meaning:
        "Your content presence is too sparse to build meaningful audience trust. Potential customers who find you may not see enough to feel confident.",
      action:
        "Pick one platform and post at least twice a week for 30 days before expanding.",
    },
  },
  "Audience Fit": {
    high: {
      meaning:
        "Your content appears to be reaching and resonating with the right people. Strong audience fit means higher engagement and better conversion.",
      action:
        "Document what's working — identify the content formats and topics that drive the most relevant engagement.",
    },
    mid: {
      meaning:
        "Some of your content is landing with the right audience but there's room to sharpen your targeting and messaging.",
      action:
        "Define your ideal customer in more specific detail — marktr's ICP Generator can help with this.",
    },
    low: {
      meaning:
        "Your content may be reaching the wrong people, or not clearly speaking to anyone in particular. This is a foundational issue that affects everything downstream.",
      action:
        "Before creating more content, define your ideal customer — this single step transforms how you write.",
    },
  },
  "Engagement Quality": {
    high: {
      meaning:
        "People are actively responding to your content. High engagement quality means your audience finds your posts genuinely useful or interesting.",
      action:
        "Lean into what's generating conversation — questions, opinions and specific expertise tend to drive the best engagement.",
    },
    mid: {
      meaning:
        "You're getting some engagement but it's not consistent. Some content lands well while other posts receive little response.",
      action:
        "Study which posts generate comments rather than just likes — those formats are your strongest signal.",
    },
    low: {
      meaning:
        "Your content isn't generating meaningful interaction. This often means the content isn't specific enough to your audience or isn't giving them a reason to respond.",
      action:
        "End every post with a direct question or a specific call to action tied to your ideal customer's biggest frustration.",
    },
  },
  "Channel Coverage": {
    high: {
      meaning:
        "You have a strong multi-channel presence. You're visible where your customers are looking, which reduces reliance on any single platform.",
      action:
        "Make sure your messaging is consistent across all channels — the same story, adapted for each platform's format.",
    },
    mid: {
      meaning:
        "You're active on some channels but there are gaps where your ideal customer may be looking and not finding you.",
      action:
        "Identify which one additional platform your ideal customer uses most and establish a basic presence there.",
    },
    low: {
      meaning:
        "Your digital footprint is limited to very few channels. This makes you invisible to potential customers who discover brands through platforms you're not on.",
      action:
        "Prioritise the one or two platforms where your ideal customer spends the most time and commit to those first.",
    },
  },
};

function extractDomain(url: string) {
  try {
    const prefixed = /^https?:\/\//i.test(url) ? url : `https://${url}`;
    return new URL(prefixed).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function ScoreCard({ dimension }: { dimension: DimensionScore }) {
  const detail = DIMENSION_DETAIL[dimension.name];
  const tier =
    dimension.score >= 70 ? "high" : dimension.score >= 40 ? "mid" : "low";
  const detailTier = detail?.[tier];

  return (
    <article className="rounded-2xl border border-border bg-white p-6">
      <p className="font-['DM_Sans'] text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
        {dimension.name}
      </p>
      <p
        className={`mt-2 font-['Fraunces'] text-4xl font-bold leading-none ${getScoreColor(dimension.score)}`}
      >
        {dimension.score}
      </p>
      <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={`h-full rounded-full ${getBarColor(dimension.score)}`}
          style={{ width: `${dimension.score}%` }}
        />
      </div>
      <p className="mt-3 font-['DM_Sans'] text-sm font-medium leading-relaxed text-[#0D1833]">
        {dimension.observation}
      </p>
      {detailTier && (
        <>
          <p className="mt-2 font-['DM_Sans'] text-xs leading-relaxed text-muted-foreground">
            {detailTier.meaning}
          </p>
          <div className="mt-3 rounded-lg border border-border bg-background px-3 py-2">
            <p className="mb-1 font-['DM_Sans'] text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
              Recommended action
            </p>
            <p className="font-['DM_Sans'] text-xs leading-relaxed text-[#0D1833]">
              {detailTier.action}
            </p>
          </div>
        </>
      )}
      {dimension.name === "Website Clarity" && dimension.strengths?.length && (
        <div className="mt-3 space-y-2">
          <p className="font-['DM_Sans'] text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
            What&apos;s working
          </p>
          {dimension.strengths.map((s, i) => (
            <div key={i} className="flex items-start gap-2">
              <span className="mt-0.5 text-xs text-[#2D7A5F]">✓</span>
              <p className="font-['DM_Sans'] text-xs leading-relaxed text-[#0D1833]">
                {s}
              </p>
            </div>
          ))}
          {dimension.gaps?.length ? (
            <>
              <p className="mt-3 font-['DM_Sans'] text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
                Key gaps
              </p>
              {dimension.gaps.map((g, i) => (
                <div key={i} className="flex items-start gap-2">
                  <span className="mt-0.5 text-xs text-primary">→</span>
                  <p className="font-['DM_Sans'] text-xs leading-relaxed text-[#0D1833]">
                    {g}
                  </p>
                </div>
              ))}
            </>
          ) : null}
        </div>
      )}
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
          Your Digital Health Report
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
          <p className="mt-2 font-['DM_Sans'] text-sm text-muted-foreground">Overall digital health</p>
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
            to="/guest-dashboard"
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
