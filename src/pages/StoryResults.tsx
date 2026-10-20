import { useEffect, useMemo, useRef, useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { supabase } from "../config/supabase";
import { getGuestStory, setGuestStory } from "../lib/guestStory";
import { useAuth } from "../contexts/AuthContext";
import { isRealUser } from "../utils/isRealUser";
import useSubscription from "../hooks/useSubscription";
import useProfile from "../hooks/useProfile";
import { parseBrandStoryFromApi, type BrandStoryOutput } from "../lib/brandStory";
import { storyForViewer, storyHasFindings } from "../lib/brandStoryAccess";
import { getGuestBusinessName, getGuestIdentityEmail } from "../lib/guestContext";
import { BrandStorySections } from "../components/story/BrandStorySections";
import { usePaywall } from "../contexts/PaywallContext";
import { GuestPreviewShell } from "../layouts/GuestPreviewShell";
import { GuestResultsNextStepsCta } from "../components/guest/GuestResultsNextStepsCta";
import { track } from "../lib/analytics";
import { trackGenerationError } from "../lib/generationError";
import { GenerationErrorNotice } from "../components/GenerationErrorNotice";

export type { BrandStoryOutput } from "../lib/brandStory";

export type StoryResultsLocationState = {
  answers: string[];
  email: string;
  story?: BrandStoryOutput | null;
  error?: string | null;
  generationFailures?: number;
};

export default function StoryResults() {
  const location = useLocation();
  const navigate = useNavigate();
  const state = (location.state ?? null) as StoryResultsLocationState | null;
  const { user } = useAuth();
  const { isPro: subscriptionIsPro, hasFullAccess, loading: subscriptionLoading } = useSubscription();
  const { openPaywall } = usePaywall();
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
    Boolean(state?.email?.trim() || getGuestIdentityEmail());
  const hasStoredStory = Boolean(
    guestStored?.output &&
      Array.isArray(guestStored.answers) &&
      guestStored.answers.length === 7 &&
      (guestStored.email?.trim() || getGuestIdentityEmail())
  );

  const [story, setStory] = useState<BrandStoryOutput | null>(null);
  const [failed, setFailed] = useState(false);
  const [failures, setFailures] = useState(0);
  const [retrying, setRetrying] = useState(false);
  const [loading, setLoading] = useState(true);
  const completeTracked = useRef(false);
  const appliedRouterFailure = useRef(false);

  useEffect(() => {
    if (!story || completeTracked.current) return;
    completeTracked.current = true;
    track("brand_story_complete");
  }, [story]);

  useEffect(() => {
    if (isRealUser(user)) return;

    if (!hasRouterPayload && !hasStoredStory) {
      setLoading(false);
      return;
    }

    const routerFailures = state?.generationFailures ?? (state?.error ? 1 : 0);
    if (routerFailures > 0) {
      if (!appliedRouterFailure.current) {
        appliedRouterFailure.current = true;
        setFailures(routerFailures);
        setFailed(true);
        setLoading(false);
      }
      return;
    }

    if (state?.story) {
      const storyEmail = state.email.trim() || getGuestIdentityEmail() || "";
      setStory(state.story);
      setGuestStory({
        answers: state.answers,
        email: storyEmail,
        output: state.story,
        created_at: new Date().toISOString(),
      });
      setLoading(false);
      return;
    }

    if (hasRouterPayload && !state?.story) {
      const answersPayload = state!.answers;
      const emailPayload = state!.email.trim() || getGuestIdentityEmail() || "";

      let cancelled = false;

      const businessName = getGuestBusinessName();

      async function run() {
        setLoading(true);
        setFailed(false);
        try {
          const { data, error: invokeError } = await supabase.functions.invoke("generate-brand-story", {
            body: {
              answers: answersPayload,
              email: emailPayload,
              ...(businessName ? { businessName } : {}),
            },
          });

          if (invokeError) throw invokeError;

          const raw = data as Record<string, unknown> | null;
          const output = parseBrandStoryFromApi(raw);
          if (!output) {
            throw new Error("Invalid story response from server.");
          }

          if (!cancelled) {
            setFailures(0);
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
            trackGenerationError("generate-brand-story", e);
            setFailures((count) => count + 1);
            setFailed(true);
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
        <p className="mt-6 text-center font-['Fraunces'] text-2xl font-semibold text-foreground">
          Writing your brand story...
        </p>
      </main>
    );
  }

  const retryStory = async () => {
    const answersPayload = state?.answers ?? guestStored?.answers ?? [];
    const emailPayload =
      state?.email?.trim() || guestStored?.email?.trim() || getGuestIdentityEmail() || "";
    if (answersPayload.length !== 7 || !emailPayload) return;
    const businessName = getGuestBusinessName();
    setRetrying(true);
    setLoading(true);
    setFailed(false);
    try {
      const { data, error: invokeError } = await supabase.functions.invoke("generate-brand-story", {
        body: {
          answers: answersPayload,
          email: emailPayload,
          ...(businessName ? { businessName } : {}),
        },
      });
      if (invokeError) throw invokeError;
      const output = parseBrandStoryFromApi(data as Record<string, unknown> | null);
      if (!output) throw new Error("Invalid story response from server.");
      setFailures(0);
      setStory(output);
      setGuestStory({
        answers: answersPayload,
        email: emailPayload,
        output,
        created_at: new Date().toISOString(),
      });
    } catch (e) {
      trackGenerationError("generate-brand-story", e);
      setFailures((count) => count + 1);
      setFailed(true);
    } finally {
      setRetrying(false);
      setLoading(false);
    }
  };

  if (failed || !story) {
    return (
      <GuestPreviewShell>
        <div className="mx-auto max-w-2xl">
          {failed ? (
            <GenerationErrorNotice
              failures={Math.max(failures, 1)}
              onRetry={() => void retryStory()}
              retrying={retrying}
            />
          ) : (
            <p className="font-['Plus_Jakarta_Sans'] text-sm text-destructive">Could not load your story.</p>
          )}
          <Link to="/story" className="mt-4 inline-block font-['Plus_Jakarta_Sans'] text-sm text-primary underline">
            Start over
          </Link>
        </div>
      </GuestPreviewShell>
    );
  }

  const canReadFullStory = !subscriptionLoading && hasFullAccess;

  return (
    <GuestPreviewShell>
      <section className="mx-auto max-w-2xl">
        <span className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 font-['Plus_Jakarta_Sans'] text-xs font-medium text-primary">
          Your Brand Story
        </span>

        <h1 className="mt-4 font-['Fraunces'] text-4xl font-bold text-foreground sm:text-5xl">This is your story.</h1>

        <p className="mt-4 font-['Plus_Jakarta_Sans'] text-base text-muted-foreground">
          Based on everything you&apos;ve shared, here&apos;s the foundation marktr will use to create everything for you.
        </p>

        {showDashboardCta && (
          <div className="mt-8 flex flex-col gap-4 rounded-2xl border border-primary/20 bg-primary/5 px-6 py-5 sm:flex-row sm:items-center">
            <div className="flex-1">
              <p className="font-['Plus_Jakarta_Sans'] text-sm font-semibold text-foreground">
                Your story is saved to your dashboard.
              </p>
              <p className="mt-1 font-['Plus_Jakarta_Sans'] text-sm text-muted-foreground">
                Head to your dashboard to refine your story, connect your accounts, and build content
                that sounds like you.
              </p>
            </div>
            <button
              type="button"
              onClick={() => navigate("/dashboard")}
              className="shrink-0 h-11 whitespace-nowrap px-5 font-['Plus_Jakarta_Sans'] text-sm"
            >
              Go to dashboard →
            </button>
          </div>
        )}

        <BrandStorySections
          story={canReadFullStory ? story : storyForViewer(story, false)}
          hasAccess={canReadFullStory}
          showFindingsLock={!canReadFullStory && storyHasFindings(story)}
          findingsVariant={showPaywallUpsell ? "guest" : "authenticated"}
          onUnlock={() => openPaywall()}
        />

        {showPaywallUpsell && <GuestResultsNextStepsCta currentTool="story" className="mt-10" />}

        {showDashboardCta && (
          <div className="mt-10 rounded-2xl bg-[#0D1833] px-8 py-8 text-white">
            <h2 className="mb-3 font-['Fraunces'] text-3xl font-semibold">Your story is saved.</h2>
            <p className="mb-6 max-w-lg font-['Plus_Jakarta_Sans'] text-sm text-white/70">
              Use your dashboard to refine each section, generate content from your story, and keep
              everything you publish sounding like you.
            </p>
            <button
              type="button"
              onClick={() => navigate("/dashboard")}
              className="inline-flex h-11 items-center justify-center rounded-full border-2 border-[#101A26] bg-[#EBFD84] px-6 font-['Plus_Jakarta_Sans'] text-sm font-semibold text-[#101A26] transition-colors hover:bg-[#E4F356]"
            >
              Go to your dashboard →
            </button>
          </div>
        )}
      </section>
    </GuestPreviewShell>
  );
}
