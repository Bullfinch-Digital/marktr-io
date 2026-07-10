import type { ContentItemType, ContentPayload } from "../types/contentItemPayload";
import { normalizeContentPayload } from "./contentItemPayload";

export type ContentSectionId =
  | "title"
  | "on_image_text"
  | "caption"
  | "cta"
  | "visual_direction"
  | "hook_text"
  | "slides"
  | "beats"
  | "subject"
  | "preheader"
  | "body_sections"
  | "headline"
  | "subhead"
  | "sections";

export const CONTENT_SECTION_LABELS: Record<ContentSectionId, string> = {
  title: "Title",
  on_image_text: "On-image text",
  caption: "Caption",
  cta: "CTA",
  visual_direction: "Visual direction",
  hook_text: "Hook",
  slides: "Slides",
  beats: "Beats",
  subject: "Subject",
  preheader: "Preheader",
  body_sections: "Body sections",
  headline: "Headline",
  subhead: "Subhead",
  sections: "Sections",
};

export function sectionsForContentType(type: ContentItemType): ContentSectionId[] {
  switch (type) {
    case "ig_single":
      return ["title", "on_image_text", "caption", "cta", "visual_direction"];
    case "ig_story":
      return ["title", "on_image_text", "cta", "visual_direction"];
    case "ig_carousel":
      return ["title", "slides", "caption", "cta"];
    case "reel_brief":
      return ["title", "hook_text", "beats", "caption", "cta"];
    case "email":
      return ["title", "subject", "preheader", "body_sections", "cta"];
    case "landing_page":
      return ["title", "headline", "subhead", "sections", "cta"];
  }
}

export type ContentDraft = {
  title: string;
  content: ContentPayload;
};

export function normalizeContentDraft(
  type: ContentItemType,
  title: string,
  content: ContentPayload
): ContentDraft {
  return {
    title: title.trim(),
    content: normalizeContentPayload(type, content),
  };
}

export function serializeContentDraft(type: ContentItemType, draft: ContentDraft): string {
  const normalized = normalizeContentDraft(type, draft.title, draft.content);
  return JSON.stringify(normalized);
}

export function serializeContentSection(
  type: ContentItemType,
  section: ContentSectionId,
  draft: ContentDraft
): string {
  const normalized = normalizeContentDraft(type, draft.title, draft.content);
  if (section === "title") return JSON.stringify({ title: normalized.title });
  const content = normalized.content as Record<string, unknown>;
  return JSON.stringify(content[section] ?? null);
}

export function getStagedContentSections(
  type: ContentItemType,
  saved: ContentDraft,
  draft: ContentDraft
): ContentSectionId[] {
  return sectionsForContentType(type).filter(
    (section) =>
      serializeContentSection(type, section, saved) !==
      serializeContentSection(type, section, draft)
  );
}

export type ContentSectionSnapshot = ContentDraft;

export function captureContentSectionSnapshot(
  type: ContentItemType,
  draft: ContentDraft
): ContentSectionSnapshot {
  return normalizeContentDraft(type, draft.title, draft.content);
}

export function applyContentSectionSnapshot(
  type: ContentItemType,
  section: ContentSectionId,
  draft: ContentDraft,
  snapshot: ContentSectionSnapshot
): ContentDraft {
  const nextContent = { ...draft.content } as Record<string, unknown>;
  const snapContent = snapshot.content as Record<string, unknown>;

  if (section === "title") {
    return normalizeContentDraft(type, snapshot.title, draft.content);
  }

  nextContent[section] = snapContent[section];
  return normalizeContentDraft(type, draft.title, nextContent as ContentPayload);
}

export function patchContentSection(
  type: ContentItemType,
  draft: ContentDraft,
  section: ContentSectionId,
  value: unknown
): ContentDraft {
  if (section === "title") {
    return normalizeContentDraft(type, String(value ?? ""), draft.content);
  }
  const nextContent = { ...(draft.content as Record<string, unknown>), [section]: value };
  return normalizeContentDraft(type, draft.title, nextContent as ContentPayload);
}
