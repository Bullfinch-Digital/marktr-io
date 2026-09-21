import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { supabase } from "../config/supabase";
import { useAuth } from "../contexts/AuthContext";
import { runPostAuthPipelineWithTimeout } from "../lib/postAuthPipeline";
import { redirectToStripeCheckout } from "../lib/stripeCheckout";
import {
  clearPendingCheckoutPlan,
  getResumablePendingCheckoutPlan,
} from "../utils/pendingCheckout";
import {
  clearOAuthNext,
  hasOAuthCallbackParams,
  resolveOAuthNext,
} from "../utils/oauthRedirect";

function navigateAfterAuth(next: string) {
  // Strip resumeCheckout from the landing URL so bookmarks/share don't re-trigger paywall.
  let safeNext = next.startsWith("/") ? next : "/dashboard";
  try {
    const url = new URL(safeNext, window.location.origin);
    url.searchParams.delete("resumeCheckout");
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

  // Only resume Stripe when this auth was part of an explicit Start-trial click
  // (session intent and/or ?resumeCheckout= on next). Ignore bare localStorage leftovers.
  const pendingPlan = getResumablePendingCheckoutPlan(next);
  if (pendingPlan) {
    const checkout = await redirectToStripeCheckout(pendingPlan);
    if (checkout.status === "redirect") {
      return;
    }
    if (checkout.status === "error") {
      console.warn("[AuthCallback] checkout resume failed", checkout.message);
      clearPendingCheckoutPlan();
    }
  }

  navigateAfterAuth(next);
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
      const next = resolveOAuthNext(location.search);
      const url = new URL(window.location.href);
      const hasOAuth = hasOAuthCallbackParams(url);
      const isAnonymous = Boolean((user as { is_anonymous?: boolean })?.is_anonymous);

      if (!authLoading && user && !isAnonymous && !hasOAuth) {
        handledRef.current = true;
        await completeOAuthHandoff(user.id, user.email ?? null, next);
        return;
      }

      try {
        const code = url.searchParams.get("code");
        const hash = new URLSearchParams(window.location.hash.replace("#", ""));
        const accessToken = hash.get("access_token");
        const refreshToken = hash.get("refresh_token");

        if (code) {
          const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
          if (exchangeError) throw exchangeError;

          handledRef.current = true;
          setStatusMessage("Saving your results…");
          const sessionUser = data.session?.user;
          if (sessionUser?.id) {
            await completeOAuthHandoff(
              sessionUser.id,
              sessionUser.email ?? null,
              next
            );
          } else {
            navigateAfterAuth(next);
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
          const sessionUser = data.session?.user;
          if (sessionUser?.id) {
            await completeOAuthHandoff(
              sessionUser.id,
              sessionUser.email ?? null,
              next
            );
          } else {
            navigateAfterAuth(next);
          }
          return;
        }

        if (!authLoading) {
          const { data: sessionData } = await supabase.auth.getSession();
          const sessionUser = sessionData?.session?.user ?? null;
          if (sessionUser && !(sessionUser as { is_anonymous?: boolean }).is_anonymous) {
            handledRef.current = true;
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
        <div className="text-4xl font-['Fraunces'] mb-3">{statusMessage}</div>
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
            <p className="font-['Inter'] text-sm text-foreground/70">{error}</p>
            <p className="font-['Inter'] text-xs text-foreground/60 mt-3 reminder">
              Tip: If you opened the email in Incognito / a different browser, the sign-in link can’t complete.
              Open it in the same browser you signed up in, or just log in.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
