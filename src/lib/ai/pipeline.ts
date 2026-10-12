import { supabase } from "../../config/supabase";
import { GENERATION_ERROR_MESSAGE, trackGenerationError } from "../generationError";
import { setLastGenerated } from "./generatedStore";
import { type AvatarAgeRange, type AvatarGender } from "../../utils/avatarLibrary";

export type GenerateICPsInput = {
  name: string;
  brandName: string;
  businessDescription: string;
  productOrService: string;
  assumedAudience: string[];
  marketingChannels: string[];
  businessType?: string;
  country?: string;
  regionOrCity?: string;
  currency?: string;
};

export type GeneratedICP = {
  name: string;
  description: string;
  industry?: string;
  company_size?: string;
  location?: string;
  goals?: string[];
  pain_points?: string[];
  budget?: string;
  decision_makers?: string[];
  tech_stack?: string[];
  challenges?: string[];
  opportunities?: string[];
  avatar_key?: string;
  avatar_gender?: AvatarGender;
  avatar_age_range?: AvatarAgeRange;
};

export type GenerateICPsResult = { icps: GeneratedICP[] };

function mockICPs(input: GenerateICPsInput): GenerateICPsResult {
  const base = `${input.brandName} / ${input.productOrService}`;
  const currency = (input.currency || "GBP").toUpperCase();
  const currencySymbol =
    currency === "GBP"
      ? "£"
      : currency === "USD"
      ? "$"
      : currency === "EUR"
      ? "€"
      : currency === "CAD"
      ? "C$"
      : currency === "AUD"
      ? "A$"
      : currency === "NZD"
      ? "NZ$"
      : currency === "AED"
      ? "د.إ"
      : currency === "INR"
      ? "₹"
      : currency === "ZAR"
      ? "R"
      : `${currency} `;

  const location =
    [input.regionOrCity, input.country].filter(Boolean).join(", ") ||
    input.country ||
    "UK";

  return {
    icps: [
      {
        name: "The Time-Poor Owner",
        description: `Busy founder looking for predictable growth for ${base} in ${location}.`,
        industry: "SME / Services",
        company_size: "1–10",
        location,
        goals: ["Get more qualified leads", "Increase conversions", "Stop wasting ad spend"],
        pain_points: ["Inconsistent pipeline", "No time for marketing", "Unclear messaging"],
        budget: `${currencySymbol}500–${currencySymbol}2,000/month`,
        decision_makers: ["Founder/Owner"],
        tech_stack: ["WordPress/Shopify", "Google Analytics", "Email tool"],
        challenges: ["Low clarity on ICP", "Poor tracking"],
        opportunities: ["Simple funnel + email capture", "Offer clarity + targeting"],
      },
    ],
  };
}

function normalise(icp: GeneratedICP) {
  return {
    name: icp.name ?? "",
    description: icp.description ?? "",
    industry: icp.industry ?? "",
    company_size: icp.company_size ?? "",
    location: icp.location ?? "",
    goals: Array.isArray(icp.goals) ? icp.goals : [],
    pain_points: Array.isArray(icp.pain_points) ? icp.pain_points : [],
    budget: icp.budget ?? "",
    decision_makers: Array.isArray(icp.decision_makers) ? icp.decision_makers : [],
    tech_stack: Array.isArray(icp.tech_stack) ? icp.tech_stack : [],
    challenges: Array.isArray(icp.challenges) ? icp.challenges : [],
    opportunities: Array.isArray(icp.opportunities) ? icp.opportunities : [],
    avatar_key: icp.avatar_key,
    avatar_gender: icp.avatar_gender,
    avatar_age_range: icp.avatar_age_range,
  };
}

function hashString(input: string) {
  let h = 0;
  for (let i = 0; i < input.length; i += 1) {
    h = (h << 5) - h + input.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

const AVAILABLE_AVATARS: Record<AvatarGender, Partial<Record<AvatarAgeRange, string[]>>> = {
  female: {
    "18-24": [
      "female/18-24/female_18-24_001.png",
      "female/18-24/female_18-24_003.png",
      "female/18-24/female_18-24_006.png",
      "female/18-24/female_18-24_009.png",
    ],
    "25-34": [
      "female/25-34/female_25-34_002.png",
      "female/25-34/female_25-34_006.png",
      "female/25-34/female_25-34_009.png",
      "female/25-34/female_25-34_013.png",
    ],
    "35-44": [
      "female/35-44/female_35-44_002.png",
      "female/35-44/female_35-44_004.png",
    ],
    "45-54": [
      "female/45-54/female_45-54_001.png",
      "female/45-54/female_45-54_002.png",
    ],
    "55-64": [
      "female/55-64/female_55-64_001.png",
      "female/55-64/female_55-64_002.png",
    ],
    "65+": [
      "female/65+/female_64+_001.png",
      "female/65+/female_64+_002.png",
    ],
  },
  male: {
    "18-24": [
      "male/18-24/male_18-24_001.png",
      "male/18-24/male_18-24_002.png",
    ],
    "25-34": [
      "male/25-34/male_25-34_001.png",
    ],
    "35-44": [
      "male/35-44/male_35-44_001.png",
    ],
    "45-54": [
      "male/45-54/male_45-54_002.png",
    ],
    "55-64": [],
    "65+": [],
  },
  non_binary: {},
};

function inferAvatarMeta(icp: ReturnType<typeof normalise>, index: number): { gender: AvatarGender; ageRange: AvatarAgeRange } {
  const text = [
    icp.name || "",
    icp.description || "",
    ...(icp.decision_makers || []),
    ...(icp.goals || []),
  ]
    .join(" ")
    .toLowerCase();

  const maleSignals = /(father|dad|male|man|gentleman|husband|he\b|him\b|his\b)/;
  const femaleSignals = /(mother|mom|mum|female|woman|wife|she\b|her\b)/;
  const seniorSignals = /(retire|retired|senior|pension|older|grandparent|65\+|over 60)/;
  const matureSignals = /(director|head of|manager|owner|founder|executive|lead)/;
  const youngSignals = /(student|undergrad|graduate|entry-level|early career|young professional|gen z|18-24)/;

  let gender: AvatarGender = index % 2 === 0 ? "female" : "male";
  if (maleSignals.test(text) && !femaleSignals.test(text)) gender = "male";
  if (femaleSignals.test(text) && !maleSignals.test(text)) gender = "female";

  let ageRange: AvatarAgeRange = "25-34";
  if (seniorSignals.test(text)) ageRange = "55-64";
  else if (matureSignals.test(text)) ageRange = "35-44";
  else if (youngSignals.test(text)) ageRange = "18-24";

  return { gender, ageRange };
}

function assignAvatars(icps: Array<ReturnType<typeof normalise>>) {
  const used = new Set<string>();
  return icps.map((icp, index) => {
    const { gender, ageRange } = inferAvatarMeta(icp, index);
    const primaryPool = AVAILABLE_AVATARS[gender]?.[ageRange] || [];
    const femaleFallbackPool = AVAILABLE_AVATARS.female["25-34"] || [];
    const pool = primaryPool.length ? primaryPool : femaleFallbackPool;

    const base = hashString(`${icp.name}-${icp.description}-${index}`) % pool.length;

    let avatarKey = pool[base];
    for (let i = 0; i < pool.length && used.has(avatarKey); i += 1) {
      avatarKey = pool[(base + i + 1) % pool.length];
    }
    used.add(avatarKey);

    return {
      ...icp,
      avatar_key: avatarKey,
      avatar_gender: gender,
      avatar_age_range: ageRange,
    };
  });
}

/**
 * generateICPs()
 * - Default: calls Supabase Edge Function `generate-icps` (real OpenAI call, server-side).
 * - Mock mode only if VITE_AI_MOCK=1
 */
export async function generateICPs(input: GenerateICPsInput): Promise<GenerateICPsResult> {
  const mock = (import.meta.env.VITE_AI_MOCK || "").trim() === "1";
  if (mock) {
    console.warn("⚠️ AI pipeline running in MOCK mode (VITE_AI_MOCK=1).");
    return mockICPs(input);
  }

  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  if (import.meta.env.DEV) {
    console.log("generateICPs payload (dev):", {
      name: input.name,
      brandName: input.brandName,
      productOrService: input.productOrService,
      country: input.country,
      regionOrCity: input.regionOrCity,
      currency: input.currency,
      assumedAudience: input.assumedAudience,
      marketingChannels: input.marketingChannels,
      sessionError,
      hasSession: !!sessionData?.session,
      userId: sessionData?.session?.user?.id,
    });
  }

  console.log("🤖 AI pipeline: invoking Supabase Edge Function generate-icps… (before invoke)");

  const { data, error } = await supabase.functions.invoke("generate-icps", {
    body: input,
  });

  console.log("🤖 AI pipeline: generate-icps invoke completed", { hasError: !!error, hasData: !!data });

  if (error) {
    console.error("generate-icps function error");
    trackGenerationError("generate-icps", error);
    throw new Error(GENERATION_ERROR_MESSAGE);
  }

  const icps = assignAvatars((data?.icps || []).map(normalise));
  if (!icps.length) {
    trackGenerationError("generate-icps");
    throw new Error(GENERATION_ERROR_MESSAGE);
  }

  console.log("✅ AI pipeline: received icps =", icps.length);

  // Store for guest users (and as a fallback for results UI)
  try {
    if (icps?.length) {
      setLastGenerated(icps);
    }
  } catch (e) {
    console.warn("AI pipeline: could not store last generated ICPs", e);
  }
  return { icps };
}
