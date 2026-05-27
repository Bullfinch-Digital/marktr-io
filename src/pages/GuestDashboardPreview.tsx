import { useEffect, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Activity, BookOpen, Users } from "lucide-react";
import DashboardShell from "../layouts/DashboardShell";
import { Button } from "../components/ui/button";
import { ICPPreviewCard } from "../components/cards/ICPPreviewCard";
import { usePaywall } from "../contexts/PaywallContext";
import { useAuth } from "../contexts/AuthContext";
import { getGuestICPs } from "../lib/guestICP";
import { getGuestBrandSeed } from "../lib/guestBrandSeed";
import { getGuestStory } from "../lib/guestStory";
import { getGuestHealthCheck } from "../lib/guestHealthCheck";

export default function GuestDashboardPreview() {
  const navigate = useNavigate();
  const { openPaywall } = usePaywall();
  const { user } = useAuth();

  const guestStory = getGuestStory();
  const guestHealth = getGuestHealthCheck();

  useEffect(() => {
    if (user?.id) {
      navigate("/dashboard", { replace: true });
    }
  }, [user?.id, navigate]);

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

  const hasICPs = guestICPs.length > 0;
  const hasStory = Boolean(guestStory?.output);
  const hasHealth = Boolean(guestHealth?.scores);

  const completedCount = [hasICPs, hasStory, hasHealth].filter(Boolean).length;

  const headerTitle = (() => {
    if (completedCount === 3) return "Your full marketing picture is ready.";
    if (hasStory && !hasICPs && !hasHealth) return "Your brand story is ready.";
    if (hasICPs && !hasStory && !hasHealth) return "Your ideal customers, defined.";
    if (hasHealth && !hasICPs && !hasStory) return "Your digital health scores are in.";
    return "Your marktr results are ready.";
  })();

  const headerSubtitle = (() => {
    if (completedCount === 3) {
      return "You've completed all three steps. Sign up free to save your work and unlock your full dashboard.";
    }
    const remaining = [
      !hasICPs && "customer profiles",
      !hasStory && "brand story",
      !hasHealth && "digital health check",
    ].filter(Boolean) as string[];
    const remainingText = remaining.join(" and ");
    return `Complete your ${remainingText} to get the full picture — then unlock your dashboard free for 14 days.`;
  })();

  const handleUpgrade = () => {
    openPaywall();
  };

  return (
    <DashboardShell
      contentClassName="flex-1 px-6 py-8 lg:px-12"
      guestMode
      onGuestAction={() => openPaywall()}
    >
      <div className="-mx-6 mb-8 flex flex-col gap-3 bg-primary px-6 py-3 sm:flex-row sm:items-center sm:justify-between lg:-mx-12 lg:px-12">
        <p className="font-['DM_Sans'] text-sm font-medium text-white">
          Your results are stored temporarily in your browser. Sign up free to save them permanently.
        </p>
        <Button
          onClick={() => openPaywall()}
          className="shrink-0 self-start whitespace-nowrap rounded-full bg-white px-4 py-1.5 font-['DM_Sans'] text-sm font-medium text-primary hover:bg-white/90 sm:ml-4 sm:self-auto"
        >
          Save my progress →
        </Button>
      </div>

      <div className="mx-auto max-w-7xl space-y-10 pb-12">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="mb-2 font-['Fraunces'] text-3xl text-[#0D1833] lg:text-4xl">{headerTitle}</h1>
            <p className="font-['DM_Sans'] text-foreground/70">{headerSubtitle}</p>
          </div>
          <div className="flex shrink-0 items-center gap-3">
            <Button
              className="rounded-full bg-primary px-6 py-2 font-['DM_Sans'] text-sm font-medium text-primary-foreground hover:opacity-90"
              onClick={() => openPaywall()}
            >
              Unlock your dashboard — free for 14 days
            </Button>
          </div>
        </header>

        <section className="grid gap-6 lg:grid-cols-3">
          {/* Card 1 — Know your customer */}
          <div
            className={`rounded-2xl border p-6 ${
              hasICPs ? "border-[#D4871A] bg-[#FDF0CC]" : "border-border bg-white"
            }`}
          >
            <div className="flex items-start gap-3">
              <Users className={`h-8 w-8 shrink-0 ${hasICPs ? "text-[#E8650A]" : "text-muted-foreground"}`} />
              <div className="min-w-0 flex-1">
                <h3 className="font-['Fraunces'] text-lg font-bold text-[#0D1833]">Know your customer</h3>
                <p className={`mt-2 font-['DM_Sans'] text-sm ${hasICPs ? "text-[#D4871A]" : "text-muted-foreground"}`}>
                  {hasICPs ? `✓ ${guestICPs.length} profiles generated` : "Not started yet"}
                </p>
                {!hasICPs && (
                  <Link to="/onboarding-build" className="mt-3 inline-block font-['DM_Sans'] text-xs text-primary underline">
                    Generate your ICPs →
                  </Link>
                )}
              </div>
            </div>
          </div>

          {/* Card 2 — Digital health check */}
          <div
            className={`rounded-2xl border p-6 ${
              hasHealth ? "border-[#2D7A5F] bg-[#D4EDE8]" : "border-border bg-white"
            }`}
          >
            <div className="flex items-start gap-3">
              <Activity className={`h-8 w-8 shrink-0 ${hasHealth ? "text-[#2D7A5F]" : "text-muted-foreground"}`} />
              <div className="min-w-0 flex-1">
                <h3 className="font-['Fraunces'] text-lg font-bold text-[#0D1833]">Digital health check</h3>
                {hasHealth && guestHealth && (
                  <p className="mt-1 font-['Fraunces'] text-4xl font-bold leading-none text-[#2D7A5F]">
                    {guestHealth.scores.overall}
                    <span className="font-['DM_Sans'] text-lg font-normal text-muted-foreground">/100</span>
                  </p>
                )}
                <p className={`mt-2 font-['DM_Sans'] text-sm ${hasHealth ? "text-[#2D7A5F]" : "text-muted-foreground"}`}>
                  {hasHealth ? "✓ Health check complete" : "Not started yet"}
                </p>
                {!hasHealth && (
                  <Link to="/health-check" className="mt-3 inline-block font-['DM_Sans'] text-xs text-primary underline">
                    Run your health check →
                  </Link>
                )}
              </div>
            </div>
          </div>

          {/* Card 3 — Brand story */}
          <div
            className={`rounded-2xl border p-6 ${
              hasStory ? "border-[#E8650A] bg-[#FAE8E0]" : "border-border bg-white"
            }`}
          >
            <div className="flex items-start gap-3">
              <BookOpen className={`h-8 w-8 shrink-0 ${hasStory ? "text-[#E8650A]" : "text-muted-foreground"}`} />
              <div className="min-w-0 flex-1">
                <h3 className="font-['Fraunces'] text-lg font-bold text-[#0D1833]">Brand story</h3>
                <p className={`mt-2 font-['DM_Sans'] text-sm ${hasStory ? "text-[#E8650A]" : "text-muted-foreground"}`}>
                  {hasStory ? "✓ Brand story ready" : "Not started yet"}
                </p>
                {!hasStory && (
                  <Link to="/story" className="mt-3 inline-block font-['DM_Sans'] text-xs text-primary underline">
                    Find your story →
                  </Link>
                )}
              </div>
            </div>
          </div>
        </section>

        {hasICPs && (
          <section className="mb-8">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="font-['Fraunces'] text-2xl text-[#0D1833]">Your customer profiles</h2>
                <p className="font-['DM_Sans'] text-sm text-muted-foreground">
                  marktr has identified three distinct customers for your business. Unlock the platform to build content
                  strategies for each one.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {guestICPs.map((icp: any, index: number) => (
                <ICPPreviewCard
                  key={icp.id}
                  icp={icp}
                  userTier="free"
                  onUpgrade={handleUpgrade}
                  isLocked={icp.isLocked}
                  brands={[{ id: guestBrand.id, name: guestBrand.name }]}
                  onChangeColor={() => handleUpgrade()}
                  onChangeAvatar={() => handleUpgrade()}
                  onMoveToBrand={() => handleUpgrade()}
                  onDelete={() => {}}
                  onRemoveFromCollection={() => {}}
                  onAddToCollection={() => {}}
                  onCardClickOverride={() => navigate(`/icp-preview/${index}`)}
                />
              ))}
            </div>
          </section>
        )}

        {hasStory && guestStory?.output && (
          <div className="space-y-4 rounded-2xl border border-border bg-white p-6">
            <h2 className="font-['Fraunces'] text-2xl font-bold text-[#0D1833]">Your brand story</h2>
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
        )}

        {hasHealth && guestHealth?.scores && (
          <div className="space-y-4 rounded-2xl border border-border bg-white p-6">
            <h2 className="font-['Fraunces'] text-2xl font-bold text-[#0D1833]">Your digital health scores</h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
              {(
                [
                  { label: "Website Clarity", score: guestHealth.scores.websiteClarity },
                  { label: "Content Consistency", score: guestHealth.scores.contentConsistency },
                  { label: "Audience Fit", score: guestHealth.scores.audienceFit },
                  { label: "Engagement Quality", score: guestHealth.scores.engagementQuality },
                  { label: "Channel Coverage", score: guestHealth.scores.channelCoverage },
                ] as const
              ).map(({ label, score }) => (
                <div key={label} className="rounded-xl border border-border bg-background p-4 text-center">
                  <p
                    className={`font-['Fraunces'] text-3xl font-bold leading-none ${
                      score >= 70 ? "text-[#2D7A5F]" : score >= 40 ? "text-[#BA7517]" : "text-[#E24B4A]"
                    }`}
                  >
                    {score}
                  </p>
                  <p className="mt-2 font-['DM_Sans'] text-[10px] leading-tight text-muted-foreground">{label}</p>
                </div>
              ))}
            </div>
            <div className="pt-2 text-center">
              <p className="font-['Fraunces'] text-4xl font-bold text-[#0D1833]">
                {guestHealth.scores.overall}
                <span className="font-['DM_Sans'] text-lg font-normal text-muted-foreground">/100</span>
              </p>
              <p className="font-['DM_Sans'] text-sm text-muted-foreground">Overall digital health</p>
            </div>
          </div>
        )}

        <div className="mt-4 rounded-2xl bg-[#0D1833] p-8">
          <h2 className="font-['Fraunces'] text-2xl font-bold text-white sm:text-3xl">
            Unlock your full marktr dashboard — completely free for 14 days.
          </h2>
          <p className="mt-3 max-w-xl font-['DM_Sans'] text-base leading-relaxed text-white/70">
            Save your customer profiles, build your brand story, generate content strategies and create a month of posts — all
            in one platform. No agency required.
          </p>
          <div className="mt-6 flex flex-col items-start gap-4 sm:flex-row">
            <Button
              className="rounded-full bg-primary px-8 py-3 font-['DM_Sans'] text-base font-medium text-primary-foreground hover:opacity-90"
              onClick={() => openPaywall()}
            >
              Start free — 14 days on us
            </Button>
            <div className="flex flex-col gap-1">
              <p className="font-['DM_Sans'] text-xs text-white/50">No credit card required</p>
              <p className="font-['DM_Sans'] text-xs text-white/50">Cancel anytime</p>
            </div>
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}
