import type {
  ContentItemType,
  ContentPayload,
  ContentPayloadByType,
  EmailBodySection,
  IgCarouselSlide,
  LandingPageSection,
  ReelBeat,
} from "../../types/contentItemPayload";
import {
  CONTENT_SECTION_LABELS,
  type ContentSectionId,
} from "../../lib/contentItemEditPayload";
import {
  ContentField,
  ContentFieldLabel,
  ContentFieldValue,
  ContentItemHeader,
  ContentStructuredItem,
} from "./ContentStructure";

type Props = {
  type: ContentItemType;
  content: ContentPayload;
  compact?: boolean;
  bare?: boolean;
  section?: ContentSectionId;
  title?: string;
};

function SectionLabel({ bare, children }: { bare: boolean; children: React.ReactNode }) {
  if (bare) return null;
  return <ContentFieldLabel>{children}</ContentFieldLabel>;
}

function wrapSection(content: React.ReactNode, bare: boolean) {
  if (!content) return null;
  if (bare) return <>{content}</>;
  return (
    <section className="rounded-design border border-brand-stroke bg-card p-4">{content}</section>
  );
}

function ScalarBlock({
  label,
  value,
  bare,
  emphasize,
  secondary,
}: {
  label: string;
  value: string;
  bare: boolean;
  emphasize?: boolean;
  secondary?: boolean;
}) {
  return wrapSection(
    <>
      <SectionLabel bare={bare}>{label}</SectionLabel>
      <div className={bare ? "" : "mt-1.5"}>
        <ContentFieldValue primary={emphasize} secondary={secondary} empty={!value.trim()}>
          {value.trim() ? value : "—"}
        </ContentFieldValue>
      </div>
    </>,
    bare
  );
}

function ObjectListBlock<T extends Record<string, string>>({
  label,
  itemLabel,
  items,
  fields,
  bare,
  compact,
  emptyMessage,
}: {
  label: string;
  itemLabel: string;
  items: T[];
  fields: Array<{ key: keyof T & string; label: string; primary?: boolean; secondary?: boolean }>;
  bare: boolean;
  compact?: boolean;
  emptyMessage: string;
}) {
  const limit = compact ? 2 : undefined;
  const shown = limit ? items.slice(0, limit) : items;

  return wrapSection(
    <>
      <SectionLabel bare={bare}>{label}</SectionLabel>
      {items.length > 0 ? (
        <div className={`space-y-5 ${bare ? "mt-2" : "mt-4"}`}>
          {shown.map((item, index) => (
            <ContentStructuredItem key={`${label}-${index}`}>
              <ContentItemHeader label={itemLabel} index={index} />
              <div className="mt-3">
                {fields.map((field) => {
                  const value = item[field.key] ?? "";
                  if (!value.trim()) return null;
                  return (
                    <ContentField
                      key={field.key}
                      label={field.label}
                      value={value}
                      primary={field.primary}
                      secondary={field.secondary}
                    />
                  );
                })}
              </div>
            </ContentStructuredItem>
          ))}
        </div>
      ) : (
        <p className="mt-2 font-['Plus_Jakarta_Sans'] text-sm text-foreground/60">{emptyMessage}</p>
      )}
    </>,
    bare
  );
}

export function ContentItemView({
  type,
  content,
  compact = false,
  bare = false,
  section,
  title,
}: Props) {
  const titleSection =
    title !== undefined
      ? wrapSection(
          <>
            <SectionLabel bare={bare}>{CONTENT_SECTION_LABELS.title}</SectionLabel>
            <h1
              className={`font-['Fraunces'] text-3xl lg:text-4xl text-foreground ${
                bare ? "" : "mt-2"
              }`}
            >
              {title || "Untitled"}
            </h1>
          </>,
          bare
        )
      : null;

  const renderScalar = (
    sectionId: ContentSectionId,
    value: string,
    emphasize?: boolean,
    secondary?: boolean
  ) =>
    ScalarBlock({
      label: CONTENT_SECTION_LABELS[sectionId],
      value,
      bare,
      emphasize,
      secondary,
    });

  let sections: Array<{ id: ContentSectionId; node: React.ReactNode }> = [];

  switch (type) {
    case "ig_single": {
      const c = content as ContentPayloadByType["ig_single"];
      sections = [
        { id: "on_image_text", node: renderScalar("on_image_text", c.on_image_text, true) },
        { id: "caption", node: renderScalar("caption", c.caption) },
        { id: "cta", node: renderScalar("cta", c.cta) },
        { id: "visual_direction", node: renderScalar("visual_direction", c.visual_direction, false, true) },
      ];
      break;
    }
    case "ig_story": {
      const c = content as ContentPayloadByType["ig_story"];
      sections = [
        { id: "on_image_text", node: renderScalar("on_image_text", c.on_image_text, true) },
        { id: "cta", node: renderScalar("cta", c.cta) },
        { id: "visual_direction", node: renderScalar("visual_direction", c.visual_direction, false, true) },
      ];
      break;
    }
    case "ig_carousel": {
      const c = content as ContentPayloadByType["ig_carousel"];
      sections = [
        {
          id: "slides",
          node: ObjectListBlock<IgCarouselSlide>({
            label: CONTENT_SECTION_LABELS.slides,
            itemLabel: "Slide",
            items: c.slides ?? [],
            fields: [
              { key: "slide_text", label: "Slide text", primary: true },
              { key: "visual_direction", label: "Visual direction", secondary: true },
            ],
            bare,
            compact,
            emptyMessage: "No slides yet.",
          }),
        },
        { id: "caption", node: renderScalar("caption", c.caption) },
        { id: "cta", node: renderScalar("cta", c.cta) },
      ];
      break;
    }
    case "reel_brief": {
      const c = content as ContentPayloadByType["reel_brief"];
      sections = [
        { id: "hook_text", node: renderScalar("hook_text", c.hook_text, true) },
        {
          id: "beats",
          node: ObjectListBlock<ReelBeat>({
            label: CONTENT_SECTION_LABELS.beats,
            itemLabel: "Scene",
            items: c.beats ?? [],
            fields: [
              { key: "on_screen_text", label: "On-screen text", primary: true },
              { key: "clip_direction", label: "Clip direction", secondary: true },
            ],
            bare,
            compact,
            emptyMessage: "No beats yet.",
          }),
        },
        { id: "caption", node: renderScalar("caption", c.caption) },
        { id: "cta", node: renderScalar("cta", c.cta) },
      ];
      break;
    }
    case "email": {
      const c = content as ContentPayloadByType["email"];
      sections = [
        { id: "subject", node: renderScalar("subject", c.subject, true) },
        { id: "preheader", node: renderScalar("preheader", c.preheader) },
        {
          id: "body_sections",
          node: ObjectListBlock<EmailBodySection>({
            label: CONTENT_SECTION_LABELS.body_sections,
            itemLabel: "Email",
            items: c.body_sections ?? [],
            fields: [
              { key: "heading", label: "Heading", primary: true },
              { key: "body", label: "Body" },
            ],
            bare,
            compact,
            emptyMessage: "No body sections yet.",
          }),
        },
        { id: "cta", node: renderScalar("cta", c.cta) },
      ];
      break;
    }
    case "landing_page": {
      const c = content as ContentPayloadByType["landing_page"];
      sections = [
        { id: "headline", node: renderScalar("headline", c.headline, true) },
        { id: "subhead", node: renderScalar("subhead", c.subhead) },
        {
          id: "sections",
          node: ObjectListBlock<LandingPageSection>({
            label: CONTENT_SECTION_LABELS.sections,
            itemLabel: "Section",
            items: c.sections ?? [],
            fields: [
              { key: "heading", label: "Heading", primary: true },
              { key: "body", label: "Body" },
            ],
            bare,
            compact,
            emptyMessage: "No sections yet.",
          }),
        },
        { id: "cta", node: renderScalar("cta", c.cta) },
      ];
      break;
    }
  }

  if (section === "title") return titleSection;
  if (section) {
    const match = sections.find((s) => s.id === section);
    return match?.node ?? null;
  }

  return (
    <div className="space-y-4">
      {titleSection}
      {sections.map((s) => (
        <div key={s.id}>{s.node}</div>
      ))}
    </div>
  );
}
