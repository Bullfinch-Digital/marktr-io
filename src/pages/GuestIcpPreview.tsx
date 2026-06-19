import { useEffect, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Lock } from "lucide-react";
import DashboardShell from "../layouts/DashboardShell";
import { useAuth } from "../contexts/AuthContext";
import { isRealUser } from "../utils/isRealUser";
import { getGuestICPs } from "../lib/guestICP";
import { getGuestBrandSeed } from "../lib/guestBrandSeed";
import { Button } from "../components/ui/button";
import { ICPProfileLayout } from "../components/icp/ICPProfileLayout";
import { usePaywall } from "../contexts/PaywallContext";
import useSubscription from "@/hooks/useSubscription";

export default function GuestIcpPreview() {
  const { index } = useParams<{ index: string }>();
  const navigate = useNavigate();
  const { openPaywall } = usePaywall();
  const { user } = useAuth();
  const { effectiveTier } = useSubscription();

  // Redirect real authenticated users to the dashboard.
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
      business_type: brandSeed?.businessType ?? null,
      country: brandSeed?.country ?? null,
    }),
    [brandSeed]
  );

  const guestICPs = useMemo(() => {
    const icps = getGuestICPs() || [];
    return icps.map((icp: any, idx: number) => ({
      ...icp,
      id: icp.id || `guest-icp-${idx}`,
      _index: idx,
      brand_id: icp.brand_id ?? guestBrand.id,
      brandName: guestBrand.name,
    }));
  }, [guestBrand.id, guestBrand.name]);

  const targetIndex = Number.isFinite(Number(index)) ? Number(index) : 0;
  const maxPreviewIndex = Math.max(0, Math.min(2, guestICPs.length - 1));
  const resolvedIndex = Math.max(0, Math.min(targetIndex, maxPreviewIndex));

  useEffect(() => {
    if (targetIndex !== resolvedIndex) {
      navigate(`/icp-preview/${resolvedIndex}`, { replace: true });
    }
  }, [targetIndex, resolvedIndex, navigate]);

  const icp = guestICPs[resolvedIndex];

  if (!icp) {
    return (
      <DashboardShell
        guestMode
        onGuestAction={() => openPaywall()}
        contentClassName="flex-1 px-6 py-8 lg:px-12"
      >
        <div className="max-w-4xl mx-auto text-center space-y-4">
          <h1 className="font-['Fraunces'] text-3xl lg:text-4xl">No ICPs yet</h1>
          <p className="font-['Inter'] text-foreground/70">
            Start again to generate your first ICP.
          </p>
          <Button
            className="bg-button-green hover:bg-button-green/90 text-foreground border border-black rounded-design px-6 py-3"
            onClick={() => navigate("/")}
          >
            Create a free ICP
          </Button>
        </div>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell
      guestMode
      onGuestAction={() => openPaywall()}
      contentClassName="flex-1 px-6 py-8 lg:px-12"
    >
      <ICPProfileLayout
        headerLeft={
          <div>
            <h1 className="font-['Fraunces'] text-3xl lg:text-4xl">ICP Preview</h1>
            <p className="font-['Inter'] text-foreground/70">
              Explore your first profile. Sign up to edit, save and unlock marketing insights.
            </p>
          </div>
        }
        headerRight={
          <>
            <Button
              className="bg-button-green hover:bg-button-green/90 text-foreground border border-black rounded-design px-4 py-2"
              onClick={() => openPaywall()}
            >
              Start 14-day free trial
            </Button>
          </>
        }
        profileCardTopRow={
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-2">
              <p className="font-['Inter'] text-xs text-foreground/60">Brand</p>
              <p className="font-['Fraunces'] text-2xl">
                {icp.brand_id ? guestBrand.name : "No brand allocated"}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                className="border-black rounded-design"
                onClick={() => openPaywall()}
              >
                Edit this ICP
              </Button>
            </div>
          </div>
        }
        profileMain={
          <div className="space-y-4">
            <div>
              <p className="font-['Inter'] text-xs text-foreground/60 mb-1">Name</p>
              <h2 className="font-['Fraunces'] text-2xl">{icp.name}</h2>
            </div>

            <div>
              <p className="font-['Inter'] text-xs text-foreground/60 mb-1">Description</p>
              <p className="font-['Inter'] text-sm text-foreground/80">{icp.description}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <DetailCard label="Industry" value={icp.industry} />
              <DetailCard label="Location" value={icp.location} />
              <DetailCard label="Company size" value={(icp as any).company_size ?? icp.companySize} />
              <DetailCard label="Budget" value={icp.budget} />
            </div>

            <DetailList label="Goals" items={icp.goals} />
            <DetailList label="Pain Points" items={(icp as any).pain_points ?? icp.painPoints} />
            <DetailList label="Decision Makers" items={(icp as any).decision_makers ?? icp.decisionMakers} />
            <DetailList label="Tech Stack" items={(icp as any).tech_stack ?? icp.techStack} />

            <div className="bg-background border border-black rounded-design p-6 shadow-md mt-6">
              <h3 className="font-['Fraunces'] text-xl mb-2">Marketing Strategy</h3>

              <div className="relative">
                <div className="space-y-4 blur-sm pointer-events-none select-none">
                  <div className="border border-black rounded-design p-4 bg-white">
                    <h4 className="font-['Fraunces'] text-lg mb-2">Positioning</h4>
                    <p className="text-sm font-['Inter'] text-foreground/80">
                      Your ICP positioning, messaging and differentiators will appear here.
                    </p>
                  </div>

                  <div className="border border-black rounded-design p-4 bg-white">
                    <h4 className="font-['Fraunces'] text-lg mb-2">Campaign Ideas</h4>
                    <p className="text-sm font-['Inter'] text-foreground/80">
                      Ready-to-use campaign hooks, angles and CTAs tailored to this ICP.
                    </p>
                  </div>
                </div>

                <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-6">
                  <h4 className="font-['Fraunces'] text-lg mb-2">
                    Unlock your marketing strategy
                  </h4>
                  <p className="text-sm font-['Inter'] text-foreground/70 mb-4 max-w-sm">
                    Generate positioning, messaging, campaigns and ad ideas tailored to this ICP.
                  </p>
                  <Button
                    className="bg-button-green hover:bg-button-green/90 text-foreground border border-black rounded-design px-6 py-3"
                    onClick={() => openPaywall()}
                  >
                    Start your 14-day free trial
                  </Button>
                </div>
              </div>
            </div>
          </div>
        }
        footerCta={
          effectiveTier === "free" ? (
            <div className="text-center animate-fade-in-up">
              <div className="bg-gradient-to-br from-[#FFD336]/20 to-[#FF9922]/20 rounded-design p-8">
                <Lock className="w-8 h-8 mx-auto mb-4 text-foreground/60" />
                <h3 className="font-['Fraunces'] text-xl mb-3">
                  Unlock full editing & exports
                </h3>
                <p className="font-['Inter'] text-foreground/70 mb-6 max-w-md mx-auto">
                  Upgrade to edit all sections, generate marketing strategies, and export to PDF.
                </p>
                <Button
                  className="bg-button-green hover:bg-button-green/90 text-foreground border border-black rounded-design px-8 py-6 transition-all hover:scale-[1.02] hover:shadow-lg"
                  onClick={() => openPaywall()}
                >
                  Start your 14-day free trial
                </Button>
              </div>
            </div>
          ) : null
        }
      />
    </DashboardShell>
  );
}

function DetailCard({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div className="border border-black rounded-design p-4 bg-white">
      <p className="font-['Inter'] text-xs text-foreground/60 mb-1">{label}</p>
      <p className="font-['Inter'] text-sm text-foreground/80">{value}</p>
    </div>
  );
}

function DetailList({ label, items }: { label: string; items?: string[] }) {
  if (!items || !items.length) return null;
  return (
    <div className="border border-black rounded-design p-4 bg-white">
      <p className="font-['Inter'] text-xs text-foreground/60 mb-2">{label}</p>
      <ul className="list-disc list-inside space-y-1">
        {items.map((item, idx) => (
          <li key={`${label}-${idx}`} className="font-['Inter'] text-sm text-foreground/80">
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}
