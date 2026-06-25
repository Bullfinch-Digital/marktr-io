import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { ArrowLeft, Home } from "lucide-react";
import { Button } from "../components/ui/button";
import { ProgressBar } from "../components/onboarding/ProgressBar";
import { ImageWithFallback } from "../components/figma/ImageWithFallback";
import { AlreadyCompletedPrompt } from "../components/AlreadyCompletedPrompt";
import { useICPs } from "../hooks/useICPs";
import useSubscription from "../hooks/useSubscription";
import { canCreateICP } from "../config/accessRules";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../config/supabase";
import { setLastGenerated } from "../lib/ai/generatedStore";
import { setGuestICPs } from "../lib/guestICP";
import { captureGuestLeadOnce, isTurnstileConfigured } from "../lib/leadCapture";
import { clearGuestBrandSeed, getGuestBrandSeed, setGuestBrandSeed } from "../lib/guestBrandSeed";
import {
  getGuestContext,
  getGuestIdentityEmail,
  getGuestIdentityName,
  isGuestLeadCaptured,
  updateGuestContext,
} from "../lib/guestContext";
import {
  WelcomeScreen,
  NameScreen,
  BrandNameScreen,
  BusinessDescriptionScreen,
  ProductOrServiceScreen,
  AssumedAudienceScreen,
  MarketingChannelsScreen,
  GeographyCurrencyScreen,
  EmailCaptureScreen,
  LoadingScreen
} from "../components/onboarding/screens";

type Step = 
  | "1_Welcome"
  | "2_Name"
  | "3_BrandName"
  | "4_BusinessDescription"
  | "5_ProductOrService"
  | "6_AssumedAudience"
  | "7_MarketingChannels"
  | "8_GeographyCurrency"
  | "9_EmailCapture"
  | "10_Loading";

const STEPS: Step[] = [
  "1_Welcome",
  "2_Name",
  "3_BrandName",
  "4_BusinessDescription",
  "5_ProductOrService",
  "6_AssumedAudience",
  "7_MarketingChannels",
  "8_GeographyCurrency",
  "9_EmailCapture",
  "10_Loading",
];

interface FormData {
  name: string;
  brandName: string;
  businessDescription: string;
  productOrService: string;
  businessType: "B2B" | "B2C" | "Both";
  assumedAudience: string[];
  customAudience: string;
  marketingChannels: string[];
  country: string;
  regionOrCity: string;
  currency: string;
  email: string;
}

export default function OnboardingBuild() {
  const navigate = useNavigate();
  const { icps, isLoading: icpsLoading } = useICPs();
  const { tier: userTier, effectiveTier, loading: subscriptionLoading } = useSubscription();
  const { user, loading: authLoading } = useAuth();
  const isLoggedIn = Boolean(user && !(user as { is_anonymous?: boolean }).is_anonymous);
  const anonInitRef = useRef(false);
  const [leadToken, setLeadToken] = useState<string | null>(null);
  const turnstileConfigured = isTurnstileConfigured();
  const [currentStep, setCurrentStep] = useState<Step>("1_Welcome");
  const [existingIcpRun, setExistingIcpRun] = useState<{ id: string; created_at: string } | null>(
    null
  );
  const [icpPromptDismissed, setIcpPromptDismissed] = useState(false);
  const hasRunRef = useRef(false);
  const hasPersistedRef = useRef(false);
  const unsavedPreviewRef = useRef(false);
  const [formData, setFormData] = useState<FormData>({
    name: "",
    brandName: "",
    businessDescription: "",
    productOrService: "",
    businessType: "B2C",
    assumedAudience: [],
    customAudience: "",
    marketingChannels: [],
    country: "",
    regionOrCity: "",
    currency: "GBP",
    email: "",
  });

  useEffect(() => {
    const ctx = getGuestContext();
    setFormData((prev) => ({
      ...prev,
      name: ctx.identity.name || prev.name,
      email: ctx.identity.email || prev.email,
      brandName: ctx.business.businessName || prev.brandName,
    }));
  }, []);

  const shouldSkipStep = useCallback(
    (step: Step): boolean => {
      const ctx = getGuestContext();
      if (step === "2_Name" && (ctx.identity.name?.trim() || formData.name.trim())) {
        return true;
      }
      if (step === "3_BrandName" && (ctx.business.businessName?.trim() || formData.brandName.trim())) {
        return true;
      }
      if (
        step === "9_EmailCapture" &&
        (isLoggedIn || ctx.identity.email?.trim() || formData.email.trim())
      ) {
        return true;
      }
      return false;
    },
    [formData.brandName, formData.email, formData.name, isLoggedIn]
  );

  const resolveStepIndex = useCallback(
    (fromIndex: number, direction: 1 | -1): number => {
      let index = fromIndex + direction;
      while (index >= 0 && index < STEPS.length) {
        const step = STEPS[index]!;
        if (direction === 1 && shouldSkipStep(step)) {
          index += direction;
          continue;
        }
        if (direction === -1 && shouldSkipStep(step)) {
          index += direction;
          continue;
        }
        break;
      }
      return Math.max(0, Math.min(STEPS.length - 1, index));
    },
    [shouldSkipStep]
  );

  useEffect(() => {
    if (anonInitRef.current) return;
    if (authLoading) return;
    if (user) return;
    anonInitRef.current = true;
    supabase.auth.signInAnonymously().catch((err) => {
      console.warn("[Onboarding] anonymous sign-in failed", err);
    });
  }, [authLoading, user]);

  useEffect(() => {
    if (!isLoggedIn || !user?.id) {
      setExistingIcpRun(null);
      return;
    }

    let cancelled = false;

    void supabase
      .from("icps")
      .select("id, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        if (!cancelled) {
          setExistingIcpRun(
            data?.id && data?.created_at
              ? { id: data.id, created_at: data.created_at }
              : null
          );
        }
      });

    return () => {
      cancelled = true;
    };
  }, [isLoggedIn, user?.id]);

  const captureLead = useCallback(
    async (email: string, token: string | null) => {
      const trimmed = email?.trim() || getGuestIdentityEmail();
      if (!trimmed) return;

      if (!isLoggedIn && !token && !isGuestLeadCaptured()) {
        return;
      }

      await captureGuestLeadOnce({
        email: trimmed,
        source: "onboarding",
        userId: user?.id ?? null,
        token: isLoggedIn ? null : token,
        name: formData.name.trim() || getGuestIdentityName() || null,
      });
    },
    [user?.id, formData.name, isLoggedIn]
  );

  const currentStepIndex = STEPS.indexOf(currentStep);
  const showBackButton = currentStepIndex > 1 && currentStep !== "10_Loading"; // Show back button after step 2, hide on ICP carousel
  const showProgressBar = currentStep !== "10_Loading";

  const emailToUse = isLoggedIn
    ? user?.email?.trim() ?? ""
    : formData.email.trim() || getGuestIdentityEmail() || "";

  const handleNext = () => {
    if (currentStep === "2_Name" && formData.name.trim()) {
      updateGuestContext({ identity: { name: formData.name.trim() } });
    }
    let nextIndex = resolveStepIndex(currentStepIndex, 1);
    if (nextIndex < STEPS.length) {
      const nextStep = STEPS[nextIndex]!;
      if (
        currentStep === "8_GeographyCurrency" &&
        nextStep === "10_Loading"
      ) {
        if (isLoggedIn || isGuestLeadCaptured() || leadToken) {
          void captureLead(emailToUse, isLoggedIn ? null : leadToken);
        }
      }
      setCurrentStep(nextStep);
    }
  };

  // Reset guard whenever we enter the loading step to ensure pipeline runs
  useEffect(() => {
    if (currentStep === "10_Loading") {
      hasRunRef.current = false;
      hasPersistedRef.current = false;
      unsavedPreviewRef.current = false;
      console.debug("[Onboarding] reset hasRunRef for Loading step");
    }
  }, [currentStep]);

  const handleBack = () => {
    const prevIndex = resolveStepIndex(currentStepIndex, -1);
    if (prevIndex >= 0) {
      setCurrentStep(STEPS[prevIndex]!);
    }
  };

  const handleLoadingComplete = () => {
    // Navigate to dedicated ICP Results page after loading
    navigate("/guest-dashboard", { state: { unsavedPreview: unsavedPreviewRef.current } });
  };

  // Only evaluate create limits once BOTH subscription + ICPs have finished loading.
  const canUserCreateAnotherICP = useMemo(() => {
    // If we don't yet know the tier, do not block/redirect.
    if (!userTier) return true;
    // If icps hasn't loaded yet, don't block/redirect.
    if (!icps) return true;
    return canCreateICP(icps.length, effectiveTier as any);
  }, [icps, userTier, effectiveTier]);

  useEffect(() => {
    // Only enforce ICP creation limits for logged-in users.
    if (!isLoggedIn) return;
    if (icpsLoading) return;
    if (subscriptionLoading) return;
    if (!icps) return;
    if (!userTier) return;

    if (!canUserCreateAnotherICP) {
      navigate("/dashboard?limit=icp", { replace: true });
    }
  }, [icps, userTier, navigate, icpsLoading, subscriptionLoading, canUserCreateAnotherICP, user?.id]);

  // Option 1: never block generation; only block saving when at limit.
  const atCreateLimit = useMemo(() => {
    if (!icps) return false;
    if (!userTier) return false;
    return !canCreateICP(icps.length, effectiveTier as any);
  }, [icps, userTier, effectiveTier]);

  /**
   * Ensure a brand exists for this authenticated onboarding run and return its id.
   * - Prefer an existing brand with the same name (exact match)
   * - Otherwise create a new brand from onboarding inputs
   * - Returns null if no authenticated user or no usable brandName
   */
  const ensureBrandForAuthenticatedOnboarding = useCallback(async (): Promise<string | null> => {
    if (!user?.id) return null;

    const desiredNameRaw =
      (formData.brandName || "").trim() ||
      getGuestContext().business.businessName?.trim() ||
      (getGuestBrandSeed()?.brandName || "").trim();

    if (!desiredNameRaw) return null;

    const desiredName = desiredNameRaw.trim();
    const now = new Date().toISOString();

    // 1) Prefer existing brand for this user with same name
    try {
      const { data: existing, error: existingErr } = await supabase
        .from("brands")
        .select("id, name")
        .eq("user_id", user.id)
        .eq("name", desiredName)
        .limit(1);

      if (!existingErr && existing && existing.length) {
        return existing[0].id;
      }
    } catch (err) {
      if (import.meta.env.DEV) console.warn("[Onboarding] brand lookup unexpected", err);
    }

    // 2) Create a new brand from onboarding inputs
    const row = {
      user_id: user.id,
      name: desiredName,
      color: null,
      website: null,
      business_description: (formData.businessDescription || "").trim() || null,
      product_or_service: formData.productOrService || null,
      business_type: formData.businessType || null,
      assumed_audience: [...(formData.assumedAudience || []), formData.customAudience]
        .filter(Boolean),
      marketing_channels: formData.marketingChannels || [],
      country: formData.country || null,
      region_or_city: formData.regionOrCity || null,
      currency: formData.currency || null,
      created_at: now,
      updated_at: now,
    };

    try {
      const { data, error } = await supabase
        .from("brands")
        .insert([row])
        .select("id")
        .single();

      if (error) {
        // If there is a constraint we haven't seen, fall back to "first brand for user"
        const isConflict =
          (error as any)?.code === "23505" ||
          (error as any)?.code === "409" ||
          (error as any)?.message?.toLowerCase?.().includes?.("duplicate");

        if (isConflict) {
          const { data: first, error: firstErr } = await supabase
            .from("brands")
            .select("id")
            .eq("user_id", user.id)
            .order("created_at", { ascending: true })
            .limit(1);
          if (!firstErr && first && first.length) return first[0].id;
        }

        if (import.meta.env.DEV) {
          console.warn("[Onboarding] brand insert error", {
            code: (error as any)?.code,
            message: (error as any)?.message,
            details: (error as any)?.details ?? (error as any)?.hint,
          });
        }
        return null;
      }

      try {
        window.dispatchEvent(new Event("brands:changed"));
      } catch {}

      return (data as any)?.id ?? null;
    } catch (err) {
      if (import.meta.env.DEV) console.warn("[Onboarding] brand insert unexpected", err);
      return null;
    } finally {
      // Seed is no longer needed once we have a persisted brand (prevents later bleed)
      clearGuestBrandSeed();
    }
  }, [user?.id, formData]);

  // Option B: run pipeline on Loading screen mount
  const runIcpGeneration = useCallback(async () => {
    // Guard against double-run (React StrictMode can mount/unmount in dev)
    if (hasRunRef.current) {
      console.warn("[Onboarding] runIcpGeneration blocked by hasRunRef guard");
      return;
    }
    hasRunRef.current = true;
    console.log("[Onboarding] runIcpGeneration start");
    console.debug("[Onboarding] importing pipeline…");

    const { generateICPs } = await import("../lib/ai/pipeline");
    console.debug("[Onboarding] calling generateICPs…");

    const businessDescriptionWithType = [
      formData.businessDescription?.trim(),
      `Business type: ${formData.businessType}`,
    ]
      .filter(Boolean)
      .join("\n\n");

    const result = await generateICPs({
      name: formData.name,
      brandName: formData.brandName,
      businessDescription: businessDescriptionWithType,
      productOrService: formData.productOrService,
      assumedAudience: [...formData.assumedAudience, formData.customAudience].filter(Boolean),
      marketingChannels: formData.marketingChannels,
      country: formData.country,
      regionOrCity: formData.regionOrCity,
      currency: formData.currency,
    });

    // Always store generated output for results page (legacy store)
    setLastGenerated(result.icps || []);
    // Also store for guest flow
    setGuestICPs(result.icps || []);
    // Store brand seed locally for post-signup brand creation
    setGuestBrandSeed({
      brandName: formData.brandName,
      // Use raw description for brand; keep business type separate
      businessDescription: formData.businessDescription?.trim() || "",
      productOrService: formData.productOrService,
      businessType: formData.businessType,
      assumedAudience: [...formData.assumedAudience, formData.customAudience].filter(Boolean),
      marketingChannels: formData.marketingChannels,
      country: formData.country,
      regionOrCity: formData.regionOrCity,
      currency: formData.currency,
      created_at: new Date().toISOString(),
    });
    updateGuestContext({
      identity: {
        name: formData.name.trim() || undefined,
        email: emailToUse || undefined,
      },
      business: {
        businessName: formData.brandName.trim() || undefined,
      },
    });

    // Only save if:
    // - not at limit
    // - icps + subscription have finished loading
    // - we actually have at least one icp
    const canSave =
      !atCreateLimit &&
      !icpsLoading &&
      !subscriptionLoading &&
      Array.isArray(result.icps) &&
      result.icps.length > 0;
    unsavedPreviewRef.current = !canSave;

    if (canSave) {
      const expectedCount = Array.isArray(result.icps) ? result.icps.length : 0;
      let insertedRows: Array<{ id: string; created_at: string; user_id: string; name: string }> = [];

      const canInsert =
        user?.id && Array.isArray(result.icps) && result.icps.length > 0;

      if (canInsert) {
        if (hasPersistedRef.current) {
          console.warn("[Onboarding] persistence already ran; skipping insert");
        } else {
          hasPersistedRef.current = true;

          // Ensure a brand exists for THIS onboarding run (authenticated users)
          // and use it to allocate the new ICPs.
          let resolvedBrandId: string | null = null;
          try {
            resolvedBrandId = await ensureBrandForAuthenticatedOnboarding();
          } catch (err) {
            if (import.meta.env.DEV) {
              console.warn("[Onboarding] ensureBrandForAuthenticatedOnboarding error", err);
            }
          }

          const now = new Date().toISOString();
          const rowsToInsert = result.icps.map((icp: any) => {
            const {
              id,
              _index,
              brandName,
              brands,
              ...rest
            } = icp || {};
            return {
              ...rest,
              // Persist avatar metadata when schema supports it.
              // If production is on an older schema, we fall back below.
              avatar_key: (icp as any)?.avatar_key ?? null,
              avatar_gender: (icp as any)?.avatar_gender ?? null,
              avatar_age_range: (icp as any)?.avatar_age_range ?? null,
              user_id: user.id,
              brand_id: (rest as any)?.brand_id ?? resolvedBrandId ?? null,
              name: (rest as any)?.name || "",
              description: (rest as any)?.description || "",
              created_at: now,
              updated_at: now,
            };
          });

        const stripAvatarColumns = (row: any) => {
          const { avatar_key, avatar_gender, avatar_age_range, ...base } = row || {};
          return base;
        };

        let batchError: any = null;
        let batchData: Array<{ id: string; created_at: string; user_id: string; name: string }> = [];
        let usedAvatarFallback = false;
        try {
          const { data, error } = await supabase
            .from("icps")
            .insert(rowsToInsert)
            .select("id, created_at, user_id, name");
          if (error) batchError = error;
          batchData = (data as any) || [];
        } catch (err) {
          batchError = err;
        }

        const avatarSchemaMismatch =
          !!batchError &&
          (String((batchError as any)?.code || "").toUpperCase() === "PGRST204" ||
            /avatar_(key|gender|age_range)|column/i.test(
              String((batchError as any)?.message || "") +
                " " +
                String((batchError as any)?.details || "")
            ));

        if (avatarSchemaMismatch) {
          usedAvatarFallback = true;
          batchError = null;
          batchData = [];
          try {
            const { data, error } = await supabase
              .from("icps")
              .insert(rowsToInsert.map(stripAvatarColumns))
              .select("id, created_at, user_id, name");
            if (error) batchError = error;
            batchData = (data as any) || [];
          } catch (err) {
            batchError = err;
          }
        }

        if (batchError) {
          console.error("[Onboarding] ICP batch insert error", {
            code: (batchError as any)?.code,
            message: (batchError as any)?.message,
            details: (batchError as any)?.details ?? (batchError as any)?.hint,
          });
        }

        insertedRows = batchData || [];
        const batchMismatch = insertedRows.length !== expectedCount;

        if (batchError || batchMismatch) {
          const insertedNames = new Set(
            insertedRows.map((row) => row?.name).filter((name) => typeof name === "string")
          );
          const rowsToRetryRaw = rowsToInsert.filter((row) => !insertedNames.has(row.name));
          const rowsToRetry = usedAvatarFallback
            ? rowsToRetryRaw.map(stripAvatarColumns)
            : rowsToRetryRaw;
          const retryResults = await Promise.allSettled(
            rowsToRetry.map((row) =>
              supabase
                .from("icps")
                .insert([row])
                .select("id, created_at, user_id, name")
                .single()
            )
          );

          retryResults.forEach((result, index) => {
            if (result.status === "fulfilled") {
              const { data, error } = result.value as any;
              if (error) {
                console.error("[Onboarding] ICP insert error", {
                  name: rowsToRetry[index]?.name,
                  code: error.code,
                  message: error.message,
                  details: error.details ?? error.hint,
                });
                return;
              }
              if (data) {
                insertedRows.push(data);
              }
              return;
            }
            console.error("[Onboarding] ICP insert exception", {
              name: rowsToRetry[index]?.name,
              error: result.reason,
            });
          });
        }

        const insertedCount = insertedRows.length;
        if (expectedCount !== insertedCount) {
          console.warn("[Onboarding] expected", expectedCount, "ICP inserts, got", insertedCount);
          if (expectedCount === 3) {
            console.warn("[Onboarding] expected 3 ICP inserts, got", insertedCount);
          }
        }

        if (import.meta.env.DEV) {
          console.log("[Onboarding] ICP insert summary", {
            generatedCount: expectedCount,
            insertedCount,
            insertedIds: insertedRows.map((row) => row?.id),
          });
        }

          if (insertedCount > 0) {
            try {
              window.dispatchEvent(new Event("icps:changed"));
            } catch {}
          }
        }
      }

      setLastGenerated(result.icps || []);
    } else {
      setLastGenerated(result.icps || []);
    }

    navigate("/guest-dashboard", { state: { unsavedPreview: unsavedPreviewRef.current } });
    console.log("[Onboarding] runIcpGeneration complete");
  }, [
    formData,
    atCreateLimit,
    icpsLoading,
    subscriptionLoading,
    user?.id,
    ensureBrandForAuthenticatedOnboarding,
    navigate
  ]);

  const renderScreen = () => {
    switch (currentStep) {
      case "1_Welcome":
        if (existingIcpRun && !icpPromptDismissed && isLoggedIn) {
          return (
            <AlreadyCompletedPrompt
              toolName="Know Your Customer"
              reportPath="/icp-report"
              createdAt={existingIcpRun.created_at}
              onRunAgain={() => setIcpPromptDismissed(true)}
            />
          );
        }
        return <WelcomeScreen onContinue={handleNext} />;
      
      case "2_Name":
        return (
          <NameScreen
            value={formData.name}
            onChange={(value) => setFormData({ ...formData, name: value })}
            onCommit={(value) => {
              updateGuestContext({ identity: { name: value || undefined } });
            }}
            onContinue={handleNext}
            onBack={handleBack}
          />
        );
      
      case "3_BrandName":
        return (
          <BrandNameScreen
            value={formData.brandName}
            onChange={(value) => {
              setFormData({ ...formData, brandName: value });
              updateGuestContext({ business: { businessName: value.trim() || undefined } });
            }}
            onContinue={handleNext}
            onBack={handleBack}
          />
        );
      
      case "4_BusinessDescription":
        return (
          <BusinessDescriptionScreen
            value={formData.businessDescription}
            onChange={(value) => setFormData({ ...formData, businessDescription: value })}
            onContinue={handleNext}
            onBack={handleBack}
          />
        );
      
      case "5_ProductOrService":
        return (
          <ProductOrServiceScreen
            value={formData.productOrService}
            onChange={(value) => setFormData({ ...formData, productOrService: value })}
            onContinue={handleNext}
            onBack={handleBack}
          />
        );
      
      case "6_AssumedAudience":
        return (
          <AssumedAudienceScreen
            value={formData.assumedAudience}
            customAudience={formData.customAudience}
            businessType={formData.businessType}
            onChange={(value) => setFormData({ ...formData, assumedAudience: value })}
            onCustomAudienceChange={(value) => setFormData({ ...formData, customAudience: value })}
            onBusinessTypeChange={(value) => setFormData({ ...formData, businessType: value })}
            onContinue={handleNext}
            onBack={handleBack}
          />
        );
      
      case "7_MarketingChannels":
        return (
          <MarketingChannelsScreen
            value={formData.marketingChannels}
            onChange={(value) => setFormData({ ...formData, marketingChannels: value })}
            onContinue={handleNext}
            onBack={handleBack}
          />
        );
      
      case "8_GeographyCurrency":
        return (
          <GeographyCurrencyScreen
            country={formData.country}
            regionOrCity={formData.regionOrCity}
            currency={formData.currency}
            onCountryChange={(country) => setFormData((prev) => ({ ...prev, country }))}
            onRegionOrCityChange={(regionOrCity) => setFormData((prev) => ({ ...prev, regionOrCity }))}
            onCurrencyChange={(currency) => setFormData((prev) => ({ ...prev, currency }))}
            onContinue={handleNext}
            onBack={handleBack}
          />
        );
      
      case "9_EmailCapture":
        return (
          <EmailCaptureScreen
            email={formData.email}
            onEmailChange={(value) => setFormData({ ...formData, email: value })}
            onEmailCommit={(value) => {
              updateGuestContext({ identity: { email: value || undefined } });
            }}
            onTokenChange={(token) => setLeadToken(token)}
            turnstileRequired={turnstileConfigured && !isLoggedIn}
            hasTurnstileToken={Boolean(leadToken)}
            hideEmailInput={isLoggedIn}
            onContinue={async () => {
              if (turnstileConfigured && !isLoggedIn && !leadToken) {
                console.warn("[LeadCapture] blocked: Turnstile token not ready yet");
                return;
              }
              const trimmedEmail = formData.email.trim();
              if (trimmedEmail) {
                updateGuestContext({ identity: { email: trimmedEmail } });
              }
              // reset guard each time we enter loading step
              hasRunRef.current = false;
              console.debug("[LeadCapture] continue", { email: emailToUse, leadToken });
              // Fire-and-forget (time-boxed) lead capture so UI is never blocked
              await Promise.race([
                captureLead(emailToUse, isLoggedIn ? null : leadToken),
                new Promise((resolve) => setTimeout(resolve, 8000)),
              ]);
              setCurrentStep("10_Loading");
            }}
            onBack={handleBack}
          />
        );
      
      case "10_Loading":
        // Loading screen owns the async generation now (Option B)
        // Reset guard right before mounting the loader to guarantee a fresh run
        hasRunRef.current = false;
        return <LoadingScreen run={runIcpGeneration} onComplete={handleLoadingComplete} />;
      
      default:
        return null;
    }
  };

  const getCTAText = () => {
    if (currentStep === "1_Welcome") return "Start";
    if (currentStep === "9_EmailCapture") return "Generate my ICPs";
    return "Continue";
  };

  const canContinue = () => {
    switch (currentStep) {
      case "1_Welcome":
        return true;
      case "2_Name":
        return formData.name.trim().length > 0 || Boolean(getGuestIdentityName());
      case "3_BrandName":
        return formData.brandName.trim().length > 0 || Boolean(getGuestContext().business.businessName?.trim());
      case "4_BusinessDescription":
        return formData.businessDescription.trim().length > 0;
      case "5_ProductOrService":
        return formData.productOrService.trim().length > 0;
      case "6_AssumedAudience":
        return formData.assumedAudience.length > 0 || formData.customAudience.trim().length > 0;
      case "7_MarketingChannels":
        return formData.marketingChannels.length > 0;
      case "8_GeographyCurrency":
        return formData.country.trim().length > 0 && formData.currency.trim().length > 0;
      case "9_EmailCapture": {
        if (isLoggedIn) return Boolean(user?.email?.trim());
        if (getGuestIdentityEmail()) return true;
        const emailOk = formData.email.trim().length > 0 && formData.email.includes("@");
        if (!emailOk) return false;
        if (turnstileConfigured && !leadToken) return false;
        return true;
      }
      case "10_Loading":
        return false;
      default:
        return true;
    }
  };

  const handleCtaClick = async () => {
    if (currentStep === "9_EmailCapture") {
      if (turnstileConfigured && !isLoggedIn && !leadToken) {
        console.warn("[LeadCapture] blocked CTA: Turnstile token not ready yet");
        return;
      }
      const trimmedEmail = formData.email.trim();
      if (trimmedEmail) {
        updateGuestContext({ identity: { email: trimmedEmail } });
      }
      hasRunRef.current = false;
      console.debug("[LeadCapture] CTA", { email: emailToUse, leadToken });
      // Fire-and-forget (time-boxed) lead capture so UI is never blocked
      await Promise.race([
        captureLead(emailToUse, isLoggedIn ? null : leadToken),
        new Promise((resolve) => setTimeout(resolve, 8000)),
      ]);
      setCurrentStep("10_Loading");
      return;
    }
    handleNext();
  };

  // Screen backgrounds and illustrations
  const SCREEN_STYLES: Record<Step, { bgColor: string; illustration: string }> = {
    "1_Welcome": {
      bgColor: "bg-purple/20",
      illustration: "/images/onboarding/onboarding-01.png"
    },
    "2_Name": {
      bgColor: "bg-pink/20",
      illustration: "/images/onboarding/onboarding-02.png"
    },
    "3_BrandName": {
      bgColor: "bg-orange/20",
      illustration: "/images/onboarding/onboarding-03.png"
    },
    "4_BusinessDescription": {
      bgColor: "bg-yellow/20",
      illustration: "/images/onboarding/onboarding-04.png"
    },
    "5_ProductOrService": {
      bgColor: "bg-green/20",
      illustration: "/images/onboarding/onboarding-05.png"
    },
    "6_AssumedAudience": {
      bgColor: "bg-purple/20",
      illustration: "/images/onboarding/onboarding-06.png"
    },
    "7_MarketingChannels": {
      bgColor: "bg-pink/20",
      illustration: "/images/onboarding/onboarding-07.png"
    },
    "8_GeographyCurrency": {
      bgColor: "bg-orange/20",
      illustration: "/images/onboarding/onboarding-08.png"
    },
    "9_EmailCapture": {
      bgColor: "bg-green/20",
      illustration: "/images/onboarding/onboarding-09.png"
    },
    "10_Loading": {
      bgColor: "bg-button-green/20",
      illustration: ""
    }
  };

  return (
    <main className="min-h-screen bg-background flex">
      {/* Full-width layout for ICP Carousel */}
      {currentStep === "10_Loading" ? (
        <div className="w-full">
          {renderScreen()}
        </div>
      ) : (
        <>
          {/* Left Column - White Background */}
          <div className="w-full lg:w-1/2 bg-background flex flex-col">
            <div className="flex-1 flex flex-col px-6 sm:px-12 lg:px-16 py-8">
              {/* Homepage Link - Above Progress Bar */}
              <div className="mb-6">
                <Link
                  to="/"
                  className="inline-flex items-center gap-2 font-['Inter'] text-sm text-foreground/70 hover:text-foreground transition-colors"
                >
                  <Home className="w-4 h-4" />
                  Go back to homepage
                </Link>
              </div>

              {/* Progress Bar - Top */}
              {showProgressBar && (
                <div className="mb-8 animate-fade-in-up">
                  <ProgressBar current={currentStepIndex + 1} total={STEPS.length} />
                </div>
              )}

              {/* Back Button */}
              {showBackButton && (
                <button
                  onClick={handleBack}
                  className="flex items-center gap-2 text-foreground/70 hover:text-foreground transition-colors mb-8 group"
                >
                  <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
                  <span>Back</span>
                </button>
              )}

              {/* Screen Content */}
              <div className="flex-1 flex flex-col justify-start pt-8 max-w-xl">
                {renderScreen()}
                
                {/* CTA Button */}
                {currentStep !== "1_Welcome" && (
                  <div className="mt-8 animate-fade-in-up delay-300">
                    <Button
                      onClick={handleCtaClick}
                      disabled={!canContinue()}
                      className="bg-button-green text-text-dark hover:bg-button-green/90 border-[1px] border-black rounded-design px-8 py-6 transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 font-['Fraunces']"
                    >
                      {getCTAText()}
                    </Button>
                    {currentStep === "9_EmailCapture" && !isLoggedIn && (
                      <div className="mt-2 space-y-1">
                        <p className="text-xs text-foreground/60 font-['Inter']">
                          No spam. Just your ICP and access to your dashboard.
                        </p>
                        {turnstileConfigured && !leadToken && (
                          <p className="text-xs text-foreground/80 font-['Inter']">
                            Complete the verification box above, then continue.
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Welcome Screen Button */}
                {currentStep === "1_Welcome" && !(existingIcpRun && !icpPromptDismissed && isLoggedIn) && (
                  <div className="mt-8 animate-fade-in-up delay-300">
                    <Button
                      onClick={handleNext}
                      className="bg-button-green text-text-dark hover:bg-button-green/90 border-[1px] border-black rounded-design px-8 py-6 transition-all hover:scale-105 active:scale-95 font-['Fraunces']"
                    >
                      Start
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Column - Colored Background with Illustration */}
          <div className={`hidden lg:flex lg:w-1/2 ${SCREEN_STYLES[currentStep].bgColor} items-center justify-center p-16`}>
            {SCREEN_STYLES[currentStep].illustration && (
              <div className="relative w-full max-w-lg aspect-square animate-fade-in-up delay-200">
                <ImageWithFallback
                  src={SCREEN_STYLES[currentStep].illustration}
                  alt="Illustration"
                  className="w-full h-full object-cover rounded-[20px] shadow-lg animate-float"
                />
              </div>
            )}
          </div>
        </>
      )}
    </main>
  );
}
