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
  return (
    <p className="font-['Inter'] text-xs uppercase tracking-wide text-foreground/55">{children}</p>
  );
}

function wrapSection(content: React.ReactNode, bare: boolean) {
  if (!content) return null;
  if (bare) return <>{content}</>;
  return (
    <section className="rounded-design border border-black/10 bg-white p-4">{content}</section>
  );
}

function ScalarBlock({
  label,
  value,
  bare,
  emphasize,
}: {
  label: string;
  value: string;
  bare: boolean;
  emphasize?: boolean;
}) {
  if (!value.trim()) {
    return wrapSection(
      <>
        <SectionLabel bare={bare}>{label}</SectionLabel>
        <p className={`font-['Inter'] text-sm text-foreground/45 ${bare ? "" : "mt-2"}`}>—</p>
      </>,
      bare
    );
  }

  return wrapSection(
    <>
      <SectionLabel bare={bare}>{label}</SectionLabel>
      <p
        className={`whitespace-pre-wrap ${
          emphasize
            ? "font-['Fraunces'] text-lg text-foreground"
            : "font-['Inter'] text-sm text-foreground/80"
        } ${bare ? "" : "mt-2"}`}
      >
        {value}
      </p>
    </>,
    bare
  );
}

function ObjectListBlock<T extends Record<string, string>>({
  label,
  items,
  fields,
  bare,
  compact,
  emptyMessage,
}: {
  label: string;
  items: T[];
  fields: Array<{ key: keyof T & string; label: string }>;
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
        <div className={`space-y-3 ${bare ? "mt-2" : "mt-3"}`}>
          {shown.map((item, index) => (
            <div
              key={`${label}-${index}`}
              className="rounded-design border border-black/10 bg-accent-grey/10 p-3"
            >
              <p className="font-['Inter'] text-xs font-medium text-foreground/55 mb-2">
                {label.replace(/s$/, "")} {index + 1}
              </p>
              {fields.map((field) => {
                const value = item[field.key] ?? "";
                if (!value.trim()) return null;
                return (
                  <div key={field.key} className="mt-1.5 first:mt-0">
                    <p className="font-['Inter'] text-xs font-medium text-foreground/60">
                      {field.label}
                    </p>
                    <p className="font-['Inter'] text-sm text-foreground/80 whitespace-pre-wrap">
                      {value}
                    </p>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      ) : (
        <p className="font-['Inter'] text-sm text-foreground/60 mt-2">{emptyMessage}</p>
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
              className={`font-['Fraunces'] text-3xl lg:text-4xl text-[#0D1833] ${
                bare ? "" : "mt-2"
              }`}
            >
              {title || "Untitled"}
            </h1>
          </>,
          bare
        )
      : null;

  const renderScalar = (sectionId: ContentSectionId, value: string, emphasize?: boolean) =>
    ScalarBlock({
      label: CONTENT_SECTION_LABELS[sectionId],
      value,
      bare,
      emphasize,
    });

  let sections: Array<{ id: ContentSectionId; node: React.ReactNode }> = [];

  switch (type) {
    case "ig_single": {
      const c = content as ContentPayloadByType["ig_single"];
      sections = [
        { id: "on_image_text", node: renderScalar("on_image_text", c.on_image_text, true) },
        { id: "caption", node: renderScalar("caption", c.caption) },
        { id: "cta", node: renderScalar("cta", c.cta) },
        { id: "visual_direction", node: renderScalar("visual_direction", c.visual_direction) },
      ];
      break;
    }
    case "ig_story": {
      const c = content as ContentPayloadByType["ig_story"];
      sections = [
        { id: "on_image_text", node: renderScalar("on_image_text", c.on_image_text, true) },
        { id: "cta", node: renderScalar("cta", c.cta) },
        { id: "visual_direction", node: renderScalar("visual_direction", c.visual_direction) },
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
            items: c.slides ?? [],
            fields: [
              { key: "slide_text", label: "Slide text" },
              { key: "visual_direction", label: "Visual direction" },
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
            items: c.beats ?? [],
            fields: [
              { key: "on_screen_text", label: "On-screen text" },
              { key: "clip_direction", label: "Clip direction" },
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
            items: c.body_sections ?? [],
            fields: [
              { key: "heading", label: "Heading" },
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
            items: c.sections ?? [],
            fields: [
              { key: "heading", label: "Heading" },
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
