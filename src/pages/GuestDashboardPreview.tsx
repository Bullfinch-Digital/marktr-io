import { useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import DashboardShell from "../layouts/DashboardShell";
import { Button } from "../components/ui/button";
import { ICPPreviewCard } from "../components/cards/ICPPreviewCard";
import { usePaywall } from "../contexts/PaywallContext";
import { useAuth } from "../contexts/AuthContext";
import { getGuestICPs } from "../lib/guestICP";
import { getGuestBrandSeed } from "../lib/guestBrandSeed";

export default function GuestDashboardPreview() {
  const navigate = useNavigate();
  const { openPaywall } = usePaywall();
  const { user } = useAuth();

  // If user is already authenticated, send them to the real dashboard
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

  const handleUpgrade = () => {
    openPaywall();
  };

  return (
    <DashboardShell
      contentClassName="flex-1 px-6 py-8 lg:px-12"
      guestMode
      onGuestAction={() => openPaywall()}
    >
      <div className="max-w-7xl mx-auto space-y-10 pb-12">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="font-['Fraunces'] text-3xl lg:text-4xl mb-2 text-[#0D1833]">
              Your ideal customers, defined.
            </h1>
            <p className="font-['DM_Sans'] text-foreground/70">
              Here are the three customer profiles marktr has built for your business. Unlock the full platform to put them to work.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              className="bg-primary hover:opacity-90 text-primary-foreground rounded-full px-6 py-2 font-['DM_Sans'] text-sm font-medium"
              onClick={() => openPaywall()}
            >
              Unlock your dashboard — free for 14 days
            </Button>
          </div>
        </header>

        {/* My ICPs */}
        <section className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-['Fraunces'] text-2xl text-[#0D1833]">Your customer profiles</h2>
              <p className="font-['DM_Sans'] text-sm text-muted-foreground">
                marktr has identified three distinct customers for your business. Unlock the platform to build content strategies for each one.
              </p>
            </div>
          </div>

          {guestICPs.length === 0 ? (
            <p className="font-['DM_Sans'] text-sm text-foreground/60">No ICPs yet.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
          )}
        </section>

        {/* Bottom CTA / paywall */}
        <div className="rounded-2xl bg-[#0D1833] p-8 mt-4">
          <h2 className="font-['Fraunces'] text-2xl font-bold text-white sm:text-3xl">
            Unlock your full marktr dashboard — completely free for 14 days.
          </h2>
          <p className="mt-3 font-['DM_Sans'] text-base leading-relaxed text-white/70 max-w-xl">
            Save your customer profiles, build your brand story, generate content strategies and create a month of posts — all in one platform. No agency required.
          </p>
          <div className="mt-6 flex flex-col sm:flex-row items-start gap-4">
            <Button
              className="bg-primary hover:opacity-90 text-primary-foreground rounded-full px-8 py-3 font-['DM_Sans'] text-base font-medium"
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
