import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { supabase } from "../config/supabase";
import { useAuth } from "../contexts/AuthContext";
import {
  clearOAuthNext,
  hasOAuthCallbackParams,
  resolveOAuthNext,
} from "../utils/oauthRedirect";

function navigateAfterAuth(next: string) {
  const safeNext = next.startsWith("/") ? next : "/dashboard";
  clearOAuthNext();
  // Hard navigation avoids race with auth listener re-renders on the wrong route.
  if (window.location.pathname + window.location.search === safeNext) return;
  window.location.replace(safeNext);
}

export default function AuthCallback() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, loading: authLoading } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const handledRef = useRef(false);

  useEffect(() => {
    if (handledRef.current) return;

    const run = async () => {
      const next = resolveOAuthNext(location.search);
      const url = new URL(window.location.href);
      const hasOAuth = hasOAuthCallbackParams(url);
      const isAnonymous = Boolean((user as any)?.is_anonymous);

      // Skip only when already signed in with a real account and no OAuth params to exchange.
      if (!authLoading && user && !isAnonymous && !hasOAuth) {
        handledRef.current = true;
        navigateAfterAuth(next);
        return;
      }

      try {
        const code = url.searchParams.get("code");
        const hash = new URLSearchParams(window.location.hash.replace("#", ""));
        const accessToken = hash.get("access_token");
        const refreshToken = hash.get("refresh_token");

        // Case 1: PKCE / OAuth code in search params
        if (code) {
          const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
          if (exchangeError) throw exchangeError;

          handledRef.current = true;
          navigateAfterAuth(next);
          return;
        }

        // Case 2: Access/refresh tokens in hash (email confirmation / recovery links)
        if (accessToken && refreshToken) {
          const { error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          if (sessionError) throw sessionError;

          handledRef.current = true;
          navigateAfterAuth(next);
          return;
        }

        // Case 3: No tokens found; check existing session
        if (!authLoading) {
          const { data: sessionData } = await supabase.auth.getSession();
          if (sessionData?.session && !(sessionData.session.user as any)?.is_anonymous) {
            handledRef.current = true;
            navigateAfterAuth(next);
          } else if (!hasOAuth) {
            handledRef.current = true;
            navigate("/login", { replace: true });
          }
        }
      } catch (e: any) {
        console.error("AuthCallback error:", e);
        setError(
          e?.message || "Something went wrong signing you in."
        );
      }
    };

    void run();
  }, [location.search, location.hash, navigate, user, authLoading]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md text-center">
        <div className="text-4xl font-['Fraunces'] mb-3">Signing you in…</div>
        <p className="text-foreground/70 mb-8">Just finishing up your account.</p>

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
