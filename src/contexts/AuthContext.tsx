// src/contexts/AuthContext.tsx

import { createContext, useContext, useEffect, useState, ReactNode, useRef } from "react";
import type { User, Session, AuthError } from "@supabase/supabase-js";
import { supabase } from "../config/supabase";
import { flushGuestICPsToSupabase } from "../lib/guestICP";
import { transferGuestMarktrData } from "../lib/transferGuestMarktrData";
import { runOncePerKey } from "../lib/asyncUserLock";
import { isRealUser } from "../utils/isRealUser";
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
async function tryMigrateSubscriptionByEmail(user: User) {
  const isAnonymous = (user as any)?.is_anonymous === true;
  if (!user.email || isAnonymous) return;

  try {
    const { data, error } = await supabase.functions.invoke(
      "migrate-subscription-by-email",
      { body: {} }
    );

    if (error) {
      console.warn("AuthContext: migrate-subscription-by-email failed", error);
      return;
    }

    if (data?.migrated) {
      console.log(
        "AuthContext: migrated subscription from",
        data.fromUserId,
        "to",
        user.id
      );
      try {
        window.dispatchEvent(new Event("subscription:changed"));
        window.dispatchEvent(new Event("auth:changed"));
      } catch {}
    }
  } catch (err) {
    console.warn("AuthContext: tryMigrateSubscriptionByEmail unexpected error", err);
  }
}

async function ensureProfileInsertOnly(user: User) {
  const uid = user.id;
  const isAnonymous = (user as any)?.is_anonymous === true;
  const email = isAnonymous ? "" : user.email ?? "";
  const name = (user.user_metadata as any)?.name ?? null;

  console.log("AuthContext: profile ensure start", { uid, email, name, isAnonymous, metadata: user.user_metadata });

  try {
    // 1) Check if a profile already exists for this user
    console.log("AuthContext: profile ensure step 1 — fetching profile");
    const { data, error } = await supabase
      .from("profiles")
      .select("id")
      .eq("id", uid)
      .maybeSingle();

    if (error) {
      console.warn("AuthContext: profile fetch error", error);
      return; // soft-fail, do not block auth
    }

    console.log("AuthContext: profile ensure step 1 — profile fetched", data);

    if (data) {
      console.log("AuthContext: profile already exists, skipping insert for", uid);
      return;
    }

    // 2) Insert a fresh profile row with default free tier
    console.log("AuthContext: profile ensure step 2 — inserting profile");
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

/** Post-auth pipeline completed for this browser session (per user id). */
const postAuthCompletedUserIds = new Set<string>();

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const pendingLinkAttemptRef = useRef<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    console.log("AuthContext: Initializing…");

    // --------------------------------------------------------------
    // Post-auth pipeline: MUST NEVER block auth hydration / routing.
    // Fire-and-forget with its own internal guard + timeouts.
    // --------------------------------------------------------------
    const runPostAuthPipeline = async (userId: string, email?: string | null) => {
      if (postAuthCompletedUserIds.has(userId)) {
        console.log("AuthContext: post-auth step 0 — skipped (already completed for user)", userId);
        try {
          window.dispatchEvent(new Event("brands:changed"));
          window.dispatchEvent(new Event("icps:changed"));
        } catch {}
        return;
      }

      return runOncePerKey(`post-auth-pipeline:${userId}`, async () => {
        if (postAuthCompletedUserIds.has(userId)) {
          console.log("AuthContext: post-auth step 0 — skipped (already ran for user)", userId);
          return;
        }

        console.log("AuthContext: post-auth step 0 — pipeline start", { userId, email });

      // Mark onboarding lead as converted (best-effort)
      if (email) {
        console.log("AuthContext: post-auth step 1 — markLeadConverted", email);
        try {
          await markLeadConverted(email, userId);
          console.log("AuthContext: post-auth step 1 — markLeadConverted done");
        } catch (err) {
          console.warn("AuthContext: markLeadConverted error", err);
        }
      } else {
        console.log("AuthContext: post-auth step 1 — markLeadConverted skipped (no email)");
      }

      let brandId: string | null = null;

      // Time-box brand creation so it can’t deadlock the UI on refresh.
      console.log("AuthContext: post-auth step 2 — brand seed start");
      try {
        brandId = await Promise.race([
          ensureFirstBrandFromGuestSeed(userId),
          new Promise<string | null>((resolve) => setTimeout(() => resolve(null), 2000)),
        ]);
        console.log("AuthContext: post-auth step 2 — brand seed done", { brandId });
      } catch (err) {
        console.warn("AuthContext: ensureFirstBrandFromGuestSeed error", err);
      }

      try {
        window.dispatchEvent(new Event("brands:changed"));
      } catch {}

      // Time-box health/story transfer (Google OAuth + email sign-in paths)
      console.log("AuthContext: post-auth step 3 — guest health/story transfer start");
      try {
        await Promise.race([
          transferGuestMarktrData(userId),
          new Promise((resolve) => setTimeout(resolve, 2000)),
        ]);
        console.log("AuthContext: post-auth step 3 — guest health/story transfer done");
      } catch (err) {
        console.warn("AuthContext: transferGuestMarktrData error", err);
      }

      // Time-box ICP flush too (already was, but keep it here in the pipeline)
      console.log("AuthContext: post-auth step 4 — ICP flush start");
      try {
        await Promise.race([
          flushGuestICPsToSupabase(userId, { brandId }),
          new Promise((resolve) => setTimeout(resolve, 2000)),
        ]);
        console.log("AuthContext: post-auth step 4 — ICP flush done");
      } catch (err) {
        console.warn("AuthContext: flushGuestICPsToSupabase error", err);
      }

      try {
        window.dispatchEvent(new Event("icps:changed"));
      } catch {}
      postAuthCompletedUserIds.add(userId);
      console.log("AuthContext: post-auth step 5 — pipeline complete");
      });
    };

    const tryAutoLinkPending = async (activeSession: Session | null) => {
      console.log("AuthContext: tryAutoLinkPending start", {
        hasSession: Boolean(activeSession?.access_token),
        userId: activeSession?.user?.id ?? null,
      });
      // Auto-link any pending guest checkout as soon as we have a valid session.
      try {
        const userId = activeSession?.user?.id ?? null;
        if (!activeSession?.access_token || !userId) {
          console.log("AuthContext: tryAutoLinkPending — skipped (no session/user)");
          return;
        }

        if (pendingLinkAttemptRef.current === userId) {
          console.log("AuthContext: tryAutoLinkPending — skipped (already attempted)");
          return;
        }

        const pending = getPendingGuestLink();
        if (!pending) {
          console.log("AuthContext: tryAutoLinkPending — skipped (no pending link)");
          return;
        }

        console.log("AuthContext: tryAutoLinkPending — invoking link-guest-checkout", pending);
        const body = buildLinkBody();
        if (!body.session_id && !body.guest_ref) {
          console.log("AuthContext: tryAutoLinkPending — skipped (empty body)");
          return;
        }

        pendingLinkAttemptRef.current = userId;

        const { data, error } = await supabase.functions.invoke("link-guest-checkout", {
          body,
        });

        console.log("AuthContext: tryAutoLinkPending — link-guest-checkout response", {
          error,
          data,
        });

        if (!error && (data?.ok || data?.linked || data?.alreadyLinked)) {
          clearPendingGuestLink();
          try {
            window.dispatchEvent(new Event("subscription:changed"));
            window.dispatchEvent(new Event("auth:changed"));
          } catch {}
        }
      } catch (e) {
        console.warn("[AuthContext] pending guest link failed", e);
      }
      console.log("AuthContext: tryAutoLinkPending done");
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

        console.log("AuthContext: getSession() completed", { hasSession: !!sess });
      } catch (err) {
        if (!isMounted) return;
        console.warn("AuthContext: init unexpected error", err);
      } finally {
        if (isMounted) {
          setLoading(false);
          // Defer Supabase calls — never await auth APIs in the same tick as getSession.
          setTimeout(() => {
            if (!isMounted) return;
            void (async () => {
              const { data } = await supabase.auth.getSession();
              const sess = data?.session ?? null;
              await tryAutoLinkPending(sess);
              const currentUser = sess?.user ?? null;
              if (isRealUser(currentUser)) {
                void runPostAuthPipeline(currentUser!.id, currentUser!.email ?? null);
              }
            })();
          }, 0);
        }
      }
    };

    init();

    // --------------------------------------------------------------
    // Auth state listener
    // --------------------------------------------------------------
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (!isMounted) return;

      console.log("AuthContext: onAuthStateChange event:", event, {
        userId: nextSession?.user?.id ?? null,
      });

      const nextUser = nextSession?.user ?? null;
      setSession(nextSession ?? null);
      setUser(nextUser);

      if (!nextUser?.id) {
        pendingLinkAttemptRef.current = null;
      } else if (
        pendingLinkAttemptRef.current &&
        pendingLinkAttemptRef.current !== nextUser.id
      ) {
        pendingLinkAttemptRef.current = null;
      }

      // Release the UI immediately — never await Supabase inside this callback (deadlocks getSession).
      setLoading(false);

      setTimeout(() => {
        if (!isMounted) return;
        void (async () => {
          try {
            await tryAutoLinkPending(nextSession ?? null);

            if (
              (event === "SIGNED_IN" ||
                event === "INITIAL_SESSION" ||
                event === "TOKEN_REFRESHED") &&
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

            if (event === "SIGNED_IN" && nextUser) {
              await ensureProfileInsertOnly(nextUser);
              if (!(nextUser as any)?.is_anonymous) {
                await tryMigrateSubscriptionByEmail(nextUser);
              }
            }

            if (
              (event === "SIGNED_IN" || event === "INITIAL_SESSION") &&
              isRealUser(nextUser)
            ) {
              void runPostAuthPipeline(nextUser!.id, nextUser!.email ?? null);
            }
          } catch (err) {
            console.warn("AuthContext: deferred auth listener error", err);
          }
        })();
      }, 0);
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
