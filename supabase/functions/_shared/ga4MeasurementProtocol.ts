/**
 * GA4 Measurement Protocol helper for Stripe webhooks.
 * Env: GA4_MEASUREMENT_ID and GA4_API_SECRET. If either is missing, log once and skip.
 */

let missingSecretsLogged = false;

type Ga4Param = string | number | boolean;

export async function sendGa4MeasurementProtocolEvent(input: {
  name: string;
  clientId?: string | null;
  sessionId?: string | null;
  userId?: string | null;
  params?: Record<string, Ga4Param>;
}): Promise<boolean> {
  try {
    const apiSecret = (Deno.env.get("GA4_API_SECRET") ?? "").trim();
    const measurementId = (Deno.env.get("GA4_MEASUREMENT_ID") ?? "").trim();
    if (!apiSecret || !measurementId) {
      if (!missingSecretsLogged) {
        missingSecretsLogged = true;
        console.warn("[ga4-mp] skipped — GA4_MEASUREMENT_ID or GA4_API_SECRET not set");
      }
      return false;
    }
    const clientId = (input.clientId || "").trim() || "stripe.webhook";
    const params: Record<string, Ga4Param> = { ...(input.params ?? {}) };
    const sessionId = (input.sessionId || "").trim();
    if (/^\d{1,20}$/.test(sessionId)) {
      params.session_id = sessionId;
      if (params.engagement_time_msec == null) params.engagement_time_msec = 1;
    }
    const body: Record<string, unknown> = {
      client_id: clientId,
      events: [
        {
          name: input.name.slice(0, 40),
          params,
        },
      ],
    };
    if (input.userId) body.user_id = input.userId;

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
