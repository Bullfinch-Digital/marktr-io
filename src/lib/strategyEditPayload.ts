import type { ICPStrategyPayload } from "../hooks/useICPStrategy";

export type CampaignIdea = ICPStrategyPayload["campaign_ideas"][number];

export const EMPTY_CAMPAIGN_IDEA: CampaignIdea = {
  name: "",
  hook: "",
  angle: "",
  cta: "",
};

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
  next.campaign_ideas = next.campaign_ideas ?? [];
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
