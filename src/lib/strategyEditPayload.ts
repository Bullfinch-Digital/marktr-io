import type { ICPStrategyPayload } from "../types/icpStrategyPayload";

export type CampaignIdea = ICPStrategyPayload["campaign_ideas"][number];

export function mintCampaignIdeaId(): string {
  return crypto.randomUUID();
}

export function createEmptyCampaignIdea(): CampaignIdea {
  return {
    id: mintCampaignIdeaId(),
    name: "",
    hook: "",
    angle: "",
    cta: "",
  };
}

/** @deprecated Prefer createEmptyCampaignIdea() so each card gets a fresh id. */
export const EMPTY_CAMPAIGN_IDEA: CampaignIdea = createEmptyCampaignIdea();

export function ensureCampaignIdeaIds(
  ideas: Array<Partial<CampaignIdea> & { id?: string }> | null | undefined
): CampaignIdea[] {
  return (ideas ?? []).map((idea) => ({
    id: typeof idea.id === "string" && idea.id.trim() ? idea.id.trim() : mintCampaignIdeaId(),
    name: idea.name ?? "",
    hook: idea.hook ?? "",
    angle: idea.angle ?? "",
    cta: idea.cta ?? "",
  }));
}

export function cloneStrategyPayload(strategy: ICPStrategyPayload): ICPStrategyPayload {
  return structuredClone(strategy);
}

export function normalizeStrategyPayload(strategy: ICPStrategyPayload): ICPStrategyPayload {
  const next = cloneStrategyPayload(strategy);
  next.positioning = {
    one_liner: next.positioning?.one_liner ?? "",
    why_us: next.positioning?.why_us ?? "",
    differentiators: next.positioning?.differentiators ?? [],
  };
  next.messaging = {
    value_props: next.messaging?.value_props ?? [],
    pain_to_promise: next.messaging?.pain_to_promise ?? [],
    objections_and_rebuttals: next.messaging?.objections_and_rebuttals ?? [],
  };
  next.campaign_ideas = ensureCampaignIdeaIds(next.campaign_ideas);
  next.channel_plan = {
    primary_channel: next.channel_plan?.primary_channel ?? "",
    secondary_channels: next.channel_plan?.secondary_channels ?? [],
    first_14_days: next.channel_plan?.first_14_days ?? [],
  };
  next.offer = {
    recommended_offer: next.offer?.recommended_offer ?? "",
    lead_magnet_idea: next.offer?.lead_magnet_idea ?? null,
    landing_page_sections: next.offer?.landing_page_sections ?? [],
  };
  next.success_metrics = {
    kpis: next.success_metrics?.kpis ?? [],
    targets: next.success_metrics?.targets ?? [],
  };
  return next;
}

export function serializeStrategyDraft(title: string, strategy: ICPStrategyPayload): string {
  return JSON.stringify({ title: title.trim(), strategy: normalizeStrategyPayload(strategy) });
}

export function createEmptyAdAssets(): NonNullable<ICPStrategyPayload["ad_assets"]> {
  return {
    headlines: [],
    primary_texts: [],
    creative_briefs: [],
  };
}

export type StrategySectionId =
  | "title"
  | "positioning"
  | "messaging"
  | "campaign_ideas"
  | "channel_plan"
  | "offer"
  | "success_metrics"
  | "ad_assets";

export const STRATEGY_SECTION_IDS: StrategySectionId[] = [
  "title",
  "positioning",
  "messaging",
  "campaign_ideas",
  "channel_plan",
  "offer",
  "success_metrics",
  "ad_assets",
];

export function serializeStrategySection(
  section: StrategySectionId,
  title: string,
  strategy: ICPStrategyPayload
): string {
  const normalized = normalizeStrategyPayload(strategy);
  switch (section) {
    case "title":
      return JSON.stringify({ title: title.trim() });
    case "positioning":
      return JSON.stringify(normalized.positioning);
    case "messaging":
      return JSON.stringify(normalized.messaging);
    case "campaign_ideas":
      return JSON.stringify(normalized.campaign_ideas);
    case "channel_plan":
      return JSON.stringify(normalized.channel_plan);
    case "offer":
      return JSON.stringify(normalized.offer);
    case "success_metrics":
      return JSON.stringify(normalized.success_metrics);
    case "ad_assets":
      return JSON.stringify(normalized.ad_assets ?? null);
  }
}

export function getStagedStrategySections(
  savedTitle: string,
  savedStrategy: ICPStrategyPayload,
  draftTitle: string,
  draftStrategy: ICPStrategyPayload
): StrategySectionId[] {
  return STRATEGY_SECTION_IDS.filter(
    (section) =>
      serializeStrategySection(section, savedTitle, savedStrategy) !==
      serializeStrategySection(section, draftTitle, draftStrategy)
  );
}

export type StrategySectionSnapshot = {
  title: string;
  strategy: ICPStrategyPayload;
};

export function captureStrategySectionSnapshot(
  section: StrategySectionId,
  title: string,
  strategy: ICPStrategyPayload
): StrategySectionSnapshot {
  const normalized = normalizeStrategyPayload(strategy);
  switch (section) {
    case "title":
      return { title, strategy: cloneStrategyPayload(normalized) };
    case "positioning":
      return {
        title,
        strategy: { ...normalized, positioning: cloneStrategyPayload(normalized).positioning },
      };
    case "messaging":
      return {
        title,
        strategy: { ...normalized, messaging: cloneStrategyPayload(normalized).messaging },
      };
    case "campaign_ideas":
      return {
        title,
        strategy: {
          ...normalized,
          campaign_ideas: cloneStrategyPayload(normalized).campaign_ideas,
        },
      };
    case "channel_plan":
      return {
        title,
        strategy: { ...normalized, channel_plan: cloneStrategyPayload(normalized).channel_plan },
      };
    case "offer":
      return {
        title,
        strategy: { ...normalized, offer: cloneStrategyPayload(normalized).offer },
      };
    case "success_metrics":
      return {
        title,
        strategy: {
          ...normalized,
          success_metrics: cloneStrategyPayload(normalized).success_metrics,
        },
      };
    case "ad_assets":
      return {
        title,
        strategy: {
          ...normalized,
          ad_assets: normalized.ad_assets ? cloneStrategyPayload(normalized).ad_assets : null,
        },
      };
  }
}

export function applyStrategySectionSnapshot(
  section: StrategySectionId,
  draftTitle: string,
  draftStrategy: ICPStrategyPayload,
  snapshot: StrategySectionSnapshot
): { title: string; strategy: ICPStrategyPayload } {
  const next = cloneStrategyPayload(draftStrategy);
  switch (section) {
    case "title":
      return { title: snapshot.title, strategy: next };
    case "positioning":
      return { title: draftTitle, strategy: { ...next, positioning: snapshot.strategy.positioning } };
    case "messaging":
      return { title: draftTitle, strategy: { ...next, messaging: snapshot.strategy.messaging } };
    case "campaign_ideas":
      return {
        title: draftTitle,
        strategy: { ...next, campaign_ideas: snapshot.strategy.campaign_ideas },
      };
    case "channel_plan":
      return {
        title: draftTitle,
        strategy: { ...next, channel_plan: snapshot.strategy.channel_plan },
      };
    case "offer":
      return { title: draftTitle, strategy: { ...next, offer: snapshot.strategy.offer } };
    case "success_metrics":
      return {
        title: draftTitle,
        strategy: { ...next, success_metrics: snapshot.strategy.success_metrics },
      };
    case "ad_assets":
      return {
        title: draftTitle,
        strategy: { ...next, ad_assets: snapshot.strategy.ad_assets ?? null },
      };
  }
}
