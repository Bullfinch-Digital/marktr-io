/** Sent only when the function actually sent. A throttle is never success. */
export function sendScoreOutcome(
  data: unknown,
  error: { context?: { status?: number } } | null,
): "sent" | "throttled" | "error" {
  const payload =
    data && typeof data === "object"
      ? (data as { ok?: unknown; code?: unknown; error?: unknown })
      : null;
  const code =
    typeof payload?.code === "string"
      ? payload.code
      : typeof payload?.error === "string"
        ? payload.error
        : null;
  if (code === "throttled" || error?.context?.status === 429) return "throttled";
  if (payload?.ok === true) return "sent";
  return "error";
}
