import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { VoiceInput } from "../components/ui/VoiceInput";
import { VoiceTextarea } from "../components/ui/VoiceTextarea";
import { ProgressBar } from "../components/onboarding/ProgressBar";
import { SelectChip } from "../components/onboarding/SelectChip";
import { GenerationErrorNotice } from "../components/GenerationErrorNotice";
import { useAuth } from "../contexts/AuthContext";
import { useBrand } from "../contexts/BrandContext";
import { applyDocumentSeo } from "../lib/documentSeo";
import { track } from "../lib/analytics";
import {
  commitStoryAnswerToGuestContext,
  getGuestBusinessName,
  getGuestContext,
  getGuestIdentityEmail,
  getGuestIdentityName,
  suggestBusinessNameFromUrl,
  updateGuestContext,
} from "../lib/guestContext";
import { setGuestBrandSeed } from "../lib/guestBrandSeed";
import { getGuestStory } from "../lib/guestStory";
import {
  START_GENERATION_STEPS,
  START_PLATFORM_OPTIONS,
  START_STORY_QUESTIONS,
  answeredStoryCount,
  getStartFlowDraft,
  saveStartFlowDraft,
  startJobsFinished,
  type StartFlowDraft,
  type StartFlowStep,
  type StartJobStatus,
} from "../lib/startFlow";
import {
  finishHealthCheck,
  generateStartIcps,
  generateStartStory,
  startHealthCheckInBackground,
} from "../lib/startFlowJobs";
import type { BrandStoryOutput } from "../lib/brandStory";

function TrackButton({
  trackId,
  className,
  type = "button",
  disabled,
  onClick,
  children,
}: {
  trackId: string;
  className?: string;
  type?: "button";
  disabled?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      data-track-id={trackId}
      data-track-location="start_flow"
      className={className}
    >
      {children}
    </button>
  );
}

export default function StartFlow() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { activeBrandId, brands } = useBrand();
  const isLoggedIn = Boolean(user && !(user as { is_anonymous?: boolean }).is_anonymous);

  const [draft, setDraft] = useState<StartFlowDraft>(() => getStartFlowDraft());
  const [storyDraft, setStoryDraft] = useState("");
  const [healthFailures, setHealthFailures] = useState(0);
  const [storyFailures, setStoryFailures] = useState(0);
  const [icpFailures, setIcpFailures] = useState(0);
  const [healthRetrying, setHealthRetrying] = useState(false);
  const [storyRetrying, setStoryRetrying] = useState(false);
  const [icpRetrying, setIcpRetrying] = useState(false);
  const [businessNameTouched, setBusinessNameTouched] = useState(
    () => Boolean(getStartFlowDraft().businessName.trim()),
  );

  const storyRef = useRef<BrandStoryOutput | null>(null);
  const generationStartedRef = useRef(false);
  const viewedStepRef = useRef<StartFlowStep | null>(null);
  const draftRef = useRef(draft);
  draftRef.current = draft;

  useEffect(() => {
    const stored = getGuestStory();
    if (stored?.output) storyRef.current = stored.output;
    const initial = draftRef.current;
    if (startJobsFinished(initial)) {
      generationStartedRef.current = true;
      if (initial.step === 3) {
        navigate("/start/results", { replace: true });
      }
    }
  }, [navigate]);

  const persist = (next: StartFlowDraft) => {
    draftRef.current = next;
    setDraft(next);
    saveStartFlowDraft(next);
  };

  const patch = (partial: Partial<StartFlowDraft>) => {
    persist({ ...draftRef.current, ...partial });
  };

  useEffect(() => {
    applyDocumentSeo({
      title: "Start | marktr",
      robots: "noindex, nofollow",
      canonicalPath: "/start",
    });
  }, []);

  useEffect(() => {
    const ctx = getGuestContext();
    const current = draftRef.current;
    const next = { ...current };
    let changed = false;
    if (!current.businessName.trim() && ctx.business.businessName?.trim()) {
      next.businessName = ctx.business.businessName.trim();
      changed = true;
    }
    if (!current.websiteUrl.trim() && ctx.business.websiteUrl?.trim()) {
      next.websiteUrl = ctx.business.websiteUrl;
      changed = true;
    }
    if (changed) persist(next);
  }, []);

  useEffect(() => {
    if (businessNameTouched || draft.businessName.trim() || draft.noWebsite) return;
    const suggested = suggestBusinessNameFromUrl(draft.websiteUrl);
    if (!suggested) return;
    patch({ businessName: suggested });
    updateGuestContext({ business: { businessName: suggested } });
  }, [draft.websiteUrl, draft.businessName, draft.noWebsite, businessNameTouched]);

  useEffect(() => {
    if (viewedStepRef.current === draft.step) return;
    viewedStepRef.current = draft.step;
    track("start_step_view", { step: draft.step });
  }, [draft.step]);

  useEffect(() => {
    if (draft.step !== 2) return;
    setStoryDraft(draft.answers[draft.storyQuestionIndex] ?? "");
  }, [draft.step, draft.storyQuestionIndex, draft.answers]);

  const userId = isLoggedIn ? user?.id : undefined;
  const email = isLoggedIn ? user?.email?.trim() ?? "" : getGuestIdentityEmail() || "";
  const founderName =
    getGuestIdentityName() ||
    (typeof user?.user_metadata?.name === "string" ? user.user_metadata.name.trim() : "");

  const healthInput = useMemo(
    () => ({
      websiteUrl: draft.noWebsite ? "" : draft.websiteUrl.trim(),
      businessName: draft.businessName.trim(),
      noWebsite: draft.noWebsite,
      email,
    }),
    [draft.noWebsite, draft.websiteUrl, draft.businessName, email],
  );

  const beginBackgroundHealth = () => {
    const businessName = draft.businessName.trim();
    updateGuestContext({
      business: {
        businessName: businessName || undefined,
        websiteUrl: draft.noWebsite ? undefined : draft.websiteUrl.trim() || undefined,
      },
    });
    if (businessName) {
      setGuestBrandSeed({
        brandName: businessName,
        businessDescription: "",
        productOrService: "",
        businessType: "B2C",
        assumedAudience: [],
        marketingChannels: draft.platforms,
        country: "",
        regionOrCity: "",
        currency: "GBP",
        created_at: new Date().toISOString(),
      });
    }
    void startHealthCheckInBackground({
      ...healthInput,
      websiteUrl: draft.noWebsite ? "" : draft.websiteUrl.trim(),
    });
  };

  const goToStep2 = () => {
    beginBackgroundHealth();
    patch({ step: 2, storyQuestionIndex: draft.storyQuestionIndex || 0, healthStatus: "running" });
  };

  const completeStep2 = (answers: [string, string, string, string]) => {
    track("start_story_answer_count", { count: answeredStoryCount(answers) });
    persist({ ...draftRef.current, answers, step: 3, storyQuestionIndex: 3 });
  };

  const runGeneration = async () => {
    const current = draftRef.current;
    const answers = current.answers;
    const businessName = current.businessName.trim() || getGuestBusinessName() || "";

    patch({
      healthStatus: current.healthStatus === "success" || current.healthStatus === "skipped"
        ? current.healthStatus
        : "running",
      storyStatus: current.storyStatus === "success" ? "success" : "running",
      icpStatus: current.icpStatus === "success" ? "success" : "running",
    });

    const healthPromise = (async () => {
      if (current.healthStatus === "success" || current.healthStatus === "skipped") {
        return current.healthStatus;
      }
      setHealthRetrying(true);
      const result = await finishHealthCheck({
        input: {
          websiteUrl: current.noWebsite ? "" : current.websiteUrl.trim(),
          businessName,
          noWebsite: current.noWebsite,
          email,
        },
        userId,
        activeBrandId,
        brands,
      });
      setHealthRetrying(false);
      if (result.status === "error") {
        setHealthFailures((count) => count + 1);
        patch({ healthStatus: "error" });
        return "error" as StartJobStatus;
      }
      patch({ healthStatus: result.status });
      return result.status;
    })();

    const storyPromise = (async () => {
      if (current.storyStatus === "success" && storyRef.current) {
        return storyRef.current;
      }
      setStoryRetrying(true);
      const result = await generateStartStory({
        answers,
        businessName,
        email,
        userId,
        activeBrandId,
        brands,
      });
      setStoryRetrying(false);
      if (result.status === "error") {
        setStoryFailures((count) => count + 1);
        patch({ storyStatus: "error" });
        return null;
      }
      storyRef.current = result.story;
      patch({ storyStatus: "success" });
      return result.story;
    })();

    const [healthStatus, story] = await Promise.all([healthPromise, storyPromise]);

    if (current.icpStatus === "success") {
      if ((healthStatus === "success" || healthStatus === "skipped") && story) {
        track("start_generation_complete");
        navigate("/start/results", { replace: true });
      }
      return;
    }

    setIcpRetrying(true);
    const icpResult = await generateStartIcps({
      answers,
      platforms: current.platforms,
      businessName,
      story,
      userId,
      founderName,
      activeBrandId,
    });
    setIcpRetrying(false);
    if (icpResult.status === "error") {
      setIcpFailures((count) => count + 1);
      patch({ icpStatus: "error" });
      return;
    }
    patch({ icpStatus: "success" });

    const latest = draftRef.current;
    if (
      startJobsFinished({
        ...latest,
        healthStatus: healthStatus === "error" ? latest.healthStatus : healthStatus,
        storyStatus: story ? "success" : latest.storyStatus,
        icpStatus: "success",
      })
    ) {
      track("start_generation_complete");
      navigate("/start/results", { replace: true });
    }
  };

  useEffect(() => {
    if (draft.step !== 3) {
      generationStartedRef.current = false;
      return;
    }
    if (generationStartedRef.current) return;
    generationStartedRef.current = true;
    void runGeneration();
  }, [draft.step]);

  const retryHealth = () => {
    patch({ healthStatus: "running" });
    void (async () => {
      setHealthRetrying(true);
      const result = await finishHealthCheck({
        input: healthInput,
        userId,
        activeBrandId,
        brands,
      });
      setHealthRetrying(false);
      if (result.status === "error") {
        setHealthFailures((count) => count + 1);
        patch({ healthStatus: "error" });
        return;
      }
      patch({ healthStatus: result.status });
      maybeFinish();
    })();
  };

  const retryStory = () => {
    patch({ storyStatus: "running" });
    void (async () => {
      setStoryRetrying(true);
      const result = await generateStartStory({
        answers: draftRef.current.answers,
        businessName: draftRef.current.businessName,
        email,
        userId,
        activeBrandId,
        brands,
      });
      setStoryRetrying(false);
      if (result.status === "error") {
        setStoryFailures((count) => count + 1);
        patch({ storyStatus: "error" });
        return;
      }
      storyRef.current = result.story;
      patch({ storyStatus: "success" });
      maybeFinish();
    })();
  };

  const retryIcps = () => {
    patch({ icpStatus: "running" });
    void (async () => {
      setIcpRetrying(true);
      const result = await generateStartIcps({
        answers: draftRef.current.answers,
        platforms: draftRef.current.platforms,
        businessName: draftRef.current.businessName,
        story: storyRef.current,
        userId,
        founderName,
        activeBrandId,
      });
      setIcpRetrying(false);
      if (result.status === "error") {
        setIcpFailures((count) => count + 1);
        patch({ icpStatus: "error" });
        return;
      }
      patch({ icpStatus: "success" });
      maybeFinish();
    })();
  };

  const maybeFinish = () => {
    if (startJobsFinished(draftRef.current)) {
      track("start_generation_complete");
      navigate("/start/results", { replace: true });
    }
  };

  const togglePlatform = (option: string) => {
    const selected = draft.platforms.includes(option)
      ? draft.platforms.filter((item) => item !== option)
      : [...draft.platforms, option];
    patch({ platforms: selected });
  };

  const canContinueStep1 = draft.platforms.length > 0;

  const commitStoryAnswer = (text: string) => {
    const nextAnswers = [...draft.answers] as [string, string, string, string];
    nextAnswers[draft.storyQuestionIndex] = text;
    persist({ ...draft, answers: nextAnswers });
    commitStoryAnswerToGuestContext(draft.storyQuestionIndex, text);
    return nextAnswers;
  };

  const goNextQuestion = () => {
    const trimmed = storyDraft.trim();
    if (!trimmed) return;
    const nextAnswers = commitStoryAnswer(trimmed);
    if (draft.storyQuestionIndex >= 3) {
      completeStep2(nextAnswers);
      return;
    }
    const nextIndex = draft.storyQuestionIndex + 1;
    setStoryDraft(nextAnswers[nextIndex] ?? "");
    persist({ ...draftRef.current, answers: nextAnswers, storyQuestionIndex: nextIndex });
  };

  const skipQuestion = () => {
    const nextAnswers = [...draft.answers] as [string, string, string, string];
    nextAnswers[draft.storyQuestionIndex] = "";
    if (draft.storyQuestionIndex >= 3) {
      setStoryDraft("");
      completeStep2(nextAnswers);
      return;
    }
    const nextIndex = draft.storyQuestionIndex + 1;
    setStoryDraft(nextAnswers[nextIndex] ?? "");
    persist({ ...draftRef.current, answers: nextAnswers, storyQuestionIndex: nextIndex });
  };

  const goBack = () => {
    if (draft.step === 3) {
      setStoryDraft(draft.answers[3] ?? "");
      patch({ step: 2, storyQuestionIndex: 3 });
      return;
    }
    if (draft.step === 2 && draft.storyQuestionIndex > 0) {
      const prevIndex = draft.storyQuestionIndex - 1;
      setStoryDraft(draft.answers[prevIndex] ?? "");
      persist({ ...draft, storyQuestionIndex: prevIndex });
      return;
    }
    if (draft.step === 2) {
      patch({ step: 1 });
    }
  };

  const question = START_STORY_QUESTIONS[draft.storyQuestionIndex]!;
  const jobStatus = (id: (typeof START_GENERATION_STEPS)[number]["id"]): StartJobStatus => {
    if (id === "health") return draft.healthStatus;
    if (id === "story") return draft.storyStatus;
    return draft.icpStatus;
  };

  return (
    <main className="min-h-screen bg-background">
      <section className="relative mx-auto flex min-h-screen w-full max-w-3xl flex-col px-4 py-8 sm:px-6 sm:py-12">
        {draft.step === 2 ? null : (
          <div className="mb-6 animate-fade-in-up">
            <ProgressBar current={draft.step} total={3} />
            <p className="mt-3 font-['Plus_Jakarta_Sans'] text-xs text-muted-foreground">
              Step {draft.step} of 3
            </p>
          </div>
        )}

        {draft.step > 1 ? (
          <div className="mb-6">
            <TrackButton
              trackId={`start_back_${draft.step}`}
              onClick={goBack}
              className="inline-flex items-center gap-2 font-['Plus_Jakarta_Sans'] text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </TrackButton>
          </div>
        ) : null}

        {draft.step === 1 ? (
          <div className="flex flex-1 flex-col pb-12">
            <h1 className="font-['Fraunces'] text-3xl font-bold leading-tight text-foreground sm:text-4xl">
              Your business
            </h1>
            <p className="mt-3 max-w-lg font-['Plus_Jakarta_Sans'] text-base text-muted-foreground">
              Share what you have — even without a website we can keep going.
            </p>

            <div className="mt-8 space-y-6">
              <div className="space-y-2">
                <Label htmlFor="start-business-name" className="font-['Plus_Jakarta_Sans'] text-sm text-foreground">
                  Business name
                </Label>
                <Input
                  id="start-business-name"
                  type="text"
                  value={draft.businessName}
                  onChange={(e) => {
                    setBusinessNameTouched(true);
                    const value = e.target.value;
                    patch({ businessName: value });
                    updateGuestContext({ business: { businessName: value.trim() || undefined } });
                  }}
                  placeholder="Your business name"
                  className="h-12 px-4 text-foreground placeholder:text-foreground/40"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <Label htmlFor="start-website-url" className="font-['Plus_Jakarta_Sans'] text-sm text-foreground">
                    Website URL
                  </Label>
                  <span className="font-['Plus_Jakarta_Sans'] text-xs text-muted-foreground">optional</span>
                </div>
                <VoiceInput
                  id="start-website-url"
                  type="url"
                  value={draft.noWebsite ? "" : draft.websiteUrl}
                  disabled={draft.noWebsite}
                  onChange={(e) => {
                    const websiteUrl = e.target.value;
                    patch({ websiteUrl, noWebsite: false });
                    updateGuestContext({ business: { websiteUrl: websiteUrl.trim() || undefined } });
                  }}
                  onTranscript={(trimmed) => {
                    const websiteUrl = draft.websiteUrl.trim()
                      ? `${draft.websiteUrl.trim()} ${trimmed}`
                      : trimmed;
                    patch({ websiteUrl, noWebsite: false });
                    updateGuestContext({ business: { websiteUrl: websiteUrl.trim() || undefined } });
                  }}
                  placeholder="https://yourbusiness.com"
                  className="h-12 px-4 text-foreground placeholder:text-foreground/40"
                />
                <label className="flex items-start gap-3 pt-1 font-['Plus_Jakarta_Sans'] text-sm text-foreground">
                  <input
                    type="checkbox"
                    checked={draft.noWebsite}
                    onChange={(e) => {
                      const noWebsite = e.target.checked;
                      patch({
                        noWebsite,
                        websiteUrl: noWebsite ? "" : draft.websiteUrl,
                      });
                      if (noWebsite) {
                        updateGuestContext({ business: { websiteUrl: undefined } });
                      }
                    }}
                    className="mt-1 h-4 w-4 shrink-0 rounded border-border"
                  />
                  I don&apos;t have a website yet
                </label>
              </div>

              <div className="space-y-3">
                <h2 className="font-['Fraunces'] text-2xl font-bold leading-tight text-foreground">
                  Which platforms do you use to promote your business today?
                </h2>
                <p className="max-w-md font-['Plus_Jakarta_Sans'] text-foreground/70">
                  Tick everything you use now. Don&apos;t worry if it&apos;s just one, or none yet.
                </p>
                <div className="flex flex-wrap gap-3 pt-2">
                  {START_PLATFORM_OPTIONS.map((option) => (
                    <SelectChip
                      key={option}
                      label={option}
                      selected={draft.platforms.includes(option)}
                      onClick={() => togglePlatform(option)}
                    />
                  ))}
                </div>
              </div>
            </div>

            <Button
              type="button"
              disabled={!canContinueStep1}
              onClick={goToStep2}
              data-track-id="start_next_1"
              data-track-location="start_flow"
              className="mt-8 h-12 w-fit px-8 font-['Plus_Jakarta_Sans'] text-base disabled:opacity-50"
            >
              Next →
            </Button>
          </div>
        ) : null}

        {draft.step === 2 ? (
          <div className="flex flex-1 flex-col pb-12">
            <div className="mb-6 animate-fade-in-up">
              <ProgressBar current={draft.storyQuestionIndex + 1} total={4} />
              <p className="mt-3 font-['Plus_Jakarta_Sans'] text-xs text-muted-foreground">
                Step 2 of 3 · Question {draft.storyQuestionIndex + 1} of 4
              </p>
            </div>
            <h1 className="font-['Fraunces'] text-3xl font-bold leading-tight text-foreground sm:text-4xl">
              {question.heading}
            </h1>
            <p className="mt-4 max-w-lg font-['Plus_Jakarta_Sans'] text-base text-muted-foreground">
              {question.subtext}
            </p>
            <div className="mt-8">
              <VoiceTextarea
                value={storyDraft}
                onChange={(e) => setStoryDraft(e.target.value)}
                onBlur={() => {
                  commitStoryAnswerToGuestContext(draft.storyQuestionIndex, storyDraft);
                }}
                className="min-h-[140px] resize-none rounded-design border border-border bg-background px-4 py-4 font-['Plus_Jakarta_Sans'] text-foreground placeholder:text-foreground/40"
              />
            </div>
            <Button
              type="button"
              disabled={!storyDraft.trim()}
              onClick={goNextQuestion}
              data-track-id="start_next_2"
              data-track-location="start_flow"
              className="mt-8 h-12 w-fit px-8 font-['Plus_Jakarta_Sans'] text-base disabled:opacity-50"
            >
              Next →
            </Button>
            <button
              type="button"
              onClick={skipQuestion}
              className="mt-4 w-fit font-['Plus_Jakarta_Sans'] text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
            >
              Skip this question
            </button>
          </div>
        ) : null}

        {draft.step === 3 ? (
          <div className="flex flex-1 flex-col justify-center pb-12">
            <div className="rounded-3xl border border-border bg-card p-6 shadow-sm sm:p-12">
              <h1 className="font-['Fraunces'] text-3xl font-bold leading-tight text-foreground sm:text-4xl">
                Building your plan
              </h1>
              <div className="mt-8 space-y-4">
                {START_GENERATION_STEPS.map((item) => {
                  const status = jobStatus(item.id);
                  const done = status === "success" || status === "skipped";
                  const active = status === "running";
                  return (
                    <div key={item.id} className="flex items-center gap-3">
                      {done ? (
                        <CheckCircle2 className="h-5 w-5 text-foreground" />
                      ) : active ? (
                        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                      ) : (
                        <Loader2 className="h-5 w-5 text-muted-foreground/40" />
                      )}
                      <p
                        className={`font-['Plus_Jakarta_Sans'] text-sm ${
                          done
                            ? "text-foreground"
                            : active
                              ? "text-muted-foreground"
                              : "text-muted-foreground/60"
                        }`}
                      >
                        {item.label}
                        {status === "skipped" ? " — skipped" : ""}
                      </p>
                    </div>
                  );
                })}
              </div>

              {draft.healthStatus === "error" ? (
                <GenerationErrorNotice
                  failures={Math.max(healthFailures, 1)}
                  onRetry={retryHealth}
                  retrying={healthRetrying}
                  className="mt-8 font-['Plus_Jakarta_Sans'] text-sm text-destructive"
                />
              ) : null}
              {draft.storyStatus === "error" ? (
                <GenerationErrorNotice
                  failures={Math.max(storyFailures, 1)}
                  onRetry={retryStory}
                  retrying={storyRetrying}
                  className="mt-8 font-['Plus_Jakarta_Sans'] text-sm text-destructive"
                />
              ) : null}
              {draft.icpStatus === "error" ? (
                <GenerationErrorNotice
                  failures={Math.max(icpFailures, 1)}
                  onRetry={retryIcps}
                  retrying={icpRetrying}
                  className="mt-8 font-['Plus_Jakarta_Sans'] text-sm text-destructive"
                />
              ) : null}
            </div>
          </div>
        ) : null}
      </section>
    </main>
  );
}
