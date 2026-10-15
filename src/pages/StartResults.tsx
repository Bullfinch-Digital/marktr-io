import { useEffect, useState } from "react";
import { supabase } from "../config/supabase";
import { useAuth } from "../contexts/AuthContext";
import { getGuestHealthCheck } from "../lib/guestHealthCheck";
import { getGuestICPs } from "../lib/guestICP";
import { getGuestStory } from "../lib/guestStory";
import { applyDocumentSeo } from "../lib/documentSeo";
import { applyCurrentIcpFilter } from "../lib/icpVersioning";
import { customerProfilesSaved, getStartFlowDraft } from "../lib/startFlow";

export default function StartResults() {
  const { user, loading } = useAuth();
  const signedIn = Boolean(user && !(user as { is_anonymous?: boolean }).is_anonymous);
  const draft = getStartFlowDraft();
  const health = getGuestHealthCheck();
  const story = getGuestStory();
  const guestIcps = getGuestICPs();
  const [dbCount, setDbCount] = useState<number | null>(null);
  const healthExists = Boolean(health) || draft.healthStatus === "skipped";
  const storyExists = Boolean(story?.output);
  const profilesSaved = customerProfilesSaved({
    guestCount: guestIcps.length,
    authReady: !loading,
    signedIn,
    dbCount,
  });

  useEffect(() => {
    applyDocumentSeo({
      title: "Results | marktr",
      robots: "noindex, nofollow",
      canonicalPath: "/start/results",
    });
  }, []);

  useEffect(() => {
    if (loading || !signedIn || !user?.id) return;
    let cancelled = false;
    const userId = user.id;
    void (async () => {
      let query = supabase
        .from("icps")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId);
      query = applyCurrentIcpFilter(query);
      const { count, error } = await query;
      if (cancelled) return;
      setDbCount(error ? 0 : count ?? 0);
    })();
    return () => {
      cancelled = true;
    };
  }, [loading, signedIn, user?.id]);

  return (
    <main className="min-h-screen bg-background">
      <section className="mx-auto flex min-h-screen w-full max-w-3xl flex-col justify-center px-4 py-12 sm:px-6">
        <h1 className="font-['Fraunces'] text-3xl font-bold text-foreground sm:text-4xl">Results</h1>
        <ul className="mt-6 space-y-2 font-['Plus_Jakarta_Sans'] text-base text-foreground">
          <li>Health check: {healthExists ? "saved" : "missing"}</li>
          <li>Brand story: {storyExists ? "saved" : "missing"}</li>
          <li>
            Customer profiles:{" "}
            {profilesSaved == null ? "" : profilesSaved ? "saved" : "missing"}
          </li>
        </ul>
      </section>
    </main>
  );
}
