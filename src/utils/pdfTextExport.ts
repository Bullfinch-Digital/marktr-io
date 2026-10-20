import jsPDF from "jspdf";

const MARGIN = 40;

/** Brand navy (#101A26). */
const BRAND_NAVY: [number, number, number] = [16, 26, 38];
const MARKTR_URL = "https://www.marktr.io";
const LOGO_PATH = "/brand/Marktrio_Logo_01.png";
/** Native aspect of Marktrio_Logo_01.png. */
const LOGO_ASPECT = 5333 / 1667;
const LOGO_DRAW_HEIGHT = 16;
/** Leave this much clear at the bottom of every page so the footer never overlaps content. */
export const PDF_FOOTER_RESERVE = 68;

export function pdfContentLimitY(pageHeight: number) {
  return pageHeight - PDF_FOOTER_RESERVE;
}

let logoDataUrlPromise: Promise<string | null> | null = null;

function bytesToBase64(bytes: Uint8Array) {
  let binary = "";
  const chunk = 0x2000;
  for (let i = 0; i < bytes.length; i += chunk) {
    const slice = bytes.subarray(i, i + chunk);
    binary += String.fromCharCode(...(slice as unknown as number[]));
  }
  return btoa(binary);
}

/**
 * Downscale the wordmark before embedding. jsPDF stores PNG pixels uncompressed,
 * and the source file is large enough to blow the PDF up to tens of megabytes.
 */
async function downscaleLogoBlob(blob: Blob): Promise<string | null> {
  if (typeof document === "undefined" || typeof Image === "undefined") return null;
  const objectUrl = URL.createObjectURL(blob);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      const timer = setTimeout(() => reject(new Error("marktr logo timed out")), 2500);
      el.onload = () => {
        clearTimeout(timer);
        resolve(el);
      };
      el.onerror = () => {
        clearTimeout(timer);
        reject(new Error("marktr logo failed to load"));
      };
      el.src = objectUrl;
    });
    const sourceW = img.naturalWidth || img.width;
    const sourceH = img.naturalHeight || img.height;
    if (!sourceW || !sourceH) return null;
    const width = 240;
    const height = Math.max(1, Math.round((width * sourceH) / sourceW));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.clearRect(0, 0, width, height);
    ctx.drawImage(img, 0, 0, width, height);
    const dataUrl = canvas.toDataURL("image/png");
    if (!dataUrl.startsWith("data:image/png") || dataUrl.length < 80 || dataUrl.length > 250_000) {
      return null;
    }
    return dataUrl;
  } catch {
    return null;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

async function loadMarktrLogoDataUrl(): Promise<string | null> {
  if (!logoDataUrlPromise) {
    logoDataUrlPromise = (async () => {
      if (typeof fetch !== "function") return null;
      try {
        const response = await fetch(LOGO_PATH);
        if (!response.ok) return null;
        const blob = await response.blob();
        const scaled = await downscaleLogoBlob(blob);
        if (scaled) return scaled;
        const bytes = new Uint8Array(await blob.arrayBuffer());
        if (bytes.byteLength > 20_000) return null;
        return `data:image/png;base64,${bytesToBase64(bytes)}`;
      } catch {
        return null;
      }
    })();
  }
  return logoDataUrlPromise;
}

function drawMarktrWordmark(doc: jsPDF, logoDataUrl: string | null, x: number, y: number) {
  const height = LOGO_DRAW_HEIGHT;
  const width = height * LOGO_ASPECT;
  if (logoDataUrl) {
    try {
      doc.addImage(logoDataUrl, "PNG", x, y, width, height);
      return width;
    } catch {
      // Fall through to text.
    }
  }
  doc.setFont("Helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...BRAND_NAVY);
  doc.text("marktr.io", x, y + 12);
  return doc.getTextWidth("marktr.io");
}

/** Footer on every page: wordmark, "Created with marktr.io", and a link to marktr.io. */
export async function stampMarktrFooter(doc: jsPDF) {
  const logoDataUrl = await loadMarktrLogoDataUrl();
  const pageCount = doc.getNumberOfPages();
  for (let page = 1; page <= pageCount; page += 1) {
    doc.setPage(page);
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const top = pageH - PDF_FOOTER_RESERVE;

    doc.setFillColor(255, 255, 255);
    doc.rect(0, top, pageW, PDF_FOOTER_RESERVE, "F");

    const markWidth = drawMarktrWordmark(doc, logoDataUrl, MARGIN, top + 16);
    const textX = MARGIN + markWidth + 12;

    doc.setFont("Helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...BRAND_NAVY);
    doc.text("Created with marktr.io", textX, top + 24);

    const linkText = MARKTR_URL;
    const linkY = top + 38;
    doc.text(linkText, textX, linkY);
    const linkW = doc.getTextWidth(linkText);
    doc.setDrawColor(...BRAND_NAVY);
    doc.setLineWidth(0.4);
    doc.line(textX, linkY + 1.5, textX + linkW, linkY + 1.5);
    doc.link(textX, linkY - 8, Math.max(linkW, 8), 11, { url: MARKTR_URL });
  }
}

export function sanitizeExportFilename(value: unknown, fallback = "export") {
  const base = String(value || fallback)
    .trim()
    .replace(/\s+/g, "_")
    .replace(/[^a-zA-Z0-9_-]/g, "");
  return base.length ? base : fallback;
}

export function downloadCsv(
  filename: string,
  headers: string[],
  rows: Array<Array<string | number | null | undefined>>
) {
  const escape = (v: string | number | null | undefined) =>
    `"${String(v ?? "").replace(/"/g, '""')}"`;
  const lines = [
    headers.map(escape).join(","),
    ...rows.map((row) => row.map(escape).join(",")),
  ];
  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/** Simple multi-page text PDF writer used by strategy/content (and brand-style) exports. */
export function createTextPdf() {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const maxWidth = pageW - MARGIN * 2;
  let y = MARGIN + 10;

  const ensure = (needed: number) => {
    const limit = pdfContentLimitY(doc.internal.pageSize.getHeight());
    if (y + needed > limit) {
      doc.addPage();
      y = MARGIN;
    }
  };

  const gap = (amount = 12) => {
    y += amount;
  };

  const title = (text: string) => {
    ensure(36);
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(22);
    doc.setTextColor("#000000");
    const lines = doc.splitTextToSize(text || "—", maxWidth);
    doc.text(lines, MARGIN, y);
    y += lines.length * 26;
  };

  const subtitle = (text: string) => {
    ensure(20);
    doc.setFont("Helvetica", "normal");
    doc.setFontSize(11);
    doc.setTextColor("#555555");
    const lines = doc.splitTextToSize(text || "", maxWidth);
    doc.text(lines, MARGIN, y);
    y += lines.length * 14 + 6;
  };

  const rule = () => {
    ensure(16);
    doc.setDrawColor("#000000");
    doc.setLineWidth(1);
    doc.line(MARGIN, y, pageW - MARGIN, y);
    y += 18;
  };

  const heading = (text: string) => {
    ensure(28);
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(14);
    doc.setTextColor("#000000");
    doc.text(text, MARGIN, y);
    y += 18;
  };

  const subheading = (text: string) => {
    ensure(22);
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor("#111111");
    doc.text(text, MARGIN, y);
    y += 16;
  };

  const body = (text: unknown) => {
    const value = String(text ?? "").trim() || "—";
    doc.setFont("Helvetica", "normal");
    doc.setFontSize(11);
    doc.setTextColor("#333333");
    const lines = doc.splitTextToSize(value, maxWidth) as string[];
    for (const line of lines) {
      ensure(14);
      doc.text(line, MARGIN, y);
      y += 14;
    }
    y += 6;
  };

  const bullets = (items: unknown) => {
    const list = Array.isArray(items)
      ? items.map((i) => String(i ?? "").trim()).filter(Boolean)
      : [];
    if (!list.length) {
      body("—");
      return;
    }
    doc.setFont("Helvetica", "normal");
    doc.setFontSize(11);
    doc.setTextColor("#333333");
    for (const item of list) {
      const lines = doc.splitTextToSize(`• ${item}`, maxWidth - 12) as string[];
      for (let i = 0; i < lines.length; i += 1) {
        ensure(14);
        doc.text(lines[i]!, MARGIN + (i === 0 ? 0 : 12), y);
        y += 14;
      }
      y += 2;
    }
    y += 6;
  };

  const save = async (filename: string) => {
    await stampMarktrFooter(doc);
    doc.save(filename);
  };

  return { title, subtitle, rule, heading, subheading, body, bullets, gap, save };
}
