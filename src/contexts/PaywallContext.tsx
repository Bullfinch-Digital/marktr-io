import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { PaywallModal } from "../components/modals/PaywallModal";
import { createStripeCheckoutSession } from "../lib/stripeCheckout";
import { supabase } from "../config/supabase";
import { useAuth } from "./AuthContext";
import { useAuthModal } from "./AuthModalContext";
import {
  getPendingCheckoutPlan,
  setPendingCheckoutPlan,
} from "../utils/pendingCheckout";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
} from "../components/ui/alert-dialog";
import { Button } from "../components/ui/button";

// IMPORTANT: internally we ONLY allow these two values.
// (UI can say "Yearly", but the value must remain "annual".)
type Plan = "monthly" | "annual";

type PaywallContextValue = {
  openPaywall: (plan?: Plan) => void;
  startCheckout: (plan?: Plan, force?: boolean) => Promise<void>;
  closePaywall: () => void;
  isStartingCheckout: boolean;
};

type AlreadySubscribedState = {
  open: boolean;
  portalUrl: string | null;
};

const PaywallContext = createContext<PaywallContextValue | undefined>(undefined);

export function PaywallProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const { openSignIn } = useAuthModal();
  const resumeCheckoutRef = useRef(false);
  const [showPaywall, setShowPaywall] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<Plan>("annual");
  const [isStartingCheckout, setIsStartingCheckout] = useState(false);
  const [alreadySubscribed, setAlreadySubscribed] = useState<AlreadySubscribedState>({
    open: false,
    portalUrl: null,
  });
  const [emailAlreadySubscribed, setEmailAlreadySubscribed] = useState<{
    open: boolean;
    email: string | null;
    portalUrl: string | null;
    plan: Plan | null;
  }>({
    open: false,
    email: null,
    portalUrl: null,
    plan: null,
  });

  const openPaywall = useCallback((plan?: Plan) => {
    if (plan) setSelectedPlan(plan);
    setShowPaywall(true);
  }, []);

  const closePaywall = useCallback(() => setShowPaywall(false), []);

  // Defensive: if any caller accidentally passes "yearly", normalise it.
  const normalisePlan = (p: any): Plan => (p === "yearly" ? "annual" : p);

  const proceedToStripe = useCallback(
    async (plan: Plan, force?: boolean) => {
      const nextPlan = normalisePlan(plan);

      try {
        setIsStartingCheckout(true);
        console.log("[paywall] proceedToStripe", { plan: nextPlan });

        const result = await createStripeCheckoutSession(nextPlan, { force });

        if (result.status === "already_subscribed") {
          setAlreadySubscribed({
            open: true,
            portalUrl: result.portalUrl ?? null,
          });
          setShowPaywall(false);
          setIsStartingCheckout(false);
          return;
        }

        if (result.status === "email_already_subscribed") {
          setEmailAlreadySubscribed({
            open: true,
            email: result.email ?? null,
            portalUrl: result.portalUrl ?? null,
            plan: result.plan,
          });
          setShowPaywall(false);
          setIsStartingCheckout(false);
          return;
        }

        if (result.status === "error") {
          throw new Error(result.message);
        }

        console.log("[paywall] branch: redirecting to checkout", result.url);
        window.location.assign(result.url);
      } catch (err) {
        console.error("[paywall] proceedToStripe failed", err);
        alert(
          err instanceof Error
            ? `Unable to start checkout: ${err.message}`
            : "Unable to start checkout. Please try again."
        );
        setIsStartingCheckout(false);
      }
    },
    []
  );

  const startCheckout = useCallback(
    async (plan?: Plan, force?: boolean) => {
      const nextPlan = normalisePlan(plan ?? selectedPlan);

      const { data: userData } = await supabase.auth.getUser();
      const currentUser = userData?.user ?? null;
      const isRealUser = Boolean(currentUser && !(currentUser as any).is_anonymous);

      if (!isRealUser) {
        setPendingCheckoutPlan(nextPlan);
        setShowPaywall(false);
        openSignIn({
          redirectPath: "/dashboard",
          heading: "Sign in to start your trial",
          subheading: "Takes 10 seconds. Your results are saved.",
        });
        return;
      }

      await proceedToStripe(nextPlan, force);
    },
    [selectedPlan, openSignIn, proceedToStripe]
  );

  useEffect(() => {
    if (!user || (user as any).is_anonymous) return;

    const pendingPlan = getPendingCheckoutPlan();
    if (!pendingPlan) return;
    if (resumeCheckoutRef.current) return;

    resumeCheckoutRef.current = true;
    console.log("[paywall] resuming pending checkout after auth", { plan: pendingPlan });

    void (async () => {
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const sessionUser = sessionData?.session?.user ?? null;
        if (
          !sessionData?.session?.access_token ||
          !sessionUser ||
          (sessionUser as { is_anonymous?: boolean }).is_anonymous
        ) {
          console.warn("[paywall] pending checkout resume deferred — session not ready");
          resumeCheckoutRef.current = false;
          return;
        }

        await proceedToStripe(pendingPlan);
      } catch (err) {
        console.error("[paywall] pending checkout resume failed", err);
        resumeCheckoutRef.current = false;
      }
    })();
  }, [user, proceedToStripe]);

  const value = useMemo(
    () => ({
      openPaywall,
      startCheckout,
      closePaywall,
      isStartingCheckout,
    }),
    [openPaywall, startCheckout, closePaywall, isStartingCheckout]
  );

  return (
    <PaywallContext.Provider value={value}>
      {children}

      <PaywallModal
        isOpen={showPaywall}
        onClose={closePaywall}
        // Normalise in case PaywallModal passes "yearly"
        onUpgrade={(plan, force) =>
          startCheckout(normalisePlan(plan) as Plan, force)
        }
        onContinueFree={closePaywall}
        selectedPlan={selectedPlan}
        // Normalise in case PaywallModal passes "yearly"
        onSelectPlan={(plan) => setSelectedPlan(normalisePlan(plan))}
        isStartingCheckout={isStartingCheckout}
      />

      <AlertDialog
        open={alreadySubscribed.open}
        onOpenChange={(open) =>
          setAlreadySubscribed((prev) => ({ ...prev, open }))
        }
      >
        <AlertDialogContent className="rounded-design border border-black">
          <AlertDialogHeader>
            <AlertDialogTitle>You're already subscribed</AlertDialogTitle>
            <AlertDialogDescription>
              It looks like you already have a subscription set up. You can amend
              it from your Account page.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel asChild>
              <Button
                type="button"
                variant="outline"
                className="border-black rounded-design"
                onClick={() => {
                  setAlreadySubscribed({ open: false, portalUrl: null });
                  window.location.assign("/account");
                }}
              >
                Go to Account
              </Button>
            </AlertDialogCancel>
            <AlertDialogAction asChild>
              <Button
                type="button"
                className="bg-button-green hover:bg-button-green/90 text-text-dark border border-black rounded-design"
                onClick={async () => {
                  const portalUrl = alreadySubscribed.portalUrl;
                  setAlreadySubscribed({ open: false, portalUrl: null });
                  if (portalUrl) {
                    window.location.assign(portalUrl);
                    return;
                  }
                  try {
                    const origin = window.location.origin;
                    const { data } = await supabase.functions.invoke(
                      "create-portal-session",
                      { body: { returnUrl: `${origin}/account` } }
                    );
                    if (data?.url) {
                      window.location.assign(data.url);
                      return;
                    }
                  } catch (err) {
                    console.error("[paywall] portal session failed", err);
                  }
                  window.location.assign("/account");
                }}
              >
                Manage Billing
              </Button>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={emailAlreadySubscribed.open}
        onOpenChange={(open) =>
          setEmailAlreadySubscribed((prev) => ({ ...prev, open }))
        }
      >
        <AlertDialogContent className="rounded-design border border-black">
          <AlertDialogHeader>
            <AlertDialogTitle>Email already has a subscription</AlertDialogTitle>
            <AlertDialogDescription>
              Looks like <strong>{emailAlreadySubscribed.email ?? "this email"}</strong> already has an active or trial subscription.
              You can manage billing, or continue anyway if you really need a second subscription.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel asChild>
              <Button
                type="button"
                variant="outline"
                className="border-black rounded-design"
                onClick={() => {
                  setEmailAlreadySubscribed({
                    open: false,
                    email: null,
                    portalUrl: null,
                    plan: null,
                  });
                  window.location.assign("/account");
                }}
              >
                Go to Account
              </Button>
            </AlertDialogCancel>

            <AlertDialogAction asChild>
              <Button
                type="button"
                className="bg-button-green hover:bg-button-green/90 text-text-dark border border-black rounded-design"
                onClick={async () => {
                  const portalUrl = emailAlreadySubscribed.portalUrl;
                  if (portalUrl) {
                    setEmailAlreadySubscribed({
                      open: false,
                      email: null,
                      portalUrl: null,
                      plan: null,
                    });
                    window.location.assign(portalUrl);
                    return;
                  }

                  try {
                    const origin = window.location.origin;
                    const { data } = await supabase.functions.invoke(
                      "create-portal-session",
                      { body: { returnUrl: `${origin}/account` } }
                    );
                    if (data?.url) {
                      setEmailAlreadySubscribed({
                        open: false,
                        email: null,
                        portalUrl: null,
                        plan: null,
                      });
                      window.location.assign(data.url);
                      return;
                    }
                  } catch {}

                  setEmailAlreadySubscribed({
                    open: false,
                    email: null,
                    portalUrl: null,
                    plan: null,
                  });
                  window.location.assign("/account");
                }}
              >
                Manage Billing
              </Button>
            </AlertDialogAction>

            <AlertDialogAction asChild>
              <Button
                type="button"
                variant="outline"
                className="border-black rounded-design"
                onClick={async () => {
                  const plan = emailAlreadySubscribed.plan ?? "annual";
                  setEmailAlreadySubscribed({
                    open: false,
                    email: null,
                    portalUrl: null,
                    plan: null,
                  });
                  await startCheckout(plan, true);
                }}
              >
                Continue anyway
              </Button>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PaywallContext.Provider>
  );
}

export function usePaywall(): PaywallContextValue {
  const ctx = useContext(PaywallContext);
  if (!ctx) {
    throw new Error("usePaywall must be used within a PaywallProvider");
  }
  return ctx;
}
