import type { StrategyWithLinks } from "../hooks/useBrandStrategies";
import { createTextPdf, sanitizeExportFilename } from "./pdfTextExport";

export function exportStrategyAsPDF(strategy: StrategyWithLinks) {
  const date = new Date().toISOString().split("T")[0];
  const filename = `strategy_${sanitizeExportFilename(strategy.title)}_${date}.pdf`;
  const pdf = createTextPdf();
  const payload = strategy.strategy;

  const aimNames = (strategy.aims || [])
    .map((a) => a.title)
    .filter(Boolean)
    .join(", ");
  const personaNames = (strategy.icps || [])
    .map((p) => p.name)
    .filter(Boolean)
    .join(", ");

  pdf.title(strategy.title || "Strategy");
  pdf.subtitle(`Version ${strategy.version} · Exported ${date}`);
  pdf.rule();

  pdf.heading("Serves");
  pdf.body(`Aims: ${aimNames || "—"}`);
  pdf.body(`Personas: ${personaNames || "—"}`);

  pdf.heading("Positioning");
  pdf.subheading("One-liner");
  pdf.body(payload?.positioning?.one_liner);
  pdf.subheading("Why us");
  pdf.body(payload?.positioning?.why_us);
  pdf.subheading("Differentiators");
  pdf.bullets(payload?.positioning?.differentiators);

  pdf.heading("Messaging");
  pdf.subheading("Value props");
  pdf.bullets(payload?.messaging?.value_props);
  pdf.subheading("Pain to promise");
  pdf.bullets(payload?.messaging?.pain_to_promise);
  pdf.subheading("Objections & rebuttals");
  pdf.bullets(payload?.messaging?.objections_and_rebuttals);

  pdf.heading("Campaign ideas");
  const ideas = Array.isArray(payload?.campaign_ideas) ? payload.campaign_ideas : [];
  if (!ideas.length) {
    pdf.body("No campaign ideas yet.");
  } else {
    ideas.forEach((idea, index) => {
      pdf.subheading(`${index + 1}. ${idea.name || "Untitled idea"}`);
      if (idea.hook) {
        pdf.body(`Hook: ${idea.hook}`);
      }
      if (idea.angle) {
        pdf.body(`Angle: ${idea.angle}`);
      }
      if (idea.cta) {
        pdf.body(`CTA: ${idea.cta}`);
      }
      pdf.gap(4);
    });
  }

  pdf.save(filename);
}

export default { exportStrategyAsPDF };
