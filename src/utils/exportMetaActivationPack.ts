import jsPDF from "jspdf";
import { MetaActivationPackRecord } from "../hooks/useMetaActivationPack";

const safeName = (value: string) =>
  (value || "meta_activation_pack").replace(/\s+/g, "_").replace(/[^a-zA-Z0-9_-]/g, "");

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportMetaPackAsJSON(record: MetaActivationPackRecord) {
  const blob = new Blob([JSON.stringify(record, null, 2)], { type: "application/json;charset=utf-8;" });
  downloadBlob(blob, `${safeName(record.pack_name)}_${record.id}.json`);
}

export function exportMetaPackAudienceCSV(record: MetaActivationPackRecord) {
  const rows = record.pack_json?.audience_plan || [];
  const header = [
    "audience_name",
    "source_type",
    "build_rule",
    "retention_window",
    "use_case",
    "exclusions",
  ];
  const lines = [header.join(",")];
  rows.forEach((row) => {
    const vals = [
      row.audience_name || "",
      row.source_type || "",
      row.build_rule || "",
      row.retention_window || "",
      row.use_case || "",
      (row.exclusions || []).join(" | "),
    ].map((v) => `"${String(v).replace(/"/g, '""')}"`);
    lines.push(vals.join(","));
  });
  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
  downloadBlob(blob, `${safeName(record.pack_name)}_audiences.csv`);
}

export function exportMetaPackAsPDF(record: MetaActivationPackRecord) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const margin = 40;
  const lineHeight = 16;
  const pageHeight = doc.internal.pageSize.getHeight();
  let y = margin;

  const writeLine = (text: string, bold = false) => {
    if (y > pageHeight - margin) {
      doc.addPage();
      y = margin;
    }
    doc.setFont("helvetica", bold ? "bold" : "normal");
    const wrapped = doc.splitTextToSize(text, 515);
    doc.text(wrapped, margin, y);
    y += wrapped.length * lineHeight;
  };

  writeLine(`Meta Activation Pack: ${record.pack_name}`, true);
  writeLine(`Generated: ${new Date(record.created_at).toLocaleString("en-GB")}`);
  if (record.goal) writeLine(`Goal: ${record.goal}`);
  y += 8;

  writeLine("Audience Plan", true);
  (record.pack_json.audience_plan || []).forEach((aud, i) => {
    writeLine(`${i + 1}. ${aud.audience_name}`, true);
    writeLine(`Source: ${aud.source_type}`);
    writeLine(`Rule: ${aud.build_rule}`);
    writeLine(`Retention: ${aud.retention_window} | Use case: ${aud.use_case}`);
    writeLine(`Exclusions: ${(aud.exclusions || []).join(" | ") || "None"}`);
    y += 4;
  });

  y += 6;
  writeLine("Lookalike Plan", true);
  writeLine(`Sources: ${(record.pack_json.lookalike_plan?.source_audiences || []).join(" | ") || "—"}`);
  (record.pack_json.lookalike_plan?.tier_recommendations || []).forEach((tier) => {
    writeLine(`- ${tier.tier_name} (${tier.percentage}): ${tier.use_case}`);
  });
  writeLine(
    `Mandatory exclusions: ${(record.pack_json.lookalike_plan?.mandatory_exclusions || []).join(" | ") || "—"}`
  );
  writeLine(`Location note: ${record.pack_json.lookalike_plan?.location_note || "—"}`);

  y += 6;
  writeLine("30-Day Roadmap", true);
  (record.pack_json.roadmap_30d || []).forEach((week) => {
    writeLine(`${week.week} - ${week.focus}`, true);
    (week.tasks || []).forEach((task) => writeLine(`- ${task}`));
    writeLine(`Checkpoint: ${week.checkpoint}`);
    writeLine(`Decision rule: ${week.decision_rule}`);
    y += 4;
  });

  y += 6;
  writeLine("Compliance Notes", true);
  (record.pack_json.compliance_notes || []).forEach((note) => writeLine(`- ${note}`));

  doc.save(`${safeName(record.pack_name)}_${record.id}.pdf`);
}
