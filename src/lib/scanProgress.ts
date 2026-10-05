export const SCAN_LINE_INTERVAL_MS = 3500;
export const SCAN_CHECKLIST_STEP_MS = 4000;

export const SCAN_REASSURANCE = [
  { atMs: 25_000, text: "Bigger sites take a little longer to read properly — nearly there." },
  { atMs: 40_000, text: "Still going — we'd rather get this right than rush it." },
  { atMs: 60_000, text: "This one's taking longer than usual. Leave the tab open, it'll appear here when it's ready." },
] as const;

export const SCAN_CHECKLIST = [
  { id: "website", label: "Checking your website" },
  { id: "content", label: "Reading your content" },
  { id: "social", label: "Analysing social presence", requiresHandles: true },
  { id: "audience", label: "Scoring audience alignment" },
  { id: "report", label: "Generating your report" },
] as const;

export type ScanChecklistItem = (typeof SCAN_CHECKLIST)[number];

export function visibleScanChecklist(hasHandles: boolean): ScanChecklistItem[] {
  return SCAN_CHECKLIST.filter((item) => !("requiresHandles" in item && item.requiresHandles) || hasHandles);
}

/** Index of the active step. The last step stays active until the result arrives. */
export function activeChecklistIndex(elapsedMs: number, count: number): number {
  if (count <= 1) return 0;
  const stepped = Math.floor(Math.max(0, elapsedMs) / SCAN_CHECKLIST_STEP_MS);
  return Math.min(stepped, count - 1);
}

/**
 * Each pool line is shown once, about every 3.5s.
 * After the pool is used up, the latest due reassurance is shown, once each as time passes.
 * Before 25s with an empty remainder, the last line stays on screen.
 */
export function scanStatusLine(pool: readonly string[], elapsedMs: number): string {
  const lines = pool.filter((line) => line.trim());
  if (lines.length === 0) {
    return reassuranceAt(elapsedMs) ?? "";
  }
  const index = Math.floor(Math.max(0, elapsedMs) / SCAN_LINE_INTERVAL_MS);
  if (index < lines.length) return lines[index];
  return reassuranceAt(elapsedMs) ?? lines[lines.length - 1];
}

function reassuranceAt(elapsedMs: number): string | undefined {
  let current: string | undefined;
  for (const step of SCAN_REASSURANCE) {
    if (elapsedMs >= step.atMs) current = step.text;
  }
  return current;
}
