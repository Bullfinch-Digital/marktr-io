import type { ContentItemWithComposition } from "../hooks/useContentItems";
import type {
  ContentItemType,
  ContentPayload,
  EmailContent,
  IgCarouselContent,
  IgSingleContent,
  IgStoryContent,
  LandingPageContent,
  ReelBriefContent,
} from "../types/contentItemPayload";
import { CONTENT_TYPE_LABELS } from "../lib/contentTypeLabels";
import { createTextPdf, downloadCsv, sanitizeExportFilename } from "./pdfTextExport";

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso || "";
  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

type BriefSection = { heading: string; body?: string; bullets?: string[] };

function briefSectionsForType(type: ContentItemType, content: ContentPayload): BriefSection[] {
  switch (type) {
    case "ig_single": {
      const c = content as IgSingleContent;
      return [
        { heading: "On-image text", body: c.on_image_text },
        { heading: "Caption", body: c.caption },
        { heading: "CTA", body: c.cta },
        { heading: "Visual direction", body: c.visual_direction },
      ];
    }
    case "ig_story": {
      const c = content as IgStoryContent;
      return [
        { heading: "On-image text", body: c.on_image_text },
        { heading: "CTA", body: c.cta },
        { heading: "Visual direction", body: c.visual_direction },
      ];
    }
    case "ig_carousel": {
      const c = content as IgCarouselContent;
      const slides = (c.slides || []).flatMap((slide, i) => [
        {
          heading: `Slide ${i + 1} — text`,
          body: slide.slide_text,
        },
        {
          heading: `Slide ${i + 1} — visual direction`,
          body: slide.visual_direction,
        },
      ]);
      return [
        ...slides,
        { heading: "Caption", body: c.caption },
        { heading: "CTA", body: c.cta },
      ];
    }
    case "reel_brief": {
      const c = content as ReelBriefContent;
      const beats = (c.beats || []).flatMap((beat, i) => [
        {
          heading: `Beat ${i + 1} — on-screen text`,
          body: beat.on_screen_text,
        },
        {
          heading: `Beat ${i + 1} — clip direction`,
          body: beat.clip_direction,
        },
      ]);
      return [
        { heading: "Hook text", body: c.hook_text },
        ...beats,
        { heading: "Caption", body: c.caption },
        { heading: "CTA", body: c.cta },
      ];
    }
    case "email": {
      const c = content as EmailContent;
      const sections = (c.body_sections || []).map((section, i) => ({
        heading: section.heading?.trim()
          ? `Section ${i + 1} — ${section.heading}`
          : `Section ${i + 1}`,
        body: section.body,
      }));
      return [
        { heading: "Subject", body: c.subject },
        { heading: "Preheader", body: c.preheader },
        ...sections,
        { heading: "CTA", body: c.cta },
      ];
    }
    case "landing_page": {
      const c = content as LandingPageContent;
      const sections = (c.sections || []).map((section, i) => ({
        heading: section.heading?.trim()
          ? `Section ${i + 1} — ${section.heading}`
          : `Section ${i + 1}`,
        body: section.body,
      }));
      return [
        { heading: "Headline", body: c.headline },
        { heading: "Subhead", body: c.subhead },
        ...sections,
        { heading: "CTA", body: c.cta },
      ];
    }
    default:
      return [{ heading: "Content", body: JSON.stringify(content, null, 2) }];
  }
}

export function exportContentAsPDF(item: ContentItemWithComposition) {
  const date = new Date().toISOString().split("T")[0];
  const filename = `content_${sanitizeExportFilename(item.title)}_${date}.pdf`;
  const pdf = createTextPdf();
  const typeLabel = CONTENT_TYPE_LABELS[item.type] ?? item.type;
  const statusLabel = item.status === "approved" ? "Approved" : "Draft";

  pdf.title(item.title || "Content brief");
  pdf.subtitle(
    `${typeLabel} · ${statusLabel} · v${item.version} · Exported ${date}`
  );
  pdf.rule();

  pdf.heading("Context");
  pdf.body(`Strategy: ${item.composition?.strategy?.title || "—"}`);
  pdf.body(
    `Campaign idea: ${
      item.composition?.campaignIdea?.name ||
      item.campaign_idea_name_snapshot ||
      "Strategy-level"
    }`
  );
  pdf.body(
    `Persona: ${item.composition?.persona?.name || item.icp_name_snapshot || "—"}`
  );

  pdf.heading("Brief");
  for (const section of briefSectionsForType(item.type, item.content)) {
    pdf.subheading(section.heading);
    if (section.bullets) pdf.bullets(section.bullets);
    else pdf.body(section.body);
  }

  pdf.save(filename);
}

export function exportContentListAsCSV(items: ContentItemWithComposition[]) {
  const date = new Date().toISOString().split("T")[0];
  const filename = `content_list_${date}.csv`;
  const headers = [
    "type",
    "title",
    "strategy",
    "campaign_idea",
    "persona",
    "status",
    "date",
  ];
  const rows = items.map((item) => [
    CONTENT_TYPE_LABELS[item.type] ?? item.type,
    item.title,
    item.composition?.strategy?.title || "",
    item.composition?.campaignIdea?.name ||
      item.campaign_idea_name_snapshot ||
      "Strategy-level",
    item.composition?.persona?.name || item.icp_name_snapshot || "",
    item.status === "approved" ? "Approved" : "Draft",
    formatDate(item.updated_at || item.created_at),
  ]);
  downloadCsv(filename, headers, rows);
}

export default {
  exportContentAsPDF,
  exportContentListAsCSV,
};
