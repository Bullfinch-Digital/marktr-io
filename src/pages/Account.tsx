import { useState, useEffect } from "react";
import { DashboardSidebar } from "../components/layout/DashboardSidebar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../components/ui/alert-dialog";
import { Input } from "../components/ui/input";
import { User, CreditCard, Bell, Shield, Loader2, AlertCircle } from "lucide-react";
import useSubscription from "../hooks/useSubscription";
import useProfile from "../hooks/useProfile";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../config/supabase";

export default function Account() {
  console.log("🔥 Account component rendered");
  console.log("✅ ACCOUNT COMPONENT RENDERED", new Date().toISOString());
  console.log(
    "Stripe prices:",
    import.meta.env.VITE_STRIPE_PRICE_ANNUAL
  );

  const { user } = useAuth();
  const { profile, loading } = useProfile(user?.id ?? null);
  const { tier: userTier, trialActive } = useSubscription();
  const safeUserTier = userTier === "free" && !trialActive ? "free" : "paid";

  // Display tier: show Pro during trial, otherwise show based on subscription_tier
  const subscriptionTier = trialActive
    ? "pro"
    : userTier === "pro" || userTier === "team"
    ? "pro"
    : "free";

  // Local state for form fields
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [pendingEmail, setPendingEmail] = useState<string | null>(null);
  const [savingName, setSavingName] = useState(false);
  const [updatingEmail, setUpdatingEmail] = useState(false);
  const [nameMessage, setNameMessage] = useState("");
  const [emailMessage, setEmailMessage] = useState("");
  const [isStartingTrial, setIsStartingTrial] = useState(false);
  const [isManagingBilling, setIsManagingBilling] = useState(false);
  const [alreadySubscribed, setAlreadySubscribed] = useState<{
    open: boolean;
    portalUrl: string | null;
  }>({ open: false, portalUrl: null });

  const stripePriceId = import.meta.env.VITE_STRIPE_PRICE_ID as string | undefined;

  useEffect(() => {
    console.log("✅ Account mounted");
    console.log("import.meta.env", import.meta.env);
    console.log(
      "Stripe envs:",
      import.meta.env.VITE_STRIPE_PRICE_ANNUAL,
      import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY
    );
    console.log(import.meta.env.VITE_STRIPE_PRICE_ANNUAL);
  }, []);

  // Load profile into form when ready - ensure fields are never empty
  useEffect(() => {
    if (profile) {
      setName(profile.name || user?.user_metadata?.name || user?.email?.split("@")[0] || "");
      setEmail(profile.email || user?.email || "");
      setPendingEmail(null); // Clear pending email when profile loads
    } else if (user && !loading) {
      // Fallback to user data if profile not loaded yet
      setName(user.user_metadata?.name || user.email?.split("@")[0] || "");
      setEmail(user.email || "");
    }
  }, [profile, user, loading]);

  // Check for pending email from auth user
  useEffect(() => {
    if (user?.email && profile?.email && user.email !== profile.email) {
      // There's a pending email confirmation
      setPendingEmail(user.email);
      setEmail(profile.email); // Show current confirmed email
    }
  }, [user?.email, profile?.email]);

  async function handleSaveName() {
    if (!user?.id) return;

    setSavingName(true);
    setNameMessage("");

    try {
      const { error } = await supabase
        .from("profiles")
        .update({ name })
        .eq("id", user.id);

      if (error) {
        throw error;
      }

      setNameMessage("Name updated successfully!");
      setTimeout(() => setNameMessage(""), 2500);
    } catch (err) {
      console.error("Account: failed to update name", err);
      setNameMessage("Failed to update name");
    } finally {
      setSavingName(false);
    }
  }

  async function handleUpdateEmail() {
    if (!user || !profile) return;

    setUpdatingEmail(true);
    setEmailMessage("");

    try {
      const { error: emailError } = await supabase.auth.updateUser({
        email: email,
      });

      if (emailError) {
        throw emailError;
      }

      // Email update initiated - show confirmation message
      setPendingEmail(email);
      setEmailMessage("Check your inbox to confirm email change");
      // Keep showing the old email until confirmed
      setEmail(profile?.email || email);
    } catch (err) {
      console.error("Error updating email:", err);
      setEmailMessage(
        err instanceof Error ? err.message : "Failed to update email"
      );
    } finally {
      setUpdatingEmail(false);
    }
  }

  async function handleStartTrial() {
    console.log("➡️ Checkout clicked - starting flow");
    if (!stripePriceId) {
      alert("Missing Stripe price ID.");
      return;
    }
    setIsStartingTrial(true);
    try {
      const origin = window.location.origin;
      console.log("➡️ Checkout flow: about to call billing endpoint / function");
      const { data, error } = await supabase.functions.invoke(
        "create-checkout-session",
        {
          body: {
            priceId: stripePriceId,
            successUrl: `${origin}/account?checkout=success`,
            cancelUrl: `${origin}/account?checkout=cancel`,
          },
        }
      );
      if (error) throw error;
      if (data?.code === "ALREADY_SUBSCRIBED") {
        setAlreadySubscribed({
          open: true,
          portalUrl: (data as any)?.portalUrl ?? null,
        });
        return;
      }
      if (data?.url) {
        window.location.href = data.url;
      } else {
        throw new Error("Checkout URL missing");
      }
    } catch (err) {
      console.error("Account: failed to start trial", err);
      alert("Unable to start trial. Please try again.");
    } finally {
      setIsStartingTrial(false);
    }
  }

  async function handleManageBilling() {
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
      console.error("Account: failed to open billing portal", err);
      alert("Unable to open billing portal. Please try again.");
    } finally {
      setIsManagingBilling(false);
    }
  }

  // Watch for email confirmation
  if (loading) {
    return (
      <div className="flex min-h-screen">
        <DashboardSidebar
          userTier={safeUserTier}
          onUpgrade={() => {}}
        />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="w-8 h-8 mx-auto mb-4 animate-spin text-button-green" />
            <p className="text-text-dark">Loading your profile…</p>
          </div>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex min-h-screen">
        <DashboardSidebar
          userTier={safeUserTier}
          onUpgrade={() => {}}
        />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center text-text-dark">
            <p>No profile found</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen">
      <DashboardSidebar
        userTier={safeUserTier}
        onUpgrade={() => (window.location.href = "/pricing")}
      />

      <div className="flex-1 p-8 max-w-4xl">
        <h1 className="font-fraunces text-4xl font-bold text-text-dark mb-8">
          My Account
        </h1>

        {/* Pending Email Change Banner */}
        {(user?.user_metadata?.email_change || (user as any)?.new_email) && (
          <div className="mb-6 bg-amber-50 border border-amber-200 rounded-design p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <h3 className="font-['Inter'] font-semibold text-amber-900 mb-1">
                  Your email change is pending.
                </h3>
                <p className="font-['Inter'] text-sm text-amber-800">
                  We've sent a confirmation link to:{" "}
                  <span className="font-medium">
                    {user?.user_metadata?.email_change || (user as any)?.new_email}
                  </span>
                </p>
                <p className="font-['Inter'] text-sm text-amber-700 mt-1">
                  Please check your inbox to complete the update.
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-6">
          {/* Profile Settings */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <User className="h-5 w-5 text-button-green" />
                <CardTitle className="font-fraunces text-2xl">Profile Settings</CardTitle>
              </div>
              <CardDescription>Update your personal information</CardDescription>
            </CardHeader>

            <CardContent className="space-y-6">
              {/* Name Field */}
              <div className="space-y-2">
                <label className="block text-sm font-medium mb-2">Name</label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={savingName}
                  placeholder={profile.name || "Your name"}
                />
                <div className="flex items-center gap-3">
                  <Button
                    disabled={savingName || name === profile.name || !name.trim()}
                    onClick={handleSaveName}
                    className="bg-button-green text-text-dark font-fraunces font-bold"
                  >
                    {savingName ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Saving…
                      </>
                    ) : (
                      "Save Name"
                    )}
                  </Button>
                  {nameMessage && (
                    <div className={`text-sm ${
                      nameMessage.includes("successfully") 
                        ? "text-green-600" 
                        : "text-red-600"
                    }`}>
                      {nameMessage}
                    </div>
                  )}
                </div>
              </div>

              <div className="border-t border-accent-grey pt-4">
                {/* Email Field */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium mb-2">Email</label>
                  {pendingEmail ? (
                    <div className="space-y-2">
                      <Input
                        type="email"
                        value={email}
                        disabled
                        className="bg-accent-grey/30"
                      />
                      <p className="text-xs text-foreground/60">
                        Pending confirmation: {pendingEmail}
                      </p>
                    </div>
                  ) : (
                    <Input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      disabled={updatingEmail}
                      placeholder={profile.email || "your@email.com"}
                    />
                  )}
                  <div className="flex items-center gap-3">
                    <Button
                      disabled={
                        updatingEmail ||
                        email === profile.email ||
                        !email.trim() ||
                        pendingEmail !== null
                      }
                      onClick={handleUpdateEmail}
                      className="bg-button-green text-text-dark font-fraunces font-bold"
                    >
                      {updatingEmail ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Updating…
                        </>
                      ) : (
                        "Update Email"
                      )}
                    </Button>
                    {emailMessage && (
                      <div className={`text-sm ${
                        emailMessage.includes("successfully") || emailMessage.includes("Check your inbox")
                          ? "text-green-600"
                          : "text-red-600"
                      }`}>
                        {emailMessage}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Subscription */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <CreditCard className="h-5 w-5 text-button-green" />
                <CardTitle className="font-fraunces text-2xl">Subscription</CardTitle>
              </div>
              <CardDescription>Manage your subscription and billing</CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-accent-grey/30 rounded-design">
                <div>
                  <div className="font-semibold text-text-dark">
                    {subscriptionTier === "pro" ? "Pro Plan" : "Free Plan"}
                  </div>
                  <div className="text-sm text-text-dark/60">
                    {subscriptionTier === "free"
                      ? "3 ICPs • Basic features"
                      : "Unlimited ICPs • Strategy tools • Meta Lookalike Export"}
                  </div>
                </div>

                {subscriptionTier === "free" && (
                  <Button
                    variant="outline"
                    onClick={handleStartTrial}
                    disabled={isStartingTrial}
                  >
                    {isStartingTrial ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Starting…
                      </>
                    ) : (
                      "Start free trial"
                    )}
                  </Button>
                )}
                {subscriptionTier === "pro" && (
                  <Button
                    variant="outline"
                    onClick={handleManageBilling}
                    disabled={isManagingBilling}
                  >
                    {isManagingBilling ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Opening…
                      </>
                    ) : (
                      "Manage billing"
                    )}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Notifications */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <Bell className="h-5 w-5 text-button-green" />
                <CardTitle className="font-fraunces text-2xl">Notifications</CardTitle>
              </div>
              <CardDescription>Configure your notification preferences</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium text-text-dark">Email Notifications</div>
                  <div className="text-sm text-text-dark/60">
                    Receive updates via email
                  </div>
                </div>
                <input type="checkbox" defaultChecked className="w-5 h-5" />
              </div>
            </CardContent>
          </Card>

          {/* Security */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <Shield className="h-5 w-5 text-button-green" />
                <CardTitle className="font-fraunces text-2xl">Security</CardTitle>
              </div>
              <CardDescription>Manage your account security settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Current Password</label>
                <Input type="password" placeholder="Enter current password" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">New Password</label>
                <Input type="password" placeholder="Enter new password" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Confirm New Password</label>
                <Input type="password" placeholder="Confirm new password" />
              </div>
              <Button className="bg-button-green text-text-dark font-fraunces font-bold">
                Update Password
              </Button>
            </CardContent>
          </Card>
        </div>
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
                      console.error("Account: portal session failed", err);
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
      </div>
    </div>
  );
}
