import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../config/supabase";
import useProfile from "../hooks/useProfile";
import useSubscription from "../hooks/useSubscription";
import { usePaywall } from "../contexts/PaywallContext";
import {
  User,
  CheckCircle2,
  Crown,
  Calendar,
  ChevronLeft,
  AlertTriangle,
  Lock,
} from "lucide-react";

export default function MyAccount() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { profile, loading: profileLoading } = useProfile(user?.id ?? null);
  const { isPro } = useSubscription();
  const { openPaywall } = usePaywall();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveFeedback, setSaveFeedback] = useState<"idle" | "saved" | "error">("idle");
  const [emailMessage, setEmailMessage] = useState<string | null>(null);
  const [emailCooldownUntil, setEmailCooldownUntil] = useState<number | null>(null);
  const [cooldownNow, setCooldownNow] = useState<number>(Date.now());
  const [localReady, setLocalReady] = useState(false);
  const savedTimerRef = useRef<number | null>(null);
  const isSavingRef = useRef(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [isManagingBilling, setIsManagingBilling] = useState(false);

  // Stripe subscription display (from DB)
  type StripeSubscriptionRow = {
    user_id: string;
    stripe_subscription_id: string;
    stripe_customer_id: string;
    price_id: string | null;
    status: string | null;
    cancel_at_period_end: boolean | null;
    current_period_end: string | null; // timestamptz
    trial_start: string | null;
    trial_end: string | null;
    created_at?: string | null;
    updated_at?: string | null;
  };

  const [stripeSub, setStripeSub] = useState<StripeSubscriptionRow | null>(null);

  const PRICE_MONTHLY = import.meta.env.VITE_STRIPE_PRICE_MONTHLY as
    | string
    | undefined;
  const PRICE_ANNUAL = import.meta.env.VITE_STRIPE_PRICE_ANNUAL as
    | string
    | undefined;

  const isLoading = authLoading || profileLoading || !localReady;
  const emailInputChanged =
    email.trim().length > 0 &&
    email.trim().toLowerCase() !== (user?.email || "").trim().toLowerCase();
  const emailCooldownSeconds = emailCooldownUntil
    ? Math.max(0, Math.ceil((emailCooldownUntil - cooldownNow) / 1000))
    : 0;
  const emailOnCooldown = emailInputChanged && emailCooldownSeconds > 0;

  // Safer timestamptz parsing (Supabase can return microseconds; JS Date can be inconsistent)
  const parseSupabaseTimestamptz = useCallback((input: string | null | undefined): number | null => {
    if (!input) return null;
    let s = String(input).trim();
    s = s.replace(/(\.\d{3})\d+/, "$1"); // trim microseconds -> millis
    s = s.replace(/\+00:00$/, "Z");
    const t = Date.parse(s);
    return Number.isFinite(t) ? t : null;
  }, []);

  // Fetch latest stripe_subscriptions row for this user (display only)
  const fetchLatestStripeSubscription = useCallback(async () => {
    if (!user?.id) {
      setStripeSub(null);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("stripe_subscriptions")
        .select(
          "user_id,stripe_subscription_id,stripe_customer_id,price_id,status,cancel_at_period_end,current_period_end,trial_start,trial_end,created_at,updated_at"
        )
        .eq("user_id", user.id)
        // IMPORTANT: webhook updates tend to modify an existing row, so updated_at is the real "latest"
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      setStripeSub((data as StripeSubscriptionRow) ?? null);
    } catch (err) {
      console.error("MyAccount: failed to fetch stripe subscription", err);
      setStripeSub(null);
    }
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id) {
      setStripeSub(null);
      return;
    }

    let isCancelled = false;
    const run = async () => {
      if (isCancelled) return;
      await fetchLatestStripeSubscription();
    };

    // Initial fetch
    void run();

    // Re-fetch when webhook/checkout completes and the app dispatches refresh events
    const onChanged = () => void run();
    window.addEventListener("subscription:changed", onChanged);
    window.addEventListener("auth:changed", onChanged);
    window.addEventListener("paywall:changed", onChanged);

    // Re-fetch when returning from Stripe portal (tab focus / visibility change)
    const onFocus = () => void run();
    const onVisibility = () => {
      if (document.visibilityState === "visible") void run();
    };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibility);

    // Realtime: keep Account page in sync if stripe_subscriptions changes while this view is open
    const channel = supabase
      .channel(`stripe_subscriptions:user:${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "stripe_subscriptions",
          filter: `user_id=eq.${user.id}`,
        },
        () => void run()
      )
      .subscribe();

    return () => {
      isCancelled = true;
      window.removeEventListener("subscription:changed", onChanged);
      window.removeEventListener("auth:changed", onChanged);
      window.removeEventListener("paywall:changed", onChanged);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibility);
      supabase.removeChannel(channel);
    };
  }, [user?.id, fetchLatestStripeSubscription]);

  const isProFromStripe =
    stripeSub?.status === "trialing" || stripeSub?.status === "active";

  const plan = useMemo<"free" | "monthly" | "annual" | "pro">(() => {
    if (!isPro && !isProFromStripe) return "free";
    const priceId = stripeSub?.price_id ?? null;
    if (priceId && PRICE_ANNUAL && priceId === PRICE_ANNUAL) return "annual";
    if (priceId && PRICE_MONTHLY && priceId === PRICE_MONTHLY) return "monthly";
    // fallback if price_id missing/unknown
    return "pro";
  }, [isPro, isProFromStripe, stripeSub?.price_id, PRICE_ANNUAL, PRICE_MONTHLY]);

  const statusLabel =
    stripeSub?.status === "trialing"
      ? "Trial"
      : stripeSub?.status === "active"
      ? "Active"
      : "Free";
  const statusIsPro = statusLabel !== "Free";

  const subscription = useMemo(() => {
    const priceDisplay =
      plan === "annual"
        ? "£300/year (equivalent £25/month)"
        : plan === "monthly"
        ? "£30/month"
        : plan === "pro"
        ? "Pro (price updating)"
        : "—";

    const nextBillingSource =
      stripeSub?.current_period_end ??
      (stripeSub?.status === "trialing" ? stripeSub?.trial_end ?? null : null);
    const nextBillingDate = nextBillingSource
      ? new Date(nextBillingSource).toLocaleDateString("en-GB", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        })
      : "—";

    return {
      plan,
      priceDisplay,
      nextBillingDate,
      status: stripeSub?.status ?? "free",
    };
  }, [plan, stripeSub?.current_period_end, stripeSub?.status, stripeSub?.trial_end]);

  const trialDaysLeft = useMemo(() => {
    if (stripeSub?.status !== "trialing") return null;
    const trialEndMs = parseSupabaseTimestamptz(stripeSub?.trial_end);
    if (!trialEndMs) return null;
    const now = Date.now();
    const diff = trialEndMs - now;
    // If already passed, show 0
    const days = Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
    return days;
  }, [stripeSub?.status, stripeSub?.trial_end, parseSupabaseTimestamptz]);

  // Expose supabase for console debugging
  useEffect(() => {
    (window as any).supabase = supabase;
  }, []);

  // Prefill name/email from profile or user
  useEffect(() => {
    console.log("MyAccount: prefill effect", {
      authLoading,
      profileLoading,
      userId: user?.id,
      profileName: profile?.name,
      profileEmail: profile?.email,
      authEmail: user?.email,
    });

    if (authLoading || profileLoading) return;

    // Keep account screen usable even if profile row is delayed or email is blank.
    const resolvedName =
      profile?.name ??
      user?.user_metadata?.name ??
      user?.email?.split("@")[0] ??
      "";

    const resolvedEmail = profile?.email || user?.email || "";

    setName(resolvedName);
    // Only overwrite local email when we actually have a resolved value.
    // This avoids blank profile.email wiping a just-entered pending email.
    if (resolvedEmail) {
      setEmail(resolvedEmail);
    }
    setLocalReady(true);
  }, [authLoading, profileLoading, profile, user]);

  useEffect(() => {
    return () => {
      if (savedTimerRef.current) {
        window.clearTimeout(savedTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!emailCooldownUntil) return;
    if (emailCooldownUntil <= Date.now()) return;

    const intervalId = window.setInterval(() => {
      setCooldownNow(Date.now());
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, [emailCooldownUntil]);

  useEffect(() => {
    if (!emailCooldownUntil) return;
    if (emailCooldownUntil <= Date.now()) {
      setEmailCooldownUntil(null);
      setCooldownNow(Date.now());
    }
  }, [emailCooldownUntil, cooldownNow]);

  const showTemporarySavedState = () => {
    if (savedTimerRef.current) {
      window.clearTimeout(savedTimerRef.current);
    }

    setSaveFeedback("saved");
    savedTimerRef.current = window.setTimeout(() => {
      setSaveFeedback("idle");
    }, 2000);
  };

  const handleSaveProfile = async () => {
    console.log("MyAccount: handleSaveProfile start", {
      userId: user?.id,
      currentEmail: user?.email,
      inputEmail: email,
    });

    if (saving || isSavingRef.current) {
      console.log("DEBUG: Already saving, cancelling duplicate click");
      return;
    }

    const trimmedName = name.trim();
    const trimmedEmail = email.trim();
    const newEmail = trimmedEmail;
    const currentProfileName = profile?.name || user?.user_metadata?.name || user?.email?.split("@")[0] || "User";
    const currentAuthEmail = user?.email || "";

    const emailChanged =
      trimmedEmail.length > 0 && trimmedEmail.toLowerCase() !== currentAuthEmail.toLowerCase();
    const nameChanged = trimmedName !== currentProfileName;
    const now = Date.now();

    if (emailChanged && emailCooldownUntil && now < emailCooldownUntil) {
      const secondsLeft = Math.max(1, Math.ceil((emailCooldownUntil - now) / 1000));
      setEmailMessage(
        `Please wait ${secondsLeft}s before requesting another email change.`
      );
      return;
    }

    if (!emailChanged && !nameChanged) {
      console.log("MyAccount: no changes detected");
      setEmailMessage("No changes to save.");
      setSaveFeedback("idle");
      return;
    }

    setSaving(true);
    isSavingRef.current = true;
    setSaveFeedback("idle");
    setEmailMessage(null);

    try {
      if (!user?.id) {
        throw new Error("No authenticated user");
      }

      let emailChangeWarning: string | null = null;

      if (emailChanged) {
        const emailRedirectUrl = `${window.location.origin}/account`;
        console.log("MyAccount: requesting email change", {
          currentEmail: user.email,
          newEmail,
          emailRedirectUrl,
        });

        console.log("Calling updateUser (v2) with:", {
          email: newEmail,
          redirect: emailRedirectUrl,
        });

        const result = await supabase.auth.updateUser(
          { email: newEmail },
          { emailRedirectTo: emailRedirectUrl }
        );

        console.log("updateUser returned:", result);

        if (result.error) {
          console.error("MyAccount: updateUser error", result.error);
          const status = (result.error as any)?.status;
          const message = (result.error as any)?.message || "Failed to request email change.";
          const waitMatch = /after\s+(\d+)\s+seconds?/i.exec(message);

          const isRateLimited =
            status === 429 ||
            !!waitMatch ||
            /rate limit|too many requests/i.test(message);

          if (isRateLimited) {
            const waitSeconds = waitMatch ? Number(waitMatch[1]) : 60;
            setEmailCooldownUntil(Date.now() + waitSeconds * 1000);
            emailChangeWarning = waitMatch
              ? `Please wait ${waitSeconds}s before requesting another email change.`
              : "Email change rate limit reached. Please wait a few minutes, then try again.";
          } else {
            throw result.error;
          }
        } else {
          setEmailMessage("Check your new email to confirm this change.");
          // Keep the requested email visible in the field while confirmation is pending.
          setEmail(newEmail);
          console.log("MyAccount: email change request sent successfully");
          showTemporarySavedState();
        }
      }

      if (nameChanged) {
        console.log("MyAccount: updating profile name", { userId: user.id, newName: trimmedName });
        const { error: nameError } = await supabase
          .from("profiles")
          .update({ name: trimmedName })
          .eq("id", user.id);

        if (nameError) {
          console.error("MyAccount: failed to update profile name", nameError);
          throw nameError;
        } else {
          console.log("MyAccount: profile name updated successfully");
        }

        showTemporarySavedState();
      }

      if (emailChangeWarning) {
        setEmailMessage(emailChangeWarning);
      }

    } catch (err) {
      console.error("Error saving profile:", err);
      setSaveFeedback("error");
      setEmailMessage(err instanceof Error ? err.message : "Failed to update email");
    } finally {
      console.log("DEBUG: handleSaveProfile finally reached");
      console.log("MyAccount: handleSaveProfile finished - resetting state");
      setSaving(false);
      isSavingRef.current = false;
      setLocalReady(true);
    }
  };

  const handleChangePassword = async () => {
    if (passwordSaving) return;

    setPasswordMessage(null);
    setPasswordError(null);

    if (!newPassword || newPassword.length < 8) {
      setPasswordError("Password must be at least 8 characters long.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("Passwords do not match.");
      return;
    }

    try {
      setPasswordSaving(true);
      const { data, error } = await supabase.auth.updateUser({
        password: newPassword,
      });
      console.log("MyAccount: change password result", { data, error });
      if (error) {
        setPasswordError(error.message || "Failed to update password.");
        return;
      }
      setPasswordMessage("Password updated successfully.");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      console.error("MyAccount: change password unexpected error", err);
      setPasswordError(err instanceof Error ? err.message : "Failed to update password.");
    } finally {
      setPasswordSaving(false);
    }
  };

  const handleManageBilling = async () => {
    setIsManagingBilling(true);
    try {
      const origin = window.location.origin;
      const { data, error } = await supabase.functions.invoke(
        "create-portal-session",
        {
          body: {
            returnUrl: `${origin}/account`,
          },
        }
      );

      if (error) throw error;
      if (data?.url) {
        window.location.href = data.url;
      } else {
        throw new Error("Portal URL missing");
      }
    } catch (err) {
      console.error("MyAccount: failed to open billing portal", err);
      alert("Unable to open billing portal. Please try again.");
    } finally {
      setIsManagingBilling(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 border-4 border-button-green border-t-transparent rounded-full animate-spin" />
          <p className="text-foreground/70">Loading account...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b border-warm-grey bg-background sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-6 py-4">
          <button
            onClick={() => navigate("/dashboard")}
            className="inline-flex items-center gap-2 font-['Inter'] text-sm text-foreground/70 hover:text-foreground transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            Back to Dashboard
          </button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-12 space-y-8">
        <div className="mb-8">
          <h1 className="font-['Fraunces'] text-4xl mb-2">My Account</h1>
          <p className="font-['Inter'] text-foreground/70">
            Manage your profile, subscription, and settings.
          </p>
        </div>

        <div className="bg-[#E5E5E5]/30 border border-black rounded-design p-8">
          <div className="flex items-start gap-6 mb-6">
            <User className="w-5 h-5 mt-1" />
            <div className="flex-1">
              <h2 className="font-['Fraunces'] text-2xl mb-1">Profile Information</h2>
              <p className="font-['Inter'] text-sm text-foreground/70">
                Update your personal details.
              </p>
            </div>
          </div>

          <div className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name" className="font-['Inter'] text-sm">
                Full Name
              </Label>
              <Input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="border-black rounded-design font-['Inter']"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="font-['Inter'] text-sm">
                Email Address
              </Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="border-black rounded-design font-['Inter']"
              />
              {emailMessage && (
                <p className="text-sm text-foreground/70">{emailMessage}</p>
              )}
            </div>

            <div className="flex items-center gap-3">
              <Button
                onClick={handleSaveProfile}
                disabled={saving || emailOnCooldown}
                className="bg-button-green hover:bg-button-green/90 text-foreground border border-black rounded-design font-['Inter'] disabled:opacity-50"
              >
                {saving && "Saving..."}
                {!saving && emailOnCooldown && `Wait ${emailCooldownSeconds}s`}
                {!saving && saveFeedback === "saved" && "Saved!"}
                {!saving && saveFeedback === "error" && "Try Again"}
                {!saving && !emailOnCooldown && saveFeedback === "idle" && "Save Changes"}
              </Button>
              {saveFeedback === "saved" && (
                <span className="flex items-center gap-2 font-['Inter'] text-sm text-button-green">
                  <CheckCircle2 className="w-4 h-4" />
                  Changes saved successfully
                </span>
              )}
            </div>
            {emailOnCooldown && (
              <p className="font-['Inter'] text-xs text-foreground/70">
                Please wait {emailCooldownSeconds}s before requesting another email change.
              </p>
            )}
          </div>
        </div>

        <div className="bg-[#E5E5E5]/30 border border-black rounded-design p-8">
          <div className="flex items-start gap-6 mb-6">
            <Lock className="w-5 h-5 mt-1" />
            <div className="flex-1">
              <h2 className="font-['Fraunces'] text-2xl mb-1">Security</h2>
              <p className="font-['Inter'] text-sm text-foreground/70">
                Update your password.
              </p>
            </div>
          </div>

          <div className="space-y-4 max-w-md">
            <div className="space-y-2">
              <Label htmlFor="new-password" className="font-['Inter'] text-sm">
                New password
              </Label>
              <Input
                id="new-password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="border-black rounded-design font-['Inter']"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirm-password" className="font-['Inter'] text-sm">
                Confirm new password
              </Label>
              <Input
                id="confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="border-black rounded-design font-['Inter']"
              />
            </div>

            {passwordError && <p className="text-sm text-red-600">{passwordError}</p>}
            {passwordMessage && <p className="text-sm text-foreground/80">{passwordMessage}</p>}

            <Button
              onClick={handleChangePassword}
              disabled={passwordSaving}
              className="bg-background hover:bg-foreground/5 text-foreground border border-black rounded-design font-['Inter'] disabled:opacity-60"
            >
              {passwordSaving ? "Saving..." : "Update password"}
            </Button>
          </div>
        </div>

        <div className="bg-gradient-to-br from-button-green/20 to-[#BBA0E5]/10 border border-black rounded-design p-8">
          <div className="flex items-start gap-6 mb-6">
            <Crown className="w-5 h-5 mt-1" />
            <div className="flex-1">
              <h2 className="font-['Fraunces'] text-2xl mb-1">Subscription</h2>
              <p className="font-['Inter'] text-sm text-foreground/70">
                Manage your billing and plan.
              </p>
            </div>
            <span
              className={`inline-flex items-center gap-1 px-3 py-1 rounded-full border text-xs font-['Inter'] uppercase tracking-wide ${
                statusIsPro
                  ? "bg-button-green border-black"
                  : "bg-background border-warm-grey"
              }`}
            >
              {statusIsPro && <CheckCircle2 className="w-3 h-3" />}
              {statusLabel}
            </span>
          </div>

          <div className="space-y-4 mb-6">
            <div className="flex items-center justify-between py-3 border-b border-warm-grey">
              <span className="font-['Inter'] text-sm text-foreground/70">Current Plan</span>
              <span className="font-['Fraunces'] text-lg">
                {subscription.plan === "free"
                  ? "Free"
                  : subscription.plan === "monthly"
                  ? "Monthly Pro"
                  : subscription.plan === "annual"
                  ? "Annual Pro"
                  : "Pro"}
              </span>
            </div>
            {subscription.plan !== "free" && (
              <>
                <div className="flex items-center justify-between py-3 border-b border-warm-grey">
                  <span className="font-['Inter'] text-sm text-foreground/70">Price</span>
                  <span className="font-['Fraunces'] text-lg">
                    {subscription.priceDisplay}
                  </span>
                </div>
                <div className="flex items-center justify-between py-3">
                  <span className="font-['Inter'] text-sm text-foreground/70">Next Billing Date</span>
                  <span className="font-['Inter'] flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    {subscription.nextBillingDate}
                  </span>
                </div>
                {stripeSub?.status === "trialing" && (
                  <div className="flex items-center justify-between py-3">
                    <span className="font-['Inter'] text-sm text-foreground/70">Trial remaining</span>
                    <span className="font-['Inter']">
                      {trialDaysLeft === null
                        ? "—"
                        : trialDaysLeft === 1
                        ? "1 day"
                        : `${trialDaysLeft} days`}
                    </span>
                  </div>
                )}
              </>
            )}
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            {!isPro && (
              <Button
                onClick={() => openPaywall()}
                className="bg-button-green hover:bg-button-green/90 text-foreground border border-black rounded-design font-['Inter']"
              >
                Start 7-day trial
              </Button>
            )}
            {isPro && (
              <Button
                onClick={handleManageBilling}
                disabled={isManagingBilling}
                variant="outline"
                className="border-black rounded-design font-['Inter']"
              >
                {isManagingBilling ? "Opening..." : "Manage billing"}
              </Button>
            )}
          </div>
        </div>

        <div className="bg-[#FFE5E5]/30 border-l-4 border-l-[#FF6B6B] border-t border-r border-b border-black rounded-design p-8">
          <div className="flex items-start gap-6 mb-6">
            <AlertTriangle className="w-5 h-5 mt-1 text-[#FF6B6B]" />
            <div className="flex-1">
              <h2 className="font-['Fraunces'] text-2xl mb-1">Danger Zone</h2>
              <p className="font-['Inter'] text-sm text-foreground/70">
                Irreversible and destructive actions.
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <p className="font-['Inter'] text-sm text-foreground/80">
              This action cannot be undone. All ICPs and collections will be permanently deleted.
            </p>
            <Button
              onClick={() => window.confirm("Are you sure?")}
              className="bg-background hover:bg-[#FF6B6B]/10 text-[#FF6B6B] border border-[#FF6B6B] rounded-design font-['Inter']"
            >
              Delete Account
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
