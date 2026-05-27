import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { PaywallModal } from "../components/modals/PaywallModal";
import { supabase } from "../config/supabase";
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
  startCheckout: (plan?: Plan, email?: string, force?: boolean) => Promise<void>;
  closePaywall: () => void;
  isStartingCheckout: boolean;
};

type AlreadySubscribedState = {
  open: boolean;
  portalUrl: string | null;
};

const PaywallContext = createContext<PaywallContextValue | undefined>(undefined);

export function PaywallProvider({ children }: { children: React.ReactNode }) {
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

  const startCheckout = useCallback(
    async (plan?: Plan, email?: string, force?: boolean) => {
      const nextPlan = normalisePlan(plan ?? selectedPlan);
      const trimmedEmail = (email ?? "").trim();

      try {
        if (!trimmedEmail) {
          console.warn("[paywall] Email required before checkout.");
          throw new Error("Email is required to start checkout.");
        }
        setIsStartingCheckout(true);

        // Prefer a real session access_token for Authorization. The Edge Function then uses the
        // authenticated branch and does not require CHECKOUT_GUEST_SECRET. If getUser() errors
        // (e.g. stale refresh), we still try anon sign-in rather than skipping it.
        let accessToken = "";
        {
          const { data: s0 } = await supabase.auth.getSession();
          accessToken = s0?.session?.access_token ?? "";
          if (!accessToken) {
            const {
              data: { user: existingUser },
            } = await supabase.auth.getUser();
            if (existingUser) {
              const { data: refreshed } = await supabase.auth.refreshSession();
              accessToken = refreshed.session?.access_token ?? "";
            }
          }
          if (!accessToken) {
            const { error: anonError } = await supabase.auth.signInAnonymously();
            if (anonError) {
              console.warn("[paywall] signInAnonymously failed", anonError);
            } else {
              const { data: s1 } = await supabase.auth.getSession();
              accessToken = s1?.session?.access_token ?? "";
            }
          }
        }

        const monthlyPriceId = import.meta.env.VITE_STRIPE_PRICE_MONTHLY as
          | string
          | undefined;
        const annualPriceId = import.meta.env.VITE_STRIPE_PRICE_ANNUAL as
          | string
          | undefined;

        const priceId = nextPlan === "monthly" ? monthlyPriceId : annualPriceId;
        const origin = window.location.origin;

        console.log("[paywall] startCheckout", { plan: nextPlan, priceId, origin });

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
        const checkoutGuestSecret = (import.meta.env.VITE_CHECKOUT_GUEST_SECRET || "").trim();
        const checkoutUrl = `${supabaseUrl}/functions/v1/create-checkout-session`;
        const redirectBasePath = accessToken ? "/dashboard" : "/guest-dashboard";

        const payload = {
          priceId,
          successUrl: `${origin}${redirectBasePath}?checkout=success`,
          cancelUrl: `${origin}${redirectBasePath}?checkout=cancel`,
          customerEmail: trimmedEmail,
          force: Boolean(force),
        };

        console.log("[paywall] create-checkout-session payload", payload);

        console.log("[paywall] checkout session info", {
          supabaseUrl,
          hasAccessToken: Boolean(accessToken),
          tokenPreview: accessToken ? accessToken.slice(0, 20) : "",
        });
        console.log("[paywall] create-checkout-session url", checkoutUrl);
        const headers: Record<string, string> = {
          "Content-Type": "application/json",
          apikey: supabaseAnonKey,
          // Functions gateway may require a JWT in Authorization before our code runs.
          // With a real session we send the user access token; otherwise the public anon JWT
          // (Edge Function optionally validates x-guest-secret when secrets are configured).
          Authorization: `Bearer ${accessToken || supabaseAnonKey}`,
        };
        if (!accessToken && checkoutGuestSecret) {
          headers["x-guest-secret"] = checkoutGuestSecret;
        }
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

        // Surface the real error details (critical for debugging)
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
        // NOTE: we intentionally do not unset isStartingCheckout here because
        // the browser will navigate away immediately.
        window.location.assign(redirectUrl);
      } catch (err) {
        console.error("[paywall] startCheckout failed", err);
        alert(
          err instanceof Error
            ? `Unable to start checkout: ${err.message}`
            : "Unable to start checkout. Please try again."
        );
        setIsStartingCheckout(false);
      }
    },
    [selectedPlan]
  );

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
        onUpgrade={(plan, email, force) =>
          startCheckout(normalisePlan(plan) as Plan, email, force)
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
                  const email = emailAlreadySubscribed.email ?? "";
                  setEmailAlreadySubscribed({
                    open: false,
                    email: null,
                    portalUrl: null,
                    plan: null,
                  });
                  await startCheckout(plan, email, true);
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
