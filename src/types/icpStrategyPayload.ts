/** JSON shape stored in `strategies.strategy` (and formerly `icp_strategies.strategy`). */
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
    name: string;
    hook: string;
    angle: string;
    cta: string;
  }>;
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
