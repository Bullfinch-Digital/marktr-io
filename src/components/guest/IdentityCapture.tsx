import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { captureGuestLeadOnce, isTurnstileConfigured } from "../../lib/leadCapture";
import { isGuestLeadCaptured } from "../../lib/guestContext";

type IdentityCaptureProps = {
  name: string;
  email: string;
  onNameChange: (value: string) => void;
  onEmailChange: (value: string) => void;
  /** Lead source tag written to onboarding_leads.source */
  captureSource: string;
  showName?: boolean;
  showEmail?: boolean;
  onTokenChange?: (token: string | null) => void;
  className?: string;
};

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export function IdentityCapture({
  name,
  email,
  onNameChange,
  onEmailChange,
  captureSource,
  showName = true,
  showEmail = true,
  onTokenChange,
  className = "",
}: IdentityCaptureProps) {
  const widgetIdRef = useRef<string | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const onTokenChangeRef = useRef(onTokenChange);
  onTokenChangeRef.current = onTokenChange;
  const captureInFlightRef = useRef(false);

  const [leadToken, setLeadToken] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [captureError, setCaptureError] = useState<string | null>(null);

  const turnstileConfigured = isTurnstileConfigured();
  const showTurnstile = showEmail && turnstileConfigured && !isGuestLeadCaptured();

  const attemptLeadCapture = useCallback(async () => {
    if (!showEmail || isGuestLeadCaptured() || captureInFlightRef.current) return;

    const trimmedEmail = email.trim();
    if (!isValidEmail(trimmedEmail)) return;
    if (turnstileConfigured && !leadToken) return;

    captureInFlightRef.current = true;
    setCaptureError(null);

    const ok = await captureGuestLeadOnce({
      email: trimmedEmail,
      name: name.trim() || null,
      token: leadToken,
      source: captureSource,
    });

    captureInFlightRef.current = false;

    if (!ok && !isGuestLeadCaptured()) {
      setCaptureError("We couldn't save your email just now. You can continue — we'll try again.");
    }
  }, [captureSource, email, leadToken, name, showEmail, turnstileConfigured]);

  useEffect(() => {
    void attemptLeadCapture();
  }, [attemptLeadCapture]);

  useEffect(() => {
    if (!showTurnstile) return;

    const sitekey = (import.meta.env.VITE_TURNSTILE_SITE_KEY as string | undefined)?.trim();
    if (!sitekey) return;

    const renderWidget = () => {
      if (!(window as unknown as { turnstile?: { render: Function; remove: Function } }).turnstile) {
        return;
      }
      const el = containerRef.current;
      if (!el || widgetIdRef.current) return;
      try {
        widgetIdRef.current = (window as unknown as { turnstile: { render: Function } }).turnstile.render(
          el,
          {
            sitekey,
            callback: (token: string) => {
              setLoadError(null);
              setLeadToken(token);
              onTokenChangeRef.current?.(token);
            },
            "expired-callback": () => {
              setLeadToken(null);
              onTokenChangeRef.current?.(null);
            },
            "error-callback": () => {
              setLoadError("Verification could not load. Try refreshing, or pause ad blockers for this site.");
              setLeadToken(null);
              onTokenChangeRef.current?.(null);
            },
          }
        );
      } catch (err) {
        console.warn("[IdentityCapture] Turnstile render error", err);
        setLoadError("Verification could not load. Please refresh the page.");
        onTokenChangeRef.current?.(null);
      }
    };

    const ensureScript = (): Promise<void> => {
      const win = window as unknown as { turnstile?: unknown };
      if (win.turnstile) return Promise.resolve();
      return new Promise((resolve, reject) => {
        const existing = document.querySelector<HTMLScriptElement>(
          'script[src*="challenges.cloudflare.com/turnstile/v0/api.js"]'
        );
        if (existing) {
          if (win.turnstile) {
            resolve();
            return;
          }
          existing.addEventListener("load", () => resolve(), { once: true });
          existing.addEventListener("error", () => reject(new Error("Turnstile script load error")), {
            once: true,
          });
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
        if (cancelled) return;
        queueMicrotask(renderWidget);
      })
      .catch(() => {
        if (!cancelled) {
          setLoadError("Could not load verification. Check your connection and try again.");
        }
      });

    return () => {
      cancelled = true;
      const turnstile = (window as unknown as { turnstile?: { remove: (id: string) => void } })
        .turnstile;
      if (turnstile && widgetIdRef.current) {
        try {
          turnstile.remove(widgetIdRef.current);
        } catch {
          /* ignore */
        }
        widgetIdRef.current = null;
      }
      setLeadToken(null);
      onTokenChangeRef.current?.(null);
    };
  }, [showTurnstile]);

  if (!showName && !showEmail) return null;

  return (
    <div className={`space-y-6 ${className}`}>
      {showName && (
        <div className="space-y-2">
          <Label htmlFor="guest-identity-name" className="font-['DM_Sans'] text-sm text-[#0D1833]">
            What should we call you?
          </Label>
          <Input
            id="guest-identity-name"
            type="text"
            value={name}
            onChange={(e) => onNameChange(e.target.value)}
            placeholder="Your first name"
            className="border border-black rounded-design bg-white px-4 py-6 text-foreground placeholder:text-foreground/40"
          />
        </div>
      )}

      {showEmail && (
        <div className="space-y-2">
          <Label htmlFor="guest-identity-email" className="font-['DM_Sans'] text-sm text-[#0D1833]">
            Where should we send your results?
          </Label>
          <Input
            id="guest-identity-email"
            type="email"
            value={email}
            onChange={(e) => onEmailChange(e.target.value)}
            placeholder="you@yourbusiness.com"
            className="border border-black rounded-design bg-white px-4 py-6 text-foreground placeholder:text-foreground/40"
          />
        </div>
      )}

      {showTurnstile && (
        <div
          ref={containerRef}
          className="min-h-[72px] flex items-start"
          aria-label="Security verification"
        />
      )}

      {loadError ? (
        <p className="text-xs text-red-600 font-['DM_Sans']" role="alert">
          {loadError}
        </p>
      ) : null}

      {captureError ? (
        <p className="text-xs text-amber-700 font-['DM_Sans']" role="status">
          {captureError}
        </p>
      ) : null}

      {showEmail && (
        <p className="text-xs text-muted-foreground max-w-md font-['DM_Sans']">
          By continuing, you agree to our{" "}
          <Link to="/privacy-policy" className="underline text-foreground">
            Privacy Policy
          </Link>{" "}
          and{" "}
          <Link to="/terms-of-service" className="underline text-foreground">
            Terms &amp; Conditions
          </Link>
          .
        </p>
      )}
    </div>
  );
}
