// src/contexts/AuthContext.tsx

import { createContext, useContext, useEffect, useState, ReactNode, useRef } from "react";
import type { User, Session, AuthError } from "@supabase/supabase-js";
import { supabase } from "../config/supabase";
import { runPostAuthPipeline } from "../lib/postAuthPipeline";
import { isRealUser } from "../utils/isRealUser";
import { syncOutbox } from "../lib/syncOutbox";
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

export { runPostAuthPipeline } from "../lib/postAuthPipeline";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const pendingLinkAttemptRef = useRef<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    console.log("AuthContext: Initializing…");

    // Post-auth pipeline: fire-and-forget for returning sessions.
    // OAuth signup awaits the same pipeline in AuthCallback before redirect.
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
              isRealUser(nextUser) &&
              window.location.pathname !== "/auth/callback"
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
