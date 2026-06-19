import { useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../config/supabase";
import type { BrandStoryOutput } from "./StoryResults";

export default function StoryReport() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [story, setStory] = useState<BrandStoryOutput | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user?.id) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    void supabase
      .from("brand_story_results")
      .select("story_data")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error || !data?.story_data) {
          setStory(null);
        } else {
          const raw = data.story_data as Record<string, unknown>;
          if (
            typeof raw.foundingStory === "string" &&
            typeof raw.pointOfView === "string" &&
            typeof raw.positioningStatement === "string" &&
            typeof raw.brandPurpose === "string"
          ) {
            setStory({
              foundingStory: raw.foundingStory,
              pointOfView: raw.pointOfView,
              positioningStatement: raw.positioningStatement,
              brandPurpose: raw.brandPurpose,
            });
          } else if (raw.output && typeof raw.output === "object") {
            const output = raw.output as Record<string, unknown>;
            if (
              typeof output.foundingStory === "string" &&
              typeof output.pointOfView === "string" &&
              typeof output.positioningStatement === "string" &&
              typeof output.brandPurpose === "string"
            ) {
              setStory({
                foundingStory: output.foundingStory,
                pointOfView: output.pointOfView,
                positioningStatement: output.positioningStatement,
                brandPurpose: output.brandPurpose,
              });
            }
          }
        }
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [authLoading, user?.id]);

  if (authLoading || loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </main>
    );
  }

  if (!user?.id) {
    return <Navigate to="/" replace />;
  }

  if (!story) {
    return <Navigate to="/story" replace />;
  }

  const cards: { label: string; body: string }[] = [
    { label: "FOUNDING STORY", body: story.foundingStory },
    { label: "YOUR POINT OF VIEW", body: story.pointOfView },
    { label: "POSITIONING STATEMENT", body: story.positioningStatement },
    { label: "YOUR PURPOSE", body: story.brandPurpose },
  ];

  return (
    <main className="min-h-screen bg-background">
      <section className="mx-auto max-w-2xl px-6 py-12">
        <span className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 font-['DM_Sans'] text-xs font-medium text-primary">
          Your Brand Story
        </span>

        <h1 className="mt-4 font-['Fraunces'] text-4xl font-bold text-[#0D1833] sm:text-5xl">This is your story.</h1>

        <p className="mt-4 font-['DM_Sans'] text-base text-muted-foreground">
          Based on everything you&apos;ve shared, here&apos;s the foundation marktr will use to create
          everything for you.
        </p>

        <div className="mt-10 space-y-4">
          {cards.map(({ label, body }) => (
            <article key={label} className="rounded-2xl border border-border bg-white p-6">
              <p className="font-['DM_Sans'] text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                {label}
              </p>
              <p className="mt-3 font-['Fraunces'] text-lg leading-relaxed text-[#0D1833]">{body}</p>
            </article>
          ))}
        </div>

        <div className="mt-10">
          <button
            type="button"
            onClick={() => navigate("/dashboard")}
            className="rounded-full bg-primary px-6 py-3 font-['DM_Sans'] text-sm font-semibold text-white hover:bg-primary/90"
          >
            Go to your dashboard →
          </button>
        </div>
      </section>
    </main>
  );
}
