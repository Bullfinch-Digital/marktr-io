import jsPDF from "jspdf";

const MARGIN = 40;

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
  const pageH = doc.internal.pageSize.getHeight();
  const pageW = doc.internal.pageSize.getWidth();
  const maxWidth = pageW - MARGIN * 2;
  let y = MARGIN + 10;

  const ensure = (needed: number) => {
    if (y + needed > pageH - MARGIN) {
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

  const save = (filename: string) => {
    doc.save(filename);
  };

  return { title, subtitle, rule, heading, subheading, body, bullets, gap, save };
}
