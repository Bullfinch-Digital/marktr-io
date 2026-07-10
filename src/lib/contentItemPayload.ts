import type {
  ContentItemType,
  ContentPayload,
  ContentPayloadByType,
  EmailBodySection,
  IgCarouselSlide,
  LandingPageSection,
  ReelBeat,
} from "../types/contentItemPayload";
import { CONTENT_ITEM_TYPES } from "../types/contentItemPayload";

function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function normalizeCarouselSlides(raw: unknown): IgCarouselSlide[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((slide) => ({
    slide_text: asString((slide as IgCarouselSlide)?.slide_text),
    visual_direction: asString((slide as IgCarouselSlide)?.visual_direction),
  }));
}

function normalizeReelBeats(raw: unknown): ReelBeat[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((beat) => ({
    on_screen_text: asString((beat as ReelBeat)?.on_screen_text),
    clip_direction: asString((beat as ReelBeat)?.clip_direction),
  }));
}

function normalizeEmailSections(raw: unknown): EmailBodySection[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((section) => ({
    heading: asString((section as EmailBodySection)?.heading),
    body: asString((section as EmailBodySection)?.body),
  }));
}

function normalizeLandingSections(raw: unknown): LandingPageSection[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((section) => ({
    heading: asString((section as LandingPageSection)?.heading),
    body: asString((section as LandingPageSection)?.body),
  }));
}

export function isContentItemType(value: unknown): value is ContentItemType {
  return typeof value === "string" && (CONTENT_ITEM_TYPES as readonly string[]).includes(value);
}

export function normalizeIgSingleContent(raw: unknown): ContentPayloadByType["ig_single"] {
  const src = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  return {
    on_image_text: asString(src.on_image_text),
    caption: asString(src.caption),
    cta: asString(src.cta),
    visual_direction: asString(src.visual_direction),
  };
}

export function normalizeIgStoryContent(raw: unknown): ContentPayloadByType["ig_story"] {
  const src = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  return {
    on_image_text: asString(src.on_image_text),
    cta: asString(src.cta),
    visual_direction: asString(src.visual_direction),
  };
}

export function normalizeIgCarouselContent(raw: unknown): ContentPayloadByType["ig_carousel"] {
  const src = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  return {
    slides: normalizeCarouselSlides(src.slides),
    caption: asString(src.caption),
    cta: asString(src.cta),
  };
}

export function normalizeReelBriefContent(raw: unknown): ContentPayloadByType["reel_brief"] {
  const src = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  return {
    hook_text: asString(src.hook_text),
    beats: normalizeReelBeats(src.beats),
    caption: asString(src.caption),
    cta: asString(src.cta),
  };
}

export function normalizeEmailContent(raw: unknown): ContentPayloadByType["email"] {
  const src = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  return {
    subject: asString(src.subject),
    preheader: asString(src.preheader),
    body_sections: normalizeEmailSections(src.body_sections),
    cta: asString(src.cta),
  };
}

export function normalizeLandingPageContent(raw: unknown): ContentPayloadByType["landing_page"] {
  const src = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  return {
    headline: asString(src.headline),
    subhead: asString(src.subhead),
    sections: normalizeLandingSections(src.sections),
    cta: asString(src.cta),
  };
}

export function normalizeContentPayload(type: ContentItemType, raw: unknown): ContentPayload {
  switch (type) {
    case "ig_single":
      return normalizeIgSingleContent(raw);
    case "ig_story":
      return normalizeIgStoryContent(raw);
    case "ig_carousel":
      return normalizeIgCarouselContent(raw);
    case "reel_brief":
      return normalizeReelBriefContent(raw);
    case "email":
      return normalizeEmailContent(raw);
    case "landing_page":
      return normalizeLandingPageContent(raw);
  }
}

export function createEmptyContentPayload(type: ContentItemType): ContentPayload {
  return normalizeContentPayload(type, {});
}
