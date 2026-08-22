import { useEffect, useRef, useState } from "react";
import { ExternalLink, Loader2, X } from "lucide-react";
import { Button } from "../ui/button";
import { isTurnstileConfigured } from "../../lib/leadCapture";
import { supabase } from "../../config/supabase";

export type DownloadResource = {
  id: string;
  title: string;
  description: string;
  slug: string;
  thumbnail_url: string | null;
  related_video_url: string | null;
};

type Props = {
  resource: DownloadResource;
  onClose: () => void;
};

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export function DownloadGateModal({ resource, onClose }: Props) {
  const [email, setEmail] = useState("");
  const [token, setToken] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [expiresInSeconds, setExpiresInSeconds] = useState<number | null>(null);

  const widgetContainerRef = useRef<HTMLDivElement | null>(null);
  const widgetIdRef = useRef<string | null>(null);
  const turnstileReady = isTurnstileConfigured();

  useEffect(() => {
    if (!turnstileReady || downloadUrl) return;

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
        console.warn("[DownloadGateModal] Turnstile render error", err);
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
  }, [turnstileReady, downloadUrl]);

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
      const { data, error } = await supabase.functions.invoke("request-resource-download", {
        body: {
          resourceId: resource.id,
          slug: resource.slug,
          email: trimmed,
          token,
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

      const url = (data as { downloadUrl?: string } | null)?.downloadUrl;
      const expires = (data as { expiresInSeconds?: number } | null)?.expiresInSeconds;
      if (!url) {
        setSubmitError("Download link missing. Please try again.");
        return;
      }
      setDownloadUrl(url);
      setExpiresInSeconds(typeof expires === "number" ? expires : 600);
    } catch (err) {
      console.error("[DownloadGateModal] submit failed", err);
      setSubmitError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="download-gate-title"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md rounded-design border border-black bg-background p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-3 top-3 rounded-lg p-2 hover:bg-accent-grey/20"
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>

        {downloadUrl ? (
          <div className="space-y-4 pr-6">
            <h2 id="download-gate-title" className="font-['Fraunces'] text-2xl font-bold">
              Your download is ready
            </h2>
            <p className="text-sm text-foreground/70">
              Thanks — here&apos;s your link for{" "}
              <span className="font-medium">{resource.title}</span>
              {expiresInSeconds
                ? `. It expires in about ${Math.round(expiresInSeconds / 60)} minutes.`
                : "."}
            </p>
            <a
              href={downloadUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex w-full items-center justify-center rounded-design border border-black bg-button-green px-4 py-3 font-['Fraunces'] font-bold text-text-dark transition-all hover:bg-button-green/90 hover:shadow-lg"
            >
              Download PDF
            </a>
            <button
              type="button"
              onClick={onClose}
              className="w-full text-sm text-foreground/70 underline hover:text-foreground"
            >
              Close
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 pr-6">
            <div>
              <h2 id="download-gate-title" className="font-['Fraunces'] text-2xl font-bold">
                Get your free download
              </h2>
              <p className="mt-2 text-sm text-foreground/70">
                Enter your email to unlock{" "}
                <span className="font-medium">{resource.title}</span>.
              </p>
            </div>

            {resource.related_video_url ? (
              <a
                href={resource.related_video_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-sm text-foreground/80 underline hover:text-foreground"
              >
                Watch the video
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            ) : null}

            <div className="space-y-2">
              <label htmlFor="download-email" className="text-sm font-medium">
                Email
              </label>
              <input
                id="download-email"
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
                Verification isn&apos;t configured in this environment, so downloads can&apos;t be
                unlocked here.
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
                  Unlocking…
                </span>
              ) : (
                "Unlock download"
              )}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
