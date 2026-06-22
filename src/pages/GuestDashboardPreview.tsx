import { useEffect, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Activity, BookOpen, Users } from "lucide-react";
import { Button } from "../components/ui/button";
import { GuestICPCard } from "../components/cards/GuestICPCard";
import { usePaywall } from "../contexts/PaywallContext";
import { useAuth } from "../contexts/AuthContext";
import { isRealUser } from "../utils/isRealUser";
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

  const hasICPs = guestICPs.length > 0;
  const hasStory = Boolean(guestStory?.output);
  const hasHealth = Boolean(guestHealth?.scores);

  const completedCount = [hasICPs, hasStory, hasHealth].filter(Boolean).length;

  const headerTitle = (() => {
    if (completedCount === 3) return "Your full marketing picture is ready.";
    if (hasStory && !hasICPs && !hasHealth) return "Your brand story is ready.";
    if (hasICPs && !hasStory && !hasHealth) return "Your ideal customers, defined.";
    if (hasHealth && !hasICPs && !hasStory) return "Your digital health scores are in.";
    if (completedCount === 0) return "Welcome to marktr.";
    return "Your marktr results are ready.";
  })();

  const headerSubtitle = (() => {
    if (completedCount === 0) {
      return "Start with one of our free tools below — no account needed.";
    }
    if (completedCount === 3) {
      return "You've completed all three steps. Start your free trial to save your work and put it all to work.";
    }
    const remaining = [
      !hasICPs && "customer profiles",
      !hasStory && "brand story",
      !hasHealth && "digital health check",
    ].filter(Boolean) as string[];
    const remainingText = remaining.join(" and ");
    return `Complete your ${remainingText} to get the full picture — then start your free trial to put it all to work.`;
  })();

  return (
    <main className="min-h-screen bg-background">
      <div className="mb-8 flex flex-col gap-3 bg-primary px-6 py-3 sm:flex-row sm:items-center sm:justify-between lg:px-12">
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

      <div className="container mx-auto max-w-7xl space-y-10 px-6 pb-12 pt-8 lg:px-12">
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
              Start your free trial →
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
                  {hasHealth ? "✓ Digital health check complete" : "Not started yet"}
                </p>
                {!hasHealth && (
                  <Link to="/health-check" className="mt-3 inline-block font-['DM_Sans'] text-xs text-primary underline">
                    Run your digital health check →
                  </Link>
                )}
                {hasHealth && (
                  <Link to="/health-preview" className="mt-3 inline-block font-['DM_Sans'] text-xs text-primary underline">
                    View your findings →
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
                {hasStory && (
                  <Link to="/story/results" className="mt-3 inline-block font-['DM_Sans'] text-xs text-primary underline">
                    View full story →
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
                  marktr has identified three distinct customers for your business. Start your free trial to build content
                  strategies for each one.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {guestICPs.map((icp: any) => (
                <GuestICPCard
                  key={icp.id}
                  icp={icp}
                  brandName={guestBrand.name}
                />
              ))}
            </div>
          </section>
        )}

        {hasStory && guestStory?.output && (
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
        )}

        {hasHealth && guestHealth?.scores && (
          <div className="space-y-4 rounded-2xl border border-border bg-white p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <h2 className="font-['Fraunces'] text-2xl font-bold text-[#0D1833]">Your digital health scores</h2>
              <Link
                to="/health-preview"
                className="font-['DM_Sans'] text-sm font-medium text-primary hover:underline"
              >
                View your findings →
              </Link>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {(
                [
                  { label: "Website Clarity", score: guestHealth.scores.websiteClarity },
                  { label: "Brand Story", score: guestHealth.scores.brandStory },
                  { label: "Content Consistency", score: guestHealth.scores.contentConsistency },
                  { label: "Social Presence", score: guestHealth.scores.socialPresence },
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
            Now put it all to work.
          </h2>
          <p className="mt-3 max-w-xl font-['DM_Sans'] text-base leading-relaxed text-white/70">
            You&apos;ve scored your digital presence, defined your ideal customer, and found your brand story. marktr uses
            all three to plan your content, write your posts, schedule across every channel, and track what&apos;s working
            — all built around your business, not a generic template.
          </p>
          <div className="mt-6 flex flex-col items-start gap-4 sm:flex-row">
            <Button
              className="rounded-full bg-primary px-8 py-3 font-['DM_Sans'] text-base font-medium text-primary-foreground hover:opacity-90"
              onClick={() => openPaywall()}
            >
              Start your 14-day free trial →
            </Button>
            <div className="flex flex-col gap-1">
              <p className="font-['DM_Sans'] text-xs text-white/50">14-day free trial · Card details required to start</p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
