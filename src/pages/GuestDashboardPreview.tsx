import { useEffect, useMemo, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Activity, BookOpen, Users } from "lucide-react";
import { GuestAllCompleteTrialBanner } from "../components/guest/GuestAllCompleteTrialBanner";
import { GuestICPCard } from "../components/cards/GuestICPCard";
import { MarktrStepCard } from "../components/dashboard/MarktrStepCard";
import { HealthScoreHero } from "../components/dashboard/HealthScoreHero";
import { usePaywall } from "../contexts/PaywallContext";
import { useAuth } from "../contexts/AuthContext";
import { isRealUser } from "../utils/isRealUser";
import { getGuestICPs } from "../lib/guestICP";
import { getGuestBrandSeed } from "../lib/guestBrandSeed";
import { getGuestStory } from "../lib/guestStory";
import { getGuestHealthCheck } from "../lib/guestHealthCheck";

export default function GuestDashboardPreview() {
  const navigate = useNavigate();
  const { startCheckout } = usePaywall();
  const { user } = useAuth();
  const icpProfilesRef = useRef<HTMLElement>(null);

  const guestStory = getGuestStory();
  const guestHealth = getGuestHealthCheck();

  useEffect(() => {
    if (isRealUser(user)) {
      navigate("/dashboard", { replace: true });
    }
  }, [user, navigate]);

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
  const allComplete = hasHealth && hasStory && hasICPs;

  const completedCount = [hasHealth, hasStory, hasICPs].filter(Boolean).length;

  /** Same completion flags as the step-chain cards — next incomplete step for inline nudges. */
  const nextAfterHealth = !hasStory
    ? { to: "/story", label: "Next: Complete your brand story →" }
    : !hasICPs
      ? { to: "/onboarding-build", label: "Next: Know your customer →" }
      : null;
  const nextAfterStory = !hasICPs
    ? { to: "/onboarding-build", label: "Next: Know your customer →" }
    : null;

  const nextStepLinkClassName =
    "inline-block font-['DM_Sans'] text-sm font-semibold text-primary hover:underline";

  const headerTitle = (() => {
    if (completedCount === 3) return "Your full marketing picture is ready.";
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
      return "Health, story, and customer profiles — all in one place.";
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
    <main className="min-h-screen bg-background">
      <div className="mb-0 flex flex-col gap-3 bg-primary px-6 py-3 sm:flex-row sm:items-center sm:justify-between lg:px-12">
        <p className="font-['DM_Sans'] text-sm font-medium text-white">
          Your results are stored temporarily in your browser. Sign up free to save them permanently.
        </p>
      </div>

      {allComplete && (
        <GuestAllCompleteTrialBanner onStartTrial={() => void startCheckout("annual")} />
      )}

      <div className="container mx-auto max-w-7xl space-y-10 px-6 pb-12 pt-8 lg:px-12">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="mb-2 font-['Fraunces'] text-3xl text-[#0D1833] lg:text-4xl">{headerTitle}</h1>
            <p className="font-['DM_Sans'] text-foreground/70">{headerSubtitle}</p>
          </div>
        </header>

        <section className="grid gap-6 lg:grid-cols-3">
          <MarktrStepCard
            step={1}
            title="Digital health check"
            complete={hasHealth}
            onClick={() => navigate(hasHealth ? "/health-preview" : "/health-check")}
            summary={
              <div className="mt-2 flex items-center gap-2">
                <Activity
                  className={`h-5 w-5 shrink-0 ${hasHealth ? "text-[#2D7A5F]" : "text-muted-foreground"}`}
                  aria-hidden
                />
                {hasHealth && guestHealth ? (
                  <p className="font-['DM_Sans'] text-sm text-[#2D7A5F]">
                    Overall score{" "}
                    <span className="font-['Fraunces'] text-xl font-bold">{guestHealth.scores.overall}</span>
                    /100
                  </p>
                ) : (
                  <p className="font-['DM_Sans'] text-sm text-muted-foreground">Not started yet</p>
                )}
              </div>
            }
          />

          <MarktrStepCard
            step={2}
            title="Brand story"
            complete={hasStory}
            onClick={() => navigate(hasStory ? "/story/results" : "/story")}
            summary={
              <div className="mt-2 flex items-center gap-2">
                <BookOpen
                  className={`h-5 w-5 shrink-0 ${hasStory ? "text-[#E8650A]" : "text-muted-foreground"}`}
                  aria-hidden
                />
                <p
                  className={`font-['DM_Sans'] text-sm ${hasStory ? "text-[#E8650A]" : "text-muted-foreground"}`}
                >
                  {hasStory ? "Brand story ready" : "Not started yet"}
                </p>
              </div>
            }
          />

          <MarktrStepCard
            step={3}
            title="Know your customer"
            complete={hasICPs}
            onClick={() => (hasICPs ? scrollToIcpProfiles() : navigate("/onboarding-build"))}
            summary={
              <div className="mt-2 flex items-center gap-2">
                <Users
                  className={`h-5 w-5 shrink-0 ${hasICPs ? "text-[#E8650A]" : "text-muted-foreground"}`}
                  aria-hidden
                />
                <p
                  className={`font-['DM_Sans'] text-sm ${hasICPs ? "text-[#D4871A]" : "text-muted-foreground"}`}
                >
                  {hasICPs ? `${guestICPs.length} profiles generated` : "Not started yet"}
                </p>
              </div>
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
                  score: guestHealth.scores.contentConsistency ?? "—",
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
            <div className="space-y-4 rounded-2xl border border-border bg-white p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <h2 className="font-['Fraunces'] text-2xl font-bold text-[#0D1833]">Your brand story</h2>
                <Link
                  to="/story/results"
                  className="font-['DM_Sans'] text-sm font-medium text-primary hover:underline"
                >
                  View full story →
                </Link>
              </div>
              <div className="space-y-3">
                {(
                  [
                    { label: "FOUNDING STORY", body: guestStory.output.foundingStory },
                    { label: "YOUR POINT OF VIEW", body: guestStory.output.pointOfView },
                    { label: "POSITIONING", body: guestStory.output.positioningStatement },
                    { label: "YOUR PURPOSE", body: guestStory.output.brandPurpose },
                  ] as const
                ).map(({ label, body }) => (
                  <div key={label} className="rounded-xl border border-border p-4">
                    <p className="mb-2 font-['DM_Sans'] text-[10px] uppercase tracking-widest text-muted-foreground">
                      {label}
                    </p>
                    <p className="font-['Fraunces'] text-base leading-relaxed text-[#0D1833]">{body}</p>
                  </div>
                ))}
              </div>
            </div>
            {nextAfterStory ? (
              <Link to={nextAfterStory.to} className={nextStepLinkClassName}>
                {nextAfterStory.label}
              </Link>
            ) : null}
          </div>
        ) : null}

        {hasICPs && (
          <section ref={icpProfilesRef} id="guest-icp-profiles" className="scroll-mt-8">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="font-['Fraunces'] text-2xl text-[#0D1833]">Your customer profiles</h2>
                <p className="font-['DM_Sans'] text-sm text-muted-foreground">
                  marktr has identified three distinct customers for your business.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {guestICPs.map((icp: any) => (
                <GuestICPCard key={icp.id} icp={icp} brandName={guestBrand.name} />
              ))}
            </div>
          </section>
        )}

        {allComplete && (
          <GuestAllCompleteTrialBanner
            variant="contained"
            onStartTrial={() => void startCheckout("annual")}
          />
        )}
      </div>
    </main>
  );
}
