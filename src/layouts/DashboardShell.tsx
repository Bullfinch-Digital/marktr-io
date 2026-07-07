import React from "react";
import { useNavigate } from "react-router-dom";
import { DashboardHeader } from "../components/layout/DashboardHeader";
import { DashboardSidebar } from "../components/layout/DashboardSidebar";
import { Footer } from "../components";
import { Button } from "../components/ui/button";
import useSubscription from "../hooks/useSubscription";
import { usePaywall } from "../contexts/PaywallContext";
import { useAuth } from "../contexts/AuthContext";

type DashboardShellProps = {
  children: React.ReactNode;
  /**
   * Optional callback for the header "Create New" action.
   * Many pages currently pass a no-op; we keep that pattern.
   */
  onCreateNew?: () => void;
  /**
   * Optional className for main content wrapper.
   */
  contentClassName?: string;
  /**
   * Guest mode disables navigation + actions and triggers onGuestAction instead.
   */
  guestMode?: boolean;
  onGuestAction?: () => void;
};

export default function DashboardShell({
  children,
  onCreateNew,
  contentClassName,
  guestMode = false,
  onGuestAction,
}: DashboardShellProps) {
  const { user } = useAuth();
  const { tier: userTier, trialActive, trialExpired, isLoading: subscriptionLoading } = useSubscription();
  const { openPaywall } = usePaywall();
  const navigate = useNavigate();

  const showTrialOverlay = !guestMode && trialExpired && userTier === "free" && !trialActive;

  const handleUpgrade = () => {
    if (guestMode) {
      onGuestAction?.();
      return;
    }
    openPaywall();
  };

  return (
    <div className="min-h-screen bg-background flex relative" key={user?.id ?? "guest"}>
      <div className={`flex w-full ${showTrialOverlay ? "pointer-events-none opacity-40" : ""}`}>
        <DashboardSidebar
          userTier={userTier === "free" && !trialActive ? "free" : "paid"}
          onUpgrade={handleUpgrade}
          guestMode={guestMode}
          onGuestAction={onGuestAction}
          subscriptionLoading={subscriptionLoading}
        />

        <div className="flex-1 flex flex-col min-h-screen">
          <DashboardHeader
            onCreateNew={onCreateNew ?? (() => {})}
            userTier={userTier === "free" && !trialActive ? "free" : "paid"}
            onUpgrade={handleUpgrade}
            guestMode={guestMode}
            onGuestAction={onGuestAction}
          />

          <div className="flex-1 flex flex-col">
            <main className={`${contentClassName ?? "flex-1 px-6 py-8 lg:px-12"} pb-24 lg:pb-8`}>
              {children}
            </main>
            <Footer />
          </div>
        </div>
      </div>

      {showTrialOverlay && (
        <div className="absolute inset-0 z-50 flex items-start justify-center pt-12 sm:pt-16 md:pt-20 px-6 pb-6">
          <div className="absolute inset-0 bg-background/80" />
          <div className="relative w-full max-w-lg bg-background border border-black rounded-design shadow-xl p-8 text-center">
            <h2 className="font-['Fraunces'] text-2xl mb-2">Your trial has ended</h2>
            <p className="font-['Inter'] text-foreground/70 mb-6">
              Upgrade to keep editing, exporting, and creating unlimited ICPs.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button
                onClick={handleUpgrade}
                className="bg-button-green hover:bg-button-green/90 text-foreground border border-black rounded-design px-6 py-2"
              >
                Upgrade
              </Button>
              <Button
                variant="outline"
                className="border-black rounded-design px-6 py-2"
                onClick={() => navigate("/account")}
              >
                Manage account
              </Button>
              <Button
                variant="outline"
                className="border-black rounded-design px-6 py-2"
                onClick={() => navigate("/pricing")}
              >
                Not now
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
