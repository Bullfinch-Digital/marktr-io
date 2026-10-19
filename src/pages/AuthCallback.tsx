import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { supabase } from "../config/supabase";
import { useAuth } from "../contexts/AuthContext";
import { runPostAuthPipelineWithTimeout } from "../lib/postAuthPipeline";
import { fetchUserHasProAccess } from "../lib/proAccess";
import { redirectToStripeCheckout } from "../lib/stripeCheckout";
import {
  claimResumablePendingCheckout,
  clearPendingCheckoutPlan,
  otherTabHoldsFreshCheckoutClaim,
  releaseCheckoutClaim,
} from "../utils/pendingCheckout";
import {
  clearOAuthNext,
  hasOAuthCallbackParams,
  resolveOAuthNext,
} from "../utils/oauthRedirect";

function stripTrialIntentParams() {
  const url = new URL(window.location.href);
  if (!url.searchParams.has("intent") && !url.searchParams.has("plan")) return;
  url.searchParams.delete("intent");
  url.searchParams.delete("plan");
  const cleaned = `${url.pathname}${url.search}${url.hash}`;
  window.history.replaceState(window.history.state, "", cleaned);
}

/** URL intent plus resumeCheckout nested in `next`, for the claim lookup. */
function handoffSearch(locationSearch: string, next: string): string {
  const merged = new URLSearchParams(locationSearch);
  try {
    const nextUrl = new URL(next, "https://marktr.local");
    const resume = nextUrl.searchParams.get("resumeCheckout");
    if (resume && !merged.get("resumeCheckout")) merged.set("resumeCheckout", resume);
  } catch {
    // keep the callback search
  }
  const query = merged.toString();
  return query ? `?${query}` : "";
}

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

async function completeOAuthHandoff(
  userId: string,
  email: string | null,
  next: string,
  search: string,
  setStatus: (message: string) => void
): Promise<"redirect" | "yield" | "done"> {
  await runPostAuthPipelineWithTimeout(userId, email);

  // URL intent first (email confirmation). Fall back to localStorage only —
  // sessionStorage does not exist in the tab the email link opens.
  // Claim so the tab that was waiting on the email cannot also start Stripe.
  const pendingPlan = await claimResumablePendingCheckout(handoffSearch(search, next), {
    storage: "local",
  });
  if (!pendingPlan && otherTabHoldsFreshCheckoutClaim()) {
    return "yield";
  }
  if (pendingPlan) {
    const hasAccess = await fetchUserHasProAccess(userId);
    if (!hasAccess) {
      setStatus("Setting up your free trial...");
      const checkout = await redirectToStripeCheckout(pendingPlan, { honorClaim: true });
      if (checkout.status === "redirect") {
        return "redirect";
      }
      if (checkout.status === "claimed_elsewhere") {
        return "yield";
      }
      if (checkout.status === "error") {
        console.warn("[AuthCallback] checkout resume failed", checkout.message);
      }
      clearPendingCheckoutPlan();
      releaseCheckoutClaim();
      navigateAfterAuth("/dashboard");
      return "done";
    }
    clearPendingCheckoutPlan();
    releaseCheckoutClaim();
  }

  navigateAfterAuth(next);
  return "done";
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
      const search = location.search;
      stripTrialIntentParams();
      const url = new URL(window.location.href);
      const hasOAuth = hasOAuthCallbackParams(url);
      const isAnonymous = Boolean((user as { is_anonymous?: boolean })?.is_anonymous);

      if (!authLoading && user && !isAnonymous && !hasOAuth) {
        handledRef.current = true;
        const outcome = await completeOAuthHandoff(
          user.id,
          user.email ?? null,
          next,
          search,
          setStatusMessage
        );
        if (outcome === "yield") {
          setStatusMessage("You're confirmed. Continue in the other tab.");
        }
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
            const outcome = await completeOAuthHandoff(
              sessionUser.id,
              sessionUser.email ?? null,
              next,
              search,
              setStatusMessage
            );
            if (outcome === "yield") {
              setStatusMessage("You're confirmed. Continue in the other tab.");
            }
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
            const outcome = await completeOAuthHandoff(
              sessionUser.id,
              sessionUser.email ?? null,
              next,
              search,
              setStatusMessage
            );
            if (outcome === "yield") {
              setStatusMessage("You're confirmed. Continue in the other tab.");
            }
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
            const outcome = await completeOAuthHandoff(
              sessionUser.id,
              sessionUser.email ?? null,
              next,
              search,
              setStatusMessage
            );
            if (outcome === "yield") {
              setStatusMessage("You're confirmed. Continue in the other tab.");
            }
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
        {(statusMessage === "Saving your results…" ||
          statusMessage === "Setting up your free trial...") && (
          <div
            className="w-10 h-10 mx-auto mb-4 border-4 border-button-green border-t-transparent rounded-full animate-spin"
            aria-hidden
          />
        )}
        <p className="text-foreground/70 mb-8">
          {statusMessage === "Saving your results…"
            ? "Creating your brand and saving health, story, and customer profiles."
            : statusMessage === "You're confirmed. Continue in the other tab."
              ? "Checkout is continuing in the tab that was waiting for your email."
              : statusMessage === "Setting up your free trial..."
                ? "Taking you to checkout."
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
