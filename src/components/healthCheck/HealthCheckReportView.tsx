import { Link } from "react-router-dom";
import { GuestResultsNextStepsCta } from "../guest/GuestResultsNextStepsCta";
import { SendScoreCard } from "./SendScoreCard";
import { getLlmFindingForDimension, getLlmNextStepForDimension } from "../../lib/healthCheckFindings";
import { missingSocialPictureNote } from "../../lib/missingSocialChannels";
import { polishWebsiteBullets } from "../../../supabase/functions/_shared/pillarFindings";
import {
  isSpecificPillarObservation,
  logPillarFallback,
  resolvePillarCopy,
} from "../../lib/healthCheck/pillarCopy";
import { ctaTarget, track } from "../../lib/bullfinchAnalytics";
import { useEdition } from "../../contexts/EditionContext";
import { editionConfig, fillNextStepHref } from "../../lib/editionConfig";
import type { BfRoute } from "../../lib/bullfinchRouting";
import { isBfRoute } from "../../lib/bullfinchRouting";
import type { Edition } from "../../lib/edition";
import type {
  DimensionScore,
  HealthCheckInput,
  HealthCheckScores,
  StoryAssessment,
} from "../../lib/healthCheckScoring";

function activeEdition(): Edition {
  if (typeof document === "undefined") return "marktr";
  return document.documentElement.dataset.edition === "bullfinch" ? "bullfinch" : "marktr";
}

function scoreBand(score: number): "high" | "mid" | "low" {
  const { high, mid } = editionConfig[activeEdition()].scoreBands;
  if (score >= high) return "high";
  if (score >= mid) return "mid";
  return "low";
}

export function getScoreColor(score: number | null) {
  if (score === null) return "text-muted-foreground";
  const band = scoreBand(score);
  if (band === "high") return "text-[color:var(--hc-score-high)]";
  if (band === "mid") return "text-[color:var(--hc-score-mid)]";
  return "text-[color:var(--hc-score-low)]";
}

export function getBarColor(score: number | null) {
  if (score === null) return "bg-muted";
  const band = scoreBand(score);
  if (band === "high") return "bg-[var(--hc-score-high)]";
  if (band === "mid") return "bg-[var(--hc-score-mid)]";
  return "bg-[var(--hc-score-low)]";
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
        "Your homepage says what you do and who it's for. A new visitor can tell within a few seconds.",
      action:
        "Make sure the main thing you want visitors to do — book, call or enquire — is the first button they see.",
    },
    mid: {
      meaning:
        "The site explains the basics, but the homepage doesn't say clearly enough what you do or who it's for.",
      action:
        "Rewrite the homepage headline so it leads with the result you give people, not a list of services.",
    },
    low: {
      meaning:
        "A visitor can land on the homepage and still not know what you offer or who it's for.",
      action:
        "Put one line at the top of the homepage: who you help, what you do, and why it matters.",
    },
  },
  "Brand Story": {
    high: {
      meaning:
        "Your story is clear. A visitor can tell who you are, why you started, and what you believe.",
      action: "Use the same story on your homepage, your about page, and your social bios.",
    },
    mid: {
      meaning:
        "There's a start of a story, but a visitor still can't see why you began or who it's for.",
      action:
        "Add the missing piece on your about page — usually how you started, or the customer you most want.",
    },
    low: {
      meaning:
        "The site doesn't tell a story. A visitor has little reason to pick you over someone else.",
      action: "On your about page, write why you started and who you started it for.",
    },
  },
  "Content Consistency": {
    socialNote: "Instagram posting informed this score.",
    high: {
      meaning: "You're showing up regularly. People can see you're active, and that builds trust.",
      action: "Keep each post tied to the story on your website, so it has a reason to exist.",
    },
    mid: {
      meaning: "The posting has gaps. Long silences make it harder for people to trust that you're active.",
      action: "Pick a pace you can keep — two posts a week, every week, beats a burst and then nothing.",
    },
    low: {
      meaning: "There isn't enough recent posting for a new visitor to feel confident.",
      action:
        "Pick one place to post and put something up twice a week for the next month before you add anywhere else.",
    },
  },
  "Social Presence": {
    high: {
      meaning: "Your profiles say who you are, and people can find you in more than one place.",
      action: "Use the same story on each profile, written for that place.",
    },
    mid: {
      meaning:
        "You have a profile, but it doesn't yet say who you help, or you're only easy to find in one place.",
      action:
        "Rewrite your Instagram bio so it names who you help, then add one more place people can find you.",
    },
    low: {
      meaning:
        "People looking for you on social may not find a profile, or the one they find doesn't say what you do.",
      action:
        "Start with one profile. Write the bio for a specific customer, and show up there twice a week for a month.",
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

function atHandle(handle: string | undefined): string | null {
  const trimmed = handle?.trim().replace(/^@/, "");
  return trimmed ? `@${trimmed}` : null;
}

export function getDataSourceLabel(
  dimensionName: string,
  input: Pick<HealthCheckInput, "websiteUrl" | "instagramHandle" | "facebookUrl" | "websiteScore">,
  domain: string | null
): string {
  const handle = atHandle(input.instagramHandle);
  const facebook = input.facebookUrl?.trim() ? "Facebook" : null;
  const site = domain || null;

  switch (dimensionName) {
    case "Website Clarity":
      return site || "your website";
    case "Brand Story":
      return site ? `${site} homepage and about pages` : "your website";
    case "Content Consistency":
    case "Social Presence": {
      const parts = [site, handle, facebook].filter((part): part is string => Boolean(part));
      return parts.length ? parts.join(" + ") : "platforms provided";
    }
    default:
      return "";
  }
}

function BrandStoryPanel({
  sa,
  showStoryLinks,
}: {
  sa: StoryAssessment;
  showStoryLinks: boolean;
}) {
  const signpost = sa.storySystemSignpost;

  return (
    <div className="mt-4 rounded-xl border border-[#D4871A]/20 bg-[#FDF0CC] p-4">
      <p className="mb-3 font-body text-[10px] font-medium uppercase tracking-widest text-[#BA7517]">
        Brand story assessment
      </p>

      <div className="mb-3 flex items-center gap-2">
        <span
          className={`inline-flex rounded-full px-2.5 py-1 font-body text-xs font-medium ${
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
          <p className="mb-2 font-body text-[10px] font-medium uppercase tracking-widest text-[#BA7517]">
            Missing story elements
          </p>
          <div className="flex flex-wrap gap-1.5">
            {sa.missingElements.map((el) => (
              <span
                key={el}
                className="rounded-full border border-[#D4871A]/30 bg-white px-2.5 py-1 font-body text-[10px] text-[#0D1833]"
              >
                {el}
              </span>
            ))}
          </div>
        </div>
      )}

      {signpost && showStoryLinks ? (
        <div className="mt-3 border-t border-[#D4871A]/20 pt-3">
          <p className="font-body text-xs leading-relaxed text-[#0D1833]">
            {signpost.copy}
          </p>
          <Link
            to="/story"
            className="mt-2 inline-flex font-body text-xs font-medium text-primary underline underline-offset-2"
          >
            Find your brand story →
          </Link>
        </div>
      ) : signpost ? (
        <div className="mt-3 border-t border-[#D4871A]/20 pt-3">
          <p className="font-body text-xs leading-relaxed text-[#0D1833]">
            {signpost.copy}
          </p>
        </div>
      ) : null}
    </div>
  );
}

function WebsiteBullets({
  observation,
  strengths,
  gaps,
}: {
  observation: string;
  strengths?: string[];
  gaps?: string[];
}) {
  const working = polishWebsiteBullets(observation, strengths ?? []);
  const missing = polishWebsiteBullets(observation, gaps ?? []);
  if (!working.length && !missing.length) return null;
  return (
    <div className="mt-3 space-y-2">
      {working.length ? (
        <>
          <p className="font-body text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
            What&apos;s working
          </p>
          {working.map((item) => (
            <div key={item} className="flex items-start gap-2">
              <span className="mt-0.5 text-xs text-[#2D7A5F]">✓</span>
              <p className="font-body text-xs leading-relaxed text-[#0D1833]">{item}</p>
            </div>
          ))}
        </>
      ) : null}
      {missing.length ? (
        <>
          <p className="mt-3 font-body text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
            Key gaps
          </p>
          {missing.map((item) => (
            <div key={item} className="flex items-start gap-2">
              <span className="mt-0.5 text-xs text-primary">→</span>
              <p className="font-body text-xs leading-relaxed text-[#0D1833]">{item}</p>
            </div>
          ))}
        </>
      ) : null}
    </div>
  );
}

function ScoreCard({
  dimension,
  dataSourceLabel,
  instagramFound,
  instagramHandle,
  facebookUrl,
  llmFinding,
  llmNextStep,
  unassessed = false,
}: {
  dimension: DimensionScore;
  dataSourceLabel: string;
  instagramFound: boolean;
  instagramHandle?: string;
  facebookUrl?: string;
  /** Prior-aware LLM finding — when set, replaces static tier copy. */
  llmFinding?: string;
  llmNextStep?: string;
  unassessed?: boolean;
}) {
  const { config } = useEdition();
  const notChecked = !unassessed
    ? undefined
    : dimension.name === "Content Consistency" && instagramHandle?.trim() && config.unassessedContent
      ? config.unassessedContent
      : config.unassessedSocial;
  if (notChecked) {
    return (
      <article className="rounded-2xl border border-border bg-white p-6">
        <p className="font-body text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
          {dimension.name}
        </p>
        <p className="mt-3 font-body text-sm font-medium text-[#6B7280]">{notChecked.label}</p>
        <p className="mt-3 font-body text-sm font-medium leading-relaxed text-[#0D1833]">
          {notChecked.cardLine}
        </p>
      </article>
    );
  }
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
  const findingText = llmFinding?.trim();
  const storedText = dimension.observation?.trim();
  const modelObservation =
    [findingText, storedText].find((text) => isSpecificPillarObservation(text)) ||
    findingText ||
    storedText;
  const modelNextStep = dimension.nextStep?.trim() || llmNextStep?.trim();
  const resolved = resolvePillarCopy({
    pillar: dimension.name,
    score: displayScore,
    scoreRaw: dimension.scoreRaw,
    dimensionCapped: dimension.dimensionCapped,
    modelObservation,
    modelNextStep,
    bandMeaning: detailTier?.meaning,
    bandAction: detailTier?.action,
  });
  resolved.fallbacks.forEach(logPillarFallback);
  const observation = resolved.observation;
  const nextStep = resolved.nextStep;

  const missingNote =
    dimension.name === "Social Presence" && !dimension.unmeasured && !unassessed
      ? missingSocialPictureNote(instagramHandle, facebookUrl)
      : null;
  const socialNote =
    dimension.name === "Content Consistency" && instagramFound && !dimension.unmeasured
      ? detail?.socialNote
      : undefined;
  const help =
    typeof displayScore === "number" && displayScore < 75
      ? config.pillarHelp?.[dimension.name as keyof NonNullable<typeof config.pillarHelp>]
      : undefined;

  return (
    <article className="rounded-2xl border border-border bg-white p-6">
      <p className="font-body text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
        {dimension.name}
      </p>
      <p className="mb-1 font-body text-[9px] uppercase tracking-widest text-muted-foreground/70">
        Assessed: {dataSourceLabel}
      </p>
      <p
        className={`font-display text-4xl font-bold leading-none ${getScoreColor(displayScore)}`}
      >
        {displayScore === null ? "—" : displayScore}
      </p>
      <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={`h-full rounded-full ${getBarColor(displayScore)}`}
          style={{ width: `${displayScore ?? 0}%` }}
        />
      </div>
      <p className="mt-3 font-body text-sm font-medium leading-relaxed text-[#0D1833]">
        {observation}
      </p>
      {nextStep ? (
        <div className="mt-3 rounded-lg border border-border bg-background px-3 py-2">
          <p className="mb-1 font-body text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
            Next step
          </p>
          <p className="font-body text-xs leading-relaxed text-[#0D1833]">{nextStep}</p>
        </div>
      ) : null}
      {missingNote ? (
        <p className="mt-2 font-body text-xs leading-relaxed text-muted-foreground">{missingNote}</p>
      ) : null}
      {socialNote ? (
        <p className="mt-2 font-body text-xs leading-relaxed text-muted-foreground">{socialNote}</p>
      ) : null}
      {help ? (
        <p className="mt-3 font-body text-xs leading-relaxed text-muted-foreground">
          <span className="font-medium text-[#0D1833]">How Bullfinch helps. </span>
          {help}
        </p>
      ) : null}
      {dimension.name === "Website Clarity" ? (
        <WebsiteBullets
          observation={observation}
          strengths={dimension.strengths}
          gaps={suppressGaps ? [] : dimension.gaps}
        />
      ) : null}
      {sa && <BrandStoryPanel sa={sa} showStoryLinks={config.showStoryLinks} />}
    </article>
  );
}

function ScoreOverviewChip({
  shortName,
  score,
  href,
  featured = false,
  unassessedLabel,
  note,
}: {
  shortName: string;
  score: number | null;
  href?: string;
  featured?: boolean;
  unassessedLabel?: string;
  note?: string;
}) {
  const className = `flex-1 min-w-[100px] rounded-xl border border-border bg-white px-4 py-3 text-center transition-colors ${
    href ? "hover:border-primary/40" : ""
  } ${featured ? "min-w-[120px] border-primary/20 bg-primary/5 sm:flex-[1.2]" : ""}`;

  const content = (
    <>
      <p className="font-body text-[10px] uppercase tracking-widest text-muted-foreground">
        {shortName}
      </p>
      {unassessedLabel ? (
        <p className="mt-1 font-body text-sm font-medium text-[#6B7280]">{unassessedLabel}</p>
      ) : (
        <p
          className={`font-display font-bold ${getScoreColor(score)} ${
            featured ? "text-3xl" : "text-2xl"
          }`}
        >
          {score === null ? "—" : score}
          {featured && score !== null && (
            <span className="ml-0.5 font-body text-sm font-medium text-muted-foreground">
              /100
            </span>
          )}
        </p>
      )}
      {featured && (
        <p className="font-body text-[10px] text-muted-foreground">Overall digital health</p>
      )}
      {note ? (
        <p className="mt-1 font-body text-[10px] leading-snug text-[#6B7280]">{note}</p>
      ) : null}
      {unassessedLabel ? null : (
        <div className="mt-1 h-1 w-full rounded-full bg-muted">
          <div
            className={`h-full rounded-full ${getBarColor(score)}`}
            style={{ width: `${score}%` }}
          />
        </div>
      )}
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
    "websiteUrl" | "businessName" | "instagramHandle" | "facebookUrl" | "websiteScore"
  >;
  showPaywallUpsell: boolean;
  showDashboardCta: boolean;
  onGoToDashboard?: () => void;
  /** When true, omits standalone page chrome (used inside DashboardShell). */
  embedded?: boolean;
  /** Pillar mode: skip badge/title intro — parent supplies header chrome. */
  pillarMode?: boolean;
  /** Stored Bullfinch route. The report never recalculates this. */
  bfRoute?: BfRoute | null;
  publicToken?: string;
};

function StoredNextStep({
  route,
  websiteUrl,
  publicToken,
}: {
  route: BfRoute;
  websiteUrl: string;
  publicToken: string;
}) {
  const { config } = useEdition();
  const step = config.nextSteps?.[route];
  if (!step) return null;

  const primaryHref = fillNextStepHref(step.primary.href, {
    url: websiteUrl,
    publicToken,
    route,
  });

  return (
    <section
      className="mt-8 rounded-[18px] border-[1.5px] border-foreground bg-card px-6 py-8 sm:px-8"
      data-bf-route={route}
    >
      <h2 className="font-display text-3xl font-semibold leading-tight text-foreground">
        {step.heading}
      </h2>
      <p className="mt-4 max-w-2xl font-body text-base leading-relaxed text-muted-foreground">
        {step.body}
      </p>
      {config.callNote ? (
        <p className="mt-4 max-w-2xl font-body text-base leading-relaxed text-muted-foreground">
          {config.callNote}
        </p>
      ) : null}
      <a
        href={primaryHref}
        className="mt-8 inline-flex items-center justify-center rounded-full bg-primary px-7 py-3 font-body text-sm font-medium text-primary-foreground hover:opacity-90"
        rel="noopener noreferrer"
        onClick={() => {
          const target = ctaTarget(step.primary.href);
          if (target) track("bf_cta_click", { route, target }, { beacon: true });
        }}
      >
        {step.primary.label}
      </a>
      <div className="mt-4">
        <a
          href={step.secondary.href}
          className="font-body text-sm underline hover:text-foreground"
          rel="noopener noreferrer"
          onClick={() => {
            const target = ctaTarget(step.secondary.href);
            if (target) track("bf_cta_click", { route, target }, { beacon: true });
          }}
        >
          {step.secondary.label}
        </a>
      </div>
    </section>
  );
}

function recheckHref(website: string, business: string): string {
  const params = new URLSearchParams();
  if (typeof window !== "undefined") {
    const edition = new URLSearchParams(window.location.search).get("edition");
    if (edition) params.set("edition", edition);
  }
  if (website) params.set("website", website);
  if (business) params.set("business", business);
  const query = params.toString();
  return query ? `/?${query}` : "/";
}

const UNCHECKED_SOCIAL_SPOTLIGHT = {
  title: "Your social presence",
  text: "We couldn't check your Instagram this time. It's usually the first thing we look at with a business like yours — whether it tells the same story as your website, and whether there's a system keeping it going.",
};

function WhereWeStart({
  route,
  websiteUrl,
  businessName,
  publicToken,
  cards,
  isUnassessed,
}: {
  route: BfRoute;
  websiteUrl: string;
  businessName: string;
  publicToken: string;
  cards: { key: string; shortName: string; dimension: DimensionScore }[];
  isUnassessed: (name: string) => boolean;
}) {
  const { config } = useEdition();
  const spotlight = config.spotlight;
  const step = config.nextSteps?.[route];
  if (!spotlight || !step) return null;
  const uncheckedSocial = cards.some(
    (card) =>
      isUnassessed(card.dimension.name) &&
      (card.dimension.name === "Social Presence" || card.dimension.name === "Content Consistency"),
  );
  const checked = cards.filter(
    (card) => !isUnassessed(card.dimension.name) && typeof card.dimension.score === "number",
  );
  if (!uncheckedSocial && checked.length === 0) return null;
  const lowest = checked.reduce<(typeof checked)[number] | null>(
    (best, card) =>
      !best || (card.dimension.score ?? 0) < (best.dimension.score ?? 0) ? card : best,
    null,
  );
  const score = lowest?.dimension.score ?? null;
  const band =
    lowest && score !== null ? DIMENSION_DETAIL[lowest.dimension.name]?.[scoreBand(score)] : undefined;
  const title = uncheckedSocial ? UNCHECKED_SOCIAL_SPOTLIGHT.title : lowest?.shortName;
  const body = uncheckedSocial
    ? UNCHECKED_SOCIAL_SPOTLIGHT.text
    : lowest?.dimension.nextStep?.trim() || band?.action;
  const href = fillNextStepHref(step.primary.href, { url: websiteUrl, publicToken, route });
  const againHref = recheckHref(websiteUrl, businessName);

  return (
    <section className="mt-8 rounded-[18px] border border-border bg-white px-6 py-6 sm:px-8">
      <h2 className="font-display text-2xl font-semibold text-foreground">{spotlight.heading}</h2>
      {title ? <p className="mt-3 font-body text-sm font-medium text-[#0D1833]">{title}</p> : null}
      {body ? <p className="mt-2 font-body text-sm leading-relaxed text-[#0D1833]">{body}</p> : null}
      <p className="mt-3 max-w-2xl font-body text-sm leading-relaxed text-muted-foreground">{spotlight.follow}</p>
      <a
        href={href}
        className="mt-6 inline-flex items-center justify-center rounded-full bg-primary px-7 py-3 font-body text-sm font-medium text-primary-foreground hover:opacity-90"
        rel="noopener noreferrer"
        onClick={() => {
          track("bf_cta_click", { route, target: "spotlight" }, { beacon: true });
        }}
      >
        {step.primary.label}
      </a>
      {uncheckedSocial ? (
        <div className="mt-4">
          <Link to={againHref} className="font-body text-sm underline hover:text-foreground">
            Add your Instagram and re-run the check →
          </Link>
        </div>
      ) : null}
    </section>
  );
}

export function HealthCheckReportView({
  scores,
  input,
  showPaywallUpsell,
  showDashboardCta,
  onGoToDashboard,
  embedded = false,
  pillarMode = false,
  bfRoute = null,
  publicToken = "",
}: HealthCheckReportViewProps) {
  const { config } = useEdition();
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
  const socialNotEntered =
    config.showUnassessedAsNotChecked &&
    !input.instagramHandle?.trim() &&
    !input.facebookUrl?.trim() &&
    Boolean(config.unassessedSocial);
  const unassessedCopy = socialNotEntered ? config.unassessedSocial : undefined;
  const contentPostingUnread =
    config.showUnassessedAsNotChecked &&
    scores.contentConsistency.unmeasured === true &&
    !socialNotEntered;
  const isUnassessedDimension = (name: string) =>
    (Boolean(unassessedCopy) &&
      (name === "Social Presence" || name === "Content Consistency")) ||
    (contentPostingUnread && name === "Content Consistency");
  const socialOrContentUnchecked =
    isUnassessedDimension("Social Presence") ||
    isUnassessedDimension("Content Consistency") ||
    scores.contentConsistency.unmeasured === true ||
    scores.socialPresence.unmeasured === true ||
    ((!input.instagramHandle?.trim() && !input.facebookUrl?.trim()) && scores.capped === true);

  const reportContent = (
    <>
      {!pillarMode && (
        <>
          <span className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 font-body text-xs font-medium text-primary">
            {config.titles.reportEyebrow}
          </span>

          <h1 className="mt-4 font-display text-4xl font-bold leading-tight text-[#0D1833] sm:text-5xl">
            Here&apos;s how your marketing scores today.
          </h1>

          <p className="mt-4 font-body text-base text-muted-foreground">
            {displayDomain
              ? `Based on publicly visible data for ${displayDomain}`
              : "Based on your answers"}
          </p>
        </>
      )}

      <div className={`flex flex-wrap gap-3 ${pillarMode ? "mt-0" : "mt-8"}`}>
        <ScoreOverviewChip
          shortName="Overall"
          score={scores.overall}
          featured
          note={unassessedCopy?.overallNote}
        />
        {scoreCards.map(({ key, shortName, dimension }) => (
          <ScoreOverviewChip
            key={key}
            shortName={shortName}
            score={dimension.score}
            href={`#section-${key}`}
            unassessedLabel={
              isUnassessedDimension(dimension.name)
                ? unassessedCopy?.label ?? config.unassessedContent?.label
                : undefined
            }
          />
        ))}
      </div>

      {config.sendScore && publicToken ? (
        <SendScoreCard
          publicToken={publicToken}
          copy={config.sendScore}
          privacyUrl={config.privacyUrl}
          route={bfRoute}
        />
      ) : null}

      {scores.socialIncompleteSummary ? (
        <p className="mt-4 rounded-xl border border-[#BA7517]/30 bg-[#FDF0CC] px-4 py-3 font-body text-sm text-[#0D1833]">
          {scores.socialIncompleteSummary}
        </p>
      ) : null}

      {scores.overallSummary ? (
        <p className="mt-4 font-body text-sm leading-relaxed text-muted-foreground">
          {socialOrContentUnchecked && config.partialScoreCapNote
            ? config.partialScoreCapNote
            : scores.overallSummary}
        </p>
      ) : null}

      {showDashboardCta && (
        <div className="mt-6 flex flex-col gap-4 rounded-2xl border border-primary/20 bg-primary/5 px-6 py-5 sm:flex-row sm:items-center">
          <div className="flex-1">
            <p className="font-body text-sm font-semibold text-foreground">
              Your scores are saved to your dashboard.
            </p>
            <p className="mt-1 font-body text-sm text-muted-foreground">
              Head to your dashboard to track progress, connect your social accounts and get a
              step-by-step plan to improve every score.
            </p>
          </div>
          <button
            type="button"
            onClick={() => onGoToDashboard?.()}
            className="shrink-0 whitespace-nowrap rounded-full bg-primary px-5 py-2.5 font-body text-sm font-semibold text-white transition-colors hover:bg-primary/90"
          >
            Go to dashboard →
          </button>
        </div>
      )}

      {config.spotlight && isBfRoute(bfRoute) && publicToken ? (
        <WhereWeStart
          route={bfRoute}
          websiteUrl={input.websiteUrl ?? ""}
          businessName={input.businessName ?? ""}
          publicToken={publicToken}
          cards={scoreCards}
          isUnassessed={isUnassessedDimension}
        />
      ) : null}

      <div className="mt-8 grid gap-6 md:grid-cols-2">
        {scoreCards
          .filter(({ key }) => key === "website" || key === "story")
          .map(({ key, dimension }) => (
            <div key={key} id={`section-${key}`} className="scroll-mt-24">
              <ScoreCard
                dimension={dimension}
                dataSourceLabel={getDataSourceLabel(dimension.name, input, displayDomain)}
                instagramFound={instagramFound}
                instagramHandle={input.instagramHandle}
                facebookUrl={input.facebookUrl}
                llmFinding={getLlmFindingForDimension(dimension.name, input.websiteScore)}
                llmNextStep={getLlmNextStepForDimension(dimension.name, input.websiteScore)}
                unassessed={isUnassessedDimension(dimension.name)}
              />
            </div>
          ))}
      </div>
      <div className="mt-6 space-y-6">
        {scoreCards
          .filter(({ key }) => key !== "website" && key !== "story")
          .map(({ key, dimension }) => (
            <div key={key} id={`section-${key}`} className="scroll-mt-24">
              <ScoreCard
                dimension={dimension}
                dataSourceLabel={getDataSourceLabel(dimension.name, input, displayDomain)}
                instagramFound={instagramFound}
                instagramHandle={input.instagramHandle}
                facebookUrl={input.facebookUrl}
                llmFinding={getLlmFindingForDimension(dimension.name, input.websiteScore)}
                llmNextStep={getLlmNextStepForDimension(dimension.name, input.websiteScore)}
                unassessed={isUnassessedDimension(dimension.name)}
              />
            </div>
          ))}
      </div>

      {showPaywallUpsell && <GuestResultsNextStepsCta currentTool="health" className="mt-8" />}

      {isBfRoute(bfRoute) && publicToken ? (
        <StoredNextStep
          route={bfRoute}
          websiteUrl={input.websiteUrl ?? ""}
          publicToken={publicToken}
        />
      ) : null}

      {showDashboardCta && (
        <div className="mt-8 rounded-2xl bg-[#0D1833] px-8 py-8 text-white">
          <h2 className="mb-3 font-display text-3xl font-semibold">Your scores are saved.</h2>
          <p className="mb-6 max-w-lg font-body text-sm text-white/70">
            Connect your Instagram and Facebook in the dashboard to unlock real engagement data and a
            step-by-step improvement plan.
          </p>
          <button
            type="button"
            onClick={() => onGoToDashboard?.()}
            className="rounded-full bg-primary px-6 py-3 font-body text-sm font-semibold text-white transition-colors hover:bg-primary/90"
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
