import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "../components/ui/button";
import { ICPCard, ICPData } from "../components/onboarding/ICPCard";
import { ICPPreviewCard } from "../components/cards/ICPPreviewCard";
import { Lock } from "lucide-react";
import useSubscription from "../hooks/useSubscription";
import { canViewICP } from "../config/accessRules";
import { useAuth } from "../contexts/AuthContext";
import { getGuestICPs } from "../lib/guestICP";
import { useICPs } from "../hooks/useICPs";
import { usePaywall } from "../contexts/PaywallContext";
import { useAuthModal } from "../contexts/AuthModalContext";
import { resolveAvatarSrc } from "../utils/avatar";
import { BrandCard } from "../components/cards/BrandCard";
import { getGuestBrandSeed } from "../lib/guestBrandSeed";

// Fallback avatars + colours for generated data that doesn't include them
const DEFAULT_COLORS = ["#BBA0E5", "#FFD336", "#FF9922"];

export default function ICPResults() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const touchStartX = useRef<number>(0);
  const touchEndX = useRef<number>(0);
  const navigate = useNavigate();
  const { effectiveTier } = useSubscription();
  const { user } = useAuth();
  const { icps } = useICPs();
  const { openPaywall } = usePaywall();
  const { openLogin } = useAuthModal();
  const [guestICPs, setGuestICPsState] = useState<any[]>([]);
  const isGuest = !user;
  const dashboardPath = user ? "/dashboard" : "/guest-dashboard";
  const brandSeed = useMemo(() => getGuestBrandSeed(), []);

  const handleGoToDashboard = () => {
    navigate(dashboardPath);
  };

  const handleSignupToSave = () => {
    openPaywall();
  };

  const handleLoginToSave = () => {
    openLogin();
  };

  useEffect(() => {
    setGuestICPsState(getGuestICPs());
  }, []);

  useEffect(() => {
    if (user) {
      const timeout = setTimeout(() => {
        navigate("/dashboard");
      }, 800);

      return () => clearTimeout(timeout);
    }
  }, [user, navigate]);

  const icpData: ICPData[] = useMemo(() => {
    // 1) Prefer guest generated ICPs (from onboarding)
    if (guestICPs?.length) {
      return guestICPs.slice(0, 3).map((raw: any, idx: number) => ({
        name: raw?.name || raw?.title || `ICP ${idx + 1}`,
        description: raw?.description || raw?.summary || "Generated ICP",
        industry: raw?.industry,
        companySize: raw?.companySize || raw?.company_size,
        location: raw?.location,
        goals: raw?.goals || [],
        pain_points: raw?.pain_points || raw?.painPoints || [],
        budget: raw?.budget,
        decision_makers: raw?.decision_makers || raw?.decisionMakers,
        tech_stack: raw?.tech_stack || raw?.techStack,
        challenges: raw?.challenges,
        opportunities: raw?.opportunities,
        avatar: resolveAvatarSrc(
          {
            avatar_key: raw?.avatar_key ?? null,
            avatar_gender: raw?.avatar_gender ?? raw?.gender ?? null,
            avatar_age_range: raw?.avatar_age_range ?? raw?.age_range ?? null,
          },
          raw?.avatar ?? null
        ),
        color: raw?.color || DEFAULT_COLORS[idx % DEFAULT_COLORS.length],
      }));
    }

    // 2) Otherwise show latest saved ICPs from Supabase (if logged in)
    if (user?.id && icps?.length) {
      return icps.slice(0, 3).map((raw: any, idx: number) => ({
        name: raw?.name || `ICP ${idx + 1}`,
        description: raw?.description || "Saved ICP",
        industry: raw?.industry,
        companySize: raw?.company_size,
        location: raw?.location,
        goals: raw?.goals || [],
        pain_points: raw?.pain_points || [],
        budget: raw?.budget,
        decision_makers: raw?.decision_makers || [],
        tech_stack: raw?.tech_stack || [],
        challenges: raw?.challenges || [],
        opportunities: raw?.opportunities || [],
        avatar: resolveAvatarSrc(
          {
            avatar_key: raw?.avatar_key ?? null,
            avatar_gender: raw?.avatar_gender ?? (raw as any)?.gender ?? null,
            avatar_age_range: raw?.avatar_age_range ?? (raw as any)?.age_range ?? null,
          },
          raw?.avatar ?? null
        ),
        color: raw?.color || DEFAULT_COLORS[idx % DEFAULT_COLORS.length],
      }));
    }

    // 3) No data available (empty state handled below)
    return [];
  }, [guestICPs, user?.id, icps]);

  const handleUnlockAll = () => {
    openPaywall();
  };

  const handleEmailICP = () => {
    console.log("Email ICP");
  };

  const handlePrevious = () => {
    if (!icpData.length) return;
    setCurrentIndex((prev) => (prev === 0 ? icpData.length - 1 : prev - 1));
  };

  const handleNext = () => {
    if (!icpData.length) return;
    setCurrentIndex((prev) => (prev === icpData.length - 1 ? 0 : prev + 1));
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="bg-accent-grey/10 border-b border-black">
        <div className="container mx-auto px-4 py-10">
          <div className="flex justify-between items-center">
            <Link to={dashboardPath} className="text-sm font-['Inter'] underline">
              Back to Dashboard
            </Link>
            <span className="text-sm font-['Inter'] text-foreground/60">
              ICP Results
            </span>
          </div>
        </div>
      </div>

      <div className="pt-16 pb-32 px-4">
        <div className="container mx-auto max-w-7xl">
          <div className="text-center mb-16 animate-fade-in-up">
            <h1 className="font-['Fraunces'] mb-4 text-4xl sm:text-5xl">
              Meet Your Ideal Customers
            </h1>
            <p className="font-['Inter'] text-foreground/70 max-w-2xl mx-auto text-lg">
              We've identified 3 distinct ICPs. Explore each profile for free, then upgrade to unlock full editing, strategy generation, and exports.
            </p>
          </div>

          {/* Guest Dashboard Preview Overlay */}
          {isGuest && icpData.length > 0 && (
            <div className="relative mb-16">
              {/* Background preview */}
              <div className="pointer-events-none filter grayscale blur-[1.5px] opacity-70">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="lg:col-span-2 space-y-6">
                    <h3 className="font-['Fraunces'] text-xl">My ICPs</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {icpData.slice(0, 3).map((icp, index) => (
                        <ICPPreviewCard
                          key={`preview-icp-${index}`}
                          icp={{
                            id: `preview-${index}`,
                            ...icp,
                            brand_id: null,
                            _index: index,
                          }}
                          userTier={"free" as any}
                          onUpgrade={() => {}}
                          isLocked={false}
                          onChangeColor={() => {}}
                          onChangeAvatar={() => {}}
                          brands={[]}
                          onMoveToBrand={undefined}
                        />
                      ))}
                    </div>
                  </div>
                  <div className="space-y-6">
                    <h3 className="font-['Fraunces'] text-xl">My Brands</h3>
                    <BrandCard
                      brand={{
                        id: "preview-brand",
                        name: brandSeed?.brandName || "Your brand",
                        color: brandSeed?.currency ? "#EDEDED" : "#BBA0E5",
                        country: brandSeed?.country || "",
                        created_at: new Date().toISOString(),
                        updated_at: new Date().toISOString(),
                      }}
                      onView={() => {}}
                      onDelete={() => {}}
                      onDuplicate={() => {}}
                      onExportPDF={() => {}}
                      onChangeColor={() => {}}
                    />
                  </div>
                </div>
              </div>

              {/* Floating ICP card + CTA */}
              <div className="pointer-events-auto absolute inset-0 flex items-center justify-center">
                <div className="bg-background border border-black rounded-design shadow-2xl p-6 max-w-xl w-full mx-auto">
                  <ICPCard
                    data={icpData[0]}
                    isLocked={false}
                    onUnlock={handleUnlockAll}
                    cardNumber={1}
                    onEmailICP={handleSignupToSave}
                    ctaLabel="Sign up to save"
                  />
                  {icpData.length > 1 && (
                    <p className="font-['Inter'] text-center text-sm text-foreground/60 mt-3">
                      +{icpData.length - 1} more ready
                    </p>
                  )}
                  <div className="flex justify-center gap-3 mt-6">
                    <Button
                      onClick={handleSignupToSave}
                      className="bg-button-green hover:bg-button-green/90 text-foreground border border-black rounded-design px-6 py-4"
                    >
                      Sign up to save
                    </Button>
                    <Button
                      variant="outline"
                      onClick={handleLoginToSave}
                      className="border-black rounded-design px-6 py-4"
                    >
                      Log in
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Guest-save / account CTA */}
          {guestICPs.length > 0 && (
            <div className="mt-6 mb-10 p-6 border border-black rounded-design bg-background text-center">
              <h3 className="font-['Fraunces'] text-xl mb-2">Want to save these?</h3>

              {user ? (
                <>
                  <p className="font-['Inter'] text-foreground/70 mb-4">
                    Your ICPs are ready and saved to your account.
                  </p>
                  <Button
                    onClick={handleGoToDashboard}
                    className="bg-button-green hover:bg-button-green/90 text-foreground border border-black rounded-design px-6 py-4"
                  >
                    Go to dashboard
                  </Button>
                </>
              ) : (
                <>
                  <p className="font-['Inter'] text-foreground/70 mb-4">
                    You generated these as a guest. Create an account to save them to your dashboard.
                  </p>
                  <div className="flex justify-center gap-3">
                    <Button
                      onClick={handleSignupToSave}
                      className="bg-button-green hover:bg-button-green/90 text-foreground border border-black rounded-design px-6 py-4"
                    >
                      Sign up to save
                    </Button>
                    <Button
                      variant="outline"
                      onClick={handleLoginToSave}
                      className="border-black rounded-design px-6 py-4"
                    >
                      Log in
                    </Button>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Empty state */}
          {icpData.length === 0 && (
            <div className="text-center border border-black rounded-design bg-white p-10 max-w-2xl mx-auto">
              <p className="font-['Fraunces'] text-2xl mb-2">No ICPs yet</p>
              <p className="font-['Inter'] text-foreground/70 mb-6">
                Head to the onboarding flow to generate your first set of ICPs.
              </p>
              <Link to="/onboarding-build">
                <Button className="bg-button-green text-text-dark hover:bg-button-green/90 border border-black rounded-design py-6 px-8">
                  Generate my ICPs
                </Button>
              </Link>
            </div>
          )}

          {icpData.length > 0 && (
            <>
              {/* Carousel Container - Linear Stacked Cards */}
              <div className="relative mb-16" style={{ minHeight: "2000px" }}>
                <div
                  ref={containerRef}
                  className="flex flex-col gap-6 relative"
                  onTouchStart={(e) => {
                    touchStartX.current = e.changedTouches[0].clientX;
                  }}
                  onTouchMove={(e) => {
                    touchEndX.current = e.changedTouches[0].clientX;
                  }}
                  onTouchEnd={() => {
                    if (touchEndX.current < touchStartX.current - 50) {
                      handleNext();
                    } else if (touchEndX.current > touchStartX.current + 50) {
                      handlePrevious();
                    }
                  }}
                >
                  {icpData.map((icp, index) => {
                    const offset = index - currentIndex;
                    const isActive = offset === 0;

                    return (
                      <div
                        key={index}
                        className={`transition-all duration-500 ease-out ${
                          isActive ? "opacity-100 translate-y-0" : "opacity-60 translate-y-4"
                        }`}
                      >
                        <ICPCard
                          data={icp}
                          isLocked={!canViewICP(effectiveTier as any, index)}
                          onUnlock={handleUnlockAll}
                          cardNumber={index + 1}
                          onEmailICP={user ? handleEmailICP : handleSignupToSave}
                          ctaLabel={user ? undefined : "Sign up to save"}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Page-level CTA */}
              <div className="text-center animate-fade-in-up delay-200">
                <Button
                  onClick={handleUnlockAll}
                  className="bg-button-green hover:bg-button-green/90 text-foreground border border-black rounded-design px-8 py-6 transition-all hover:scale-[1.02] hover:shadow-lg flex items-center justify-center gap-2 mx-auto"
                >
                  <Lock className="w-4 h-4" />
                  Unlock the full ICP Generator
                </Button>
                <p className="font-['Inter'] text-sm text-foreground/60 mt-4">
                  Unlock unlimited brands and collections, full customer intelligence, content strategy, exports, and collaboration tools.
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
