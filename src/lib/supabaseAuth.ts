import type { AuthError, Session, User } from "@supabase/supabase-js";
import { supabase } from "../config/supabase";
import { createLegalAcceptanceRecord } from "./legal";

export const EMAIL_SIGNUP_MIN_PASSWORD = 8;

export type EmailSignUpOutcome =
  | { status: "session" }
  | { status: "confirm_email" }
  | { status: "existing" }
  | { status: "error"; message: string };

type SignUpPayload = {
  user: Pick<User, "identities"> | null;
  session: Session | null;
};

/** New accounts have identities. Supabase returns an empty list for an existing email when confirmation is on. */
export function classifyEmailSignUp(
  payload: SignUpPayload | null,
  error: Pick<AuthError, "message"> | null,
): EmailSignUpOutcome {
  if (error) {
    if (/already registered|already exists|user already/i.test(error.message)) {
      return { status: "existing" };
    }
    return { status: "error", message: error.message };
  }
  const identities = payload?.user?.identities ?? [];
  if (identities.length === 0) return { status: "existing" };
  if (payload?.session) return { status: "session" };
  return { status: "confirm_email" };
}

export async function signUpWithEmail(args: {
  email: string;
  password: string;
  emailRedirectTo: string;
}): Promise<EmailSignUpOutcome> {
  const email = args.email.trim();
  if (!email) return { status: "error", message: "Enter your email to continue." };
  if (args.password.length < EMAIL_SIGNUP_MIN_PASSWORD) {
    return { status: "error", message: "Password must be at least 8 characters." };
  }

  const legal = createLegalAcceptanceRecord();
  const { data, error } = await supabase.auth.signUp({
    email,
    password: args.password,
    options: {
      data: {
        terms_accepted_at: legal.terms_accepted_at,
        privacy_accepted_at: legal.privacy_accepted_at,
        legal_version: legal.legal_version,
      },
      emailRedirectTo: args.emailRedirectTo,
    },
  });

  return classifyEmailSignUp(data, error);
}

/**
 * Get Supabase authentication headers for REST API calls
 * Use this for any manual fetch() calls to Supabase REST endpoints
 */
export async function getSupabaseAuthHeaders(): Promise<Record<string, string>> {
  const session = (await supabase.auth.getSession()).data.session;
  const token = session?.access_token ?? "";
  
  const headers: Record<string, string> = {
    apikey: import.meta.env.VITE_SUPABASE_ANON_KEY!,
    "Content-Type": "application/json",
  };
  
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  
  // Log headers in development (without exposing full values)
  if (import.meta.env.DEV) {
    console.log("🔐 Auth Headers:", {
      hasApikey: !!headers.apikey,
      apikeyFirst8: headers.apikey?.slice(0, 8) || "missing",
      hasAuth: !!headers.Authorization,
      tokenFirst10: token?.slice(0, 10) || "missing",
    });
  }
  
  return headers;
}

/**
 * Check if we're actually offline by attempting a simple Supabase query
 * Returns true if we can successfully connect, false if offline
 */
export async function checkOnlineStatus(): Promise<boolean> {
  try {
    // Try a simple query that requires auth to verify connectivity
    const { error } = await supabase
      .from("icps")
      .select("id")
      .limit(1);
    
    // If it's an auth error or network error, we're offline/unauthenticated
    if (error) {
      // 401/403 = auth issue, not necessarily offline
      // Network errors = offline
      const isNetworkError = !error.code || error.code === "ECONNREFUSED" || error.code === "ENOTFOUND";
      if (isNetworkError) {
        console.log("🌐 Network error detected - offline");
        return false;
      }
      // Other errors might be RLS or query issues, but connection is fine
      return true;
    }
    
    return true;
  } catch (err) {
    console.log("🌐 Connection check failed - offline");
    return false;
  }
}

