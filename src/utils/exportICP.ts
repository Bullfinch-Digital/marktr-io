import { createElement } from "react";
import { createRoot } from "react-dom/client";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { ICPExportLayout } from "../components/icp/ICPExportLayout";
import { avatarUrlFromKey } from "./avatarLibrary";
import { supabase } from "../config/supabase";

type ICPRecord = Record<string, any>;

const safe = (v: unknown) => (Array.isArray(v) ? v.join(" | ") : v ?? "");

const toList = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value.map((item) => String(item || "").trim()).filter(Boolean);
  }
  if (typeof value === "string") {
    return value
      .split("\n")
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return [];
};

const sanitizeFilename = (value: unknown) => {
  const base = String(value || "icp")
    .trim()
    .replace(/\s+/g, "_")
    .replace(/[^a-zA-Z0-9_-]/g, "");
  return base.length ? base : "icp";
};

const waitForImages = async (container: HTMLElement) => {
  const images = Array.from(container.querySelectorAll("img"));
  await Promise.all(
    images.map((img) => {
      if (img.complete && img.naturalWidth > 0) return Promise.resolve();
      if (typeof img.decode === "function") {
        return img.decode().catch(() => undefined);
      }
      return new Promise<void>((resolve) => {
        const cleanup = () => {
          img.removeEventListener("load", cleanup);
          img.removeEventListener("error", cleanup);
          resolve();
        };
        img.addEventListener("load", cleanup);
        img.addEventListener("error", cleanup);
      });
    })
  );
};

const joinList = (items?: string[] | null) =>
  Array.isArray(items) && items.length ? items.join(" | ") : "";

const fetchIcpStrategies = async (
  icpId?: string | null
): Promise<Array<Record<string, any>>> => {
  if (!icpId) return [];
  try {
    const { data, error } = await supabase
      .from("icp_strategies")
      .select("goal, channel, offer_type, tone, strategy, prompt_version, model, created_at")
      .eq("icp_id", icpId)
      .order("created_at", { ascending: true });
    if (error) throw error;
    return (data as any[]) || [];
  } catch (err) {
    console.error("[exportICP] failed to fetch strategies", err);
    return [];
  }
};

const buildSlices = (container: HTMLElement, canvas: HTMLCanvasElement, pageHeightPx: number) => {
  const blocks = Array.from(container.querySelectorAll("[data-export-block]")) as HTMLElement[];
  if (!blocks.length) {
    const slices = [];
    for (let start = 0; start < canvas.height; start += pageHeightPx) {
      slices.push({ start, end: Math.min(start + pageHeightPx, canvas.height) });
    }
    return slices;
  }

  const ratio = canvas.width / container.clientWidth;
  const sorted = blocks
    .map((block) => ({
      top: Math.round(block.offsetTop * ratio),
      height: Math.round(block.offsetHeight * ratio),
    }))
    .sort((a, b) => a.top - b.top);

  const slices: Array<{ start: number; end: number }> = [];
  let cursor = 0;

  sorted.forEach((block) => {
    const blockBottom = block.top + block.height;
    if (block.height > pageHeightPx) {
      if (block.top > cursor) {
        slices.push({ start: cursor, end: block.top });
        cursor = block.top;
      }
      let splitStart = cursor;
      while (splitStart + pageHeightPx < blockBottom) {
        slices.push({ start: splitStart, end: splitStart + pageHeightPx });
        splitStart += pageHeightPx;
      }
      cursor = splitStart;
      return;
    }

    if (blockBottom - cursor > pageHeightPx) {
      const breakAt = block.top > cursor ? block.top : cursor + pageHeightPx;
      slices.push({ start: cursor, end: breakAt });
      cursor = breakAt;
    }
  });

  if (cursor < canvas.height) {
    slices.push({ start: cursor, end: canvas.height });
  }

  return slices;
};

export function exportICPAsCSV(icp: ICPRecord) {
  void exportICPAsCSVInternal(icp);
}

async function exportICPAsCSVInternal(icp: ICPRecord) {
  const strategyRecords = await fetchIcpStrategies(icp.id);
  const strategyRecord = strategyRecords[strategyRecords.length - 1] || null;
  const strategy = strategyRecord?.strategy || null;

  const row = {
    id: icp.id,
    name: icp.name,
    description: icp.description,
    industry: icp.industry,
    company_size: icp.company_size,
    location: icp.location,
    budget: icp.budget,
    pain_points: safe(icp.pain_points),
    goals: safe(icp.goals),
    tech_stack: safe(icp.tech_stack),
    decision_makers: safe(icp.decision_makers),
    challenges: safe(icp.challenges),
    opportunities: safe(icp.opportunities),
    strategy_goal: strategyRecord?.goal ?? "",
    strategy_channel: strategyRecord?.channel ?? "",
    strategy_offer_type: strategyRecord?.offer_type ?? "",
    strategy_tone: strategyRecord?.tone ?? "",
    positioning_one_liner: strategy?.positioning?.one_liner ?? "",
    positioning_why_us: strategy?.positioning?.why_us ?? "",
    positioning_differentiators: joinList(strategy?.positioning?.differentiators),
    messaging_value_props: joinList(strategy?.messaging?.value_props),
    messaging_pain_to_promise: joinList(strategy?.messaging?.pain_to_promise),
    messaging_objections_and_rebuttals: joinList(strategy?.messaging?.objections_and_rebuttals),
    campaign_ideas: Array.isArray(strategy?.campaign_ideas)
      ? strategy.campaign_ideas
          .map((idea: any) => `${idea?.name || ""}:${idea?.hook || ""}:${idea?.cta || ""}`)
          .join(" || ")
      : "",
    channel_plan_primary_channel: strategy?.channel_plan?.primary_channel ?? "",
    channel_plan_secondary_channels: joinList(strategy?.channel_plan?.secondary_channels),
    channel_plan_first_14_days: joinList(strategy?.channel_plan?.first_14_days),
    offer_recommended_offer: strategy?.offer?.recommended_offer ?? "",
    offer_lead_magnet_idea: strategy?.offer?.lead_magnet_idea ?? "",
    offer_landing_page_sections: joinList(strategy?.offer?.landing_page_sections),
    ad_assets_headlines: joinList(strategy?.ad_assets?.headlines),
    ad_assets_primary_texts: joinList(strategy?.ad_assets?.primary_texts),
    ad_assets_creative_briefs: joinList(strategy?.ad_assets?.creative_briefs),
    success_metrics_kpis: joinList(strategy?.success_metrics?.kpis),
    success_metrics_targets: joinList(strategy?.success_metrics?.targets),
    strategy_json: strategy ? JSON.stringify(strategy) : "",
    created_at: icp.created_at,
  };

  const header = Object.keys(row).join(",");
  const values = Object.values(row)
    .map((v) => `"${String(v).replace(/"/g, '""')}"`)
    .join(",");

  const csv = `${header}\n${values}`;

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);

  const date = new Date().toISOString().split("T")[0];
  const filename = `icp_${(icp.name || "icp").toString().replace(/\s+/g, "_")}_${icp.id}_${date}.csv`;

  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportICPAsPDF(icp: ICPRecord) {
  void exportICPAsPDFInternal(icp);
}

async function exportICPAsPDFInternal(icp: ICPRecord) {
  const date = new Date().toISOString().split("T")[0];
  const filename = `icp_${sanitizeFilename(icp.name)}_${date}.pdf`;

  const strategyRecords = await fetchIcpStrategies(icp.id);
  const strategyRecord = strategyRecords[strategyRecords.length - 1] || null;
  const strategy = strategyRecord?.strategy || null;

  const origin =
    typeof window !== "undefined" && window.location?.origin ? window.location.origin : "";
  const appUrl = origin && icp.id ? `${origin}/icp/${icp.id}` : null;

  const brandName =
    (icp as any)?.brandName ??
    (icp as any)?.brands?.name ??
    (icp as any)?.brand?.name ??
    null;

  const avatarSrc = (icp as any)?.avatar_key
    ? avatarUrlFromKey((icp as any).avatar_key)
    : ((icp as any)?.avatar as string | null) ?? avatarUrlFromKey(null);

  const exportData = {
    id: icp.id ?? null,
    appUrl,
    name: icp.name ?? "",
    description: icp.description ?? "",
    brandName,
    color: (icp as any)?.color ?? "#EDEDED",
    avatarSrc,
    industry: icp.industry ?? "",
    company_size: icp.company_size ?? "",
    location: icp.location ?? "",
    budget: icp.budget ?? "",
    goals: toList(icp.goals),
    pain_points: toList(icp.pain_points),
    decision_makers: toList(icp.decision_makers),
    tech_stack: toList(icp.tech_stack),
    challenges: toList(icp.challenges),
    opportunities: toList(icp.opportunities),
    strategyGoal: strategyRecord?.goal ?? null,
    strategyChannel: strategyRecord?.channel ?? null,
    strategyOfferType: strategyRecord?.offer_type ?? null,
    strategyTone: strategyRecord?.tone ?? null,
    strategy,
    strategies: strategyRecords,
    exportedAt: date,
  };

  const container = document.createElement("div");
  container.style.position = "fixed";
  container.style.left = "-10000px";
  container.style.top = "0";
  container.style.width = "794px";
  container.style.background = "#ffffff";
  container.style.zIndex = "-1";

  document.body.appendChild(container);
  const root = createRoot(container);

  try {
    const exportCss = `
      .icp-export-sandbox { background: #ffffff; color: #111111; }
      .icp-export-sandbox * { color: #111111 !important; border-color: #111111 !important; background-color: transparent !important; box-shadow: none !important; }
      .icp-export-sandbox .export-root { background-color: #ffffff !important; }
      .icp-export-sandbox .export-card { background-color: #ffffff !important; }
      .icp-export-sandbox .export-muted { color: #555555 !important; }
      .icp-export-sandbox .export-border { border-color: #111111 !important; }
      .icp-export-sandbox .export-band { background-color: var(--export-band-color, #ededed) !important; }
      .icp-export-sandbox .export-link { color: #2563eb !important; }
    `;

    root.render(
      createElement(
        "div",
        { className: "icp-export-sandbox" },
        createElement("style", { dangerouslySetInnerHTML: { __html: exportCss } }),
        createElement(ICPExportLayout, { data: exportData })
      )
    );

    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    if (document.fonts?.ready) {
      await document.fonts.ready;
    }
    await waitForImages(container);

    const linkEl = container.querySelector(".export-link") as HTMLElement | null;
    const linkBox = linkEl
      ? {
          top: linkEl.offsetTop,
          left: linkEl.offsetLeft,
          width: linkEl.offsetWidth,
          height: linkEl.offsetHeight,
        }
      : null;

    let canvas: HTMLCanvasElement;
    try {
      canvas = await html2canvas(container, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
      });
    } catch (err) {
      console.error("PDF export failed (html2canvas error):", err);
      alert("PDF export failed due to unsupported CSS. Please try again.");
      return;
    }

    const doc = new jsPDF({ unit: "pt", format: "a4" });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const pageHeightPx = Math.floor((canvas.width * pageHeight) / pageWidth);
    const scaleToPdf = pageWidth / canvas.width;

    const slices = buildSlices(container, canvas, pageHeightPx);
    const tempCanvas = document.createElement("canvas");
    const tempCtx = tempCanvas.getContext("2d");

    const linkUrl = exportData.appUrl || "";
    const linkPx = linkBox
      ? {
          x: linkBox.left * (canvas.width / container.clientWidth),
          y: linkBox.top * (canvas.width / container.clientWidth),
          w: linkBox.width * (canvas.width / container.clientWidth),
          h: linkBox.height * (canvas.width / container.clientWidth),
        }
      : null;

    slices.forEach((slice, index) => {
      const sliceHeight = Math.max(1, slice.end - slice.start);
      tempCanvas.width = canvas.width;
      tempCanvas.height = sliceHeight;
      if (tempCtx) {
        tempCtx.clearRect(0, 0, tempCanvas.width, tempCanvas.height);
        tempCtx.drawImage(
          canvas,
          0,
          slice.start,
          canvas.width,
          sliceHeight,
          0,
          0,
          canvas.width,
          sliceHeight
        );
      }

      const imgData = tempCanvas.toDataURL("image/jpeg", 0.92);
      const imgHeight = (sliceHeight * pageWidth) / canvas.width;

      if (index > 0) {
        doc.addPage();
      }
      doc.addImage(imgData, "JPEG", 0, 0, pageWidth, imgHeight);

      if (
        linkUrl &&
        linkPx &&
        linkPx.y >= slice.start &&
        linkPx.y <= slice.end
      ) {
        const linkX = linkPx.x * scaleToPdf;
        const linkY = (linkPx.y - slice.start) * scaleToPdf;
        const linkW = linkPx.w * scaleToPdf;
        const linkH = Math.max(6, linkPx.h * scaleToPdf);
        doc.link(linkX, linkY, linkW, linkH, { url: linkUrl });
      }
    });

    doc.save(filename);
  } finally {
    root.unmount();
    document.body.removeChild(container);
  }
}

export default {
  exportICPAsPDF,
  exportICPAsCSV,
};
