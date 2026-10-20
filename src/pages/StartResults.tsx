import { useEffect } from "react";
import { Lock } from "lucide-react";
import { Navigate, useNavigate } from "react-router-dom";
import { Button } from "../components/ui/button";
import { useAuth } from "../contexts/AuthContext";
import { useAuthModal } from "../contexts/AuthModalContext";
import { usePaywall } from "../contexts/PaywallContext";
import { rememberAuthTrigger, trackOnceLoad } from "../lib/analytics";
import { applyDocumentSeo } from "../lib/documentSeo";
import { getGuestHealthCheck } from "../lib/guestHealthCheck";
import { getGuestICPs, type GuestICP } from "../lib/guestICP";
import { getGuestStory } from "../lib/guestStory";
import { formatPaywallDay, paywallFirstChargeDate } from "../lib/marktrPricing";
import {
  firstSentences,
  hasStoredStartResults,
  pickHealthQuickWin,
} from "../lib/startFlow";
import { getScoreColor } from "../components/healthCheck/HealthCheckReportView";
import { isRealUser } from "../utils/isRealUser";
import { clearPendingCheckoutPlan } from "../utils/pendingCheckout";

function textField(icp: GuestICP, key: string): string {
  const value = icp[key];
  return typeof value === "string" ? value.trim() : "";
}

function listField(icp: GuestICP, key: string): string[] {
  const value = icp[key];
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
}

export default function StartResults() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { openSignIn } = useAuthModal();
  const { startCheckout, isStartingCheckout } = usePaywall();
  const signedIn = isRealUser(user);
  const health = getGuestHealthCheck();
  const storyRecord = getGuestStory();
  const story = storyRecord?.output ?? null;
  const icps = getGuestICPs();
  const quickWin = pickHealthQuickWin(health);
  const storyExcerpt = firstSentences(story?.foundingStory ?? "");
  const firstProfile = icps[0] ?? null;
  const otherProfiles = icps.slice(1);
  const firstChargeLabel = formatPaywallDay(paywallFirstChargeDate());

  useEffect(() => {
    applyDocumentSeo({
      title: "Results | marktr",
      robots: "noindex, nofollow",
      canonicalPath: "/start/results",
    });
  }, []);

  useEffect(() => {
    trackOnceLoad("start_results_view", "start_results_view");
  }, []);

  if (!hasStoredStartResults({ health, story, icpCount: icps.length })) {
    return <Navigate to="/start" replace />;
  }

  const startTrial = () => {
    void startCheckout("annual");
  };

  const signIn = () => {
    if (signedIn) {
      navigate("/dashboard");
      return;
    }
    clearPendingCheckoutPlan();
    rememberAuthTrigger("save_results");
    openSignIn({
      mode: "signin",
      redirectPath: "/dashboard",
      heading: "Sign in",
      subheading: "Your results are saved.",
    });
  };

  const whoTheyAre = firstProfile ? textField(firstProfile, "description") : "";
  const whatTheyWant = firstProfile ? listField(firstProfile, "goals") : [];
  const whereTheyHangOut = firstProfile ? listField(firstProfile, "tech_stack") : [];

  return (
    <main className="min-h-screen bg-background">
      <section className="mx-auto w-full max-w-3xl px-4 pb-16 pt-6 sm:px-6 sm:pt-16">
        <h1 className="font-['Fraunces'] text-3xl font-bold leading-tight text-foreground sm:text-4xl">
          Here&apos;s your marketing starting point
        </h1>
        <p className="mt-3 max-w-xl font-['Plus_Jakarta_Sans'] text-base leading-relaxed text-muted-foreground">
          A quick look at what marktr found. Your full plan unlocks with your 14-day free trial.
        </p>

        {health?.scores ? (
          <section className="mt-10">
            <p className="font-['Plus_Jakarta_Sans'] text-[10px] uppercase tracking-widest text-muted-foreground">
              Overall digital health
            </p>
            <p
              className={`mt-2 font-['Fraunces'] text-6xl font-bold leading-none sm:text-7xl ${getScoreColor(health.scores.overall)}`}
            >
              {health.scores.overall}
              <span className="ml-1 font-['Plus_Jakarta_Sans'] text-lg font-medium text-muted-foreground">
                /100
              </span>
            </p>

            {quickWin ? (
              <article className="mt-6 rounded-[24px] border-2 border-brand-stroke bg-card p-5 sm:p-6">
                <h2 className="font-['Fraunces'] text-xl font-semibold text-foreground">
                  Your biggest quick win
                </h2>
                <p className="mt-3 font-['Plus_Jakarta_Sans'] text-sm font-medium text-foreground">
                  {quickWin.area}
                </p>
                {quickWin.fix ? (
                  <p className="mt-2 font-['Plus_Jakarta_Sans'] text-sm leading-relaxed text-foreground/80">
                    {quickWin.fix}
                  </p>
                ) : null}
              </article>
            ) : null}

            {quickWin && quickWin.lockedCount > 0 ? (
              <div className="mt-3 flex items-start gap-3 rounded-[24px] border-2 border-brand-stroke bg-muted/40 px-4 py-4">
                <Lock className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                <p className="font-['Plus_Jakarta_Sans'] text-sm leading-relaxed text-muted-foreground">
                  {quickWin.lockedCount} more {quickWin.lockedCount === 1 ? "area" : "areas"} scored.
                  Start your free trial to see them.
                </p>
              </div>
            ) : null}
          </section>
        ) : null}

        {story ? (
          <section className="mt-10">
            <h2 className="font-['Fraunces'] text-2xl font-bold text-foreground">Brand story snapshot</h2>
            {storyExcerpt ? (
              <p className="mt-3 font-['Plus_Jakarta_Sans'] text-base leading-relaxed text-foreground/80">
                {storyExcerpt}
              </p>
            ) : null}
            <p className="mt-3 font-['Plus_Jakarta_Sans'] text-sm text-muted-foreground">
              Your full brand story is saved to your account.
            </p>
          </section>
        ) : null}

        {firstProfile ? (
          <section className="mt-10">
            <h2 className="font-['Fraunces'] text-2xl font-bold text-foreground">Your best customer</h2>
            <article className="mt-4 rounded-[24px] border-2 border-brand-stroke bg-card p-5 sm:p-6">
              <h3 className="font-['Fraunces'] text-xl font-semibold text-foreground">
                {textField(firstProfile, "name") || "Customer profile"}
              </h3>
              {whoTheyAre ? (
                <div className="mt-4">
                  <p className="font-['Plus_Jakarta_Sans'] text-xs text-muted-foreground">Who they are</p>
                  <p className="mt-1 font-['Plus_Jakarta_Sans'] text-sm leading-relaxed text-foreground/80">
                    {whoTheyAre}
                  </p>
                </div>
              ) : null}
              {whatTheyWant.length ? (
                <div className="mt-4">
                  <p className="font-['Plus_Jakarta_Sans'] text-xs text-muted-foreground">What they want</p>
                  <ul className="mt-1 space-y-1">
                    {whatTheyWant.map((item, index) => (
                      <li
                        key={`${index}-${item}`}
                        className="font-['Plus_Jakarta_Sans'] text-sm leading-relaxed text-foreground/80"
                      >
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {whereTheyHangOut.length ? (
                <div className="mt-4">
                  <p className="font-['Plus_Jakarta_Sans'] text-xs text-muted-foreground">Where they hang out</p>
                  <ul className="mt-1 space-y-1">
                    {whereTheyHangOut.map((item, index) => (
                      <li
                        key={`${index}-${item}`}
                        className="font-['Plus_Jakarta_Sans'] text-sm leading-relaxed text-foreground/80"
                      >
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </article>

            {otherProfiles.length ? (
              <div className="mt-3 space-y-3">
                {otherProfiles.map((profile, index) => (
                  <div
                    key={`${textField(profile, "name")}-${index}`}
                    className="flex items-center justify-between gap-3 rounded-[24px] border-2 border-brand-stroke bg-muted/40 px-4 py-4"
                  >
                    <p className="font-['Fraunces'] text-base font-semibold text-foreground">
                      {textField(profile, "name") || "Customer profile"}
                    </p>
                    <Lock className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                  </div>
                ))}
                <p className="font-['Plus_Jakarta_Sans'] text-sm text-muted-foreground">
                  Start your 14-day free trial to see all {icps.length} customer profiles.
                </p>
              </div>
            ) : null}
          </section>
        ) : null}

        <div className="mt-10">
          <Button
            type="button"
            disabled={isStartingCheckout}
            onClick={startTrial}
            data-track-id="start_results_signup"
            data-track-location="start_results"
            data-track-destination="checkout"
            className="h-auto min-h-12 w-full whitespace-normal px-6 py-3 text-center text-base leading-snug"
          >
            {isStartingCheckout
              ? "Setting up your free trial…"
              : "Unlock your strategy dashboard: start your 14-day free trial"}
          </Button>
          <p className="mt-3 text-center font-['Plus_Jakarta_Sans'] text-xs text-foreground/70">
            No payment due today. Cancel any time before {firstChargeLabel}.
          </p>
          <button
            type="button"
            onClick={signIn}
            data-track-id="start_results_signin"
            data-track-location="start_results"
            data-track-destination="/dashboard"
            className="mt-4 block w-full text-center font-['Plus_Jakarta_Sans'] text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
          >
            Already have an account? Sign in
          </button>
        </div>
      </section>
    </main>
  );
}
