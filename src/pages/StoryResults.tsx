import { useEffect, useState } from "react";
import { Link, Navigate, useLocation } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { supabase } from "../config/supabase";

export type StoryResultsLocationState = {
  answers: string[];
  email: string;
};

export type BrandStoryOutput = {
  foundingStory: string;
  pointOfView: string;
  positioningStatement: string;
  brandPurpose: string;
};

export default function StoryResults() {
  const location = useLocation();
  const state = (location.state ?? null) as StoryResultsLocationState | null;

  const [story, setStory] = useState<BrandStoryOutput | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const snapshot = state;
    if (!snapshot?.answers || !Array.isArray(snapshot.answers) || snapshot.answers.length !== 7) {
      setLoading(false);
      return;
    }
    if (!snapshot.email?.trim()) {
      setLoading(false);
      return;
    }

    const answersPayload = snapshot.answers;
    const emailPayload = snapshot.email.trim();

    let cancelled = false;

    async function run() {
      setLoading(true);
      setError(null);
      try {
        const { data, error: invokeError } = await supabase.functions.invoke("generate-brand-story", {
          body: {
            answers: answersPayload,
            email: emailPayload,
          },
        });

        if (invokeError) throw invokeError;

        const raw = data as Record<string, unknown> | null;
        if (
          !raw ||
          typeof raw.foundingStory !== "string" ||
          typeof raw.pointOfView !== "string" ||
          typeof raw.positioningStatement !== "string" ||
          typeof raw.brandPurpose !== "string"
        ) {
          throw new Error("Invalid story response from server.");
        }

        if (!cancelled) {
          setStory({
            foundingStory: raw.foundingStory,
            pointOfView: raw.pointOfView,
            positioningStatement: raw.positioningStatement,
            brandPurpose: raw.brandPurpose,
          });
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Something went wrong.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void run();
    return () => {
      cancelled = true;
    };
  }, [state]);

  if (!state?.answers || !Array.isArray(state.answers) || state.answers.length !== 7 || !state.email?.trim()) {
    return <Navigate to="/story" replace />;
  }

  if (loading) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-background px-6">
        <Loader2 className="h-10 w-10 animate-spin text-primary" aria-hidden />
        <p className="mt-6 text-center font-['Fraunces'] text-2xl font-semibold text-[#0D1833]">
          Writing your brand story...
        </p>
      </main>
    );
  }

  if (error || !story) {
    return (
      <main className="mx-auto max-w-2xl px-6 py-12">
        <p className="font-['DM_Sans'] text-sm text-destructive">{error || "Could not load your story."}</p>
        <Link to="/story" className="mt-4 inline-block font-['DM_Sans'] text-sm text-primary underline">
          Start over
        </Link>
      </main>
    );
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
          Based on everything you&apos;ve shared, here&apos;s the foundation marktr will use to create everything for you.
        </p>

        <div className="mt-10 space-y-4">
          {cards.map(({ label, body }) => (
            <article key={label} className="rounded-2xl border border-border bg-white p-6">
              <p className="font-['DM_Sans'] text-[10px] uppercase tracking-[0.16em] text-muted-foreground">{label}</p>
              <p className="mt-3 font-['Fraunces'] text-lg leading-relaxed text-[#0D1833]">{body}</p>
            </article>
          ))}
        </div>

        <div className="mt-10 rounded-2xl bg-[#0D1833] p-8">
          <h2 className="font-['Fraunces'] text-2xl font-bold leading-tight text-white sm:text-3xl">
            Your story is ready. Now let&apos;s put it to work.
          </h2>
          <p className="mt-4 font-['DM_Sans'] text-base leading-relaxed text-white/70">
            marktr will use your story to generate content, build your strategy, and make sure everything you publish sounds like you — not like everyone else. Free for 14 days.
          </p>
          <Link
            to="/onboarding-build"
            className="mt-8 inline-flex items-center justify-center rounded-full bg-primary px-7 py-3 font-['DM_Sans'] text-sm font-medium text-primary-foreground hover:opacity-90"
          >
            Unlock your full dashboard — free for 14 days
          </Link>
          <p className="mt-3 font-['DM_Sans'] text-xs text-white/50">Your story is saved. No credit card required.</p>
        </div>
      </section>
    </main>
  );
}
