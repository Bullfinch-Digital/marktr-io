import jsPDF from "jspdf";

const MARGIN = 40;

/** Brand navy (#101A26). */
const BRAND_NAVY: [number, number, number] = [16, 26, 38];
/** Brand cream (#FBFAF0). Wordmark on the navy band. */
const BRAND_CREAM: [number, number, number] = [251, 250, 240];
/** Brand lime (#EBFD84). Pill and the rule under the band. */
const BRAND_LIME: [number, number, number] = [235, 253, 132];
/** Muted navy for the "Created for" line. Dark enough to stay readable in print. */
const MUTED: [number, number, number] = [61, 76, 92];
const MARKTR_URL = "https://www.marktr.io";
const LOGO_PATH = "/brand/Marktrio_Logo_01.png";
/** Light wordmark (transparent white) for the navy header band. */
const LIGHT_LOGO_PATH = "/brand/Marktrio_Logo_02.png";
const TITLE_FONT_PATH = "/fonts/Fraunces-SemiBold.ttf";
const TITLE_FONT_FILE = "Fraunces-SemiBold.ttf";
/** Native aspect of the Marktr wordmark PNGs. */
const LOGO_ASPECT = 5333 / 1667;
const LOGO_DRAW_HEIGHT = 16;
/** Full-width first-page band. 85pt is about 30mm. */
const HEADER_BAND_HEIGHT = 85;
const HEADER_RULE_HEIGHT = 2.25;
const HEADER_PAD_X = 36;
/** Leave this much clear at the bottom of every page so the footer never overlaps content. */
export const PDF_FOOTER_RESERVE = 68;

export type PdfDocumentType = "Customer profile" | "Brand story" | "Strategy" | "Content" | "Plan";

export type PdfBrandedHeader = {
  documentType: PdfDocumentType;
  title: string;
  createdFor?: string | null;
  date?: string | null;
};

type StoredHeader = {
  options: PdfBrandedHeader;
  titleFont: "Fraunces" | "Times";
};

const headerByDoc = new WeakMap<jsPDF, StoredHeader>();

export function pdfContentLimitY(pageHeight: number) {
  return pageHeight - PDF_FOOTER_RESERVE;
}

let logoDataUrlPromise: Promise<string | null> | null = null;

function bytesToBinary(bytes: Uint8Array) {
  let binary = "";
  const chunk = 0x2000;
  for (let i = 0; i < bytes.length; i += chunk) {
    const slice = bytes.subarray(i, i + chunk);
    binary += String.fromCharCode(...(slice as unknown as number[]));
  }
  return binary;
}

function bytesToBase64(bytes: Uint8Array) {
  return btoa(bytesToBinary(bytes));
}

/**
 * Downscale the wordmark before embedding. jsPDF stores PNG pixels uncompressed,
 * and the source file is large enough to blow the PDF up to tens of megabytes.
 * `tint` recolors opaque pixels (used to turn the white wordmark cream).
 */
async function downscaleLogoBlob(
  blob: Blob,
  tint?: [number, number, number]
): Promise<string | null> {
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
    const width = tint ? 360 : 240;
    const height = Math.max(1, Math.round((width * sourceH) / sourceW));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.clearRect(0, 0, width, height);
    ctx.drawImage(img, 0, 0, width, height);
    if (tint) {
      const image = ctx.getImageData(0, 0, width, height);
      const data = image.data;
      for (let i = 0; i < data.length; i += 4) {
        if ((data[i + 3] ?? 0) === 0) continue;
        data[i] = tint[0];
        data[i + 1] = tint[1];
        data[i + 2] = tint[2];
      }
      ctx.putImageData(image, 0, 0);
    }
    const dataUrl = canvas.toDataURL("image/png");
    if (!dataUrl.startsWith("data:image/png") || dataUrl.length < 80 || dataUrl.length > 400_000) {
      return null;
    }
    return dataUrl;
  } catch {
    return null;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

async function loadLogoDataUrl(
  path: string,
  tint?: [number, number, number]
): Promise<string | null> {
  if (typeof fetch !== "function") return null;
  try {
    const response = await fetch(path);
    if (!response.ok) return null;
    const blob = await response.blob();
    const scaled = await downscaleLogoBlob(blob, tint);
    if (scaled) return scaled;
    if (tint) return null;
    const bytes = new Uint8Array(await blob.arrayBuffer());
    if (bytes.byteLength > 20_000) return null;
    return `data:image/png;base64,${bytesToBase64(bytes)}`;
  } catch {
    return null;
  }
}

async function loadMarktrLogoDataUrl(): Promise<string | null> {
  if (!logoDataUrlPromise) {
    logoDataUrlPromise = loadLogoDataUrl(LOGO_PATH);
  }
  return logoDataUrlPromise;
}

let lightLogoDataUrlPromise: Promise<string | null> | null = null;

async function loadLightWordmarkDataUrl(): Promise<string | null> {
  if (!lightLogoDataUrlPromise) {
    lightLogoDataUrlPromise = loadLogoDataUrl(LIGHT_LOGO_PATH, BRAND_CREAM);
  }
  return lightLogoDataUrlPromise;
}

let frauncesBinaryPromise: Promise<string | null> | null = null;

/** Static Fraunces (semibold). Variable webfonts cannot be embedded by jsPDF. */
async function loadFrauncesBinary(): Promise<string | null> {
  if (!frauncesBinaryPromise) {
    frauncesBinaryPromise = (async () => {
      if (typeof fetch !== "function") return null;
      try {
        const response = await fetch(TITLE_FONT_PATH);
        if (!response.ok) return null;
        const bytes = new Uint8Array(await response.arrayBuffer());
        if (bytes.byteLength < 1000 || bytes.byteLength > 2_000_000) return null;
        if (bytes[0] !== 0 || bytes[1] !== 1 || bytes[2] !== 0 || bytes[3] !== 0) return null;
        return bytesToBinary(bytes);
      } catch {
        return null;
      }
    })();
  }
  return frauncesBinaryPromise;
}

async function ensureTitleFont(doc: jsPDF): Promise<"Fraunces" | "Times"> {
  const binary = await loadFrauncesBinary();
  if (!binary) return "Times";
  try {
    doc.addFileToVFS(TITLE_FONT_FILE, binary);
    doc.addFont(TITLE_FONT_FILE, "Fraunces", "bold");
    doc.setFont("Fraunces", "bold");
    return "Fraunces";
  } catch {
    return "Times";
  }
}

function formatCreatedForLine(createdFor: string | null | undefined, date: string | null | undefined) {
  const name = String(createdFor || "").trim() || "—";
  const when = String(date || "").trim() || new Date().toISOString().split("T")[0];
  return `Created for ${name} · ${when}`;
}

function drawHeaderWordmark(doc: jsPDF, logoDataUrl: string | null, x: number, maxRight: number) {
  const maxWidth = Math.max(48, maxRight - x);
  if (logoDataUrl) {
    let height = 32;
    let width = height * LOGO_ASPECT;
    if (width > maxWidth) {
      width = maxWidth;
      height = width / LOGO_ASPECT;
    }
    const y = (HEADER_BAND_HEIGHT - height) / 2;
    try {
      doc.addImage(logoDataUrl, "PNG", x, y, width, height);
      return;
    } catch {
      // Fall through to cream text.
    }
  }
  doc.setFont("Helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(...BRAND_CREAM);
  doc.text("marktr.io", x, HEADER_BAND_HEIGHT / 2 + 4.5);
}

function headerMetrics(doc: jsPDF, state: StoredHeader) {
  const pageW = doc.internal.pageSize.getWidth();
  doc.setFont("Helvetica", "bold");
  doc.setFontSize(9);
  const label = state.options.documentType;
  const labelW = doc.getTextWidth(label);
  const pillPadX = 11;
  const pillH = 20;
  const pillW = labelW + pillPadX * 2;
  const pillX = pageW - HEADER_PAD_X - pillW;
  const pillY = (HEADER_BAND_HEIGHT - pillH) / 2;

  const title = String(state.options.title || "").trim() || "—";
  const maxWidth = pageW - MARGIN * 2;
  const titleSize = 26;
  const titleLeading = 32;
  const measureTitle = () => {
    doc.setFont(state.titleFont, "bold");
    doc.setFontSize(titleSize);
    return doc.splitTextToSize(title, maxWidth) as string[];
  };
  let lines: string[];
  try {
    lines = measureTitle();
  } catch {
    state.titleFont = "Times";
    lines = measureTitle();
  }
  const baseline = HEADER_BAND_HEIGHT + HEADER_RULE_HEIGHT + 28;
  let y = baseline + Math.max(0, lines.length - 1) * titleLeading + 22;
  doc.setFont("Helvetica", "normal");
  doc.setFontSize(9);
  const meta = formatCreatedForLine(state.options.createdFor, state.options.date);
  const metaLines = doc.splitTextToSize(meta, maxWidth) as string[];
  const metaBaseline = y;
  y += Math.max(0, metaLines.length - 1) * 12;
  return {
    pageW,
    label,
    pillPadX,
    pillH,
    pillW,
    pillX,
    pillY,
    lines,
    baseline,
    titleSize,
    titleLeading,
    metaLines,
    metaBaseline,
    contentTop: y + 20,
  };
}

function drawBrandedHeader(doc: jsPDF, state: StoredHeader, logoDataUrl: string | null): number {
  doc.setPage(1);
  const metrics = headerMetrics(doc, state);

  doc.setFillColor(...BRAND_NAVY);
  doc.rect(0, 0, metrics.pageW, HEADER_BAND_HEIGHT, "F");

  doc.setFillColor(...BRAND_LIME);
  doc.roundedRect(
    metrics.pillX,
    metrics.pillY,
    metrics.pillW,
    metrics.pillH,
    metrics.pillH / 2,
    metrics.pillH / 2,
    "F"
  );
  doc.setFont("Helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...BRAND_NAVY);
  doc.text(metrics.label, metrics.pillX + metrics.pillPadX, metrics.pillY + metrics.pillH / 2 + 3.1);

  drawHeaderWordmark(doc, logoDataUrl, HEADER_PAD_X, metrics.pillX - 14);

  doc.setFillColor(...BRAND_LIME);
  doc.rect(0, HEADER_BAND_HEIGHT, metrics.pageW, HEADER_RULE_HEIGHT, "F");

  doc.setFont(state.titleFont, "bold");
  doc.setFontSize(metrics.titleSize);
  doc.setTextColor(...BRAND_NAVY);
  const titleOptions = { lineHeightFactor: metrics.titleLeading / metrics.titleSize };
  try {
    doc.text(metrics.lines, MARGIN, metrics.baseline, titleOptions);
  } catch {
    state.titleFont = "Times";
    doc.setFont("Times", "bold");
    doc.setFontSize(metrics.titleSize);
    doc.text(metrics.lines, MARGIN, metrics.baseline, titleOptions);
  }

  doc.setFont("Helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...MUTED);
  doc.text(metrics.metaLines, MARGIN, metrics.metaBaseline);

  doc.setFont("Helvetica", "normal");
  doc.setTextColor(0, 0, 0);
  return metrics.contentTop;
}

/**
 * Reserves the first-page header (navy band, type pill, lime rule, title,
 * "Created for …") and returns the y where body content must start.
 * The band is painted once, when the footer is stamped. Later pages stay clear of it.
 */
export async function applyBrandedHeader(doc: jsPDF, header: PdfBrandedHeader): Promise<number> {
  const titleFont = await ensureTitleFont(doc);
  const state: StoredHeader = { options: header, titleFont };
  headerByDoc.set(doc, state);
  return headerMetrics(doc, state).contentTop;
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
  const [logoDataUrl, headerLogo] = await Promise.all([
    loadMarktrLogoDataUrl(),
    loadLightWordmarkDataUrl(),
  ]);
  const header = headerByDoc.get(doc);
  if (header) {
    drawBrandedHeader(doc, header, headerLogo);
  }
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
export async function createTextPdf(header: PdfBrandedHeader) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const maxWidth = pageW - MARGIN * 2;
  let y = await applyBrandedHeader(doc, header);

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

  const tickBox = (label = "") => {
    ensure(20);
    doc.setDrawColor("#101A26");
    doc.setLineWidth(1.1);
    doc.rect(MARGIN, y - 10, 12, 12);
    if (label) {
      doc.setFont("Helvetica", "normal");
      doc.setFontSize(11);
      doc.setTextColor("#333333");
      const lines = doc.splitTextToSize(label, maxWidth - 22) as string[];
      doc.text(lines, MARGIN + 20, y);
      y += Math.max(18, lines.length * 14);
    } else {
      y += 18;
    }
  };

  const save = async (filename: string) => {
    await stampMarktrFooter(doc);
    doc.save(filename);
  };

  return { title, subtitle, rule, heading, subheading, body, bullets, tickBox, gap, save };
}
