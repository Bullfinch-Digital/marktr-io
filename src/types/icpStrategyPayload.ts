/** JSON shape stored in `strategies.strategy` (and formerly `icp_strategies.strategy`). */

export const SUGGESTED_CONTENT_TYPES = [
  "ig_single",
  "ig_carousel",
  "ig_story",
  "reel_brief",
  "email",
  "landing_page",
] as const;

export type SuggestedContentType = (typeof SUGGESTED_CONTENT_TYPES)[number];

export type SuggestedContentItem = {
  id: string;
  /** null = serves the whole strategy (not a specific campaign idea). */
  campaign_idea_id: string | null;
  /** Snapshot of the idea name at mint time; null when campaign_idea_id is null. */
  campaign_idea_name_snapshot: string | null;
  type: SuggestedContentType;
  /** One line: why this piece, for this idea, on this channel. */
  rationale: string;
};

export type ICPStrategyPayload = {
  positioning: {
    one_liner: string;
    why_us: string;
    differentiators: string[];
  };
  messaging: {
    value_props: string[];
    pain_to_promise: string[];
    objections_and_rebuttals: string[];
  };
  campaign_ideas: Array<{
    id: string;
    name: string;
    hook: string;
    angle: string;
    cta: string;
  }>;
  /**
   * Machine-readable content brief for the Content pillar.
   * Cap 1–3 at generation. Legacy strategies may have [].
   * Orphan campaign_idea_id links are resolved at render time — do not strip on save.
   */
  suggested_content: SuggestedContentItem[];
  channel_plan: {
    primary_channel: string;
    secondary_channels: string[];
    first_14_days: string[];
  };
  offer: {
    recommended_offer: string;
    lead_magnet_idea: string | null;
    landing_page_sections: string[];
  };
  ad_assets: {
    headlines: string[];
    primary_texts: string[];
    creative_briefs: string[];
  } | null;
  success_metrics: {
    kpis: string[];
    targets: string[];
  };
};
