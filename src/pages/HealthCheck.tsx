import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { WhisperButton } from "../components/ui/WhisperButton";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../config/supabase";
import type { SocialScores, StoryAssessment } from "../lib/healthCheckScoring";

type Step = "welcome" | "inputs" | "loading";

export interface HealthCheckFormData {
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
      className="max-w-xs text-center font-['DM_Sans'] text-sm leading-relaxed text-muted-foreground transition-opacity duration-300"
      style={{ opacity: visible ? 1 : 0 }}
    >
      {messages[index]}
    </p>
  );
}

export default function HealthCheck() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isLoggedIn = Boolean(user && !(user as { is_anonymous?: boolean }).is_anonymous);
  const [step, setStep] = useState<Step>("welcome");
  const [completedCount, setCompletedCount] = useState(0);
  const [checklistDone, setChecklistDone] = useState(false);

  const [formData, setFormData] = useState<HealthCheckFormData>({
    websiteUrl: "",
    instagramHandle: "",
    facebookUrl: "",
    email: "",
  });

  const canAnalyse = useMemo(() => {
    if (isLoggedIn) return Boolean(user?.email?.trim());
    return formData.email.trim().length > 0;
  }, [isLoggedIn, user?.email, formData.email]);

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

      let websiteScore: {
        score: number;
        observation: string;
        strengths?: string[];
        gaps?: string[];
        storyAssessment?: StoryAssessment | null;
        socialScores?: SocialScores | null;
      } | null = null;

      const apiPromise = (async () => {
        if (!formData.websiteUrl?.trim()) return;

        try {
          const { data } = await supabase.functions.invoke("score-website", {
            body: {
              websiteUrl: formData.websiteUrl.trim(),
              instagramHandle: formData.instagramHandle?.trim() || undefined,
              facebookUrl: formData.facebookUrl?.trim() || undefined,
            },
          });
          if (data?.score !== undefined) {
            const rawStory = data.storyAssessment as StoryAssessment | null | undefined;
            websiteScore = {
              score: Number(data.score),
              observation: String(data.observation ?? ""),
              strengths: Array.isArray(data.strengths)
                ? data.strengths.map((s: unknown) => String(s))
                : undefined,
              gaps: Array.isArray(data.gaps)
                ? data.gaps.map((g: unknown) => String(g))
                : undefined,
              storyAssessment:
                rawStory && typeof rawStory === "object"
                  ? {
                      hasFounderStory: Boolean(rawStory.hasFounderStory),
                      founderStoryQuality:
                        rawStory.founderStoryQuality === "basic" ||
                        rawStory.founderStoryQuality === "good" ||
                        rawStory.founderStoryQuality === "compelling" ||
                        rawStory.founderStoryQuality === "none"
                          ? rawStory.founderStoryQuality
                          : "none",
                      speaksToSpecificCustomer: Boolean(rawStory.speaksToSpecificCustomer),
                      hasDistinctivePositioning: Boolean(rawStory.hasDistinctivePositioning),
                      hasEmotionalHook: Boolean(rawStory.hasEmotionalHook),
                      missingElements: Array.isArray(rawStory.missingElements)
                        ? rawStory.missingElements.map((el: unknown) => String(el))
                        : [],
                    }
                  : null,
              socialScores: (data.socialScores as SocialScores | null) ?? null,
            };
          }
        } catch {
          // Silent fail — use default scoring
        }
      })();

      const checklistMinPromise = new Promise<void>((resolve) => {
        timers.push(
          window.setTimeout(() => resolve(), CHECKLIST_ITEMS.length * 300 + 500)
        );
      });

      await Promise.all([apiPromise, checklistMinPromise]);

      if (!cancelled) {
        const emailToUse = isLoggedIn ? user?.email ?? "" : formData.email;
        navigate("/health-check/results", {
          state: {
            ...formData,
            email: emailToUse,
            websiteScore,
          },
        });
      }
    };

    void run();

    return () => {
      cancelled = true;
      timers.forEach((t) => window.clearTimeout(t));
    };
  }, [step, formData, navigate, isLoggedIn, user?.email]);

  const renderWelcome = () => (
    <section className="mx-auto flex min-h-screen w-full max-w-3xl flex-col justify-center px-6 py-12">
      <div className="rounded-3xl border border-border bg-white p-8 shadow-sm sm:p-12">
        <div className="mb-8">
          <Link
            to="/"
            className="inline-flex items-center gap-2 font-['DM_Sans'] text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to home
          </Link>
        </div>
        <h1 className="font-['Fraunces'] text-4xl font-bold leading-tight text-[#0D1833] sm:text-5xl">
          Let&apos;s check your digital health.
        </h1>
        <p className="mt-5 max-w-2xl font-['DM_Sans'] text-base leading-relaxed text-muted-foreground sm:text-lg">
          Answer 5 quick questions and marktr will score your digital presence across the
          dimensions that matter most to founders.
        </p>

        <Button
          onClick={() => setStep("inputs")}
          className="mt-10 rounded-full bg-primary px-8 py-6 font-['DM_Sans'] text-base font-medium text-primary-foreground hover:opacity-90"
        >
          Start my digital health check →
        </Button>

        <p className="mt-4 font-['DM_Sans'] text-sm text-muted-foreground">
          Takes about 2 minutes. No account needed.
        </p>
      </div>
    </section>
  );

  const renderInputs = () => (
    <section className="mx-auto flex min-h-screen w-full max-w-3xl flex-col justify-center px-6 py-12">
      <div className="rounded-3xl border border-border bg-white p-8 shadow-sm sm:p-12">
        <div className="mb-8">
          <Link
            to="/"
            className="inline-flex items-center gap-2 font-['DM_Sans'] text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to home
          </Link>
        </div>
        <h1 className="font-['Fraunces'] text-4xl font-bold leading-tight text-[#0D1833] sm:text-5xl">
          Where can we find you online?
        </h1>
        <p className="mt-5 max-w-2xl font-['DM_Sans'] text-base leading-relaxed text-muted-foreground sm:text-lg">
          Share what you have — even one URL gives us useful data.
        </p>

        <div className="mt-8 space-y-6">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="websiteUrl" className="font-['DM_Sans'] text-sm text-[#0D1833]">
                Website URL
              </Label>
              <span className="font-['DM_Sans'] text-xs text-muted-foreground">optional</span>
            </div>
            <Input
              id="websiteUrl"
              type="url"
              value={formData.websiteUrl}
              onChange={(e) => setFormData((prev) => ({ ...prev, websiteUrl: e.target.value }))}
              placeholder="https://yourbusiness.com"
              className="border border-black rounded-design bg-white px-4 py-6 text-foreground placeholder:text-foreground/40"
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="instagramHandle" className="font-['DM_Sans'] text-sm text-[#0D1833]">
                Instagram handle
              </Label>
              <span className="font-['DM_Sans'] text-xs text-muted-foreground">optional</span>
            </div>
            <div className="flex items-start gap-2">
              <Input
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
                }}
                placeholder="marktr.io (or @marktr.io)"
                className="border border-black rounded-design bg-white px-4 py-6 text-foreground placeholder:text-foreground/40"
              />
              <WhisperButton
                onTranscript={(text) => {
                  const trimmed = text.trim();
                  if (!trimmed) return;
                  setFormData((prev) => ({
                    ...prev,
                    instagramHandle: prev.instagramHandle.trim()
                      ? `${prev.instagramHandle.trim()} ${trimmed}`
                      : trimmed,
                  }));
                }}
                className="pt-1"
              />
            </div>
            <p className="font-['DM_Sans'] text-xs text-muted-foreground">Public profile only</p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="facebookUrl" className="font-['DM_Sans'] text-sm text-[#0D1833]">
                Facebook page URL
              </Label>
              <span className="font-['DM_Sans'] text-xs text-muted-foreground">optional</span>
            </div>
            <Input
              id="facebookUrl"
              type="url"
              value={formData.facebookUrl}
              onChange={(e) => setFormData((prev) => ({ ...prev, facebookUrl: e.target.value }))}
              placeholder="facebook.com/yourbusiness"
              className="border border-black rounded-design bg-white px-4 py-6 text-foreground placeholder:text-foreground/40"
            />
          </div>

          {!isLoggedIn && (
            <div className="space-y-2">
              <Label htmlFor="email" className="font-['DM_Sans'] text-sm text-[#0D1833]">
                Email address (required)
              </Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
                placeholder="you@yourbusiness.com"
                className="border border-black rounded-design bg-white px-4 py-6 text-foreground placeholder:text-foreground/40"
              />
              <p className="font-['DM_Sans'] text-xs text-muted-foreground">
                Your report will be sent here
              </p>
            </div>
          )}
        </div>

        <div className="mt-10 flex items-center gap-3">
          <Button
            type="button"
            variant="ghost"
            onClick={() => setStep("welcome")}
            className="rounded-full p-0 font-['DM_Sans'] text-sm text-muted-foreground hover:bg-transparent hover:text-foreground"
          >
            <ArrowLeft className="mr-1 h-4 w-4" />
            Back
          </Button>

          <Button
            onClick={() => {
              if (!canAnalyse) return;
              setCompletedCount(0);
              setChecklistDone(false);
              setStep("loading");
            }}
            disabled={!canAnalyse}
            className="rounded-full bg-primary px-8 py-6 font-['DM_Sans'] text-base font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
          >
            Analyse my presence →
          </Button>
        </div>
      </div>
    </section>
  );

  const renderLoading = () => (
    <section className="mx-auto flex min-h-screen w-full max-w-3xl flex-col justify-center px-6 py-12">
      <div className="rounded-3xl border border-border bg-white p-8 shadow-sm sm:p-12">
        <h1 className="font-['Fraunces'] text-4xl font-bold leading-tight text-[#0D1833] sm:text-5xl">
          marktr is checking your presence...
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
                  className={`font-['DM_Sans'] text-sm ${
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
    <main className="min-h-screen bg-background">
      {step === "welcome" && renderWelcome()}
      {step === "inputs" && renderInputs()}
      {step === "loading" && renderLoading()}
    </main>
  );
}
