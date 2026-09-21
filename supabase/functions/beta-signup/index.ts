import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

type BetaSignupInput = {
  email: string;
  password: string;
  fullName: string;
  contactNumber: string;
  accessCode: string;
  legalAccepted?: boolean;
  legalVersion?: string;
};

function json(resBody: unknown, status = 200) {
  return new Response(JSON.stringify(resBody), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers":
        "authorization, x-client-info, apikey, content-type",
    },
  });
}

function corsPreflight(req: Request) {
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers":
          "authorization, x-client-info, apikey, content-type",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
      },
    });
  }
  return null;
}

function toHex(buffer: ArrayBuffer) {
  return [...new Uint8Array(buffer)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function sha256(value: string) {
  const data = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return toHex(digest);
}

function makeStripeSubscriptionRow(userId: string) {
  const now = new Date();
  const periodEnd = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000).toISOString();
  return {
    user_id: userId,
    stripe_subscription_id: `beta_${userId}`,
    stripe_customer_id: `beta_customer_${userId}`,
    price_id: "beta_access",
    status: "active",
    cancel_at_period_end: false,
    trial_start: now.toISOString(),
    trial_end: periodEnd,
    current_period_end: periodEnd,
    updated_at: now.toISOString(),
  };
}

Deno.serve(async (req) => {
  const preflight = corsPreflight(req);
  if (preflight) return preflight;

  try {
    if (req.method !== "POST") {
      return json({ error: "Method not allowed" }, 405);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRole =
      Deno.env.get("SERVICE_ROLE_KEY") ?? Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !serviceRole) {
      return json({ error: "Missing server env vars" }, 500);
    }

    const body = (await req.json()) as Partial<BetaSignupInput>;
    const email = body.email?.trim().toLowerCase() ?? "";
    const password = body.password ?? "";
    const fullName = body.fullName?.trim() ?? "";
    const contactNumber = body.contactNumber?.trim() ?? "";
    const accessCode = body.accessCode?.trim() ?? "";

    if (!email || !password || !accessCode || !fullName || !contactNumber) {
      return json(
        { error: "email, password, fullName, contactNumber and accessCode are required" },
        400
      );
    }
    if (password.length < 6) {
      return json({ error: "Password must be at least 6 characters" }, 400);
    }
    if (!body.legalAccepted) {
      return json({ error: "You must accept the Terms of Use, Privacy Policy, and Cookie Policy" }, 400);
    }

    const legalAcceptedAt = new Date().toISOString();
    const legalVersion =
      typeof body.legalVersion === "string" && body.legalVersion.trim()
        ? body.legalVersion.trim().slice(0, 32)
        : "unknown";

    const codeHash = await sha256(accessCode);
    const admin = createClient(supabaseUrl, serviceRole);

    const { data: invite, error: inviteError } = await admin
      .from("beta_invites")
      .select("*")
      .eq("email", email)
      .eq("access_code_hash", codeHash)
      .eq("status", "active")
      .maybeSingle();

    if (inviteError) {
      return json({ error: "Failed to validate beta invite" }, 500);
    }
    if (!invite) {
      return json({ error: "Invalid beta invite credentials" }, 401);
    }

    const nowIso = new Date().toISOString();
    if (invite.expires_at && new Date(invite.expires_at).getTime() <= Date.now()) {
      return json({ error: "This beta invite has expired" }, 403);
    }
    if (typeof invite.max_uses === "number" && invite.uses_count >= invite.max_uses) {
      return json({ error: "This beta invite has already been used" }, 403);
    }

    const { data: created, error: createError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        name: fullName,
        full_name: fullName,
        contact_number: contactNumber,
        beta_user: true,
      },
    });

    if (createError || !created?.user?.id) {
      const msg = createError?.message || "";
      if (msg.toLowerCase().includes("already")) {
        return json({ error: "An account with this email already exists. Please log in." }, 409);
      }
      return json({ error: "Failed to create account", details: msg }, 500);
    }

    const userId = created.user.id;

    await admin.from("profiles").upsert(
      {
        id: userId,
        email,
        name: fullName,
        contact_number: contactNumber,
        subscription_tier: "pro",
        terms_accepted_at: legalAcceptedAt,
        privacy_accepted_at: legalAcceptedAt,
        legal_version: legalVersion,
      },
      { onConflict: "id" }
    );

    const { data: existingSub } = await admin
      .from("stripe_subscriptions")
      .select("id")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const subRow = makeStripeSubscriptionRow(userId);
    if (existingSub?.id) {
      await admin.from("stripe_subscriptions").update(subRow).eq("id", existingSub.id);
    } else {
      await admin.from("stripe_subscriptions").insert(subRow);
    }

    await admin
      .from("beta_invites")
      .update({
        uses_count: (invite.uses_count ?? 0) + 1,
        redeemed_at: invite.redeemed_at ?? nowIso,
        updated_at: nowIso,
      })
      .eq("id", invite.id);

    return json({ ok: true, email });
  } catch (err) {
    return json({ error: "Unhandled error", message: String(err) }, 500);
  }
});
