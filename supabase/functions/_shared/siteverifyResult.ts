/** HTTP status callers must use when siteverify fails closed. */
export const TURNSTILE_REJECT_STATUS = 403;

export type TurnstileVerifyResult =
  | { ok: true; hostname: string }
  | { ok: false; errorCodes: string[] };

/**
 * Interpret a Cloudflare siteverify JSON body.
 * `allowedHostname` is optional; form functions omit it (any hostname for that widget).
 */
export function applySiteverifyResult(
  data: unknown,
  allowedHostname?: (hostname: string) => boolean,
): TurnstileVerifyResult {
  const rec =
    data && typeof data === "object" ? (data as Record<string, unknown>) : null;
  if (!rec || rec.success !== true) {
    const raw = rec && Array.isArray(rec["error-codes"]) ? rec["error-codes"] : [];
    const errorCodes = raw.length
      ? raw.map((code) => String(code))
      : ["verification-failed"];
    return { ok: false, errorCodes };
  }
  const hostname = typeof rec.hostname === "string" ? rec.hostname : "";
  if (allowedHostname && !allowedHostname(hostname)) {
    return { ok: false, errorCodes: ["hostname-mismatch"] };
  }
  return { ok: true, hostname };
}
