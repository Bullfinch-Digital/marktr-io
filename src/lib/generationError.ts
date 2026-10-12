import { track } from "./analytics";

export const GENERATION_ERROR_MESSAGE =
  "Something went wrong creating this. Please try again in a moment.";

export const GENERATION_STUCK_MESSAGE =
  "Still stuck? Email hello@bullfinchdigital.com";

/** Plain copy for a generation or scoring failure. No raw error text. */
export function generationErrorMessage(consecutiveFailures: number): string {
  if (consecutiveFailures >= 2) {
    return `${GENERATION_ERROR_MESSAGE} ${GENERATION_STUCK_MESSAGE}`;
  }
  return GENERATION_ERROR_MESSAGE;
}

export function edgeFunctionStatus(error: unknown): number | undefined {
  if (!error || typeof error !== "object") return undefined;
  const status = (error as { context?: { status?: unknown } }).context?.status;
  return typeof status === "number" && Number.isFinite(status) ? status : undefined;
}

/** Analytics only: function name and HTTP status. No user text. */
export function trackGenerationError(fn: string, error?: unknown, status?: number): void {
  const resolved = status ?? (error !== undefined ? edgeFunctionStatus(error) : undefined);
  const params: Record<string, unknown> = { fn };
  if (resolved !== undefined) params.status = resolved;
  track("generation_error", params);
}
