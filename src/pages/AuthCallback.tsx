import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { supabase } from "../config/supabase";
import { useAuth } from "../contexts/AuthContext";

function getNextFromSearch(search: string) {
  const params = new URLSearchParams(search);
  return params.get("next") || "/dashboard";
}

export default function AuthCallback() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, loading: authLoading } = useAuth();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const run = async () => {
      const next = getNextFromSearch(location.search);

      // If Supabase has already created a session, don't try to exchange again.
      // (Your console shows SIGNED_IN happens even while AuthCallback is running.)
      if (!authLoading && user) {
        navigate(next, { replace: true });
        return;
      }

      try {
        const url = new URL(window.location.href);
        const code = url.searchParams.get("code");
        const hash = new URLSearchParams(window.location.hash.replace("#", ""));
        const accessToken = hash.get("access_token");
        const refreshToken = hash.get("refresh_token");

        // Case 1: PKCE / magic-link code in search params
        if (code) {
          // Supabase JS v2 PKCE/magic-link exchange (requires the raw code, not full URL)
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) throw error;

          // Clean URL (remove auth params but keep next)
          url.searchParams.delete("code");
          url.searchParams.delete("type");
          window.history.replaceState({}, document.title, url.toString());

          navigate(next, { replace: true });
          return;
        }

        // Case 2: Access/refresh tokens in hash (email confirmation / recovery links)
        if (accessToken && refreshToken) {
          const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          if (error) throw error;

          // Clean URL hash
          window.history.replaceState({}, document.title, url.pathname + url.search);
          navigate(next, { replace: true });
          return;
        }

        // Case 3: No tokens found; check existing session
        const { data: sessionData } = await supabase.auth.getSession();
        if (sessionData?.session) {
          navigate(next, { replace: true });
        } else {
          navigate("/login", { replace: true });
        }
        return;
      } catch (e: any) {
        console.error("AuthCallback error:", e);
        setError(e?.message || "Something went wrong signing you in.");
      }
    };

    run();
  }, [location.search, navigate, user, authLoading]);

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
