import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { GuestICPCard } from "../components/cards/GuestICPCard";
import { DashboardNextActionCard } from "../components/dashboard/DashboardNextActionCard";
import { DashboardTrialUnlocks } from "../components/dashboard/DashboardTrialUnlocks";
import { MarktrStepCard } from "../components/dashboard/MarktrStepCard";
import { HealthScoreHero } from "../components/dashboard/HealthScoreHero";
import { usePaywall } from "../contexts/PaywallContext";
import { useAuth } from "../contexts/AuthContext";
import { isRealUser } from "../utils/isRealUser";
import { getGuestICPs } from "../lib/guestICP";
import { getGuestBrandSeed } from "../lib/guestBrandSeed";
import { getGuestStory } from "../lib/guestStory";
import { getGuestHealthCheck } from "../lib/guestHealthCheck";
import {
  isOnboardingIcpArrival,
  revealIcpSection,
  useProfilePageScroll,
  withoutOnboardingIcpArrival,
} from "../lib/onboardingIcpArrival";
import { LockedCustomerProfileCard } from "../components/icp/LockedIcpTeaser";
import { BrandStorySections } from "../components/story/BrandStorySections";
import { storyForViewer, storyHasFindings } from "../lib/brandStoryAccess";
import { canViewICP } from "../config/accessRules";
import { resolveDashboardNextAction } from "../lib/dashboardNextAction";

export default function GuestDashboardPreview() {
  const navigate = useNavigate();
  const location = useLocation();
  const { openPaywall } = usePaywall();
  const { user, loading: authLoading } = useAuth();
  const icpProfilesRef = useRef<HTMLElement>(null);
  const [revealIcps, setRevealIcps] = useState(false);
  useProfilePageScroll(location.state);

  const guestStory = getGuestStory();
  const guestHealth = getGuestHealthCheck();

  useEffect(() => {
    if (isRealUser(user)) {
      navigate("/dashboard", { replace: true, state: location.state });
    }
  }, [user, navigate, location.state]);

  useEffect(() => {
    if (authLoading || isRealUser(user)) return;
    if (!isOnboardingIcpArrival(location.state)) return;
    setRevealIcps(true);
    navigate(`${location.pathname}${location.search}${location.hash}`, {
      replace: true,
      state: withoutOnboardingIcpArrival(location.state),
    });
  }, [authLoading, user, location.hash, location.pathname, location.search, location.state, navigate]);

  const brandSeed = getGuestBrandSeed();
  const guestBrand = useMemo(
    () => ({
      id: "guest-brand",
      name: brandSeed?.brandName?.trim() || "Untitled Brand",
      color: brandSeed?.color || "#EDEDED",
      business_type: brandSeed?.businessType ?? null,
      country: brandSeed?.country ?? null,
      updated_at: brandSeed?.created_at ?? new Date().toISOString(),
      created_at: brandSeed?.created_at ?? new Date().toISOString(),
    }),
    [brandSeed]
  );

  const guestICPs = useMemo(() => {
    const icps = getGuestICPs() || [];
    return icps.map((icp: any, index: number) => ({
      ...icp,
      id: icp.id || `guest-icp-${index}`,
      _index: index,
      isLocked: false,
      brand_id: icp.brand_id ?? guestBrand.id,
      brandName: guestBrand.name,
      gender: icp.gender ?? icp.avatar_gender ?? null,
      age_range: icp.age_range ?? icp.avatar_age_range ?? null,
    }));
  }, [guestBrand.id, guestBrand.name]);

  const hasHealth = Boolean(guestHealth?.scores);
  const hasStory = Boolean(guestStory?.output);
  const hasICPs = guestICPs.length > 0;

  useEffect(() => {
    if (!revealIcps || !hasICPs) return;
    const el = icpProfilesRef.current;
    if (!el) return;
    return revealIcpSection(el);
  }, [revealIcps, hasICPs]);

  const allComplete = hasHealth && hasStory && hasICPs;

  const nextAction = resolveDashboardNextAction({
    hasHealth,
    hasStory,
    hasCustomers: hasICPs,
    hasAccess: false,
    isGuest: true,
    progressReady: true,
    hasAim: false,
    hasStrategy: false,
  });

  const runNextAction = () => {
    if (!nextAction) return;
    if (nextAction.id === "health") {
      navigate("/health-check");
      return;
    }
    if (nextAction.id === "story") {
      navigate("/story");
      return;
    }
    if (nextAction.id === "customer") {
      navigate("/onboarding-build");
      return;
    }
    if (nextAction.id === "trial") openPaywall();
  };

  const completedCount = [hasHealth, hasStory, hasICPs].filter(Boolean).length;

  /** Same completion flags as the step-chain cards — next incomplete step for inline nudges. */
  const nextAfterHealth = !hasStory
    ? { to: "/story", label: "Next: Complete your brand story →" }
    : !hasICPs
      ? { to: "/onboarding-build", label: "Next: Know your customer →" }
      : null;
  const nextStepLinkClassName = "app-text-link font-['Plus_Jakarta_Sans']";

  const headerTitle = (() => {
    if (completedCount === 3) return "Your results";
    if (hasHealth && !hasStory && !hasICPs) return "Your digital health scores are in.";
    if (hasStory && !hasHealth && !hasICPs) return "Your brand story is ready.";
    if (hasICPs && !hasStory && !hasHealth) return "Your ideal customers, defined.";
    if (completedCount === 0) return "Welcome to marktr.";
    return "Your marktr results are ready.";
  })();

  const headerSubtitle = (() => {
    if (completedCount === 0) {
      return "Work through the three steps below — no account needed.";
    }
    if (completedCount === 3) {
      return "Health, story and customer profiles, all in one place.";
    }
    const remaining = [
      !hasHealth && "digital health check",
      !hasStory && "brand story",
      !hasICPs && "customer profiles",
    ].filter(Boolean) as string[];
    const remainingText = remaining.join(" and ");
    return `Complete your ${remainingText} to get the full picture.`;
  })();

  const scrollToIcpProfiles = () => {
    icpProfilesRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <main className="app-ui min-h-screen bg-background">
      <div className="mb-0 flex flex-col gap-3 bg-primary px-6 py-3 sm:flex-row sm:items-center sm:justify-between lg:px-12">
        <p className="font-['Plus_Jakarta_Sans'] text-sm font-medium text-white">
          Your results are stored temporarily in your browser. Sign up free to save them permanently.
        </p>
      </div>

      <div className="container mx-auto max-w-7xl space-y-4 px-6 pt-8 lg:px-12">
        {nextAction && nextAction.id !== "trial" ? (
          <DashboardNextActionCard
            title={nextAction.title}
            benefit={nextAction.benefit}
            cta={nextAction.cta}
            onAction={runNextAction}
          />
        ) : null}

        <DashboardTrialUnlocks
          heading={
            allComplete
              ? "Your foundation is built. Start your free trial to turn it into a plan."
              : undefined
          }
          onStartTrial={() => openPaywall()}
        />
      </div>

      <div className="container mx-auto max-w-7xl space-y-8 px-6 pb-12 pt-8 lg:px-12">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="app-heading-page mb-2 font-['Fraunces'] text-3xl text-foreground lg:text-4xl">{headerTitle}</h1>
            <p className="font-['Plus_Jakarta_Sans'] text-foreground/70">{headerSubtitle}</p>
          </div>
        </header>

        <section className="grid items-stretch gap-6 lg:grid-cols-3">
          <MarktrStepCard
            step={1}
            title="Digital health check"
            complete={hasHealth}
            onClick={() => navigate(hasHealth ? "/health-preview" : "/health-check")}
            status={
              hasHealth && guestHealth ? (
                <p className="app-status-pill font-['Plus_Jakarta_Sans'] text-sm">
                  Overall score{" "}
                  <span className="font-['Fraunces'] text-xl font-medium">{guestHealth.scores.overall}</span>
                  /100
                </p>
              ) : (
                <p className="font-['Plus_Jakarta_Sans'] text-sm text-foreground">Not started</p>
              )
            }
          />

          <MarktrStepCard
            step={2}
            title="Brand story"
            complete={hasStory}
            onClick={() => navigate(hasStory ? "/story/results" : "/story")}
            status={
              hasStory ? (
                <p className="app-status-pill font-['Plus_Jakarta_Sans'] text-sm">Brand story ready</p>
              ) : (
                <p className="font-['Plus_Jakarta_Sans'] text-sm text-foreground">Not started</p>
              )
            }
          />

          <MarktrStepCard
            step={3}
            title="Know your customer"
            complete={hasICPs}
            onClick={() => (hasICPs ? scrollToIcpProfiles() : navigate("/onboarding-build"))}
            status={
              hasICPs ? (
                <p className="app-status-pill font-['Plus_Jakarta_Sans'] text-sm">
                  {`${guestICPs.length} profiles generated`}
                </p>
              ) : (
                <p className="font-['Plus_Jakarta_Sans'] text-sm text-foreground">Not started</p>
              )
            }
          />
        </section>

        {hasHealth && guestHealth?.scores ? (
          <div className="space-y-3">
            <HealthScoreHero
              overall={guestHealth.scores.overall}
              reportHref="/health-preview"
              reportLinkLabel="View your findings →"
              dimensions={[
                {
                  key: "websiteClarity",
                  label: "Website Clarity",
                  score: guestHealth.scores.websiteClarity ?? "—",
                },
                {
                  key: "brandStory",
                  label: "Brand Story",
                  score: guestHealth.scores.brandStory ?? "—",
                },
                {
                  key: "contentConsistency",
                  label: "Content Consistency",
                  score: guestHealth.scores.contentConsistency ?? "Not assessed",
                },
                {
                  key: "socialPresence",
                  label: "Social Presence",
                  score: guestHealth.scores.socialPresence ?? "—",
                },
              ]}
            />
            {nextAfterHealth ? (
              <Link to={nextAfterHealth.to} className={nextStepLinkClassName}>
                {nextAfterHealth.label}
              </Link>
            ) : null}
          </div>
        ) : null}

        {hasStory && guestStory?.output ? (
          <div className="space-y-3">
            <div className="app-card space-y-4 p-8">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <h2 className="app-heading font-['Fraunces'] text-2xl text-foreground">Your brand story</h2>
                <Link
                  to="/story/results"
                  className="app-text-link font-['Plus_Jakarta_Sans']"
                >
                  View your story →
                </Link>
              </div>
              <BrandStorySections
                className="space-y-4"
                story={storyForViewer(guestStory.output, false)}
                hasAccess={false}
                showFindingsLock={storyHasFindings(guestStory.output)}
                onUnlock={() => openPaywall()}
              />
            </div>
          </div>
        ) : null}

        {hasICPs && (
          <section ref={icpProfilesRef} id="guest-icp-profiles" className="scroll-mt-8">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="app-heading font-['Fraunces'] text-2xl text-foreground">Your customer profiles</h2>
                <p className="font-['Plus_Jakarta_Sans'] text-sm text-muted-foreground">
                  marktr has identified three distinct customers for your business.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {guestICPs.map((icp: any) => {
                const profileIndex = icp._index ?? 0;
                if (!canViewICP("free", profileIndex)) {
                  return (
                    <LockedCustomerProfileCard
                      key={icp.id}
                      profileNumber={profileIndex + 1}
                      onUnlock={() => openPaywall()}
                    />
                  );
                }
                const readablePain = (icp.pain_points ?? icp.painPoints ?? []).slice(0, 2);
                return (
                  <GuestICPCard
                    key={icp.id}
                    brandName={guestBrand.name}
                    icp={{
                      _index: profileIndex,
                      name: icp.name,
                      description: icp.description,
                      industry: icp.industry,
                      company_size: icp.company_size,
                      companySize: icp.companySize,
                      location: icp.location,
                      goals: icp.goals,
                      pain_points: readablePain,
                      avatar_key: icp.avatar_key,
                      avatar: icp.avatar,
                      color: icp.color,
                    }}
                  />
                );
              })}
            </div>
          </section>
        )}

      </div>
    </main>
  );
}
