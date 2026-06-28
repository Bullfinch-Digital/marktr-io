import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { PaywallModal } from "../components/modals/PaywallModal";
import { supabase } from "../config/supabase";
import { useAuth } from "./AuthContext";
import { useAuthModal } from "./AuthModalContext";
import {
  clearPendingCheckoutPlan,
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

        const { data: userData } = await supabase.auth.getUser();
        const authedUser = userData?.user ?? null;
        const accessToken = (await supabase.auth.getSession()).data.session?.access_token ?? "";

        if (!accessToken || !authedUser || (authedUser as any).is_anonymous) {
          throw new Error("Please sign in before starting checkout.");
        }

        const monthlyPriceId = import.meta.env.VITE_STRIPE_PRICE_MONTHLY as
          | string
          | undefined;
        const annualPriceId = import.meta.env.VITE_STRIPE_PRICE_ANNUAL as
          | string
          | undefined;

        const priceId = nextPlan === "monthly" ? monthlyPriceId : annualPriceId;
        const origin = window.location.origin;

        console.log("[paywall] proceedToStripe", { plan: nextPlan, priceId, origin });

        if (!priceId) {
          console.error("[paywall] Missing Stripe priceId", {
            plan: nextPlan,
            monthlyPriceIdPresent: Boolean(monthlyPriceId),
            annualPriceIdPresent: Boolean(annualPriceId),
          });
          throw new Error(
            "Stripe price ID missing. Check VITE_STRIPE_PRICE_MONTHLY / VITE_STRIPE_PRICE_ANNUAL in your frontend env and restart dev server."
          );
        }

        const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL || "").trim();
        const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || "").trim();
        const checkoutUrl = `${supabaseUrl}/functions/v1/create-checkout-session`;

        const payload = {
          priceId,
          successUrl: `${origin}/dashboard?checkout=success`,
          cancelUrl: `${origin}/dashboard?checkout=cancel`,
          force: Boolean(force),
          customerEmail: authedUser.email ?? undefined,
        };

        console.log("[paywall] create-checkout-session payload", payload);

        const headers: Record<string, string> = {
          "Content-Type": "application/json",
          apikey: supabaseAnonKey,
          Authorization: `Bearer ${accessToken}`,
        };

        const res = await fetch(checkoutUrl, {
          method: "POST",
          headers,
          body: JSON.stringify(payload),
        });

        const raw = await res.text();
        console.log("checkout raw response", res.status, raw);
        if (!res.ok) {
          console.log("[paywall] checkout non-2xx response", res.status, raw);
        }

        let data: any = null;
        try {
          data = raw ? JSON.parse(raw) : null;
        } catch (parseError) {
          console.error("[paywall] checkout response parse error", parseError);
        }

        if (!res.ok) {
          console.error("[paywall] create-checkout-session response not ok", {
            status: res.status,
            data,
            plan: nextPlan,
            priceId,
          });
          const msg =
            (data as any)?.message ||
            (data as any)?.error ||
            raw ||
            `Request failed with status ${res.status}` ||
            "Unexpected error";
          throw new Error(msg);
        }

        if (data?.code === "ALREADY_SUBSCRIBED") {
          console.log("[paywall] branch: already subscribed (code)");
          clearPendingCheckoutPlan();
          setAlreadySubscribed({
            open: true,
            portalUrl: (data as any)?.portalUrl ?? null,
          });
          setShowPaywall(false);
          setIsStartingCheckout(false);
          return;
        }

        if (data?.code === "EMAIL_ALREADY_SUBSCRIBED") {
          console.log("[paywall] branch: email already subscribed (code)");
          clearPendingCheckoutPlan();
          setEmailAlreadySubscribed({
            open: true,
            email: (data as any)?.email ?? null,
            portalUrl: (data as any)?.portalUrl ?? null,
            plan: nextPlan,
          });
          setShowPaywall(false);
          setIsStartingCheckout(false);
          return;
        }

        if (data?.alreadySubscribed === true) {
          console.log("[paywall] branch: already subscribed (flag)");
          clearPendingCheckoutPlan();
          setAlreadySubscribed({
            open: true,
            portalUrl: (data as any)?.billingPortalUrl ?? (data as any)?.portalUrl ?? null,
          });
          setShowPaywall(false);
          setIsStartingCheckout(false);
          return;
        }

        const redirectUrl = (data as any)?.checkoutUrl;
        if (!redirectUrl) throw new Error("Checkout URL missing");
        console.log("[paywall] branch: redirecting to checkout", redirectUrl);
        clearPendingCheckoutPlan();
        window.location.assign(redirectUrl);
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
