import { useEffect, useMemo, useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { supabase } from "../config/supabase";
import { getGuestStory, setGuestStory } from "../lib/guestStory";
import { useAuth } from "../contexts/AuthContext";
import { isRealUser } from "../utils/isRealUser";
import useSubscription from "../hooks/useSubscription";
import useProfile from "../hooks/useProfile";
import { usePaywall } from "../contexts/PaywallContext";
import { parseBrandStoryFromApi, type BrandStoryOutput } from "../lib/brandStory";
import { BrandStoryFindingsSection } from "../components/story/BrandStoryFindingsSection";
import { GuestPreviewShell } from "../layouts/GuestPreviewShell";

export type { BrandStoryOutput } from "../lib/brandStory";

export type StoryResultsLocationState = {
  answers: string[];
  email: string;
  story?: BrandStoryOutput | null;
  error?: string | null;
};

export default function StoryResults() {
  const location = useLocation();
  const navigate = useNavigate();
  const state = (location.state ?? null) as StoryResultsLocationState | null;
  const { user } = useAuth();
  const { openPaywall } = usePaywall();
  const { isPro: subscriptionIsPro, loading: subscriptionLoading } = useSubscription();
  const { profile } = useProfile(user?.id ?? null);
  const isLoggedInReal = Boolean(
    user && !(user as { is_anonymous?: boolean }).is_anonymous
  );
  const hasPaidAccess =
    subscriptionIsPro || profile?.subscription_tier === "pro";
  const showDashboardCta =
    hasPaidAccess || (isLoggedInReal && subscriptionLoading);
  const showPaywallUpsell = !showDashboardCta;

  const guestStored = useMemo(() => getGuestStory(), []);

  const hasRouterPayload =
    Boolean(state?.answers && Array.isArray(state.answers) && state.answers.length === 7) &&
    Boolean(state?.email?.trim());
  const hasStoredStory = Boolean(
    guestStored?.output &&
      Array.isArray(guestStored.answers) &&
      guestStored.answers.length === 7 &&
      guestStored.email?.trim()
  );

  const [story, setStory] = useState<BrandStoryOutput | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isRealUser(user)) return;

    if (!hasRouterPayload && !hasStoredStory) {
      setLoading(false);
      return;
    }

    if (state?.error) {
      setError(state.error);
      setLoading(false);
      return;
    }

    if (state?.story) {
      setStory(state.story);
      setGuestStory({
        answers: state.answers,
        email: state.email.trim(),
        output: state.story,
        created_at: new Date().toISOString(),
      });
      setLoading(false);
      return;
    }

    if (hasRouterPayload && !state?.story) {
      const answersPayload = state!.answers;
      const emailPayload = state!.email.trim();

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
          const output = parseBrandStoryFromApi(raw);
          if (!output) {
            throw new Error("Invalid story response from server.");
          }

          if (!cancelled) {
            setStory(output);
            setGuestStory({
              answers: answersPayload,
              email: emailPayload,
              output,
              created_at: new Date().toISOString(),
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
    }

    if (guestStored?.output) {
      setStory(guestStored.output);
      setLoading(false);
      return;
    }

    setLoading(false);
  }, [state, hasRouterPayload, guestStored, user]);

  if (isRealUser(user)) {
    return <Navigate to="/story-report" replace />;
  }

  if (!hasRouterPayload && !hasStoredStory) {
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
      <GuestPreviewShell>
        <div className="mx-auto max-w-2xl">
          <p className="font-['DM_Sans'] text-sm text-destructive">{error || "Could not load your story."}</p>
          <Link to="/story" className="mt-4 inline-block font-['DM_Sans'] text-sm text-primary underline">
            Start over
          </Link>
        </div>
      </GuestPreviewShell>
    );
  }

  const cards: { label: string; body: string }[] = [
    { label: "FOUNDING STORY", body: story.foundingStory },
    { label: "YOUR POINT OF VIEW", body: story.pointOfView },
    { label: "POSITIONING STATEMENT", body: story.positioningStatement },
    { label: "YOUR PURPOSE", body: story.brandPurpose },
  ];

  return (
    <GuestPreviewShell>
      <section className="mx-auto max-w-2xl">
        <span className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 font-['DM_Sans'] text-xs font-medium text-primary">
          Your Brand Story
        </span>

        <h1 className="mt-4 font-['Fraunces'] text-4xl font-bold text-[#0D1833] sm:text-5xl">This is your story.</h1>

        <p className="mt-4 font-['DM_Sans'] text-base text-muted-foreground">
          Based on everything you&apos;ve shared, here&apos;s the foundation marktr will use to create everything for you.
        </p>

        {showPaywallUpsell && (
          <div className="mt-8 flex flex-col gap-4 rounded-2xl border border-primary/20 bg-primary/5 px-6 py-5 sm:flex-row sm:items-center">
            <div className="flex-1">
              <p className="font-['DM_Sans'] text-sm font-semibold text-foreground">
                This is just the start.
              </p>
              <p className="mt-1 font-['DM_Sans'] text-sm text-muted-foreground">
                Your brand story is one piece of the picture. Complete your ideal customer profile and
                digital health check to get the full picture — then start your 14-day free trial to put
                it all to work.
              </p>
            </div>
            <Link
              to="/guest-dashboard"
              className="shrink-0 whitespace-nowrap rounded-full bg-primary px-5 py-2.5 font-['DM_Sans'] text-sm font-semibold text-white transition-colors hover:bg-primary/90"
            >
              Complete your profile →
            </Link>
          </div>
        )}

        {showDashboardCta && (
          <div className="mt-8 flex flex-col gap-4 rounded-2xl border border-primary/20 bg-primary/5 px-6 py-5 sm:flex-row sm:items-center">
            <div className="flex-1">
              <p className="font-['DM_Sans'] text-sm font-semibold text-foreground">
                Your story is saved to your dashboard.
              </p>
              <p className="mt-1 font-['DM_Sans'] text-sm text-muted-foreground">
                Head to your dashboard to refine your story, connect your accounts, and build content
                that sounds like you.
              </p>
            </div>
            <button
              type="button"
              onClick={() => navigate("/dashboard")}
              className="shrink-0 whitespace-nowrap rounded-full bg-primary px-5 py-2.5 font-['DM_Sans'] text-sm font-semibold text-white transition-colors hover:bg-primary/90"
            >
              Go to dashboard →
            </button>
          </div>
        )}

        <div className="mt-10 space-y-4">
          {cards.map(({ label, body }) => (
            <article key={label} className="rounded-2xl border border-border bg-white p-6">
              <p className="font-['DM_Sans'] text-[10px] uppercase tracking-[0.16em] text-muted-foreground">{label}</p>
              <p className="mt-3 font-['Fraunces'] text-lg leading-relaxed text-[#0D1833]">{body}</p>
            </article>
          ))}
        </div>

        <BrandStoryFindingsSection
          findings={story.findings ?? []}
          variant={showPaywallUpsell ? "guest" : "authenticated"}
          onOpenPaywall={openPaywall}
        />

        {showPaywallUpsell && (
          <div className="mt-10 rounded-2xl bg-[#0D1833] p-8">
            <h2 className="font-['Fraunces'] text-3xl font-bold leading-tight text-white">
              Ready to put your story to work?
            </h2>
            <p className="mt-4 max-w-2xl font-['DM_Sans'] text-base leading-relaxed text-white/70">
              You&apos;ve found your brand voice. Now complete your ideal customer profile and digital
              health check — marktr uses all three to build a content strategy that&apos;s specific to
              your business. Start your 14-day free trial to save everything and unlock the full
              platform.
            </p>

            <Link
              to="/guest-dashboard"
              className="mt-8 inline-flex items-center justify-center rounded-full bg-primary px-7 py-3 font-['DM_Sans'] text-sm font-medium text-primary-foreground hover:opacity-90"
            >
              Build the full picture →
            </Link>

            <p className="mt-3 font-['DM_Sans'] text-xs text-white/50">
              Free to start · Your story is saved in your browser
            </p>
          </div>
        )}

        {showDashboardCta && (
          <div className="mt-10 rounded-2xl bg-[#0D1833] px-8 py-8 text-white">
            <h2 className="mb-3 font-['Fraunces'] text-3xl font-semibold">Your story is saved.</h2>
            <p className="mb-6 max-w-lg font-['DM_Sans'] text-sm text-white/70">
              Use your dashboard to refine each section, generate content from your story, and keep
              everything you publish sounding like you.
            </p>
            <button
              type="button"
              onClick={() => navigate("/dashboard")}
              className="rounded-full bg-primary px-6 py-3 font-['DM_Sans'] text-sm font-semibold text-white transition-colors hover:bg-primary/90"
            >
              Go to your dashboard →
            </button>
          </div>
        )}
      </section>
    </GuestPreviewShell>
  );
}
