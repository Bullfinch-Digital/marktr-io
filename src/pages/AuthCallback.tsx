import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { supabase } from "../config/supabase";
import { useAuth } from "../contexts/AuthContext";
import { runPostAuthPipelineWithTimeout } from "../lib/postAuthPipeline";
import { fetchUserHasProAccess } from "../lib/proAccess";
import { redirectToStripeCheckout } from "../lib/stripeCheckout";
import {
  clearPendingCheckoutPlan,
  getResumablePendingCheckoutPlan,
  hasSameTabCheckoutIntent,
} from "../utils/pendingCheckout";
import {
  clearOAuthNext,
  hasOAuthCallbackParams,
  hasSessionOAuthNext,
  resolveOAuthNext,
} from "../utils/oauthRedirect";

function hashParams(): URLSearchParams {
  return new URLSearchParams(window.location.hash.replace(/^#/, ""));
}

/** Old confirmation emails carried intent/plan. They are not a checkout signal. */
function isEmailConfirmationLink(search: string): boolean {
  const query = new URLSearchParams(search);
  if (query.get("intent") === "trial") return true;
  const type = query.get("type") || hashParams().get("type");
  return type === "signup" || type === "email";
}

function isRecoveryLink(search: string): boolean {
  const query = new URLSearchParams(search);
  const type = query.get("type") || hashParams().get("type");
  return type === "recovery";
}

function navigateAfterAuth(next: string) {
  // Strip resumeCheckout from the landing URL so bookmarks/share don't re-trigger paywall.
  let safeNext = next.startsWith("/") ? next : "/dashboard";
  try {
    const url = new URL(safeNext, window.location.origin);
    url.searchParams.delete("resumeCheckout");
    url.searchParams.delete("intent");
    url.searchParams.delete("plan");
    safeNext = `${url.pathname}${url.search}${url.hash}` || "/dashboard";
  } catch {
    // keep safeNext
  }
  clearOAuthNext();
  if (window.location.pathname + window.location.search === safeNext) return;
  window.location.replace(safeNext);
}

async function completeOAuthHandoff(userId: string, email: string | null, next: string) {
  await runPostAuthPipelineWithTimeout(userId, email);

  // Email confirmation links only sign the user in. Trial checkout stays in the
  // tab that submitted the code, where the session intent was stored.
  const sameTabTrial =
    !isEmailConfirmationLink(window.location.search) &&
    (hasSameTabCheckoutIntent() || hasSessionOAuthNext());
  const pendingPlan = sameTabTrial ? getResumablePendingCheckoutPlan(next) : null;
  if (!sameTabTrial) {
    clearPendingCheckoutPlan();
  }
  if (pendingPlan) {
    const hasAccess = await fetchUserHasProAccess(userId);
    if (!hasAccess) {
      const checkout = await redirectToStripeCheckout(pendingPlan);
      if (checkout.status === "redirect") {
        return;
      }
      if (checkout.status === "error") {
        console.warn("[AuthCallback] checkout resume failed", checkout.message);
      }
      clearPendingCheckoutPlan();
    } else {
      clearPendingCheckoutPlan();
    }
  }

  navigateAfterAuth(sameTabTrial ? next : "/dashboard");
}

export default function AuthCallback() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, loading: authLoading } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState("Signing you in…");
  const handledRef = useRef(false);

  useEffect(() => {
    if (handledRef.current) return;

    const run = async () => {
      const recovery = isRecoveryLink(location.search);
      const next = recovery ? "/reset-password" : resolveOAuthNext(location.search);
      const url = new URL(window.location.href);
      const hasOAuth = hasOAuthCallbackParams(url);
      const isAnonymous = Boolean((user as { is_anonymous?: boolean })?.is_anonymous);

      if (!authLoading && user && !isAnonymous && !hasOAuth) {
        handledRef.current = true;
        if (recovery) {
          navigateAfterAuth("/reset-password");
          return;
        }
        await completeOAuthHandoff(user.id, user.email ?? null, next);
        return;
      }

      try {
        const code = url.searchParams.get("code");
        const hash = hashParams();
        const accessToken = hash.get("access_token");
        const refreshToken = hash.get("refresh_token");

        if (code) {
          const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
          if (exchangeError) throw exchangeError;

          handledRef.current = true;
          setStatusMessage("Saving your results…");
          const sessionUser = data.session?.user;
          if (recovery) {
            navigateAfterAuth("/reset-password");
            return;
          }
          if (sessionUser?.id) {
            await completeOAuthHandoff(sessionUser.id, sessionUser.email ?? null, next);
          } else {
            navigateAfterAuth(recovery ? "/reset-password" : "/dashboard");
          }
          return;
        }

        if (accessToken && refreshToken) {
          const { data, error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          if (sessionError) throw sessionError;

          handledRef.current = true;
          setStatusMessage("Saving your results…");
          if (recovery) {
            navigateAfterAuth("/reset-password");
            return;
          }
          const sessionUser = data.session?.user;
          if (sessionUser?.id) {
            await completeOAuthHandoff(sessionUser.id, sessionUser.email ?? null, next);
          } else {
            navigateAfterAuth("/dashboard");
          }
          return;
        }

        if (!authLoading) {
          const { data: sessionData } = await supabase.auth.getSession();
          const sessionUser = sessionData?.session?.user ?? null;
          if (sessionUser && !(sessionUser as { is_anonymous?: boolean }).is_anonymous) {
            handledRef.current = true;
            if (recovery) {
              navigateAfterAuth("/reset-password");
              return;
            }
            setStatusMessage("Saving your results…");
            await completeOAuthHandoff(sessionUser.id, sessionUser.email ?? null, next);
          } else if (!hasOAuth) {
            handledRef.current = true;
            navigate("/login", { replace: true });
          }
        }
      } catch (e: unknown) {
        console.error("AuthCallback error:", e);
        setError(e instanceof Error ? e.message : "Something went wrong signing you in.");
      }
    };

    void run();
  }, [location.search, location.hash, navigate, user, authLoading]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md text-center">
        <div className="mb-3 font-['Fraunces'] text-3xl leading-tight sm:text-4xl">{statusMessage}</div>
        {statusMessage === "Saving your results…" && (
          <div
            className="w-10 h-10 mx-auto mb-4 border-4 border-button-green border-t-transparent rounded-full animate-spin"
            aria-hidden
          />
        )}
        <p className="text-foreground/70 mb-8">
          {statusMessage === "Saving your results…"
            ? "Creating your brand and saving health, story, and customer profiles."
            : "Just finishing up your account."}
        </p>

        {error && (
          <div className="border border-black rounded-design bg-white p-4 text-left">
            <p className="font-['Fraunces'] text-lg mb-2">Hmm — something went wrong</p>
            <p className="font-['Plus_Jakarta_Sans'] text-sm text-foreground/70">{error}</p>
            <p className="font-['Plus_Jakarta_Sans'] text-xs text-foreground/60 mt-3 reminder">
              Tip: If you opened the email in Incognito / a different browser, the sign-in link can’t complete.
              Open it in the same browser you signed up in, or just log in.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
