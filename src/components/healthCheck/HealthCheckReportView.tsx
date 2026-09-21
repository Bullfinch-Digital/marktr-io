import { Link } from "react-router-dom";
import { GuestResultsNextStepsCta } from "../guest/GuestResultsNextStepsCta";
import { getLlmFindingForDimension } from "../../lib/healthCheckFindings";
import { DIMENSION_CAP_FRAMING_COPY } from "../../lib/healthCheck";
import type {
  DimensionScore,
  HealthCheckInput,
  HealthCheckScores,
  StoryAssessment,
} from "../../lib/healthCheckScoring";

export function getScoreColor(score: number | null) {
  if (score === null) return "text-muted-foreground";
  if (score >= 70) return "text-[#2D7A5F]";
  if (score >= 40) return "text-[#BA7517]";
  return "text-[#E24B4A]";
}

export function getBarColor(score: number | null) {
  if (score === null) return "bg-muted";
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
    socialNote?: string;
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
  "Brand Story": {
    high: {
      meaning:
        "Your brand story is compelling — visitors understand who you are, why you exist, and what makes you different.",
      action:
        "Use this story consistently across your website, social bios, and content.",
    },
    mid: {
      meaning:
        "You have the beginnings of a brand story but key elements are missing — founder narrative, emotional hook, or clear positioning.",
      action:
        "Identify the one missing element that would make your story resonate — usually a specific customer or founding moment.",
    },
    low: {
      meaning:
        "Your brand story is weak or absent. Without a clear narrative, visitors have no reason to choose you over alternatives.",
      action:
        "Start with your founding moment — why did you start this business and who did you start it for?",
    },
  },
  "Content Consistency": {
    socialNote: "Instagram posting volume informed this score.",
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
  "Social Presence": {
    high: {
      meaning:
        "Your social profiles communicate clearly and you're visible across multiple platforms where customers might find you.",
      action:
        "Make sure your messaging is consistent across all channels — the same story, adapted for each platform's format.",
    },
    mid: {
      meaning:
        "You have some social visibility but your profiles could speak more clearly to your ideal customer, or you're not yet active on enough platforms.",
      action:
        "Sharpen your Instagram bio to name who you help, then establish a presence on one additional platform.",
    },
    low: {
      meaning:
        "Your social presence is limited or unclear. Potential customers searching for you on social may not find you or understand what you offer.",
      action:
        "Start with one platform — optimise your bio to speak to a specific customer, then post consistently for 30 days.",
    },
  },
};

export function extractDomain(url: string) {
  try {
    const prefixed = /^https?:\/\//i.test(url) ? url : `https://${url}`;
    return new URL(prefixed).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

export function getDataSourceLabel(
  dimensionName: string,
  input: Pick<HealthCheckInput, "websiteUrl" | "instagramHandle" | "facebookUrl" | "websiteScore">,
  domain: string | null
): string {
  const social = input.websiteScore?.socialScores;

  switch (dimensionName) {
    case "Website Clarity":
      return domain || "your website";
    case "Brand Story":
      return domain || "your website";
    case "Content Consistency":
      if (input.instagramHandle?.trim()) return input.instagramHandle.trim();
      if (input.facebookUrl?.trim()) return "Facebook page";
      return "platforms provided";
    case "Social Presence": {
      if (input.instagramHandle?.trim()) {
        const parts: string[] = [input.instagramHandle.trim()];
        if (social?.instagramFound) {
          if (input.facebookUrl?.trim()) parts.push("Facebook");
          if (input.websiteUrl?.trim() || domain) parts.push("website");
        }
        return parts.join(", ");
      }
      return "Based on platforms provided";
    }
    default:
      return "";
  }
}

function BrandStoryPanel({ sa }: { sa: StoryAssessment }) {
  const signpost = sa.storySystemSignpost;

  return (
    <div className="mt-4 rounded-xl border border-[#D4871A]/20 bg-[#FDF0CC] p-4">
      <p className="mb-3 font-['DM_Sans'] text-[10px] font-medium uppercase tracking-widest text-[#BA7517]">
        Brand story assessment
      </p>

      <div className="mb-3 flex items-center gap-2">
        <span
          className={`inline-flex rounded-full px-2.5 py-1 font-['DM_Sans'] text-xs font-medium ${
            sa.founderStoryQuality === "compelling"
              ? "bg-[#2D7A5F] text-white"
              : sa.founderStoryQuality === "good"
                ? "bg-[#2D7A5F]/20 text-[#2D7A5F]"
                : sa.founderStoryQuality === "basic"
                  ? "bg-[#BA7517]/20 text-[#BA7517]"
                  : "bg-[#E24B4A]/20 text-[#E24B4A]"
          }`}
        >
          {sa.founderStoryQuality === "compelling"
            ? "✓ Compelling founder story"
            : sa.founderStoryQuality === "good"
              ? "~ Good founder story"
              : sa.founderStoryQuality === "basic"
                ? "~ Basic story present"
                : "✗ No founder story found"}
        </span>
      </div>

      {sa.missingElements?.length > 0 && (
        <div>
          <p className="mb-2 font-['DM_Sans'] text-[10px] font-medium uppercase tracking-widest text-[#BA7517]">
            Missing story elements
          </p>
          <div className="flex flex-wrap gap-1.5">
            {sa.missingElements.map((el) => (
              <span
                key={el}
                className="rounded-full border border-[#D4871A]/30 bg-white px-2.5 py-1 font-['DM_Sans'] text-[10px] text-[#0D1833]"
              >
                {el}
              </span>
            ))}
          </div>
        </div>
      )}

      {signpost ? (
        <div className="mt-3 border-t border-[#D4871A]/20 pt-3">
          <p className="font-['DM_Sans'] text-xs leading-relaxed text-[#0D1833]">
            {signpost.copy}
          </p>
          <Link
            to="/story"
            className="mt-2 inline-flex font-['DM_Sans'] text-xs font-medium text-primary underline underline-offset-2"
          >
            Find your brand story →
          </Link>
        </div>
      ) : null}
    </div>
  );
}

function ScoreCard({
  dimension,
  dataSourceLabel,
  instagramFound,
  llmFinding,
}: {
  dimension: DimensionScore;
  dataSourceLabel: string;
  instagramFound: boolean;
  /** Prior-aware LLM finding — when set, replaces static tier copy. */
  llmFinding?: string;
}) {
  const detail = DIMENSION_DETAIL[dimension.name];
  const displayScore = dimension.score;
  const tier =
    displayScore === null
      ? null
      : displayScore >= 70
        ? "high"
        : displayScore >= 40
          ? "mid"
          : "low";
  const detailTier = tier ? detail?.[tier] : undefined;
  const sa =
    dimension.name === "Brand Story" ? dimension.storyAssessment : null;
  const suppressGaps =
    dimension.unmeasured ||
    dimension.dimensionCapped ||
    (typeof dimension.scoreRaw === "number" && dimension.scoreRaw >= 100) ||
    !dimension.gaps?.length;
  const showCapFraming =
    !dimension.unmeasured &&
    (dimension.dimensionCapped ||
      (typeof dimension.scoreRaw === "number" && dimension.scoreRaw >= 100));
  const useLlmNarrative = Boolean(llmFinding?.trim()) && !showCapFraming;
  const headline = showCapFraming
    ? DIMENSION_CAP_FRAMING_COPY
    : llmFinding?.trim() || dimension.observation;

  const socialNote =
    dimension.name === "Social Presence"
      ? dimension.unmeasured
        ? undefined
        : instagramFound
          ? "Bio targeting, follower reach and active platforms were used to score this."
          : "Connect your Instagram and Facebook for a complete picture."
      : dimension.name === "Content Consistency" && instagramFound && !dimension.unmeasured
        ? detail?.socialNote
        : undefined;

  return (
    <article className="rounded-2xl border border-border bg-white p-6">
      <p className="font-['DM_Sans'] text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
        {dimension.name}
      </p>
      <p className="mb-1 font-['DM_Sans'] text-[9px] uppercase tracking-widest text-muted-foreground/70">
        Assessed: {dataSourceLabel}
      </p>
      <p
        className={`font-['Fraunces'] text-4xl font-bold leading-none ${getScoreColor(displayScore)}`}
      >
        {displayScore === null ? "—" : displayScore}
      </p>
      <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={`h-full rounded-full ${getBarColor(displayScore)}`}
          style={{ width: `${displayScore ?? 0}%` }}
        />
      </div>
      <p className="mt-3 font-['DM_Sans'] text-sm font-medium leading-relaxed text-[#0D1833]">
        {headline}
      </p>
      {detailTier && !useLlmNarrative && !showCapFraming && !dimension.unmeasured && (
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
          {socialNote && (
            <p className="mt-2 font-['DM_Sans'] text-xs leading-relaxed text-muted-foreground">
              {socialNote}
            </p>
          )}
        </>
      )}
      {dimension.name === "Website Clarity" &&
      dimension.strengths?.length &&
      !showCapFraming ? (
        <div className="mt-3 space-y-2">
          <p className="font-['DM_Sans'] text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
            What&apos;s working
          </p>
          {dimension.strengths.map((s, i) => (
            <div key={i} className="flex items-start gap-2">
              <span className="mt-0.5 text-xs text-[#2D7A5F]">✓</span>
              <p className="font-['DM_Sans'] text-xs leading-relaxed text-[#0D1833]">{s}</p>
            </div>
          ))}
          {!suppressGaps && dimension.gaps?.length ? (
            <>
              <p className="mt-3 font-['DM_Sans'] text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
                Key gaps
              </p>
              {dimension.gaps.map((g, i) => (
                <div key={i} className="flex items-start gap-2">
                  <span className="mt-0.5 text-xs text-primary">→</span>
                  <p className="font-['DM_Sans'] text-xs leading-relaxed text-[#0D1833]">{g}</p>
                </div>
              ))}
            </>
          ) : null}
        </div>
      ) : null}
      {sa && <BrandStoryPanel sa={sa} />}
    </article>
  );
}

function ScoreOverviewChip({
  shortName,
  score,
  href,
  featured = false,
}: {
  shortName: string;
  score: number | null;
  href?: string;
  featured?: boolean;
}) {
  const className = `flex-1 min-w-[100px] rounded-xl border border-border bg-white px-4 py-3 text-center transition-colors ${
    href ? "hover:border-primary/40" : ""
  } ${featured ? "min-w-[120px] border-primary/20 bg-primary/5 sm:flex-[1.2]" : ""}`;

  const content = (
    <>
      <p className="font-['DM_Sans'] text-[10px] uppercase tracking-widest text-muted-foreground">
        {shortName}
      </p>
      <p
        className={`font-['Fraunces'] font-bold ${getScoreColor(score)} ${
          featured ? "text-3xl" : "text-2xl"
        }`}
      >
        {score === null ? "—" : score}
        {featured && score !== null && (
          <span className="ml-0.5 font-['DM_Sans'] text-sm font-medium text-muted-foreground">
            /100
          </span>
        )}
      </p>
      {featured && (
        <p className="font-['DM_Sans'] text-[10px] text-muted-foreground">Overall digital health</p>
      )}
      <div className="mt-1 h-1 w-full rounded-full bg-muted">
        <div
          className={`h-full rounded-full ${getBarColor(score)}`}
          style={{ width: `${score}%` }}
        />
      </div>
    </>
  );

  if (href) {
    return (
      <a href={href} className={className}>
        {content}
      </a>
    );
  }

  return <div className={className}>{content}</div>;
}

export type HealthCheckReportViewProps = {
  scores: HealthCheckScores;
  input: Pick<
    HealthCheckInput,
    "websiteUrl" | "instagramHandle" | "facebookUrl" | "websiteScore"
  >;
  showPaywallUpsell: boolean;
  showDashboardCta: boolean;
  onGoToDashboard?: () => void;
  /** When true, omits standalone page chrome (used inside DashboardShell). */
  embedded?: boolean;
  /** Pillar mode: skip badge/title intro — parent supplies header chrome. */
  pillarMode?: boolean;
};

export function HealthCheckReportView({
  scores,
  input,
  showPaywallUpsell,
  showDashboardCta,
  onGoToDashboard,
  embedded = false,
  pillarMode = false,
}: HealthCheckReportViewProps) {
  const displayDomain = input.websiteUrl?.trim()
    ? extractDomain(input.websiteUrl.trim())
    : null;

  const scoreCards: { key: string; shortName: string; dimension: DimensionScore }[] = [
    { key: "website", shortName: "Website", dimension: scores.websiteClarity },
    { key: "story", shortName: "Brand Story", dimension: scores.brandStory },
    { key: "social", shortName: "Social", dimension: scores.socialPresence },
    { key: "content", shortName: "Content", dimension: scores.contentConsistency },
  ];

  const instagramFound = Boolean(input.websiteScore?.socialScores?.instagramFound);

  const reportContent = (
    <>
      {!pillarMode && (
        <>
          <span className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 font-['DM_Sans'] text-xs font-medium text-primary">
            Your Digital Health Report
          </span>

          <h1 className="mt-4 font-['Fraunces'] text-4xl font-bold leading-tight text-[#0D1833] sm:text-5xl">
            Here&apos;s how your marketing scores today.
          </h1>

          <p className="mt-4 font-['DM_Sans'] text-base text-muted-foreground">
            {displayDomain
              ? `Based on publicly visible data for ${displayDomain}`
              : "Based on your answers"}
          </p>
        </>
      )}

      <div className={`flex flex-wrap gap-3 ${pillarMode ? "mt-0" : "mt-8"}`}>
        <ScoreOverviewChip shortName="Overall" score={scores.overall} featured />
        {scoreCards.map(({ key, shortName, dimension }) => (
          <ScoreOverviewChip
            key={key}
            shortName={shortName}
            score={dimension.score}
            href={`#section-${key}`}
          />
        ))}
      </div>

      {scores.socialIncompleteSummary ? (
        <p className="mt-4 rounded-xl border border-[#BA7517]/30 bg-[#FDF0CC] px-4 py-3 font-['DM_Sans'] text-sm text-[#0D1833]">
          {scores.socialIncompleteSummary}
        </p>
      ) : null}

      {scores.overallSummary ? (
        <p className="mt-4 font-['DM_Sans'] text-sm leading-relaxed text-muted-foreground">
          {scores.overallSummary}
        </p>
      ) : null}

      {showDashboardCta && (
        <div className="mt-6 flex flex-col gap-4 rounded-2xl border border-primary/20 bg-primary/5 px-6 py-5 sm:flex-row sm:items-center">
          <div className="flex-1">
            <p className="font-['DM_Sans'] text-sm font-semibold text-foreground">
              Your scores are saved to your dashboard.
            </p>
            <p className="mt-1 font-['DM_Sans'] text-sm text-muted-foreground">
              Head to your dashboard to track progress, connect your social accounts and get a
              step-by-step plan to improve every score.
            </p>
          </div>
          <button
            type="button"
            onClick={() => onGoToDashboard?.()}
            className="shrink-0 whitespace-nowrap rounded-full bg-primary px-5 py-2.5 font-['DM_Sans'] text-sm font-semibold text-white transition-colors hover:bg-primary/90"
          >
            Go to dashboard →
          </button>
        </div>
      )}

      <div className="mt-8 space-y-6">
        {scoreCards.map(({ key, dimension }) => (
          <div key={key} id={`section-${key}`} className="scroll-mt-24">
            <ScoreCard
              dimension={dimension}
              dataSourceLabel={getDataSourceLabel(dimension.name, input, displayDomain)}
              instagramFound={instagramFound}
              llmFinding={getLlmFindingForDimension(dimension.name, input.websiteScore)}
            />
          </div>
        ))}
      </div>

      {showPaywallUpsell && <GuestResultsNextStepsCta currentTool="health" className="mt-8" />}

      {showDashboardCta && (
        <div className="mt-8 rounded-2xl bg-[#0D1833] px-8 py-8 text-white">
          <h2 className="mb-3 font-['Fraunces'] text-3xl font-semibold">Your scores are saved.</h2>
          <p className="mb-6 max-w-lg font-['DM_Sans'] text-sm text-white/70">
            Connect your Instagram and Facebook in the dashboard to unlock real engagement data and a
            step-by-step improvement plan.
          </p>
          <button
            type="button"
            onClick={() => onGoToDashboard?.()}
            className="rounded-full bg-primary px-6 py-3 font-['DM_Sans'] text-sm font-semibold text-white transition-colors hover:bg-primary/90"
          >
            Go to your dashboard →
          </button>
        </div>
      )}
    </>
  );

  if (embedded) {
    return <div className="max-w-5xl">{reportContent}</div>;
  }

  return (
    <main className="min-h-screen bg-background">
      <section className="mx-auto max-w-3xl px-6 py-12">{reportContent}</section>
    </main>
  );
}
