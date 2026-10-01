import { forwardRef, useImperativeHandle, useEffect, useRef, useState } from "react";
import { isTurnstileConfigured } from "../../lib/leadCapture";

export type ScanTurnstileHandle = {
  /** Reset the widget and wait for a fresh, unused token (Turnstile tokens are single-use). */
  refreshToken: () => Promise<string | null>;
  /**
   * Resolve with the token already issued, or the next one, without resetting
   * the in-flight interaction-only challenge.
   */
  waitForToken: (timeoutMs?: number) => Promise<string | null>;
};

type TurnstileApi = {
  render: Function;
  remove: (id: string) => void;
  reset: (id: string) => void;
};

function getTurnstile(): TurnstileApi | undefined {
  return (window as unknown as { turnstile?: TurnstileApi }).turnstile;
}

const TOKEN_TIMEOUT_MS = 15_000;
const WAIT_FOR_TOKEN_MS = 10_000;

export const ScanTurnstile = forwardRef<
  ScanTurnstileHandle,
  { className?: string; compact?: boolean; onToken?: (token: string) => void }
>(
  function ScanTurnstile({ className = "", compact = false, onToken }, ref) {
    const containerRef = useRef<HTMLDivElement | null>(null);
    const widgetIdRef = useRef<string | null>(null);
    const tokenRef = useRef<string | null>(null);
    const pendingResolverRef = useRef<((token: string | null) => void) | null>(null);
    const onTokenRef = useRef(onToken);
    onTokenRef.current = onToken;
    const [loadError, setLoadError] = useState<string | null>(null);
    const turnstileReady = isTurnstileConfigured();

    const resolvePending = (token: string | null) => {
      const resolve = pendingResolverRef.current;
      pendingResolverRef.current = null;
      resolve?.(token);
    };

    useImperativeHandle(
      ref,
      () => ({
        refreshToken: async () => {
          tokenRef.current = null;
          const started = Date.now();
          while (!widgetIdRef.current || !getTurnstile()) {
            if (Date.now() - started > TOKEN_TIMEOUT_MS) return null;
            await new Promise((r) => window.setTimeout(r, 50));
          }

          const turnstile = getTurnstile();
          const widgetId = widgetIdRef.current;
          if (!turnstile || !widgetId) return null;

          return new Promise<string | null>((resolve) => {
            const timeout = window.setTimeout(() => {
              if (pendingResolverRef.current === wrapped) {
                pendingResolverRef.current = null;
                resolve(null);
              }
            }, TOKEN_TIMEOUT_MS);

            const wrapped = (token: string | null) => {
              window.clearTimeout(timeout);
              resolve(token);
            };
            pendingResolverRef.current = wrapped;

            try {
              turnstile.reset(widgetId);
            } catch {
              window.clearTimeout(timeout);
              pendingResolverRef.current = null;
              resolve(null);
            }
          });
        },
        waitForToken: (timeoutMs = WAIT_FOR_TOKEN_MS) => {
          const take = (token: string | null) => {
            if (token && tokenRef.current === token) tokenRef.current = null;
            return token;
          };
          if (tokenRef.current) return Promise.resolve(take(tokenRef.current));
          return new Promise<string | null>((resolve) => {
            let settled = false;
            const finish = (token: string | null) => {
              if (settled) return;
              settled = true;
              window.clearTimeout(timeout);
              if (pendingResolverRef.current === wrapped) pendingResolverRef.current = null;
              resolve(take(token));
            };
            const timeout = window.setTimeout(() => finish(tokenRef.current), timeoutMs);
            const wrapped = (token: string | null) => finish(token ?? tokenRef.current);
            pendingResolverRef.current = wrapped;
            if (tokenRef.current) finish(tokenRef.current);
          });
        },
      }),
      [],
    );

    useEffect(() => {
      if (!turnstileReady) return;

      const sitekey = (import.meta.env.VITE_TURNSTILE_SITE_KEY as string | undefined)?.trim();
      if (!sitekey) return;

      const renderWidget = () => {
        const turnstile = getTurnstile();
        if (!turnstile) return;
        const el = containerRef.current;
        if (!el || widgetIdRef.current) return;
        try {
          widgetIdRef.current = turnstile.render(el, {
            sitekey,
            appearance: "interaction-only",
            callback: (value: string) => {
              setLoadError(null);
              tokenRef.current = value;
              onTokenRef.current?.(value);
              resolvePending(value);
            },
            "expired-callback": () => {
              tokenRef.current = null;
              resolvePending(null);
            },
            "error-callback": () => {
              setLoadError(
                "Verification could not load. Try refreshing, or pause ad blockers for this site.",
              );
              tokenRef.current = null;
              resolvePending(null);
            },
          }) as string;
        } catch (err) {
          console.warn("[ScanTurnstile] Turnstile render error", err);
          setLoadError("Verification could not load. Please refresh the page.");
        }
      };

      const ensureScript = (): Promise<void> => {
        if (getTurnstile()) return Promise.resolve();
        return new Promise((resolve, reject) => {
          const existing = document.querySelector<HTMLScriptElement>(
            'script[src*="challenges.cloudflare.com/turnstile/v0/api.js"]',
          );
          if (existing) {
            if (getTurnstile()) {
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
        resolvePending(null);
        const turnstile = getTurnstile();
        if (turnstile && widgetIdRef.current) {
          try {
            turnstile.remove(widgetIdRef.current);
          } catch {
            /* ignore */
          }
          widgetIdRef.current = null;
        }
        tokenRef.current = null;
      };
    }, [turnstileReady]);

    if (!turnstileReady) return null;

    return (
      <div className={`space-y-2 ${className}`}>
        <div
          ref={containerRef}
          data-compact={compact ? "true" : undefined}
          className={compact ? "flex items-start" : "min-h-[65px] flex items-start"}
          aria-label="Security verification"
        />
        {loadError ? (
          <p className="text-xs text-red-600 font-body" role="alert">
            {loadError}
          </p>
        ) : null}
      </div>
    );
  },
);
