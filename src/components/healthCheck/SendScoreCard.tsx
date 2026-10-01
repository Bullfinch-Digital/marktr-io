import { Loader2 } from "lucide-react";
import { useRef, useState } from "react";
import { supabase } from "../../config/supabase";
import type { EditionConfig } from "../../lib/editionConfig";
import { ScanTurnstile, type ScanTurnstileHandle } from "./ScanTurnstile";

type SendScoreCopy = NonNullable<EditionConfig["sendScore"]>;

type Phase = "idle" | "checking" | "sent" | "error";

export function SendScoreCard({
  publicToken,
  copy,
  privacyUrl,
}: {
  publicToken: string;
  copy: SendScoreCopy;
  privacyUrl: string;
}) {
  const turnstileRef = useRef<ScanTurnstileHandle>(null);
  const busyRef = useRef(false);
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [marketingOptIn, setMarketingOptIn] = useState(false);
  const [phase, setPhase] = useState<Phase>("idle");

  const submit = async () => {
    if (busyRef.current || phase === "sent") return;
    const trimmedEmail = email.trim();
    if (!trimmedEmail) return;

    busyRef.current = true;
    setPhase("checking");
    try {
      const token = (await turnstileRef.current?.waitForToken(10_000)) ?? null;
      if (!token) {
        setPhase("error");
        return;
      }

      const { data, error } = await supabase.functions.invoke("capture-report-lead", {
        body: {
          publicToken,
          email: trimmedEmail,
          firstName: firstName.trim() || undefined,
          marketingOptIn,
          turnstileToken: token,
        },
      });
      const payload = data as { ok?: boolean } | null;
      if (error || payload?.ok !== true) {
        setPhase("error");
        void turnstileRef.current?.refreshToken();
        return;
      }
      setPhase("sent");
    } catch {
      setPhase("error");
      void turnstileRef.current?.refreshToken();
    } finally {
      busyRef.current = false;
    }
  };

  if (phase === "sent") {
    return (
      <section className="mt-6 rounded-2xl border border-border bg-card px-6 py-5">
        <p className="font-body text-sm text-foreground" role="status">
          {copy.success}
        </p>
      </section>
    );
  }

  return (
    <section className="mt-6 rounded-2xl border border-border bg-card px-6 py-5">
      <h2 className="font-display text-2xl font-semibold text-foreground">{copy.heading}</h2>
      <form
        className="mt-4 space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          void submit();
        }}
      >
        <label className="block">
          <span className="font-body text-sm text-foreground">{copy.emailLabel}</span>
          <input
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 font-body text-sm text-foreground"
          />
        </label>
        <label className="block">
          <span className="font-body text-sm text-foreground">{copy.firstNameLabel}</span>
          <input
            type="text"
            autoComplete="given-name"
            value={firstName}
            onChange={(event) => setFirstName(event.target.value)}
            className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 font-body text-sm text-foreground"
          />
        </label>
        <label className="flex items-start gap-2 font-body text-sm text-foreground">
          <input
            type="checkbox"
            checked={marketingOptIn}
            onChange={(event) => setMarketingOptIn(event.target.checked)}
            className="mt-1"
          />
          <span>{copy.marketingOptIn}</span>
        </label>
        <p className="font-body text-xs text-muted-foreground">
          {copy.consent}{" "}
          <a href={privacyUrl} className="underline">
            {copy.privacyLabel}
          </a>
        </p>
        {phase === "error" ? (
          <p className="font-body text-sm text-red-600" role="alert">
            {copy.error}
          </p>
        ) : null}
        <ScanTurnstile ref={turnstileRef} compact />
        <button
          type="submit"
          aria-busy={phase === "checking"}
          className="inline-flex items-center rounded-full bg-primary px-5 py-2.5 font-body text-sm font-semibold text-primary-foreground hover:opacity-90"
        >
          {phase === "checking" ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
              {copy.checking}
            </>
          ) : (
            copy.button
          )}
        </button>
      </form>
    </section>
  );
}
