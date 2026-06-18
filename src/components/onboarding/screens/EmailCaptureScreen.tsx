import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Input } from "../../ui/input";

interface EmailCaptureScreenProps {
  email: string;
  onEmailChange: (value: string) => void;
  onContinue: () => void;
  onBack: () => void;
  onTokenChange?: (token: string | null) => void;
  /** When Turnstile is configured, Enter must not bypass the widget (same rules as the main CTA). */
  turnstileRequired?: boolean;
  hasTurnstileToken?: boolean;
  hideEmailInput?: boolean;
}

export function EmailCaptureScreen({ 
  email, 
  onEmailChange, 
  onContinue,
  onTokenChange,
  turnstileRequired = false,
  hasTurnstileToken = false,
  hideEmailInput = false,
}: EmailCaptureScreenProps) {
  const widgetIdRef = useRef<string | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  /** Avoid re-running Turnstile setup when parent re-renders with a new `onTokenChange` identity. */
  const onTokenChangeRef = useRef(onTokenChange);
  onTokenChangeRef.current = onTokenChange;
  const [loadError, setLoadError] = useState<string | null>(null);

  const isValidEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key !== "Enter") return;
    if (!isValidEmail(email)) return;
    if (turnstileRequired && !hasTurnstileToken) {
      e.preventDefault();
      return;
    }
    onContinue();
  };

  // Load Turnstile once; re-render widget after StrictMode cleanup (do NOT gate whole effect with a ref).
  useEffect(() => {
    const sitekey = (import.meta.env.VITE_TURNSTILE_SITE_KEY as string | undefined)?.trim();
    if (!sitekey) return;

    const renderWidget = () => {
      if (!(window as any).turnstile) return;
      const el = containerRef.current;
      if (!el || widgetIdRef.current) return;
      try {
        widgetIdRef.current = (window as any).turnstile.render(el, {
          sitekey,
          callback: (token: string) => {
            setLoadError(null);
            if (import.meta.env.DEV) console.debug("[Turnstile] token received");
            onTokenChangeRef.current?.(token);
          },
          "expired-callback": () => {
            if (import.meta.env.DEV) console.debug("[Turnstile] expired");
            onTokenChangeRef.current?.(null);
          },
          "error-callback": () => {
            if (import.meta.env.DEV) console.debug("[Turnstile] error");
            setLoadError("Verification could not load. Try refreshing, or pause ad blockers for this site.");
            onTokenChangeRef.current?.(null);
          },
        });
      } catch (err) {
        console.warn("[Turnstile] render error", err);
        setLoadError("Verification could not load. Please refresh the page.");
        onTokenChangeRef.current?.(null);
      }
    };

    const ensureScript = (): Promise<void> => {
      if ((window as any).turnstile) return Promise.resolve();
      return new Promise((resolve, reject) => {
        const existing = document.querySelector<HTMLScriptElement>(
          'script[src*="challenges.cloudflare.com/turnstile/v0/api.js"]',
        );
        if (existing) {
          if ((window as any).turnstile) {
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
      if ((window as any).turnstile && widgetIdRef.current) {
        try {
          (window as any).turnstile.remove(widgetIdRef.current);
        } catch {
          /* ignore */
        }
        widgetIdRef.current = null;
      }
      onTokenChangeRef.current?.(null);
    };
  }, []);

  return (
    <div className="space-y-6 animate-fade-in-up">
      <h1 className="font-['Fraunces'] font-bold text-4xl">
        {hideEmailInput
          ? "Ready to generate your ICPs"
          : "Enter your email to access your ICPs"}
      </h1>
      <p className="text-foreground/70 max-w-md">
        {hideEmailInput
          ? "We'll use your account email and generate your ICPs for your dashboard."
          : "Enter your email to generate your ICP and unlock access to it in your dashboard."}
      </p>
      
      <div className="space-y-4 pt-4">
        {!hideEmailInput && (
          <Input
            type="email"
            value={email}
            onChange={(e) => onEmailChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="your@email.com"
            className="border border-black rounded-design px-4 py-6 bg-white text-foreground placeholder:text-foreground/40"
            autoFocus
          />
        )}

        {!hideEmailInput && (
          <div
            ref={containerRef}
            id="turnstile-container"
            className="pt-2 min-h-[72px] flex items-start"
            aria-label="Security verification"
          />
        )}
        {!hideEmailInput && loadError ? (
          <p className="text-xs text-red-600 font-['Inter'] max-w-md" role="alert">
            {loadError}
          </p>
        ) : null}

        <p className="text-xs text-foreground/60 max-w-md">
          By continuing, you agree to our{" "}
          <Link to="/privacy-policy" className="underline text-foreground">
            Privacy Policy
          </Link>{" "}
          and{" "}
          <Link to="/terms-of-service" className="underline text-foreground">
            Terms &amp; Conditions
          </Link>.
        </p>
      </div>
    </div>
  );
}
