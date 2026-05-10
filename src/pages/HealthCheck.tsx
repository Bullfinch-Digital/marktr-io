import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { WhisperButton } from "../components/ui/WhisperButton";

type Step = "welcome" | "inputs" | "loading";

export interface HealthCheckFormData {
  websiteUrl: string;
  instagramHandle: string;
  facebookUrl: string;
  linkedinUrl: string;
  email: string;
}

const CHECKLIST_ITEMS = [
  "Checking your website",
  "Reading your content",
  "Analysing social presence",
  "Scoring audience alignment",
  "Generating your report",
] as const;

export default function HealthCheck() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>("welcome");
  const [completedCount, setCompletedCount] = useState(0);

  const [formData, setFormData] = useState<HealthCheckFormData>({
    websiteUrl: "",
    instagramHandle: "",
    facebookUrl: "",
    linkedinUrl: "",
    email: "",
  });

  const canAnalyse = useMemo(() => formData.email.trim().length > 0, [formData.email]);

  useEffect(() => {
    if (step !== "loading") return;

    const timers: number[] = [];

    for (let i = 1; i <= CHECKLIST_ITEMS.length; i += 1) {
      const timer = window.setTimeout(() => {
        setCompletedCount(i);
      }, i * 300);
      timers.push(timer);
    }

    const doneTimer = window.setTimeout(() => {
      navigate("/health-check/results", { state: formData });
    }, CHECKLIST_ITEMS.length * 300 + 500);

    timers.push(doneTimer);

    return () => {
      timers.forEach((t) => window.clearTimeout(t));
    };
  }, [step, formData, navigate]);

  const renderWelcome = () => (
    <section className="mx-auto flex min-h-screen w-full max-w-3xl flex-col justify-center px-6 py-12">
      <div className="rounded-3xl border border-border bg-white p-8 shadow-sm sm:p-12">
        <h1 className="font-['Fraunces'] text-4xl font-bold leading-tight text-[#0D1833] sm:text-5xl">
          Let&apos;s check the health of your marketing.
        </h1>
        <p className="mt-5 max-w-2xl font-['DM_Sans'] text-base leading-relaxed text-muted-foreground sm:text-lg">
          Answer 5 quick questions and marktr will score your digital presence across the
          dimensions that matter most to founders.
        </p>

        <Button
          onClick={() => setStep("inputs")}
          className="mt-10 rounded-full bg-primary px-8 py-6 font-['DM_Sans'] text-base font-medium text-primary-foreground hover:opacity-90"
        >
          Start my health check →
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
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, instagramHandle: e.target.value }))
                }
                placeholder="@yourbusiness"
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

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="linkedinUrl" className="font-['DM_Sans'] text-sm text-[#0D1833]">
                LinkedIn URL
              </Label>
              <span className="font-['DM_Sans'] text-xs text-muted-foreground">optional</span>
            </div>
            <Input
              id="linkedinUrl"
              type="url"
              value={formData.linkedinUrl}
              onChange={(e) => setFormData((prev) => ({ ...prev, linkedinUrl: e.target.value }))}
              placeholder="linkedin.com/company/yourbusiness"
              className="border border-black rounded-design bg-white px-4 py-6 text-foreground placeholder:text-foreground/40"
            />
          </div>

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
