import { Input } from "../ui/input";
import { Textarea } from "../ui/textarea";
import type {
  ContentItemType,
  EmailBodySection,
  IgCarouselSlide,
  LandingPageSection,
  ReelBeat,
} from "../../types/contentItemPayload";
import {
  CONTENT_SECTION_LABELS,
  patchContentSection,
  type ContentDraft,
  type ContentSectionId,
} from "../../lib/contentItemEditPayload";
import { EditableObjectListSection } from "./EditableObjectListSection";

type Props = {
  type: ContentItemType;
  draft: ContentDraft;
  section: ContentSectionId;
  bare?: boolean;
  isLocked?: boolean;
  onChange: (draft: ContentDraft) => void;
};

function SectionCard({ children, bare }: { children: React.ReactNode; bare?: boolean }) {
  if (bare) return <>{children}</>;
  return (
    <div className="bg-background border border-black rounded-design p-6 shadow-md space-y-4">
      {children}
    </div>
  );
}

function ScalarField({
  label,
  value,
  multiline,
  isLocked,
  onChange,
}: {
  label: string;
  value: string;
  multiline?: boolean;
  isLocked?: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-2">
      <label className="font-['Inter'] text-sm text-foreground/70">{label}</label>
      {multiline ? (
        <Textarea
          value={value}
          disabled={isLocked}
          onChange={(e) => onChange(e.target.value)}
          rows={4}
          className="border-black rounded-design resize-none"
        />
      ) : (
        <Input
          value={value}
          disabled={isLocked}
          onChange={(e) => onChange(e.target.value)}
          className="border-black rounded-design"
        />
      )}
    </div>
  );
}

function emptySlide(): IgCarouselSlide {
  return { slide_text: "", visual_direction: "" };
}

function emptyBeat(): ReelBeat {
  return { on_screen_text: "", clip_direction: "" };
}

function emptyEmailSection(): EmailBodySection {
  return { heading: "", body: "" };
}

function emptyLandingSection(): LandingPageSection {
  return { heading: "", body: "" };
}

export function ContentEditForm({
  type,
  draft,
  section,
  bare = false,
  isLocked = false,
  onChange,
}: Props) {
  const patch = (sectionId: ContentSectionId, value: unknown) => {
    onChange(patchContentSection(type, draft, sectionId, value));
  };

  const content = draft.content as Record<string, unknown>;

  if (section === "title") {
    return (
      <SectionCard bare={bare}>
        <ScalarField
          label={CONTENT_SECTION_LABELS.title}
          value={draft.title}
          isLocked={isLocked}
          onChange={(value) => patch("title", value)}
        />
      </SectionCard>
    );
  }

  if (section === "slides" && type === "ig_carousel") {
    const slides = (content.slides as IgCarouselSlide[]) ?? [];
    return (
      <SectionCard bare={bare}>
        <EditableObjectListSection
          title={CONTENT_SECTION_LABELS.slides}
          items={slides}
          fields={[
            { key: "slide_text", label: "Slide text", multiline: true },
            { key: "visual_direction", label: "Visual direction", multiline: true },
          ]}
          createEmpty={emptySlide}
          getKey={(_, i) => `slide-${i}`}
          isLocked={isLocked}
          onChange={(items) => patch("slides", items)}
          itemLabel="Slide"
          addLabel="Add slide"
        />
      </SectionCard>
    );
  }

  if (section === "beats" && type === "reel_brief") {
    const beats = (content.beats as ReelBeat[]) ?? [];
    return (
      <SectionCard bare={bare}>
        <EditableObjectListSection
          title={CONTENT_SECTION_LABELS.beats}
          items={beats}
          fields={[
            { key: "on_screen_text", label: "On-screen text", multiline: true },
            { key: "clip_direction", label: "Clip direction", multiline: true },
          ]}
          createEmpty={emptyBeat}
          getKey={(_, i) => `beat-${i}`}
          isLocked={isLocked}
          onChange={(items) => patch("beats", items)}
          itemLabel="Beat"
          addLabel="Add beat"
        />
      </SectionCard>
    );
  }

  if (section === "body_sections" && type === "email") {
    const bodySections = (content.body_sections as EmailBodySection[]) ?? [];
    return (
      <SectionCard bare={bare}>
        <EditableObjectListSection
          title={CONTENT_SECTION_LABELS.body_sections}
          items={bodySections}
          fields={[
            { key: "heading", label: "Heading" },
            { key: "body", label: "Body", multiline: true },
          ]}
          createEmpty={emptyEmailSection}
          getKey={(_, i) => `body-${i}`}
          isLocked={isLocked}
          onChange={(items) => patch("body_sections", items)}
          itemLabel="Section"
          addLabel="Add body section"
        />
      </SectionCard>
    );
  }

  if (section === "sections" && type === "landing_page") {
    const pageSections = (content.sections as LandingPageSection[]) ?? [];
    return (
      <SectionCard bare={bare}>
        <EditableObjectListSection
          title={CONTENT_SECTION_LABELS.sections}
          items={pageSections}
          fields={[
            { key: "heading", label: "Heading" },
            { key: "body", label: "Body", multiline: true },
          ]}
          createEmpty={emptyLandingSection}
          getKey={(_, i) => `section-${i}`}
          isLocked={isLocked}
          onChange={(items) => patch("sections", items)}
          itemLabel="Section"
          addLabel="Add section"
        />
      </SectionCard>
    );
  }

  const scalarMultiline =
    section === "caption" ||
    section === "visual_direction" ||
    section === "on_image_text" ||
    section === "hook_text" ||
    section === "subhead";

  const value = String(content[section] ?? "");

  return (
    <SectionCard bare={bare}>
      <ScalarField
        label={CONTENT_SECTION_LABELS[section]}
        value={value}
        multiline={scalarMultiline}
        isLocked={isLocked}
        onChange={(next) => patch(section, next)}
      />
    </SectionCard>
  );
}
