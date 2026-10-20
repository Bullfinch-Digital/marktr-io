import jsPDF from "jspdf";
import { pdfContentLimitY, stampMarktrFooter } from "./pdfTextExport";

type BrandRecord = Record<string, any>;

const safe = (v: unknown) => (Array.isArray(v) ? v.join(" | ") : v ?? "");

export function exportBrandAsCSV(brand: BrandRecord) {
  const row = {
    id: brand.id,
    name: brand.name,
    website: brand.website,
    business_type: brand.business_type,
    product_or_service: brand.product_or_service,
    business_description: brand.business_description,
    assumed_audience: safe(brand.assumed_audience),
    marketing_channels: safe(brand.marketing_channels),
    country: brand.country,
    region_or_city: brand.region_or_city,
    currency: brand.currency,
    color: brand.color,
    created_at: brand.created_at,
    updated_at: brand.updated_at,
  };

  const header = Object.keys(row).join(",");
  const values = Object.values(row)
    .map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`)
    .join(",");

  const csv = `${header}\n${values}`;

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);

  const date = new Date().toISOString().split("T")[0];
  const filename = `brand_${(brand.name || "brand").toString().replace(/\s+/g, "_")}_${brand.id}_${date}.csv`;

  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportBrandAsPDF(brand: BrandRecord) {
  return exportBrandPdf(brand);
}

async function exportBrandPdf(brand: BrandRecord) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });

  const titleFont = "Helvetica";
  const bodyFont = "Helvetica";
  const margin = 40;
  const maxWidth = doc.internal.pageSize.getWidth() - margin * 2;

  const date = new Date().toISOString().split("T")[0];
  const filename = `brand_${(brand.name || "brand").toString().replace(/\s+/g, "_")}_${brand.id}_${date}.pdf`;

  doc.setFont(titleFont, "bold");
  doc.setFontSize(22);
  doc.setTextColor("#000000");
  doc.text(brand.name || "Brand Profile", margin, 50);

  doc.setFont(bodyFont, "normal");
  doc.setFontSize(12);
  doc.setTextColor("#555555");
  doc.text(`Brand Profile Report — ${date}`, margin, 70);

  doc.setDrawColor("#000000");
  doc.setLineWidth(1);
  doc.line(margin, 85, doc.internal.pageSize.getWidth() - margin, 85);

  let y = 120;

  const ensure = (needed: number) => {
    if (y + needed > pdfContentLimitY(doc.internal.pageSize.getHeight())) {
      doc.addPage();
      y = margin;
    }
  };

  const addSection = (title: string, text: unknown) => {
    ensure(36);
    doc.setFont(titleFont, "bold");
    doc.setFontSize(16);
    doc.setTextColor("#000000");
    doc.text(title, margin, y);
    y += 20;

    doc.setFont(bodyFont, "normal");
    doc.setFontSize(12);
    doc.setTextColor("#444444");

    const lines = Array.isArray(text)
      ? (text.length ? text : ["—"]).flatMap((item) =>
          doc.splitTextToSize(`• ${item}`, maxWidth - 20) as string[]
        )
      : (doc.splitTextToSize(String(text || "—"), maxWidth) as string[]);

    for (const line of lines) {
      ensure(16);
      doc.text(line, Array.isArray(text) ? margin + 20 : margin, y);
      y += 16;
    }
    y += 15;
  };

  addSection("Website", brand.website);
  addSection("Business Type", brand.business_type);
  addSection("Product or Service", brand.product_or_service);
  addSection("Business Description", brand.business_description);
  addSection("Assumed Audience", brand.assumed_audience);
  addSection("Marketing Channels", brand.marketing_channels);
  addSection("Country", brand.country);
  addSection("Region / City", brand.region_or_city);
  addSection("Currency", brand.currency);
  addSection("Colour", brand.color);

  await stampMarktrFooter(doc);
  doc.save(filename);
}

export default {
  exportBrandAsPDF,
  exportBrandAsCSV,
};
