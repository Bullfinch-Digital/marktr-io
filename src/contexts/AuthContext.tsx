// src/contexts/AuthContext.tsx

import { createContext, useContext, useEffect, useState, ReactNode, useRef } from "react";
import type { User, Session, AuthError } from "@supabase/supabase-js";
import { supabase } from "../config/supabase";
import { flushGuestICPsToSupabase } from "../lib/guestICP";
import { syncOutbox } from "../lib/syncOutbox";
import { markLeadConverted } from "../lib/leadCapture";
import { getGuestBrandSeed, clearGuestBrandSeed } from "../lib/guestBrandSeed";
import { setOAuthNext } from "../utils/oauthRedirect";
import {
  buildLinkBody,
  clearPendingGuestLink,
  getPendingGuestLink,
} from "../utils/pendingGuestLink";

type AuthContextType = {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (args: { email: string; password: string; name: string }) => Promise<{ error: AuthError | null }>;
  signInWithPassword: (args: { email: string; password: string }) => Promise<{ error: AuthError | null }>;
  signInWithGoogle: (redirectPath?: string) => Promise<{ error: AuthError | null }>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// ------------------------------------------------------------------
// Helper: insert-only profile ensure (Option A)
//  - Only inserts if no profile exists
//  - Never updates existing rows (so subscription_tier is safe)
//  - Runs in the background, never blocks loading
// ------------------------------------------------------------------
async function ensureProfileInsertOnly(user: User) {
  const uid = user.id;
  const isAnonymous = (user as any)?.is_anonymous === true;
  const email = isAnonymous ? "" : user.email ?? "";
  const name = (user.user_metadata as any)?.name ?? null;

  try {
    // 1) Check if a profile already exists for this user
    const { data, error } = await supabase
      .from("profiles")
      .select("id")
      .eq("id", uid)
      .maybeSingle();

    if (error) {
      console.warn("AuthContext: profile fetch error", error);
      return; // soft-fail, do not block auth
    }

    if (data) {
      console.log("AuthContext: profile already exists, skipping insert for", uid);
      return;
    }

    // 2) Insert a fresh profile row with default free tier
    const { error: insertErr } = await supabase.from("profiles").upsert(
      {
        id: uid,
        email,
        name,
        subscription_tier: "free",
      },
      { onConflict: "id" }
    );

    if (insertErr) {
      console.warn("AuthContext: profile insert error", insertErr);
      return;
    }

    console.log("AuthContext: profile inserted for user", uid);
  } catch (err) {
    console.warn("AuthContext: ensureProfileInsertOnly unexpected error", err);
  }
}

// ------------------------------------------------------------------
  // Helper: create first Brand from guest onboarding seed (idempotent)
  // ------------------------------------------------------------------
  async function ensureFirstBrandFromGuestSeed(userId: string) {
    if (!userId) return null;

  // 1) If user already has a brand, do nothing
  try {
    const { data, error } = await supabase
      .from("brands")
      .select("id")
      .eq("user_id", userId)
      .limit(1);

    if (error) {
      if (import.meta.env.DEV) console.warn("AuthContext: brand check error", error);
      return null;
    }
    if (data && data.length > 0) {
      return null;
    }
  } catch (err) {
    if (import.meta.env.DEV) console.warn("AuthContext: brand check unexpected", err);
    return null;
  }

  // 2) Try to read seed
  const seed = getGuestBrandSeed();
  if (!seed) return null;
  if (!seed.brandName?.trim()) return null;

  const now = new Date().toISOString();
  const row = {
    user_id: userId,
    name: seed.brandName.trim(),
    color: null,
    website: null,
    business_description:
      (() => {
        const desc = seed.businessDescription ?? "";
        // Strip any trailing "Business type: ..." that may have been stored from older seeds
        return desc.replace(/Business type:\s*(B2B|B2C|Both)\s*$/i, "").trim() || null;
      })(),
    product_or_service: seed.productOrService ?? null,
    business_type: seed.businessType ?? null,
    assumed_audience: seed.assumedAudience ?? [],
    marketing_channels: seed.marketingChannels ?? [],
    country: seed.country ?? null,
    region_or_city: seed.regionOrCity ?? null,
    currency: seed.currency ?? null,
    created_at: now,
    updated_at: now,
  };

  try {
    const { data, error } = await supabase
      .from("brands")
      .insert([row])
      .select("id")
      .single();

    if (error) {
      // Handle conflict (brand already exists) gracefully by fetching the first brand
      const isConflict =
        (error as any)?.code === "23505" ||
        (error as any)?.code === "409" ||
        (error as any)?.details?.includes?.("already exists") ||
        (error as any)?.message?.toLowerCase?.().includes?.("duplicate key") ||
        (error as any)?.message?.toLowerCase?.().includes?.("already exists");
      if (isConflict) {
        const { data: existing, error: fetchErr } = await supabase
          .from("brands")
          .select("id")
          .eq("user_id", userId)
          .order("created_at", { ascending: true })
          .limit(1);
        if (fetchErr) {
          if (import.meta.env.DEV) console.warn("AuthContext: conflict fetch brand error", fetchErr);
          return null;
        }
        const existingId = existing && existing.length ? existing[0].id : null;
        if (existingId) {
          clearGuestBrandSeed();
          try {
            window.dispatchEvent(new Event("brands:changed"));
          } catch {}
        }
        return existingId;
      }

      if (import.meta.env.DEV) console.warn("AuthContext: brand insert error", error);
      return null;
    }

    clearGuestBrandSeed();
    try {
      window.dispatchEvent(new Event("brands:changed"));
    } catch {
      // ignore
    }

    return (data as any)?.id ?? null;
  } catch (err) {
    if (import.meta.env.DEV) console.warn("AuthContext: brand insert unexpected", err);
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const postAuthRanRef = useRef<string | null>(null);
  const pendingLinkAttemptRef = useRef<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    console.log("AuthContext: Initializing…");

    // --------------------------------------------------------------
    // Post-auth pipeline: MUST NEVER block auth hydration / routing.
    // Fire-and-forget with its own internal guard + timeouts.
    // --------------------------------------------------------------
    const runPostAuthPipeline = async (userId: string, email?: string | null) => {
      // Guard: run once per user id
      if (postAuthRanRef.current === userId) {
        // Still nudge UI refresh in case listeners attached late
        try {
          window.dispatchEvent(new Event("brands:changed"));
          window.dispatchEvent(new Event("icps:changed"));
        } catch {}
        return;
      }
      postAuthRanRef.current = userId;

      // Mark onboarding lead as converted (best-effort)
      if (email) {
        try {
          await markLeadConverted(email, userId);
        } catch (err) {
          if (import.meta.env.DEV) console.warn("AuthContext: markLeadConverted error", err);
        }
      }

      let brandId: string | null = null;

      // Time-box brand creation so it can’t deadlock the UI on refresh.
      try {
        brandId = await Promise.race([
          ensureFirstBrandFromGuestSeed(userId),
          new Promise<string | null>((resolve) => setTimeout(() => resolve(null), 2000)),
        ]);
      } catch (err) {
        if (import.meta.env.DEV) console.warn("AuthContext: ensureFirstBrandFromGuestSeed error", err);
      }

      try {
        window.dispatchEvent(new Event("brands:changed"));
      } catch {}

      // Time-box ICP flush too (already was, but keep it here in the pipeline)
      try {
        await Promise.race([
          flushGuestICPsToSupabase(userId, { brandId }),
          new Promise((resolve) => setTimeout(resolve, 2000)),
        ]);
      } catch (err) {
        if (import.meta.env.DEV) console.warn("AuthContext: flushGuestICPsToSupabase error", err);
      }

      try {
        window.dispatchEvent(new Event("icps:changed"));
      } catch {}
    };

    const tryAutoLinkPending = async (activeSession: Session | null) => {
      // Auto-link any pending guest checkout as soon as we have a valid session.
      try {
        const userId = activeSession?.user?.id ?? null;
        if (!activeSession?.access_token || !userId) return;

        if (pendingLinkAttemptRef.current === userId) return;

        const pending = getPendingGuestLink();
        if (!pending) return;

        const body = buildLinkBody();
        if (!body.session_id && !body.guest_ref) return;

        pendingLinkAttemptRef.current = userId;

        const { data, error } = await supabase.functions.invoke("link-guest-checkout", {
          body,
        });

        if (!error && (data?.ok || data?.linked || data?.alreadyLinked)) {
          clearPendingGuestLink();
          try {
            window.dispatchEvent(new Event("subscription:changed"));
            window.dispatchEvent(new Event("auth:changed"));
          } catch {}
          // Optional: force refresh so tier changes are visible immediately
          // window.location.reload();
        }
      } catch (e) {
        console.warn("[AuthContext] pending guest link failed", e);
      }
    };

    // --------------------------------------------------------------
    // Initial session load
    // --------------------------------------------------------------
    const init = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (!isMounted) return;

        if (error) {
          console.warn("AuthContext: getSession error", error);
        }

        const sess = data?.session ?? null;
        setSession(sess);
        setUser(sess?.user ?? null);
        void tryAutoLinkPending(sess);

        console.log("AuthContext: getSession() completed", { hasSession: !!sess });
      } catch (err) {
        if (!isMounted) return;
        console.warn("AuthContext: init unexpected error", err);
      } finally {
        if (isMounted) {
          setLoading(false);
          // If we hydrated with an existing session, kick post-auth pipeline in the background.
          // (Important on refresh where INITIAL_SESSION may arrive late or not at all.)
          try {
            const currentUser = (await supabase.auth.getUser()).data?.user ?? null;
            if (currentUser?.id) {
              void runPostAuthPipeline(currentUser.id, currentUser.email ?? null);
            }
          } catch {
            // ignore
          }
        }
      }
    };

    init();

    // --------------------------------------------------------------
    // Auth state listener
    // --------------------------------------------------------------
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, nextSession) => {
      if (!isMounted) return;

      console.log("AuthContext: onAuthStateChange event:", event, nextSession);

      try {
        const nextUser = nextSession?.user ?? null;
        setSession(nextSession ?? null);
        setUser(nextUser);
        // reset guard when user changes
        if (nextUser?.id && postAuthRanRef.current && postAuthRanRef.current !== nextUser.id) {
          postAuthRanRef.current = null;
        }
        if (!nextUser?.id) {
          pendingLinkAttemptRef.current = null;
        } else if (
          pendingLinkAttemptRef.current &&
          pendingLinkAttemptRef.current !== nextUser.id
        ) {
          pendingLinkAttemptRef.current = null;
        }

        await tryAutoLinkPending(nextSession ?? null);

        if (
          (event === "SIGNED_IN" || event === "INITIAL_SESSION" || event === "TOKEN_REFRESHED") &&
          nextUser?.id
        ) {
          try {
            await syncOutbox(nextUser.id);
          } catch (err) {
            console.warn("AuthContext: syncOutbox error", err);
          }
          try {
            window.dispatchEvent(new Event("auth:changed"));
          } catch {}
        }

        // Fire-and-forget profile ensure on SIGNED_IN
        if (event === "SIGNED_IN" && nextUser) {
          // Do NOT await; this must never block loading / routing
          void ensureProfileInsertOnly(nextUser);
        }

        // IMPORTANT: never await post-auth pipeline inside auth listener.
        if ((event === "SIGNED_IN" || event === "INITIAL_SESSION") && nextUser?.id) {
          void runPostAuthPipeline(nextUser.id, nextUser.email ?? null);
        }
      } catch (err) {
        console.warn("AuthContext: auth listener unexpected error", err);
      } finally {
        // Whatever happens, never leave loading=true
        setLoading(false);
      }
    });

    return () => {
      isMounted = false;
      console.log("AuthContext: Cleaning up auth state listener");
      subscription.unsubscribe();
    };
  }, []);

  // --------------------------------------------------------------
  // SIGN UP
  // --------------------------------------------------------------
  const signUp = async ({ email, password, name }: { email: string; password: string; name: string }) => {
    const payloadEmail = email.trim();
    const payloadName = name.trim();

    // Ensure email confirmation link returns the user to this app (dev + prod safe)
    // e.g. http://localhost:5173/auth/callback?next=/account in dev, your domain in production
    const emailRedirectTo = `${window.location.origin}/auth/callback?next=/account`;

    const { error } = await supabase.auth.signUp({
      email: payloadEmail,
      password,
      options: {
        data: { name: payloadName },
        emailRedirectTo,
      },
    });

    // Profile creation is handled centrally on SIGNED_IN
    return { error };
  };

  // --------------------------------------------------------------
  // SIGN IN
  // --------------------------------------------------------------
  const signInWithPassword = async ({ email, password }: { email: string; password: string }) => {
    console.log("AuthContext: signInWithPassword called for:", email);
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      console.warn("AuthContext: signInWithPassword error:", error.message);
    } else {
      console.log("AuthContext: signInWithPassword successful", data);
    }

    // We let the auth state listener update user/session + loading
    return { error };
  };

  // --------------------------------------------------------------
  // GOOGLE OAUTH
  // --------------------------------------------------------------
  const signInWithGoogle = async (redirectPath = "/dashboard") => {
    const safePath = redirectPath.startsWith("/") ? redirectPath : "/dashboard";
    setOAuthNext(safePath);

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo:
          `${window.location.origin}` +
          `/auth/callback?next=` +
          encodeURIComponent(safePath),
      },
    });
    return { error };
  };

  // --------------------------------------------------------------
  // SIGN OUT
  // --------------------------------------------------------------
  const signOut = async () => {
    console.log("AuthContext: signOut called");
    // Optimistically clear local auth state
    setSession(null);
    setUser(null);
    setLoading(false);

    try {
      await supabase.auth.signOut();
      console.log("AuthContext: signOut complete");
    } catch (err) {
      console.warn("AuthContext: signOut error", err);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        loading,
        signUp,
        signInWithPassword,
        signInWithGoogle,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}
