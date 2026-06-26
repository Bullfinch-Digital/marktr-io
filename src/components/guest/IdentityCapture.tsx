import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { Link } from "react-router-dom";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { captureGuestLeadOnce, isTurnstileConfigured } from "../../lib/leadCapture";
import { isGuestLeadCaptured } from "../../lib/guestContext";

export type IdentityCaptureHandle = {
  /** Flush local edits to parent/context and attempt lead capture. */
  commitAll: () => { name: string; email: string };
  /** Current in-field values (may be ahead of parent/context). */
  getDraft: () => { name: string; email: string };
};

type IdentityCaptureProps = {
  initialName?: string;
  initialEmail?: string;
  onNameCommit: (value: string) => void;
  onEmailCommit: (value: string) => void;
  /** Draft values for parent validation (no guestContext write). */
  onDraftChange?: (draft: { name: string; email: string }) => void;
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

export const IdentityCapture = forwardRef<IdentityCaptureHandle, IdentityCaptureProps>(
  function IdentityCapture(
    {
      initialName = "",
      initialEmail = "",
      onNameCommit,
      onEmailCommit,
      onDraftChange,
      captureSource,
      showName = true,
      showEmail = true,
      onTokenChange,
      className = "",
    },
    ref
  ) {
    /** Snapshot visibility at mount — blur/commit must not hide fields mid-form. */
    const [fieldVisibility] = useState(() => ({
      showName: showName ?? true,
      showEmail: showEmail ?? true,
    }));

    const widgetIdRef = useRef<string | null>(null);
    const containerRef = useRef<HTMLDivElement | null>(null);
    const onTokenChangeRef = useRef(onTokenChange);
    onTokenChangeRef.current = onTokenChange;
    const captureInFlightRef = useRef(false);
    const leadTokenRef = useRef<string | null>(null);

    const [localName, setLocalName] = useState(initialName);
    const [localEmail, setLocalEmail] = useState(initialEmail);
    const [leadToken, setLeadToken] = useState<string | null>(null);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [captureError, setCaptureError] = useState<string | null>(null);

    const localNameRef = useRef(localName);
    const localEmailRef = useRef(localEmail);
    localNameRef.current = localName;
    localEmailRef.current = localEmail;
    leadTokenRef.current = leadToken;

    const turnstileConfigured = isTurnstileConfigured();
    const showTurnstile =
      fieldVisibility.showEmail && turnstileConfigured && !isGuestLeadCaptured();

    useEffect(() => {
      setLocalName(initialName);
      setLocalEmail(initialEmail);
    }, [initialName, initialEmail]);

    const notifyDraft = useCallback(
      (name: string, email: string) => {
        onDraftChange?.({ name, email });
      },
      [onDraftChange]
    );

    const attemptLeadCapture = useCallback(
      async (email: string, name: string, token: string | null) => {
        if (!fieldVisibility.showEmail || isGuestLeadCaptured() || captureInFlightRef.current) return;

        const trimmedEmail = email.trim();
        if (!isValidEmail(trimmedEmail)) return;
        if (turnstileConfigured && !token) return;

        captureInFlightRef.current = true;
        setCaptureError(null);

        const ok = await captureGuestLeadOnce({
          email: trimmedEmail,
          name: name.trim() || null,
          token,
          source: captureSource,
        });

        captureInFlightRef.current = false;

        if (!ok && !isGuestLeadCaptured()) {
          setCaptureError("We couldn't save your email just now. You can continue — we'll try again.");
        }
      },
      [captureSource, fieldVisibility.showEmail, turnstileConfigured]
    );

    const commitName = useCallback(() => {
      const value = localName.trim();
      onNameCommit(value);
      return value;
    }, [localName, onNameCommit]);

    const commitEmail = useCallback(() => {
      const value = localEmail.trim();
      onEmailCommit(value);
      return value;
    }, [localEmail, onEmailCommit]);

    const tryLeadCapture = useCallback(() => {
      void attemptLeadCapture(localEmail, localName, leadTokenRef.current);
    }, [localEmail, localName, attemptLeadCapture]);

    useImperativeHandle(
      ref,
      () => ({
        commitAll: () => {
          const name = commitName();
          const email = commitEmail();
          void attemptLeadCapture(email, name, leadTokenRef.current);
          return { name, email };
        },
        getDraft: () => ({
          name: localNameRef.current.trim(),
          email: localEmailRef.current.trim(),
        }),
      }),
      [commitName, commitEmail, attemptLeadCapture]
    );

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
                leadTokenRef.current = token;
                onTokenChangeRef.current?.(token);
                void attemptLeadCapture(
                  localEmailRef.current,
                  localNameRef.current,
                  token
                );
              },
              "expired-callback": () => {
                setLeadToken(null);
                leadTokenRef.current = null;
                onTokenChangeRef.current?.(null);
              },
              "error-callback": () => {
                setLoadError("Verification could not load. Try refreshing, or pause ad blockers for this site.");
                setLeadToken(null);
                leadTokenRef.current = null;
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
        leadTokenRef.current = null;
        onTokenChangeRef.current?.(null);
      };
    }, [showTurnstile, attemptLeadCapture]);

    if (!fieldVisibility.showName && !fieldVisibility.showEmail) return null;

    return (
      <div className={`space-y-6 ${className}`}>
        {fieldVisibility.showName && (
          <div className="space-y-2">
            <Label htmlFor="guest-identity-name" className="font-['DM_Sans'] text-sm text-[#0D1833]">
              What should we call you?
            </Label>
            <Input
              id="guest-identity-name"
              type="text"
              value={localName}
              onChange={(e) => {
                const next = e.target.value;
                setLocalName(next);
                notifyDraft(next, localEmail);
              }}
              onBlur={commitName}
              placeholder="Your first name"
              className="border border-black rounded-design bg-white px-4 py-6 text-foreground placeholder:text-foreground/40"
            />
          </div>
        )}

        {fieldVisibility.showEmail && (
          <div className="space-y-2">
            <Label htmlFor="guest-identity-email" className="font-['DM_Sans'] text-sm text-[#0D1833]">
              Where should we send your results?
            </Label>
            <Input
              id="guest-identity-email"
              type="email"
              value={localEmail}
              onChange={(e) => {
                const next = e.target.value;
                setLocalEmail(next);
                notifyDraft(localName, next);
              }}
              onBlur={() => {
                commitEmail();
                tryLeadCapture();
              }}
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

        {fieldVisibility.showEmail && (
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
);
