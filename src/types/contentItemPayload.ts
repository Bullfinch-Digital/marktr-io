/** Structured content shapes stored in content_items.content jsonb. */

export const CONTENT_ITEM_TYPES = [
  "ig_single",
  "ig_carousel",
  "ig_story",
  "reel_brief",
  "email",
  "landing_page",
] as const;

export type ContentItemType = (typeof CONTENT_ITEM_TYPES)[number];

export const CONTENT_ITEM_STATUSES = ["draft", "approved"] as const;
export type ContentItemStatus = (typeof CONTENT_ITEM_STATUSES)[number];

export type IgSingleContent = {
  on_image_text: string;
  caption: string;
  cta: string;
  visual_direction: string;
};

export type IgStoryContent = {
  on_image_text: string;
  cta: string;
  visual_direction: string;
};

export type IgCarouselSlide = {
  slide_text: string;
  visual_direction: string;
};

export type IgCarouselContent = {
  slides: IgCarouselSlide[];
  caption: string;
  cta: string;
};

export type ReelBeat = {
  on_screen_text: string;
  clip_direction: string;
};

export type ReelBriefContent = {
  hook_text: string;
  beats: ReelBeat[];
  caption: string;
  cta: string;
};

export type EmailBodySection = {
  heading: string;
  body: string;
};

export type EmailContent = {
  subject: string;
  preheader: string;
  body_sections: EmailBodySection[];
  cta: string;
};

export type LandingPageSection = {
  heading: string;
  body: string;
};

export type LandingPageContent = {
  headline: string;
  subhead: string;
  sections: LandingPageSection[];
  cta: string;
};

export type ContentPayloadByType = {
  ig_single: IgSingleContent;
  ig_story: IgStoryContent;
  ig_carousel: IgCarouselContent;
  reel_brief: ReelBriefContent;
  email: EmailContent;
  landing_page: LandingPageContent;
};

export type ContentPayload = ContentPayloadByType[ContentItemType];

export type ContentItemRow = {
  id: string;
  brand_id: string;
  user_id: string;
  strategy_lineage_id: string;
  campaign_idea_id: string | null;
  campaign_idea_name_snapshot: string | null;
  icp_lineage_id: string;
  icp_name_snapshot: string;
  suggested_content_id: string | null;
  type: ContentItemType;
  title: string;
  content: ContentPayload;
  status: ContentItemStatus;
  prompt_version: string | null;
  model: string | null;
  lineage_id: string;
  version: number;
  superseded_at: string | null;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
};
