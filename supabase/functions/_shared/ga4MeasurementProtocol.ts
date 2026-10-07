/**
 * GA4 Measurement Protocol helper for Stripe webhooks.
 * Env: GA4_API_SECRET, optional GA4_MEASUREMENT_ID (defaults to marktr G-0EFXQPEYY6).
 * Deduplicate client/server hits with the same transaction_id.
 */

const DEFAULT_MEASUREMENT_ID = "G-0EFXQPEYY6";

type Ga4Param = string | number | boolean;

export async function sendGa4MeasurementProtocolEvent(input: {
  name: string;
  clientId?: string | null;
  userId?: string | null;
  params?: Record<string, Ga4Param>;
}): Promise<boolean> {
  const apiSecret = (Deno.env.get("GA4_API_SECRET") ?? "").trim();
  const measurementId = (Deno.env.get("GA4_MEASUREMENT_ID") ?? DEFAULT_MEASUREMENT_ID).trim();
  if (!apiSecret || !measurementId) {
    console.warn("[ga4-mp] skipped — GA4_API_SECRET not set");
    return false;
  }
  const clientId = (input.clientId || "").trim() || "stripe.webhook";
  const body: Record<string, unknown> = {
    client_id: clientId,
    events: [
      {
        name: input.name.slice(0, 40),
        params: input.params ?? {},
      },
    ],
  };
  if (input.userId) body.user_id = input.userId;

  try {
    const res = await fetch(
      `https://www.google-analytics.com/mp/collect?measurement_id=${encodeURIComponent(measurementId)}&api_secret=${encodeURIComponent(apiSecret)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      },
    );
    if (!res.ok) {
      console.warn("[ga4-mp] HTTP", res.status, await res.text().catch(() => ""));
      return false;
    }
    return true;
  } catch (err) {
    console.warn("[ga4-mp] failed", err);
    return false;
  }
}
