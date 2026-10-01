import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { VoiceInput } from "../components/ui/VoiceInput";
import { AlreadyCompletedPrompt } from "../components/AlreadyCompletedPrompt";
import { useAuth } from "../contexts/AuthContext";
import { useBrand } from "../contexts/BrandContext";
import { supabase } from "../config/supabase";
import type { SocialScores, StoryAssessment } from "../lib/healthCheckScoring";
import {
  parseApiFindings,
  augmentFindingsWithPriorRun,
  applyFindingsToWebsiteScore,
  type HealthCheckWebsiteScore,
} from "../lib/healthCheckFindings";
import { calculateScores } from "../lib/healthCheckScoring";
import { parseScoreWebsiteResponse } from "../lib/healthCheck";
import { extractDomain } from "../components/healthCheck/HealthCheckReportView";
import { formatFacebookInput, normaliseFacebookUrl } from "../lib/normaliseFacebookUrl";
import { IdentityCapture, type IdentityCaptureHandle } from "../components/guest/IdentityCapture";
import { ScanTurnstile, type ScanTurnstileHandle } from "../components/healthCheck/ScanTurnstile";
import { LegalAgreementRequiredModal } from "../components/legal/LegalAgreementRequiredModal";
import { useLegalAgreementGate } from "../hooks/useLegalAgreementGate";
import {
  getGuestContext,
  getGuestIdentityEmail,
  getGuestIdentityName,
  hasGuestIdentity,
  isGuestLeadCaptured,
  suggestBusinessNameFromUrl,
  updateGuestContext,
} from "../lib/guestContext";
import { captureGuestLeadOnce, isTurnstileConfigured } from "../lib/leadCapture";
import { resolveScopedBrandId } from "../lib/brandScopedReads";
import { fetchLatestHealthCheck, resolveBrandIdForHealthWrite } from "../lib/healthCheckPersistence";
import { buildPriorRunPayload } from "../lib/healthCheckPriorRun";
import { fetchBrandStoryPillarForHealth } from "../lib/healthCheckPillarContext";
import { useEdition } from "../contexts/EditionContext";
import { getStoredUtms } from "../lib/utmCapture";
import { useEditionDocumentMeta } from "../hooks/useEditionDocumentMeta";

type Step = "welcome" | "inputs" | "loading";

export interface HealthCheckFormData {
  businessName: string;
  websiteUrl: string;
  instagramHandle: string;
  facebookUrl: string;
  email: string;
}

const CHECKLIST_ITEMS = [
  "Checking your website",
  "Reading your content",
  "Analysing social presence",
  "Scoring audience alignment",
  "Generating your report",
] as const;

const ANALYSIS_MESSAGES = [
  "Comparing your positioning against industry benchmarks...",
  "Identifying your biggest growth opportunities...",
  "Building your personalised recommendations...",
  "Almost there — preparing your report...",
] as const;

const SCAN_RETRY_MESSAGE = "We couldn't complete the scan. Please try again.";
const SCAN_VERIFY_MESSAGE = "Verification failed. Complete the check and try again.";
const SCAN_URL_MESSAGE = "Add a website URL so we can score your presence.";

function describeScoreWebsiteFailure(
  error: unknown,
  data: { error?: unknown } | null | undefined,
): string {
  const status = (error as { context?: Response })?.context?.status;
  if (status === 403) return SCAN_VERIFY_MESSAGE;
  const fromData = typeof data?.error === "string" ? data.error.trim() : "";
  if (fromData.toLowerCase().includes("turnstile")) return SCAN_VERIFY_MESSAGE;
  return SCAN_RETRY_MESSAGE;
}

function AnalysisMessage({ messages }: { messages: readonly string[] }) {
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setIndex((prev) => (prev + 1) % messages.length);
        setVisible(true);
      }, 300);
    }, 2000);
    return () => clearInterval(interval);
  }, [messages.length]);

  return (
    <p
      className="max-w-xs text-center font-body text-sm leading-relaxed text-muted-foreground transition-opacity duration-300"
      style={{ opacity: visible ? 1 : 0 }}
    >
      {messages[index]}
    </p>
  );
}

export default function HealthCheck() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { edition, config } = useEdition();
  useEditionDocumentMeta("healthCheck");
  const { activeBrandId, loading: brandLoading, brands } = useBrand();
  const isLoggedIn = Boolean(user && !(user as { is_anonymous?: boolean }).is_anonymous);
  const [step, setStep] = useState<Step>("welcome");
  const [existingRun, setExistingRun] = useState<{ id: string; created_at: string } | null>(
    null
  );
  const [rerunPromptDismissed, setRerunPromptDismissed] = useState(false);
  const [completedCount, setCompletedCount] = useState(0);
  const [checklistDone, setChecklistDone] = useState(false);

  const [formData, setFormData] = useState<HealthCheckFormData>({
    businessName: "",
    websiteUrl: "",
    instagramHandle: "",
    facebookUrl: "",
    email: "",
  });
  const [identityName, setIdentityName] = useState("");
  const [businessNameTouched, setBusinessNameTouched] = useState(false);
  const [leadToken, setLeadToken] = useState<string | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);
  const [preparingScan, setPreparingScan] = useState(false);
  const [awaitingTurnstile, setAwaitingTurnstile] = useState(false);
  const [identityFieldsSnapshot] = useState(() => ({
    showName: !getGuestIdentityName(),
    showEmail: !getGuestIdentityEmail(),
  }));
  const identityCaptureRef = useRef<IdentityCaptureHandle>(null);
  const scanTurnstileRef = useRef<ScanTurnstileHandle>(null);
  const awaitingTurnstileRef = useRef(false);
  const { open: legalModalOpen, gate, closeModal, confirmAgreement } = useLegalAgreementGate();
  /** Input fingerprint for the last successful score-website run (not cleared on loading re-entry). */
  const completedScoreKeyRef = useRef<string | null>(null);
  const scoreInFlightKeyRef = useRef<string | null>(null);
  const lastResultsNavigateStateRef = useRef<{
    formData: HealthCheckFormData;
    facebookUrl: string;
    email: string;
    websiteScore: (HealthCheckWebsiteScore & {
      storyAssessment?: StoryAssessment | null;
      socialScores?: SocialScores | null;
    }) | null;
  } | null>(null);
  const turnstileConfigured = isTurnstileConfigured();
  const editionRef = useRef(edition);
  /** Fresh scan-time Turnstile token for score-website — never the identity/lead-capture token. */
  const scanTurnstileTokenRef = useRef<string | null>(null);
  editionRef.current = edition;

  useEffect(() => {
    const ctx = getGuestContext();
    setFormData((prev) => ({
      ...prev,
      businessName: ctx.business.businessName || prev.businessName,
      websiteUrl: ctx.business.websiteUrl || prev.websiteUrl,
      instagramHandle: ctx.business.instagramHandle || prev.instagramHandle,
      facebookUrl: ctx.business.facebookUrl || prev.facebookUrl,
      email: ctx.identity.email || prev.email,
    }));
    setIdentityName(ctx.identity.name || "");
    if (ctx.business.businessName?.trim()) {
      setBusinessNameTouched(true);
    }
  }, []);

  useEffect(() => {
    if (businessNameTouched || formData.businessName.trim()) return;
    const suggested = suggestBusinessNameFromUrl(formData.websiteUrl);
    if (!suggested) return;
    setFormData((prev) => ({ ...prev, businessName: suggested }));
    updateGuestContext({ business: { businessName: suggested } });
  }, [formData.websiteUrl, formData.businessName, businessNameTouched]);

  const resolvedGuestEmail = formData.email.trim() || getGuestIdentityEmail() || "";
  const resolvedGuestName = identityName.trim() || getGuestIdentityName() || "";
  const showIdentityName = !isLoggedIn && identityFieldsSnapshot.showName;
  const showIdentityEmail = !isLoggedIn && identityFieldsSnapshot.showEmail;

  const runGuestIdentityAndProceed = async () => {
    if (preparingScan || awaitingTurnstileRef.current) return;
    setScanError(null);

    const identityVisible =
      !isLoggedIn &&
      config.captureTiming === "before-scan" &&
      (showIdentityName || showIdentityEmail);
    const draft = identityCaptureRef.current?.getDraft();
    const committed = identityVisible ? identityCaptureRef.current?.commitAll() : undefined;
    const nameForRun =
      committed?.name ||
      draft?.name ||
      identityName.trim() ||
      getGuestIdentityName() ||
      "";
    const emailForRun =
      committed?.email ||
      draft?.email ||
      formData.email.trim() ||
      getGuestIdentityEmail() ||
      "";

    const isBullfinch = edition === "bullfinch";
    const needsScanTurnstile = isBullfinch && turnstileConfigured;

    if (!isLoggedIn && config.captureTiming === "before-scan") {
      if (!nameForRun.length || !emailForRun.length) return;
      // Bullfinch scan uses ScanTurnstile, not the identity widget token.
      if (!isBullfinch) {
        const needsTurnstile =
          showIdentityEmail && turnstileConfigured && !isGuestLeadCaptured();
        if (needsTurnstile && !leadToken) return;
      }

      updateGuestContext({
        identity: {
          name: nameForRun,
          email: emailForRun,
        },
      });
      setIdentityName(nameForRun);
      setFormData((prev) => ({ ...prev, email: emailForRun }));
    } else if (config.captureTiming === "before-scan" && !user?.email?.trim()) {
      return;
    }

    const emailForCapture = isLoggedIn ? user?.email ?? "" : emailForRun;
    const nameForCapture = isLoggedIn ? nameForRun || resolvedGuestName : nameForRun;

    let scoreToken: string | null = null;
    if (needsScanTurnstile) {
      awaitingTurnstileRef.current = true;
      setAwaitingTurnstile(true);
      try {
        scoreToken = (await scanTurnstileRef.current?.waitForToken(10_000)) ?? null;
      } finally {
        awaitingTurnstileRef.current = false;
        setAwaitingTurnstile(false);
      }
      if (!scoreToken) {
        setScanError(SCAN_VERIFY_MESSAGE);
        return;
      }
    }

    setPreparingScan(true);
    try {
      // IdentityCapture.commitAll already captures when identity is shown.
      // Only capture here when identity is skipped (returning guest) and not yet captured.
      if (
        !isLoggedIn &&
        config.captureTiming === "before-scan" &&
        !identityVisible &&
        !isGuestLeadCaptured()
      ) {
        if (needsScanTurnstile) {
          const captureToken = (await scanTurnstileRef.current?.refreshToken()) ?? null;
          if (!captureToken) {
            setScanError(SCAN_VERIFY_MESSAGE);
            return;
          }
          await captureGuestLeadOnce({
            email: emailForCapture,
            name: nameForCapture,
            token: captureToken,
            source: "health-check",
          });
        } else {
          void captureGuestLeadOnce({
            email: emailForCapture,
            name: nameForCapture,
            token: leadToken,
            source: "health-check",
          });
        }
      }

      scanTurnstileTokenRef.current = scoreToken;

      setCompletedCount(0);
      setChecklistDone(false);
      setStep("loading");
    } finally {
      setPreparingScan(false);
    }
  };

  const flushGuestIdentityAndProceed = () => {
    if (!isLoggedIn && showIdentityEmail && config.captureTiming === "before-scan") {
      gate(identityCaptureRef.current?.isLegalAgreed() ?? false, runGuestIdentityAndProceed);
      return;
    }
    runGuestIdentityAndProceed();
  };

  const canAnalyse = useMemo(() => {
    if (edition === "bullfinch") {
      if (!turnstileConfigured) return false;
      return true;
    }
    if (isLoggedIn) return Boolean(user?.email?.trim());
    // Don't gate on React email/name state — browser autofill often fills the DOM
    // without firing onChange until the first click. Validate in the click handler
    // via IdentityCapture.getDraft() / commitAll() instead.
    const needsTurnstile =
      showIdentityEmail && turnstileConfigured && !isGuestLeadCaptured();
    if (needsTurnstile && !leadToken) return false;
    return true;
  }, [
    edition,
    isLoggedIn,
    user?.email,
    showIdentityEmail,
    turnstileConfigured,
    leadToken,
  ]);

  useEffect(() => {
    if (!isLoggedIn || !user?.id) {
      setExistingRun(null);
      return;
    }

    let cancelled = false;

    void (async () => {
      const contextBrandId = resolveScopedBrandId(activeBrandId, brands);
      const { brandId } = await resolveBrandIdForHealthWrite(
        user.id,
        contextBrandId,
        brands
      );

      if (cancelled || !brandId) {
        if (!cancelled && !brandId) {
          setExistingRun(null);
        }
        return;
      }

      const row = await fetchLatestHealthCheck(user.id, brandId);
      if (!cancelled) {
        setExistingRun(
          row?.id && row.created_at
            ? { id: row.id, created_at: row.created_at }
            : null
        );
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isLoggedIn, user?.id, activeBrandId, brandLoading, brands]);

  useEffect(() => {
    if (step !== "loading") {
      setChecklistDone(false);
      return;
    }

    let cancelled = false;
    const timers: number[] = [];
    const run = async () => {
      for (let i = 1; i <= CHECKLIST_ITEMS.length; i += 1) {
        timers.push(
          window.setTimeout(() => {
            if (!cancelled) setCompletedCount(i);
          }, i * 300)
        );
      }

      timers.push(
        window.setTimeout(() => {
          if (!cancelled) setChecklistDone(true);
        }, CHECKLIST_ITEMS.length * 300 + 200)
      );

      let websiteScore: HealthCheckWebsiteScore & {
        storyAssessment?: StoryAssessment | null;
        socialScores?: SocialScores | null;
      } | null = null;
      let publicToken = "";

      const facebookUrl = normaliseFacebookUrl(formData.facebookUrl);
      const emailToUse = isLoggedIn ? user?.email ?? "" : resolvedGuestEmail;
      const scoreInputKey = JSON.stringify({
        businessName: formData.businessName.trim(),
        websiteUrl: formData.websiteUrl.trim(),
        instagramHandle: formData.instagramHandle.trim(),
        facebookUrl: facebookUrl || "",
        email: emailToUse,
        name: resolvedGuestName,
      });

      let scanFailureMessage: string | null = null;

      const apiPromise = (async () => {
        if (!formData.websiteUrl?.trim()) {
          scanFailureMessage = SCAN_URL_MESSAGE;
          return;
        }

        if (completedScoreKeyRef.current === scoreInputKey && lastResultsNavigateStateRef.current) {
          websiteScore = lastResultsNavigateStateRef.current.websiteScore;
          return;
        }
        if (scoreInFlightKeyRef.current === scoreInputKey) {
          return;
        }

        scoreInFlightKeyRef.current = scoreInputKey;
        try {
          let priorRun = undefined;
          let pillarContext: { brandStory: Awaited<ReturnType<typeof fetchBrandStoryPillarForHealth>> } | undefined;
          if (isLoggedIn && user?.id) {
            const scopedBrandId = resolveScopedBrandId(activeBrandId, brands);
            const { brandId } = await resolveBrandIdForHealthWrite(
              user.id,
              scopedBrandId,
              brands
            );
            if (brandId) {
              const [priorRow, brandStoryPillar] = await Promise.all([
                fetchLatestHealthCheck(user.id, brandId),
                fetchBrandStoryPillarForHealth(user.id, brandId),
              ]);
              priorRun = buildPriorRunPayload(priorRow);
              if (brandStoryPillar) {
                pillarContext = { brandStory: brandStoryPillar };
              }
            }
          }

          const { data, error: invokeError } = await supabase.functions.invoke("score-website", {
            body: {
              websiteUrl: formData.websiteUrl.trim(),
              instagramHandle: formData.instagramHandle?.trim() || undefined,
              facebookUrl: facebookUrl || undefined,
              edition: editionRef.current,
              turnstileToken: scanTurnstileTokenRef.current,
              utm: getStoredUtms(),
              ...(priorRun ? { priorRun } : {}),
              ...(pillarContext ? { pillarContext } : {}),
            },
          });
          const payload = data as {
            error?: unknown;
            facts?: unknown;
            findings?: unknown;
            report?: { publicToken?: string };
          } | null;
          if (invokeError || payload?.error || payload?.facts === undefined) {
            scanFailureMessage = describeScoreWebsiteFailure(invokeError, payload);
            return;
          }
          publicToken =
            typeof payload.report?.publicToken === "string"
              ? payload.report.publicToken.trim()
              : "";
          const parsed = parseScoreWebsiteResponse(data, {
            websiteUrl: formData.websiteUrl.trim(),
            instagramHandle: formData.instagramHandle?.trim() || "",
            facebookUrl: facebookUrl || "",
            domain: extractDomain(formData.websiteUrl.trim()),
          });
          const baseWebsiteScore = {
            score: parsed.deterministic.scores.websiteClarity,
            observation: parsed.observation,
            strengths: parsed.strengths,
            gaps: parsed.gaps,
            storyAssessment: null,
            socialScores: null,
            findings: parseApiFindings(data.findings),
            deterministic: parsed.deterministic,
          };

          const scoresPreview = calculateScores({
            websiteUrl: formData.websiteUrl.trim(),
            instagramHandle: formData.instagramHandle?.trim(),
            facebookUrl: facebookUrl || "",
            businessName: formData.businessName.trim(),
            email: emailToUse,
            websiteScore: baseWebsiteScore,
          });

          websiteScore = {
            ...applyFindingsToWebsiteScore(
              baseWebsiteScore as HealthCheckWebsiteScore,
              augmentFindingsWithPriorRun(baseWebsiteScore.findings, priorRun, scoresPreview)
            ),
            storyAssessment: null,
            socialScores: null,
          };
          completedScoreKeyRef.current = scoreInputKey;
          lastResultsNavigateStateRef.current = {
            formData,
            facebookUrl,
            email: emailToUse,
            websiteScore,
          };
        } catch {
          scanFailureMessage = SCAN_RETRY_MESSAGE;
        } finally {
          if (scoreInFlightKeyRef.current === scoreInputKey) {
            scoreInFlightKeyRef.current = null;
          }
        }
      })();

      const checklistMinPromise = new Promise<void>((resolve) => {
        timers.push(
          window.setTimeout(() => resolve(), CHECKLIST_ITEMS.length * 300 + 500)
        );
      });

      await Promise.all([apiPromise, checklistMinPromise]);

      if (cancelled) return;

      if (!websiteScore) {
        setScanError(scanFailureMessage ?? SCAN_RETRY_MESSAGE);
        setStep("inputs");
        return;
      }

      if (editionRef.current === "bullfinch") {
        if (!publicToken) {
          setScanError(SCAN_RETRY_MESSAGE);
          setStep("inputs");
          return;
        }
        navigate(`/r/${encodeURIComponent(publicToken)}${window.location.search}`, {
          replace: true,
        });
        return;
      }

      updateGuestContext({
        identity: {
          name: resolvedGuestName,
          email: emailToUse,
        },
        business: {
          businessName: formData.businessName.trim() || undefined,
          websiteUrl: formData.websiteUrl.trim() || undefined,
          instagramHandle: formData.instagramHandle.trim() || undefined,
          facebookUrl: facebookUrl || undefined,
        },
      });
      navigate("/health-check/results", {
        state: {
          ...formData,
          facebookUrl,
          email: emailToUse,
          websiteScore,
        },
      });
    };

    void run();

    return () => {
      cancelled = true;
      timers.forEach((t) => window.clearTimeout(t));
    };
  }, [step, formData, navigate, isLoggedIn, user?.email, user?.id, resolvedGuestEmail, resolvedGuestName, activeBrandId, brands]);

  const renderWelcome = () => (
    <section className="mx-auto flex min-h-screen w-full max-w-3xl flex-col justify-center px-6 py-12">
      {config.showBackToHome ? (
      <div className="mb-8">
        <Link
          to="/"
          className="inline-flex items-center gap-2 font-body text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to home
        </Link>
      </div>
      ) : null}

      {existingRun && !rerunPromptDismissed && edition === "marktr" ? (
        <AlreadyCompletedPrompt
          toolName="Digital Health Check"
          reportPath="/health-report"
          createdAt={existingRun.created_at}
          onRunAgain={() => setRerunPromptDismissed(true)}
        />
      ) : (
        <div className="rounded-3xl border border-border bg-white p-8 shadow-sm sm:p-12">
          {config.start.eyebrow ? (
            <p className="font-body text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
              {config.start.eyebrow}
            </p>
          ) : null}
          <h1 className="font-display text-4xl font-bold leading-tight text-[#0D1833] sm:text-5xl">
            {config.start.h1}
          </h1>
          <p className="mt-5 max-w-2xl font-body text-base leading-relaxed text-muted-foreground sm:text-lg">
            {config.start.lede}
          </p>
          {config.start.points?.length ? (
            <ul className="mt-6 space-y-2">
              {config.start.points.map((point) => (
                <li key={point} className="font-body text-sm text-foreground">
                  {point}
                </li>
              ))}
            </ul>
          ) : null}

          <Button
            onClick={() => setStep("inputs")}
            className="mt-10 rounded-full bg-primary px-8 py-6 font-body text-base font-medium text-primary-foreground hover:opacity-90"
          >
            {config.start.button}
          </Button>

          {edition === "marktr" ? (
          <p className="mt-4 font-body text-sm text-muted-foreground">
            {isLoggedIn ? "Takes about 2 minutes." : "Takes about 2 minutes. No account needed."}
          </p>
          ) : null}
        </div>
      )}
    </section>
  );

  const renderInputs = () => (
    <section className="mx-auto flex min-h-screen w-full max-w-3xl flex-col justify-center px-6 py-12">
      <div className="rounded-3xl border border-border bg-white p-8 shadow-sm sm:p-12">
        <div className="mb-8">
          {config.showBackToHome ? (
          <Link
            to="/"
            className="inline-flex items-center gap-2 font-body text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to home
          </Link>
          ) : null}
        </div>
        <h1 className="font-display text-4xl font-bold leading-tight text-[#0D1833] sm:text-5xl">
          Where can we find you online?
        </h1>
        <p className="mt-5 max-w-2xl font-body text-base leading-relaxed text-muted-foreground sm:text-lg">
          Share what you have — even one URL gives us useful data.
        </p>

        <div className="mt-8 space-y-6">
          <div className="space-y-2">
            <Label htmlFor="businessName" className="font-body text-sm text-[#0D1833]">
              Business name
            </Label>
            <Input
              id="businessName"
              type="text"
              value={formData.businessName}
              onChange={(e) => {
                const value = e.target.value;
                setBusinessNameTouched(true);
                setFormData((prev) => ({ ...prev, businessName: value }));
                updateGuestContext({ business: { businessName: value.trim() || undefined } });
              }}
              placeholder="Your business name"
              className="border border-black rounded-design bg-white px-4 py-6 text-foreground placeholder:text-foreground/40"
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="websiteUrl" className="font-body text-sm text-[#0D1833]">
                Website URL
              </Label>
              <span className="font-body text-xs text-muted-foreground">optional</span>
            </div>
            <div className="flex items-start gap-2">
              <VoiceInput
                id="websiteUrl"
                type="url"
                value={formData.websiteUrl}
                onChange={(e) => {
                  const websiteUrl = e.target.value;
                  setFormData((prev) => ({ ...prev, websiteUrl }));
                  updateGuestContext({ business: { websiteUrl: websiteUrl.trim() || undefined } });
                }}
                onTranscript={(trimmed) => {
                  setFormData((prev) => {
                    const websiteUrl = prev.websiteUrl.trim()
                      ? `${prev.websiteUrl.trim()} ${trimmed}`
                      : trimmed;
                    updateGuestContext({ business: { websiteUrl: websiteUrl.trim() || undefined } });
                    return { ...prev, websiteUrl };
                  });
                }}
                placeholder="https://yourbusiness.com"
                className="border border-black rounded-design bg-white px-4 py-6 text-foreground placeholder:text-foreground/40"
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="instagramHandle" className="font-body text-sm text-[#0D1833]">
                Instagram handle
              </Label>
              <span className="font-body text-xs text-muted-foreground">optional</span>
            </div>
            <div className="flex items-start gap-2">
              <VoiceInput
                id="instagramHandle"
                type="text"
                value={formData.instagramHandle}
                onChange={(e) => {
                  let val = e.target.value;
                  if (val.length > 0 && !val.startsWith("@") && !val.startsWith("http")) {
                    val = "@" + val;
                  }
                  setFormData((prev) => ({
                    ...prev,
                    instagramHandle: val,
                  }));
                  updateGuestContext({ business: { instagramHandle: val.trim() || undefined } });
                }}
                onTranscript={(trimmed) => {
                  setFormData((prev) => {
                    let val = prev.instagramHandle.trim()
                      ? `${prev.instagramHandle.trim()} ${trimmed}`
                      : trimmed;
                    if (val.length > 0 && !val.startsWith("@") && !val.startsWith("http")) {
                      val = "@" + val;
                    }
                    updateGuestContext({ business: { instagramHandle: val.trim() || undefined } });
                    return { ...prev, instagramHandle: val };
                  });
                }}
                placeholder={config.placeholders.instagramHandle}
                className="border border-black rounded-design bg-white px-4 py-6 text-foreground placeholder:text-foreground/40"
              />
            </div>
            <p className="font-body text-xs text-muted-foreground">Public profile only</p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="facebookUrl" className="font-body text-sm text-[#0D1833]">
                Facebook page URL
              </Label>
              <span className="font-body text-xs text-muted-foreground">optional</span>
            </div>
            <div className="flex items-start gap-2">
              <VoiceInput
                id="facebookUrl"
                type="text"
                value={formData.facebookUrl}
                onChange={(e) => {
                  const facebookUrl = formatFacebookInput(e.target.value);
                  setFormData((prev) => ({
                    ...prev,
                    facebookUrl,
                  }));
                  updateGuestContext({ business: { facebookUrl: facebookUrl.trim() || undefined } });
                }}
                onTranscript={(trimmed) => {
                  setFormData((prev) => {
                    const facebookUrl = prev.facebookUrl.trim()
                      ? `${prev.facebookUrl.trim()} ${trimmed}`
                      : formatFacebookInput(trimmed);
                    updateGuestContext({
                      business: { facebookUrl: facebookUrl.trim() || undefined },
                    });
                    return { ...prev, facebookUrl };
                  });
                }}
                placeholder="yourbusiness (or full URL)"
                className="border border-black rounded-design bg-white px-4 py-6 text-foreground placeholder:text-foreground/40"
              />
            </div>
          </div>

          {config.captureTiming === "before-scan" && !isLoggedIn && (showIdentityName || showIdentityEmail) && (
            <IdentityCapture
              ref={identityCaptureRef}
              captureSource="health-check"
              initialName={identityName}
              initialEmail={formData.email}
              showName={showIdentityName}
              showEmail={showIdentityEmail}
              onTokenChange={setLeadToken}
              onDraftChange={({ name, email }) => {
                setIdentityName(name);
                setFormData((prev) => ({ ...prev, email }));
              }}
              onNameCommit={(value) => {
                setIdentityName(value);
                updateGuestContext({ identity: { name: value || undefined } });
              }}
              onEmailCommit={(value) => {
                setFormData((prev) => ({ ...prev, email: value }));
                updateGuestContext({ identity: { email: value || undefined } });
              }}
            />
          )}

          {config.captureTiming === "before-scan" && !isLoggedIn && hasGuestIdentity() && (
            <p className="font-body text-sm text-muted-foreground">
              Results for {resolvedGuestName} at {resolvedGuestEmail}
            </p>
          )}

          {edition === "bullfinch" && turnstileConfigured ? (
            <ScanTurnstile ref={scanTurnstileRef} onToken={() => setScanError(null)} />
          ) : null}

          {edition === "bullfinch" && !turnstileConfigured ? (
            <p className="font-body text-sm text-amber-700" role="status">
              Verification isn&apos;t configured in this environment, so the scan is unavailable here.
            </p>
          ) : null}

          {scanError ? (
            <p className="font-body text-sm text-red-600" role="alert">
              {scanError}
            </p>
          ) : null}
        </div>

        <div className="mt-10 flex items-center gap-3">
          <Button
            type="button"
            variant="ghost"
            onClick={() => setStep("welcome")}
            className="rounded-full p-0 font-body text-sm text-muted-foreground hover:bg-transparent hover:text-foreground"
          >
            <ArrowLeft className="mr-1 h-4 w-4" />
            Back
          </Button>

          <Button
            type="button"
            onMouseDown={(e) => {
              // Keep focus from leaving the email field before click fires — otherwise
              // blur/autofill sync can swallow the first Submit and require a second click.
              e.preventDefault();
            }}
            onClick={flushGuestIdentityAndProceed}
            disabled={!canAnalyse || preparingScan}
            aria-busy={awaitingTurnstile || preparingScan}
            className="rounded-full bg-primary px-8 py-6 font-body text-base font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
          >
            {awaitingTurnstile ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
                Checking…
              </>
            ) : preparingScan ? (
              "Verifying…"
            ) : (
              "Analyse my presence →"
            )}
          </Button>
        </div>
        {config.captureTiming === "after-results" ? (
          <p className="mt-4 font-body text-xs text-muted-foreground">
            By running the check you agree to our{" "}
            <a
              href={config.privacyUrl}
              className="underline hover:text-foreground"
              rel="noopener noreferrer"
            >
              privacy policy
            </a>
            .
          </p>
        ) : null}
      </div>
    </section>
  );

  const renderLoading = () => (
    <section className="mx-auto flex min-h-screen w-full max-w-3xl flex-col justify-center px-6 py-12">
      <div className="rounded-3xl border border-border bg-white p-8 shadow-sm sm:p-12">
        <h1 className="font-display text-4xl font-bold leading-tight text-[#0D1833] sm:text-5xl">
          {edition === "bullfinch"
            ? "Checking your presence..."
            : "marktr is checking your presence..."}
        </h1>

        <div className="mt-8 space-y-4">
          {CHECKLIST_ITEMS.map((item, index) => {
            const done = index < completedCount;
            const active = index === completedCount && completedCount < CHECKLIST_ITEMS.length;
            return (
              <div key={item} className="flex items-center gap-3">
                {done ? (
                  <CheckCircle2 className="h-5 w-5 text-[#E8650A]" />
                ) : active ? (
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                ) : (
                  <Loader2 className="h-5 w-5 text-muted-foreground/40" />
                )}
                <p
                  className={`font-body text-sm ${
                    done ? "text-foreground" : active ? "text-muted-foreground" : "text-muted-foreground/60"
                  }`}
                >
                  {item}
                </p>
              </div>
            );
          })}
        </div>

        {checklistDone && (
          <div className="mt-8 flex flex-col items-center gap-4">
            <div className="flex items-center gap-2">
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className="block h-2 w-2 rounded-full bg-primary"
                  style={{
                    animation: "dot-pulse 1.2s ease-in-out infinite",
                    animationDelay: `${i * 0.2}s`,
                  }}
                />
              ))}
            </div>
            <AnalysisMessage messages={ANALYSIS_MESSAGES} />
          </div>
        )}
      </div>
    </section>
  );

  return (
    <>
      <LegalAgreementRequiredModal
        open={config.captureTiming === "before-scan" && legalModalOpen}
        onClose={closeModal}
        onAgree={() => {
          identityCaptureRef.current?.acceptLegalAgreement();
          confirmAgreement();
        }}
      />
    <main className="min-h-screen bg-background">
      {step === "welcome" && renderWelcome()}
      {step === "inputs" && renderInputs()}
      {step === "loading" && renderLoading()}
    </main>
    </>
  );
}
