import { formatPlanStartDate } from "../components/plan/planDisplay";
import { planDayISODate, type PlanWithDays } from "../lib/plans";
import { createTextPdf, sanitizeExportFilename } from "./pdfTextExport";

export async function exportPlanAsPDF(
  plan: PlanWithDays,
  options?: { strategyTitle?: string | null; createdFor?: string | null }
) {
  const date = new Date().toISOString().split("T")[0];
  const filename = `plan_${sanitizeExportFilename(plan.title)}_${date}.pdf`;
  const start = formatPlanStartDate(plan.start_date);
  const end = formatPlanStartDate(planDayISODate(plan.start_date, plan.length_days));
  const pdf = await createTextPdf({
    documentType: "Plan",
    title: plan.title || "Plan",
    createdFor: options?.createdFor,
    date,
  });

  pdf.subtitle(`${options?.strategyTitle?.trim() || "Strategy"} · ${start} – ${end}`);
  pdf.rule();

  const days = [...plan.days].sort((a, b) => a.day_number - b.day_number);
  for (const day of days) {
    pdf.heading(`Day ${day.day_number} · ${day.title || "—"}`);
    pdf.body(day.task);
    if (day.channel?.trim()) {
      pdf.body(`Channel: ${day.channel.trim()}`);
    }
    pdf.tickBox();
    const notes = day.notes.trim();
    if (notes) {
      pdf.subheading("Notes");
      pdf.body(notes);
    }
    pdf.gap(8);
  }

  await pdf.save(filename);
}
