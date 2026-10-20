import { createElement } from "react";
import { createRoot } from "react-dom/client";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { ICPExportLayout } from "../components/icp/ICPExportLayout";
import { canViewICP } from "../config/accessRules";
import { avatarUrlFromKey } from "./avatarLibrary";
import { applyBrandedHeader, PDF_FOOTER_RESERVE, stampMarktrFooter } from "./pdfTextExport";

const VISIBLE_PAIN_POINTS_WITHOUT_ACCESS = 2;

export type IcpExportOptions = {
  /** Pro or an active trial. Defaults to full export. */
  hasAccess?: boolean;
};

function icpForExport(icp: ICPRecord, hasAccess: boolean): ICPRecord | null {
  const index = typeof icp._index === "number" ? icp._index : 0;
  if (!hasAccess && !canViewICP("free", index)) return null;
  if (hasAccess) return icp;
  return {
    ...icp,
    pain_points: toList(icp.pain_points).slice(0, VISIBLE_PAIN_POINTS_WITHOUT_ACCESS),
  };
}

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

const buildSlices = (
  container: HTMLElement,
  canvas: HTMLCanvasElement,
  firstPagePx: number,
  restPagePx: number
) => {
  const pageLimit = (sliceCount: number) => (sliceCount === 0 ? firstPagePx : restPagePx);
  const blocks = Array.from(container.querySelectorAll("[data-export-block]")) as HTMLElement[];
  if (!blocks.length) {
    const slices = [];
    let start = 0;
    while (start < canvas.height) {
      const end = Math.min(start + pageLimit(slices.length), canvas.height);
      if (end <= start) break;
      slices.push({ start, end });
      start = end;
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
    const limit = () => pageLimit(slices.length);
    if (block.height > limit()) {
      if (block.top > cursor) {
        slices.push({ start: cursor, end: block.top });
        cursor = block.top;
      }
      let splitStart = cursor;
      while (splitStart + limit() < blockBottom) {
        const pagePx = limit();
        slices.push({ start: splitStart, end: splitStart + pagePx });
        splitStart += pagePx;
      }
      cursor = splitStart;
      return;
    }

    if (blockBottom - cursor > limit()) {
      const breakAt = block.top > cursor ? block.top : cursor + limit();
      slices.push({ start: cursor, end: breakAt });
      cursor = breakAt;
    }
  });

  if (cursor < canvas.height) {
    slices.push({ start: cursor, end: canvas.height });
  }

  return slices;
};

export function exportICPAsCSV(icp: ICPRecord, options?: IcpExportOptions) {
  const visible = icpForExport(icp, options?.hasAccess !== false);
  if (!visible) return;
  const row = {
    id: icp.id,
    name: icp.name,
    description: icp.description,
    industry: icp.industry,
    company_size: icp.company_size,
    location: icp.location,
    budget: icp.budget,
    pain_points: safe(visible.pain_points),
    goals: safe(icp.goals),
    tech_stack: safe(icp.tech_stack),
    decision_makers: safe(icp.decision_makers),
    challenges: safe(icp.challenges),
    opportunities: safe(icp.opportunities),
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

export function exportICPAsPDF(icp: ICPRecord, options?: IcpExportOptions) {
  const visible = icpForExport(icp, options?.hasAccess !== false);
  if (!visible) return;
  return exportICPAsPDFInternal(visible);
}

async function exportICPAsPDFInternal(icp: ICPRecord) {
  const date = new Date().toISOString().split("T")[0];
  const filename = `icp_${sanitizeFilename(icp.name)}_${date}.pdf`;

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
    const profileName = String(exportData.name || "").trim();
    const headerHeightPt = await applyBrandedHeader(doc, {
      documentType: "Customer profile",
      title: profileName || "Customer profile",
      createdFor: exportData.brandName,
      date,
    });
    const firstContentPt = Math.max(80, pageHeight - PDF_FOOTER_RESERVE - headerHeightPt);
    const restContentPt = pageHeight - PDF_FOOTER_RESERVE;
    const firstPagePx = Math.max(1, Math.floor((canvas.width * firstContentPt) / pageWidth));
    const restPagePx = Math.max(1, Math.floor((canvas.width * restContentPt) / pageWidth));
    const scaleToPdf = pageWidth / canvas.width;

    const slices = buildSlices(container, canvas, firstPagePx, restPagePx).filter(
      (slice) => slice.end > slice.start
    );
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
      const isFirst = index === 0;
      const yOffset = isFirst ? headerHeightPt : 0;
      const pageContentPt = isFirst ? firstContentPt : restContentPt;

      if (!isFirst) {
        doc.addPage();
      }
      const fittedHeight = Math.min(imgHeight, pageContentPt);
      doc.addImage(imgData, "JPEG", 0, yOffset, pageWidth, fittedHeight);

      if (
        linkUrl &&
        linkPx &&
        linkPx.y >= slice.start &&
        linkPx.y <= slice.end
      ) {
        const linkX = linkPx.x * scaleToPdf;
        const linkY = (linkPx.y - slice.start) * scaleToPdf + yOffset;
        const linkW = linkPx.w * scaleToPdf;
        const linkH = Math.max(6, linkPx.h * scaleToPdf);
        doc.link(linkX, linkY, linkW, linkH, { url: linkUrl });
      }
    });

    await stampMarktrFooter(doc);
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
