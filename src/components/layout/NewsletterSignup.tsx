import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "../ui/button";
import { isTurnstileConfigured } from "../../lib/leadCapture";
import { supabase } from "../../config/supabase";

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export function NewsletterSignup({ source = "footer" }: { source?: string }) {
  const [email, setEmail] = useState("");
  const [token, setToken] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const widgetContainerRef = useRef<HTMLDivElement | null>(null);
  const widgetIdRef = useRef<string | null>(null);
  const turnstileReady = isTurnstileConfigured();

  useEffect(() => {
    if (!turnstileReady || done) return;

    const sitekey = (import.meta.env.VITE_TURNSTILE_SITE_KEY as string | undefined)?.trim();
    if (!sitekey) return;

    const renderWidget = () => {
      const turnstile = (
        window as unknown as { turnstile?: { render: Function; remove: Function } }
      ).turnstile;
      if (!turnstile) return;
      const el = widgetContainerRef.current;
      if (!el || widgetIdRef.current) return;
      try {
        widgetIdRef.current = turnstile.render(el, {
          sitekey,
          callback: (value: string) => {
            setLoadError(null);
            setToken(value);
          },
          "expired-callback": () => setToken(null),
          "error-callback": () => {
            setLoadError(
              "Verification could not load. Try refreshing, or pause ad blockers for this site.",
            );
            setToken(null);
          },
        }) as string;
      } catch (err) {
        console.warn("[NewsletterSignup] Turnstile render error", err);
        setLoadError("Verification could not load. Please refresh the page.");
      }
    };

    const ensureScript = (): Promise<void> => {
      const win = window as unknown as { turnstile?: unknown };
      if (win.turnstile) return Promise.resolve();
      return new Promise((resolve, reject) => {
        const existing = document.querySelector<HTMLScriptElement>(
          'script[src*="challenges.cloudflare.com/turnstile/v0/api.js"]',
        );
        if (existing) {
          if (win.turnstile) {
            resolve();
            return;
          }
          existing.addEventListener("load", () => resolve(), { once: true });
          existing.addEventListener(
            "error",
            () => reject(new Error("Turnstile script load error")),
            { once: true },
          );
          return;
        }
        const script = document.createElement("script");
        script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
        script.async = true;
        script.defer = true;
        script.onload = () => resolve();
        script.onerror = () => reject(new Error("Turnstile script load error"));
        document.body.appendChild(script);
      });
    };

    let cancelled = false;
    void ensureScript()
      .then(() => {
        if (!cancelled) queueMicrotask(renderWidget);
      })
      .catch(() => {
        if (!cancelled) {
          setLoadError("Could not load verification. Check your connection and try again.");
        }
      });

    return () => {
      cancelled = true;
      const turnstile = (
        window as unknown as { turnstile?: { remove: (id: string) => void } }
      ).turnstile;
      if (turnstile && widgetIdRef.current) {
        try {
          turnstile.remove(widgetIdRef.current);
        } catch {
          /* ignore */
        }
        widgetIdRef.current = null;
      }
      setToken(null);
    };
  }, [turnstileReady, done]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    const trimmed = email.trim();
    if (!isValidEmail(trimmed)) {
      setSubmitError("Enter a valid email address.");
      return;
    }
    if (turnstileReady && !token) {
      setSubmitError("Complete the verification check before continuing.");
      return;
    }

    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke("capture-newsletter-signup", {
        body: {
          email: trimmed,
          token,
          source,
        },
      });

      if (error) {
        let message = "Something went wrong. Please try again.";
        try {
          const ctx = (error as { context?: Response })?.context;
          if (ctx && typeof ctx.json === "function") {
            const body = (await ctx.json()) as { error?: string };
            if (body?.error) message = body.error;
          }
        } catch {
          /* ignore */
        }
        setSubmitError(message);
        return;
      }

      if (!(data as { ok?: boolean } | null)?.ok) {
        setSubmitError("Something went wrong. Please try again.");
        return;
      }

      setDone(true);
    } catch (err) {
      console.error("[NewsletterSignup] submit failed", err);
      setSubmitError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (done) {
    return (
      <div className="rounded-design border border-black bg-button-green/20 p-5">
        <p className="font-['Fraunces'] text-lg font-bold text-text-dark">You're on the list</p>
        <p className="mt-1 text-sm text-text-dark/80">
          Thanks — we'll send practical marketing ideas, not fluff.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div>
        <h4 className="font-['Fraunces'] text-lg font-bold text-text-dark">Stay in the loop</h4>
        <p className="mt-1 text-sm text-text-dark/80">
          Occasional tips on customers, content and growth. Unsubscribe anytime.
        </p>
      </div>

      <div className="space-y-2">
        <label htmlFor="newsletter-email" className="sr-only">
          Email
        </label>
        <input
          id="newsletter-email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@company.com"
          className="w-full rounded-design border border-black bg-white px-4 py-3 focus:outline-none"
        />
      </div>

      {turnstileReady ? (
        <div className="space-y-2">
          <div ref={widgetContainerRef} />
          {loadError ? <p className="text-sm text-red-600">{loadError}</p> : null}
        </div>
      ) : (
        <p className="text-sm text-amber-700">
          Verification isn&apos;t configured in this environment, so signup is unavailable here.
        </p>
      )}

      {submitError ? <p className="text-sm text-red-600">{submitError}</p> : null}

      <Button
        type="submit"
        disabled={submitting || !turnstileReady}
        className="w-full rounded-design border border-black bg-button-green font-['Fraunces'] font-bold text-text-dark hover:bg-button-green/90"
      >
        {submitting ? (
          <span className="inline-flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            Joining…
          </span>
        ) : (
          "Subscribe"
        )}
      </Button>
    </form>
  );
}
