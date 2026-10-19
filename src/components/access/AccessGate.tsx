import { useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { PaywallModal } from "../modals/PaywallModal";
import { usePaywall } from "../../contexts/PaywallContext";
import { useAuth } from "../../contexts/AuthContext";
import { trackOnceLoad } from "../../lib/analytics";

/**
 * Full-page trial gate for a signed-in user without Pro access.
 * Same offer and checkout path as the paywall modal. Not dismissible.
 */
export function AccessGate() {
  const { startCheckout, isStartingCheckout } = usePaywall();
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    trackOnceLoad(`access_gate_view:${location.pathname}`, "access_gate_view");
  }, [location.pathname]);

  useEffect(() => {
    const checkout = new URLSearchParams(location.search).get("checkout");
    if (checkout !== "success") return;
    let attempts = 0;
    const id = window.setInterval(() => {
      attempts += 1;
      window.dispatchEvent(new Event("subscription:changed"));
      if (attempts >= 8) window.clearInterval(id);
    }, 2000);
    return () => window.clearInterval(id);
  }, [location.search]);

  return (
    <div className="min-h-screen bg-background px-3 py-6 sm:px-4 sm:py-10">
      <PaywallModal
        isOpen
        presentation="page"
        heading="Start your free trial to unlock your dashboard"
        onUpgrade={(plan) => {
          void startCheckout(plan);
        }}
        isStartingCheckout={isStartingCheckout}
        trialTrackId="access_gate_start_trial"
        trackLocation="access_gate"
        belowActions={
          <div className="flex flex-col items-center gap-1 pt-1 sm:flex-row sm:justify-center sm:gap-6">
            <button
              type="button"
              data-track-id="access_gate_sign_out"
              data-track-location="access_gate"
              disabled={isStartingCheckout}
              onClick={() => {
                void signOut().then(() => {
                  navigate("/", { replace: true });
                });
              }}
              className="inline-flex min-h-11 items-center font-['Plus_Jakarta_Sans'] text-sm text-foreground/70 underline underline-offset-2 hover:text-foreground"
            >
              Sign out
            </button>
            <Link
              to="/account"
              className="inline-flex min-h-11 items-center font-['Plus_Jakarta_Sans'] text-sm text-foreground/70 underline underline-offset-2 hover:text-foreground"
            >
              Account
            </Link>
          </div>
        }
      />
    </div>
  );
}
