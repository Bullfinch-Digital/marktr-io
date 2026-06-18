import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
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
  const { user, loading } = useAuth();

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

    if (loading || !user || (user as any).is_anonymous) return;

    const pending = getOAuthNext();
    if (!pending || location.pathname === pending) {
      if (pending && location.pathname === pending) clearOAuthNext();
      return;
    }

    clearOAuthNext();
    window.location.replace(pending);
  }, [location.pathname, location.search, location.hash, navigate, user, loading]);

  return null;
}
