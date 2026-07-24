import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { getResumablePendingCheckoutPlan } from "../../utils/pendingCheckout";
import {
  clearOAuthNext,
  getOAuthNext,
  hasOAuthCallbackParams,
  resolveOAuthNext,
} from "../../utils/oauthRedirect";

/**
 * Supabase may fall back to Site URL (/) when redirect URLs aren't allowlisted,
 * or auto-exchange PKCE on the wrong route. Forward to /auth/callback or
 * redirect to the stored post-login path once the session is ready.
 */
export function OAuthReturnHandler() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, session, loading } = useAuth();

  useEffect(() => {
    if (location.pathname === "/auth/callback") return;

    const url = new URL(window.location.href);
    if (hasOAuthCallbackParams(url)) {
      const next = resolveOAuthNext(location.search);
      const code = url.searchParams.get("code");

      if (code) {
        navigate(
          `/auth/callback?code=${encodeURIComponent(code)}&next=${encodeURIComponent(next)}`,
          { replace: true }
        );
        return;
      }

      const hash = window.location.hash;
      if (hash.includes("access_token")) {
        window.location.replace(
          `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}${hash}`
        );
      }
      return;
    }

    if (loading || !user || (user as { is_anonymous?: boolean }).is_anonymous) return;

    // Session token may lag briefly behind `user` after OAuth — wait for it so we
    // don't clear oauth_next and bounce before the handoff can complete.
    if (!session?.access_token) return;

    const pendingNext = getOAuthNext();
    const pendingCheckout = getResumablePendingCheckoutPlan(
      pendingNext ?? location.search
    );
    const strandedOnPublicHome =
      location.pathname === "/" && Boolean(pendingNext || pendingCheckout);

    // Mid-signup OAuth often lands on Site URL (/) with a session but no code left
    // in the URL (detectSessionInUrl already consumed it). Send through AuthCallback
    // so checkout resume + post-auth pipeline still run.
    if (strandedOnPublicHome) {
      const next = pendingNext ?? resolveOAuthNext(location.search);
      clearOAuthNext();
      window.location.replace(
        `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`
      );
      return;
    }

    if (!pendingNext || location.pathname === pendingNext) {
      if (pendingNext && location.pathname === pendingNext) clearOAuthNext();
      return;
    }

    clearOAuthNext();
    window.location.replace(pendingNext);
  }, [
    location.pathname,
    location.search,
    location.hash,
    navigate,
    user,
    session,
    loading,
  ]);

  return null;
}
