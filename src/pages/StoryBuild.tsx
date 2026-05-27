import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Textarea } from "../components/ui/textarea";
import { WhisperButton } from "../components/ui/WhisperButton";

type StoryStep =
  | "q1"
  | "q2"
  | "q3"
  | "email"
  | "q4"
  | "q5"
  | "q6"
  | "q7"
  | "loading";

const QUESTIONS: { heading: string; subtext: string }[] = [
  {
    heading: "What do you do, and who do you do it for?",
    subtext: "Just like you'd explain it to someone you've just met.",
  },
  {
    heading: "Why did you start this business?",
    subtext: "What was the moment — or the frustration — that made it inevitable?",
  },
  {
    heading: "What do you believe about your industry that most people in it wouldn't say out loud?",
    subtext: "Your honest opinion. The thing that makes you different.",
  },
  {
    heading: "Who is your best customer — not in demographics, but as a person?",
    subtext: "What do they care about? What keeps them up at night?",
  },
  {
    heading: "What do your best customers say about you that you couldn't have written yourself?",
    subtext: "Real words, real feedback. Even rough paraphrases work.",
  },
  {
    heading: "What would be lost if your business didn't exist?",
    subtext: "Think beyond the product or service.",
  },
  {
    heading: "In five years, what does success look like — not in numbers, but in the world?",
    subtext: "The change you want to have made.",
  },
];

const STEP_TO_Q_INDEX: Record<Exclude<StoryStep, "email" | "loading">, number> = {
  q1: 0,
  q2: 1,
  q3: 2,
  q4: 3,
  q5: 4,
  q6: 5,
  q7: 6,
};

const LOADING_ITEMS = [
  "Reading your founding moment",
  "Finding your point of view",
  "Identifying what makes you different",
  "Shaping your brand narrative",
  "Writing your story...",
] as const;

const STEP_ORDER: StoryStep[] = ["q1", "q2", "q3", "email", "q4", "q5", "q6", "q7"];

type QuestionOnlyStep = Exclude<StoryStep, "email" | "loading">;

function isQuestionStep(step: StoryStep): step is keyof typeof STEP_TO_Q_INDEX {
  return step !== "email" && step !== "loading";
}

export default function StoryBuild() {
  const navigate = useNavigate();
  const [step, setStep] = useState<StoryStep>("q1");
  const [answers, setAnswers] = useState<string[]>(() => Array(7).fill(""));
  const [draft, setDraft] = useState("");
  const [email, setEmail] = useState("");
  const [completedCount, setCompletedCount] = useState(0);

  const questionIndex = isQuestionStep(step) ? STEP_TO_Q_INDEX[step] : null;

  useEffect(() => {
    if (questionIndex === null) return;
    setDraft(answers[questionIndex] ?? "");
  }, [step, questionIndex, answers]);

  useEffect(() => {
    if (step !== "loading") return;

    const timers: number[] = [];
    for (let i = 1; i <= LOADING_ITEMS.length; i += 1) {
      timers.push(window.setTimeout(() => setCompletedCount(i), i * 400));
    }
    const done = window.setTimeout(() => {
      navigate("/story/results", { state: { answers, email: email.trim() } });
    }, 2000);
    timers.push(done);

    return () => timers.forEach((t) => window.clearTimeout(t));
  }, [step, answers, email, navigate]);

  const canContinueQuestion = useMemo(() => draft.trim().length > 0, [draft]);

  const canContinueEmail = useMemo(() => {
    const e = email.trim();
    return e.length > 0 && e.includes("@");
  }, [email]);

  const goBack = () => {
    const idx = STEP_ORDER.indexOf(step);
    if (idx <= 0) return;
    setStep(STEP_ORDER[idx - 1]!);
  };

  const advanceFromQuestion = () => {
    if (questionIndex === null) return;
    const nextAnswers = [...answers];
    nextAnswers[questionIndex] = draft.trim();
    setAnswers(nextAnswers);

    if (step === "q3") setStep("email");
    else if (step === "q7") {
      setCompletedCount(0);
      setStep("loading");
    } else {
      const qOnly: QuestionOnlyStep[] = ["q1", "q2", "q3", "q4", "q5", "q6", "q7"];
      const i = qOnly.indexOf(step as QuestionOnlyStep);
      setStep(qOnly[i + 1]!);
    }
  };

  const skipQuestion = () => {
    if (questionIndex === null || questionIndex === 0) return;
    const nextAnswers = [...answers];
    nextAnswers[questionIndex] = "";
    setAnswers(nextAnswers);
    setDraft("");

    if (step === "q3") setStep("email");
    else if (step === "q7") {
      setCompletedCount(0);
      setStep("loading");
    } else {
      const qOnly: QuestionOnlyStep[] = ["q1", "q2", "q3", "q4", "q5", "q6", "q7"];
      const i = qOnly.indexOf(step as QuestionOnlyStep);
      setStep(qOnly[i + 1]!);
    }
  };

  const renderQuestion = () => {
    if (questionIndex === null) return null;
    const q = QUESTIONS[questionIndex]!;
    const showSkip = questionIndex >= 1;

    return (
      <section className="relative mx-auto flex min-h-screen w-full max-w-3xl flex-col px-6 py-12">
        <div className="mb-8 flex items-start justify-between gap-4">
          {step !== "q1" ? (
            <button
              type="button"
              onClick={goBack}
              className="inline-flex items-center gap-2 font-['DM_Sans'] text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </button>
          ) : (
            <Link
              to="/"
              className="inline-flex items-center gap-2 font-['DM_Sans'] text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to home
            </Link>
          )}
          <p className="font-['DM_Sans'] text-xs text-muted-foreground">
            Question {questionIndex + 1} of 7
          </p>
        </div>

        <div className="flex flex-1 flex-col justify-center pb-12">
          <h1 className="font-['Fraunces'] text-3xl font-bold leading-tight text-[#0D1833] sm:text-4xl">
            {q.heading}
          </h1>
          <p className="mt-4 max-w-lg font-['DM_Sans'] text-base text-muted-foreground">{q.subtext}</p>

          <div className="mt-8 flex items-start gap-2">
            <Textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Type your answer…"
              className="min-h-[140px] resize-none border border-black rounded-design bg-white px-4 py-4 font-['DM_Sans'] text-foreground placeholder:text-foreground/40"
            />
            <WhisperButton
              onTranscript={(text) => {
                const t = text.trim();
                if (!t) return;
                setDraft((prev) => (prev.trim() ? `${prev.trim()} ${t}` : t));
              }}
              className="pt-1"
            />
          </div>

          <Button
            type="button"
            disabled={!canContinueQuestion}
            onClick={advanceFromQuestion}
            className="mt-8 w-fit rounded-full bg-primary px-8 py-6 font-['DM_Sans'] text-base font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
          >
            Continue →
          </Button>

          {showSkip && (
            <button
              type="button"
              onClick={skipQuestion}
              className="mt-4 w-fit font-['DM_Sans'] text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
            >
              Skip this question
            </button>
          )}
        </div>
      </section>
    );
  };

  const renderEmail = () => (
    <section className="relative mx-auto flex min-h-screen w-full max-w-3xl flex-col px-6 py-12">
      <div className="mb-8 flex items-start justify-between gap-4">
        <button
          type="button"
          onClick={goBack}
          className="inline-flex items-center gap-2 font-['DM_Sans'] text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>
        <span />
      </div>

      <div className="flex flex-1 flex-col justify-center pb-12">
        <h1 className="font-['Fraunces'] text-3xl font-bold leading-tight text-[#0D1833] sm:text-4xl">
          Where should we send your brand story?
        </h1>
        <p className="mt-4 max-w-lg font-['DM_Sans'] text-base text-muted-foreground">
          We&apos;ll email you a copy when it&apos;s ready.
        </p>

        <Input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@yourbusiness.com"
          className="mt-8 max-w-lg border border-black rounded-design bg-white px-4 py-6 font-['DM_Sans'] text-foreground placeholder:text-foreground/40"
        />

        <Button
          type="button"
          disabled={!canContinueEmail}
          onClick={() => setStep("q4")}
          className="mt-8 w-fit rounded-full bg-primary px-8 py-6 font-['DM_Sans'] text-base font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
        >
          Continue building →
        </Button>
      </div>
    </section>
  );

  const renderLoading = () => (
    <section className="mx-auto flex min-h-screen w-full max-w-3xl flex-col justify-center px-6 py-12">
      <div className="rounded-3xl border border-border bg-white p-8 shadow-sm sm:p-12">
        <h1 className="font-['Fraunces'] text-3xl font-bold leading-tight text-[#0D1833] sm:text-4xl">
          marktr is finding your story...
        </h1>
        <div className="mt-8 space-y-4">
          {LOADING_ITEMS.map((item, index) => {
            const done = index < completedCount;
            const active =
              index === completedCount && completedCount < LOADING_ITEMS.length;
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
                    done
                      ? "text-foreground"
                      : active
                        ? "text-muted-foreground"
                        : "text-muted-foreground/60"
                  }`}
                >
                  {item}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );

  return (
    <main className="min-h-screen bg-background">
      {isQuestionStep(step) && renderQuestion()}
      {step === "email" && renderEmail()}
      {step === "loading" && renderLoading()}
    </main>
  );
}
