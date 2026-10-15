import { supabase } from "../config/supabase";
import { generateICPs } from "./ai/pipeline";
import { parseBrandStoryFromApi, type BrandStoryOutput } from "./brandStory";
import { labeledStoryAnswers, padStoryAnswers } from "./brandStoryAnswers";
import {
  buildStoryStoredPayload,
  insertBrandStoryResult,
} from "./brandStoryPersistence";
import { resolveBrandIdForIcpOps } from "./icpBrandAttach";
import { resolveScopedBrandId } from "./brandScopedReads";
import { extractDomain } from "../components/healthCheck/HealthCheckReportView";
import {
  applyFindingsToWebsiteScore,
  augmentFindingsWithPriorRun,
  mergeHealthFindings,
  parseApiFindings,
  type HealthCheckWebsiteScore,
} from "./healthCheckFindings";
import { parseScoreWebsiteResponse } from "./healthCheck";
import { calculateScores } from "./healthCheckScoring";
import {
  fetchLatestHealthCheck,
  persistHealthCheckForActiveBrand,
  resolveBrandIdForHealthWrite,
} from "./healthCheckPersistence";
import { buildPriorRunPayload } from "./healthCheckPriorRun";
import { fetchBrandStoryPillarForHealth } from "./healthCheckPillarContext";
import { setGuestBrandSeed } from "./guestBrandSeed";
import { setGuestHealthCheck, type GuestHealthCheck } from "./guestHealthCheck";
import { flushGuestICPsToSupabase, setGuestICPs, type GuestICP } from "./guestICP";
import { setGuestStory } from "./guestStory";
import {
  commitStoryAnswerToGuestContext,
  getGuestBusinessName,
  getGuestIdentityEmail,
  getGuestIdentityName,
  updateGuestContext,
} from "./guestContext";
import { trackGenerationError } from "./generationError";
import { ensureBrandForPostAuth } from "./ensureGuestBrand";

export type StartHealthResult =
  | { status: "skipped" }
  | { status: "success"; guest: GuestHealthCheck }
  | { status: "error" };

export type StartStoryResult =
  | { status: "success"; story: BrandStoryOutput; answers: string[] }
  | { status: "error" };

export type StartIcpResult =
  | { status: "success"; icps: GuestICP[] }
  | { status: "error" };

type HealthInput = {
  websiteUrl: string;
  businessName: string;
  noWebsite: boolean;
  email: string;
};

type HealthJob = {
  key: string;
  promise: Promise<StartHealthResult>;
};

let healthJob: HealthJob | null = null;

function healthKey(input: HealthInput): string {
  return JSON.stringify({
    websiteUrl: input.websiteUrl.trim(),
    businessName: input.businessName.trim(),
    noWebsite: input.noWebsite,
    email: input.email,
  });
}

async function persistGuestHealth(
  guest: GuestHealthCheck,
  businessName: string,
  userId?: string,
  activeBrandId?: string | null,
  brands?: { id: string }[],
): Promise<void> {
  setGuestHealthCheck(guest);
  if (!userId || !brands) return;
  const ensuredBrandId = await ensureBrandForPostAuth(userId);
  const scores = calculateScores({
    websiteUrl: guest.input.websiteUrl,
    instagramHandle: guest.input.instagramHandle,
    facebookUrl: guest.input.facebookUrl,
    email: guest.input.email || getGuestIdentityEmail() || "",
    websiteScore: guest.websiteScore ?? null,
    businessName,
  });
  await persistHealthCheckForActiveBrand({
    userId,
    contextBrandId: ensuredBrandId ?? resolveScopedBrandId(activeBrandId ?? null, brands),
    brands,
    scores,
    websiteScore: guest.websiteScore ?? null,
    input: {
      websiteUrl: guest.input.websiteUrl,
      instagramHandle: guest.input.instagramHandle,
      facebookUrl: guest.input.facebookUrl,
      businessName,
    },
  });
}

async function runHealthCheck(input: HealthInput): Promise<StartHealthResult> {
  const websiteUrl = input.websiteUrl.trim();
  if (input.noWebsite || !websiteUrl) {
    return { status: "skipped" };
  }

  try {
    let priorRun = undefined;
    let pillarContext:
      | { brandStory: Awaited<ReturnType<typeof fetchBrandStoryPillarForHealth>> }
      | undefined;

    const { data: sessionData } = await supabase.auth.getSession();
    const user = sessionData?.session?.user;
    const isLoggedIn = Boolean(user && !(user as { is_anonymous?: boolean }).is_anonymous);

    if (isLoggedIn && user?.id) {
      const { brandId } = await resolveBrandIdForHealthWrite(user.id, null, []);
      if (brandId) {
        const [priorRow, brandStoryPillar] = await Promise.all([
          fetchLatestHealthCheck(user.id, brandId),
          fetchBrandStoryPillarForHealth(user.id, brandId),
        ]);
        priorRun = buildPriorRunPayload(priorRow);
        if (brandStoryPillar) {
          pillarContext = { brandStory: brandStoryPillar };
        }
      }
    }

    const { data, error: invokeError } = await supabase.functions.invoke("score-website", {
      body: {
        websiteUrl,
        businessName: input.businessName.trim() || undefined,
        ...(priorRun ? { priorRun } : {}),
        ...(pillarContext ? { pillarContext } : {}),
      },
    });

    const payload = data as { error?: unknown; facts?: unknown; findings?: unknown } | null;
    if (invokeError || payload?.error || payload?.facts === undefined) {
      trackGenerationError("score-website", invokeError ?? payload);
      return { status: "error" };
    }

    const parsed = parseScoreWebsiteResponse(data, {
      websiteUrl,
      instagramHandle: "",
      facebookUrl: "",
      domain: extractDomain(websiteUrl),
    });
    const baseWebsiteScore = {
      score: parsed.deterministic.scores.websiteClarity,
      observation: parsed.observation,
      strengths: parsed.strengths,
      gaps: parsed.gaps,
      storyAssessment: null,
      socialScores: null,
      findings: parseApiFindings(payload.findings),
      deterministic: parsed.deterministic,
    };
    const email = input.email || getGuestIdentityEmail() || "";
    const scoresPreview = calculateScores({
      websiteUrl,
      instagramHandle: "",
      facebookUrl: "",
      businessName: input.businessName.trim(),
      email,
      websiteScore: baseWebsiteScore,
    });
    const websiteScore = {
      ...applyFindingsToWebsiteScore(
        baseWebsiteScore as HealthCheckWebsiteScore,
        augmentFindingsWithPriorRun(baseWebsiteScore.findings, priorRun, scoresPreview),
      ),
      storyAssessment: null,
      socialScores: null,
    };
    const scores = calculateScores({
      websiteUrl,
      instagramHandle: "",
      facebookUrl: "",
      businessName: input.businessName.trim(),
      email,
      websiteScore,
    });
    const guest: GuestHealthCheck = {
      input: {
        websiteUrl,
        instagramHandle: undefined,
        facebookUrl: undefined,
        email,
      },
      scores: {
        websiteClarity: scores.websiteClarity.score,
        brandStory: scores.brandStory.score,
        contentConsistency: scores.contentConsistency.score,
        socialPresence: scores.socialPresence.score,
        overall: scores.overall,
        lowestDimension: scores.lowestDimension,
        lowestScore: scores.lowestScore,
      },
      websiteScore,
      findings: mergeHealthFindings(scores, websiteScore.findings),
      created_at: new Date().toISOString(),
    };
    return { status: "success", guest };
  } catch (error) {
    trackGenerationError("score-website", error);
    return { status: "error" };
  }
}

export function startHealthCheckInBackground(input: HealthInput): Promise<StartHealthResult> {
  const key = healthKey(input);
  if (healthJob && healthJob.key === key) {
    return healthJob.promise;
  }
  const promise = runHealthCheck(input);
  healthJob = { key, promise };
  return promise;
}

export async function finishHealthCheck(opts: {
  input: HealthInput;
  userId?: string;
  activeBrandId?: string | null;
  brands?: { id: string }[];
}): Promise<StartHealthResult> {
  const result = await startHealthCheckInBackground(opts.input);
  if (result.status === "success") {
    await persistGuestHealth(
      result.guest,
      opts.input.businessName,
      opts.userId,
      opts.activeBrandId,
      opts.brands,
    );
  }
  return result;
}

export async function generateStartStory(opts: {
  answers: string[];
  businessName?: string;
  email?: string;
  userId?: string;
  activeBrandId?: string | null;
  brands?: { id: string }[];
}): Promise<StartStoryResult> {
  const labeled = labeledStoryAnswers(opts.answers);
  if (labeled.length === 0) {
    return { status: "error" };
  }

  const email = opts.email?.trim() || getGuestIdentityEmail() || "";
  const businessName = opts.businessName?.trim() || getGuestBusinessName() || "";
  const padded = padStoryAnswers(opts.answers);

  try {
    const { data, error: invokeError } = await supabase.functions.invoke("generate-brand-story", {
      body: {
        answers: labeled,
        ...(email ? { email } : {}),
        ...(businessName ? { businessName } : {}),
      },
    });
    if (invokeError) throw invokeError;
    const story = parseBrandStoryFromApi(data as Record<string, unknown> | null);
    if (!story) throw new Error("Invalid story response from server.");

    setGuestStory({
      answers: padded,
      email,
      output: story,
      created_at: new Date().toISOString(),
    });
    padded.forEach((answer, index) => {
      if (answer) commitStoryAnswerToGuestContext(index, answer);
    });

    if (opts.userId) {
      const brandId =
        (await ensureBrandForPostAuth(opts.userId)) ??
        resolveScopedBrandId(opts.activeBrandId ?? null, opts.brands ?? []) ??
        (await resolveBrandIdForIcpOps(opts.userId, opts.activeBrandId));
      if (brandId) {
        const payload = buildStoryStoredPayload(story, {
          answers: padded,
          email,
          brandId,
        });
        await insertBrandStoryResult(opts.userId, brandId, payload);
      }
    }

    return { status: "success", story, answers: padded };
  } catch (error) {
    trackGenerationError("generate-brand-story", error);
    return { status: "error" };
  }
}

export async function generateStartIcps(opts: {
  answers: string[];
  platforms: string[];
  businessName: string;
  story: BrandStoryOutput | null;
  userId?: string;
}): Promise<StartIcpResult> {
  const whatYouDo = opts.answers[0]?.trim() || "";
  const bestCustomer = opts.answers[3]?.trim() || "";
  const storyBlocks = opts.story
    ? [
        opts.story.foundingStory,
        opts.story.pointOfView,
        opts.story.positioningStatement,
        opts.story.brandPurpose,
      ]
    : [];
  const businessDescription = [whatYouDo, ...storyBlocks].filter(Boolean).join("\n\n");
  const name = getGuestIdentityName() || "";
  const brandName = opts.businessName.trim() || getGuestBusinessName() || "";

  try {
    const result = await generateICPs({
      name,
      brandName,
      businessDescription,
      productOrService: whatYouDo,
      assumedAudience: bestCustomer ? [bestCustomer] : [],
      marketingChannels: opts.platforms,
      country: "",
      regionOrCity: "",
      currency: "GBP",
    });
    const icps = (result.icps || []) as GuestICP[];
    if (!icps.length) throw new Error("No ICPs");

    setGuestICPs(icps);
    setGuestBrandSeed({
      brandName,
      businessDescription: whatYouDo,
      productOrService: whatYouDo,
      businessType: "B2C",
      assumedAudience: bestCustomer ? [bestCustomer] : [],
      marketingChannels: opts.platforms,
      country: "",
      regionOrCity: "",
      currency: "GBP",
      created_at: new Date().toISOString(),
    });
    updateGuestContext({
      business: {
        businessName: brandName || undefined,
      },
    });

    if (opts.userId) {
      const brandId = await ensureBrandForPostAuth(opts.userId);
      await flushGuestICPsToSupabase(opts.userId, { brandId });
    }

    return { status: "success", icps };
  } catch {
    return { status: "error" };
  }
}
