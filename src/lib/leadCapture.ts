import { supabase } from "../config/supabase";
import { isGuestLeadCaptured, markGuestLeadCaptured } from "./guestContext";

/** Read JSON/text body from a Supabase FunctionsHttpError (error.context is a Response). */
async function readFunctionsHttpErrorBody(error: unknown): Promise<unknown> {
  const res = (error as { context?: unknown })?.context;
  if (!res || typeof res !== "object") return null;
  const response = res as Response;
  if (typeof response.json !== "function") return null;
  try {
    const ct = response.headers.get("Content-Type") || "";
    if (ct.includes("application/json")) {
      return await response.json();
    }
    return await response.text();
  } catch {
    return null;
  }
}

export function isTurnstileConfigured(): boolean {
  return Boolean((import.meta.env.VITE_TURNSTILE_SITE_KEY as string | undefined)?.trim());
}

/**
 * Best-effort lead capture for onboarding emails via Edge Function (service role).
 * Requires Turnstile token for anonymous users; logged-in users can pass userId without token.
 * @returns true when the lead was written (or already captured via flag).
 */
export async function upsertOnboardingLead(
  email: string,
  opts?: {
    source?: string;
    userId?: string | null;
    token?: string | null;
    metadata?: Record<string, unknown>;
    name?: string | null;
  }
): Promise<boolean> {
  const trimmed = email?.trim();
  if (!trimmed) return false;

  const siteKey = (import.meta.env.VITE_TURNSTILE_SITE_KEY as string | undefined)?.trim();
  if (!siteKey) {
    console.warn(
      "[leadCapture] VITE_TURNSTILE_SITE_KEY is not set; skipping onboarding_leads capture (add Turnstile to your env / hosting build).",
    );
    return false;
  }

  try {
    const payload: Record<string, unknown> = {
      email: trimmed,
      source: opts?.source || "onboarding",
      intent: "capture",
      token: opts?.token ?? null,
      metadata: opts?.metadata ?? null,
    };

    if (opts?.userId) {
      payload.userId = opts.userId;
    }

    if (typeof opts?.name === "string" && opts.name.trim().length) {
      payload.name = opts.name.trim();
    }

    const { data, error } = await supabase.functions.invoke("capture-onboarding-lead", {
      body: payload,
    });
    if (error) {
      const responseBody = await readFunctionsHttpErrorBody(error);
      const status = (error as { context?: Response })?.context?.status;
      console.warn("[leadCapture] upsert lead failed", {
        status,
        responseBody,
        message: (error as Error)?.message ?? String(error),
        data,
      });
      return false;
    }
    return true;
  } catch (err) {
    console.warn("[leadCapture] upsert lead failed", err);
    return false;
  }
}

/**
 * Idempotent guest lead capture — skips if leadCapturedAt is already set.
 * Anonymous guests require a Turnstile token when Turnstile is configured.
 */
export async function captureGuestLeadOnce(opts: {
  email: string;
  name?: string | null;
  token?: string | null;
  source?: string;
  userId?: string | null;
}): Promise<boolean> {
  if (isGuestLeadCaptured()) return true;

  const trimmed = opts.email?.trim();
  if (!trimmed) return false;

  if (isTurnstileConfigured() && !opts.userId && !opts.token) {
    return false;
  }

  const ok = await upsertOnboardingLead(trimmed, {
    source: opts.source || "guest",
    userId: opts.userId ?? null,
    token: opts.token ?? null,
    name: opts.name ?? null,
  });

  if (ok) markGuestLeadCaptured();
  return ok;
}

/**
 * Mark a lead as converted when a user account exists (service role Edge Function).
 */
export async function markLeadConverted(email: string | null | undefined, userId: string | null | undefined) {
  if (!email || !userId) return;
  try {
    const { data, error } = await supabase.functions.invoke("capture-onboarding-lead", {
      body: {
        email,
        userId,
        intent: "convert",
      },
    });
    if (error) {
      const responseBody = await readFunctionsHttpErrorBody(error);
      const status = (error as { context?: Response })?.context?.status;
      console.warn("[leadCapture] mark converted failed", {
        status,
        responseBody,
        message: (error as Error)?.message ?? String(error),
        data,
      });
      throw error;
    }
  } catch (err) {
    console.warn("[leadCapture] mark converted failed", err);
  }
}
