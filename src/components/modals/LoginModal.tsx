import { useEffect, useRef, useState } from "react";
// AuthModalProvider must stay inside <Router>: LegalAgreementCheckbox uses
// react-router <Link>, and a missing NavigationContext white-screens the app
// ("Cannot destructure property 'basename'").
import { supabase } from "../../config/supabase";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { useAuth } from "../../contexts/AuthContext";
import { GoogleIcon } from "../icons/GoogleIcon";
import { signUpWithEmail } from "../../lib/supabaseAuth";
import { getFirstTouchParams, track } from "../../lib/analytics";
import {
  buildLinkBody,
  clearPendingGuestLink,
  getPendingGuestLink,
  setPendingGuestLink,
} from "../../utils/pendingGuestLink";
import { isRealUser } from "../../utils/isRealUser";
import {
  LegalAgreementCheckbox,
} from "../legal/LegalAgreement";
import { LegalAgreementRequiredModal } from "../legal/LegalAgreementRequiredModal";
import { useLegalAgreementGate } from "../../hooks/useLegalAgreementGate";
import { stashPendingLegalAcceptance } from "../../lib/legal";
import {
  checkoutResumePath,
  getCheckoutPlanFromPath,
  getPendingCheckoutPlan,
} from "../../utils/pendingCheckout";

const RESEND_COOLDOWN_SECONDS = 30;

type ResendUiState = { status: "ready" } | { status: "cooldown"; seconds: number };

function isUnconfirmedEmail(error: { message?: string; code?: string | null }): boolean {
  if (error.code === "email_not_confirmed") return true;
  return /email not confirmed/i.test(error.message ?? "");
}

function friendlyCodeError(error: { message?: string; code?: string | null }): string {
  const message = error.message ?? "";
  const expired = error.code === "otp_expired" || /expired/i.test(message);
  const invalid = /invalid|otp|token/i.test(message);
  if (expired && invalid) {
    return "That code doesn't match or has expired. Try again, or request a new one.";
  }
  if (expired) return "That code has expired. Request a new one.";
  if (invalid) return "That code doesn't match. Try again.";
  return "Couldn't verify that code. Try again.";
}

function signupCallbackUrl(): string {
  return `${window.location.origin}/auth/callback?next=${encodeURIComponent("/dashboard")}`;
}

export type AuthFormMode = "signin" | "signup";

type LoginModalProps = {
  isOpen: boolean;
  email: string | null;
  guestRef: string | null;
  sessionId: string | null;
  onClose: () => void;
  /** Decided by the entry point that opened the modal. Defaults to signup. */
  initialMode?: AuthFormMode;
  /** Post-auth path. Trial intent is embedded when a pending checkout plan exists. */
  redirectPath?: string;
};

/** Keep an explicit trial click in the auth redirect so a new browser can resume Stripe. */
function resolvePostAuthPath(explicit?: string | null): string {
  const pending = getPendingCheckoutPlan();
  if (explicit && explicit.startsWith("/")) {
    if (pending && !getCheckoutPlanFromPath(explicit)) {
      const base = explicit.split("?")[0] || "/dashboard";
      return checkoutResumePath(pending, base);
    }
    return explicit;
  }
  if (pending) return checkoutResumePath(pending, "/dashboard");
  const next = new URLSearchParams(window.location.search).get("next");
  if (next && next.startsWith("/")) return next;
  return "/dashboard";
}

export function LoginModal({
  isOpen,
  email,
  guestRef,
  sessionId,
  onClose,
  initialMode = "signup",
  redirectPath,
}: LoginModalProps) {
  const { signInWithGoogle } = useAuth();
  const handleClose = () => {
    onClose();
  };

  const redirectAfterLogin = async () => {
    const { data } = await supabase.auth.getSession();
    const sessionUser = data?.session?.user ?? null;
    const target = isRealUser(sessionUser) ? resolvePostAuthPath(redirectPath) : "/guest-dashboard";
    window.location.assign(`${window.location.origin}${target}`);
  };
  const [localEmail, setLocalEmail] = useState(email ?? "");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<AuthFormMode>(initialMode);
  const [appliedOpenKey, setAppliedOpenKey] = useState<AuthFormMode | null>(null);
  const [accountExists, setAccountExists] = useState(false);
  const [awaitingCode, setAwaitingCode] = useState(false);
  const [confirmEmail, setConfirmEmail] = useState("");
  const [code, setCode] = useState("");
  const [resendUi, setResendUi] = useState<ResendUiState>({ status: "ready" });
  const [resendError, setResendError] = useState(false);
  const [resendBusy, setResendBusy] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [legalAgreed, setLegalAgreed] = useState(true);
  const { open: legalModalOpen, gate, closeModal, confirmAgreement } = useLegalAgreementGate();
  const busyRef = useRef(false);

  useEffect(() => {
    setLocalEmail(email ?? "");
  }, [email]);

  // Apply the entry-point mode when the modal opens, before paint, without
  // resetting it when the user later toggles sign-in / sign-up.
  const openKey = isOpen ? initialMode : null;
  if (openKey !== appliedOpenKey) {
    setAppliedOpenKey(openKey);
    if (openKey) {
      setMode(openKey);
      setPassword("");
      setAccountExists(false);
      setError(null);
      setAwaitingCode(false);
      setCode("");
      setConfirmEmail("");
      setResendUi({ status: "ready" });
      setResendError(false);
      busyRef.current = false;
    }
  }

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") handleClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen]);

  useEffect(() => {
    if (resendUi.status !== "cooldown") return;
    const timer = window.setTimeout(() => {
      setResendUi((current) => {
        if (current.status !== "cooldown") return current;
        if (current.seconds <= 1) return { status: "ready" };
        return { status: "cooldown", seconds: current.seconds - 1 };
      });
    }, 1000);
    return () => window.clearTimeout(timer);
  }, [resendUi]);

  if (!isOpen) return null;

  const handleGoogle = () => {
    gate(legalAgreed, async () => {
      setError(null);
      stashPendingLegalAcceptance();
      setGoogleLoading(true);
      const postAuthPath = resolvePostAuthPath(redirectPath);
      const { error: oauthError } = await signInWithGoogle(postAuthPath);
      if (oauthError) {
        setError(oauthError.message);
        setGoogleLoading(false);
      }
    });
  };

  const showCodeStep = (emailAddress: string, sent: boolean) => {
    setConfirmEmail(emailAddress);
    setLocalEmail(emailAddress);
    setCode("");
    setError(null);
    setAccountExists(false);
    setResendError(!sent);
    setResendUi(sent ? { status: "cooldown", seconds: RESEND_COOLDOWN_SECONDS } : { status: "ready" });
    setAwaitingCode(true);
  };

  const finishVerifiedSignup = () => {
    track("sign_up", { method: "email", ...getFirstTouchParams() });
    try {
      window.dispatchEvent(new Event("subscription:changed"));
      window.dispatchEvent(new Event("auth:changed"));
    } catch {}
    onClose();
  };

  const performSignIn = async (resolvedEmail: string, resolvedPassword: string) => {
    if (busyRef.current) return;
    if (!resolvedEmail) {
      setError("Enter your email to continue.");
      return;
    }
    if (!resolvedPassword) {
      setError("Enter your password to continue.");
      return;
    }
    if (resolvedEmail !== localEmail) setLocalEmail(resolvedEmail);
    if (resolvedPassword !== password) setPassword(resolvedPassword);
    busyRef.current = true;
    setLoading(true);
    setError(null);
    setAccountExists(false);
    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: resolvedEmail,
        password: resolvedPassword,
      });
      if (signInError) {
        if (isUnconfirmedEmail(signInError)) {
          try {
            const { error: resendErrorResult } = await supabase.auth.resend({
              type: "signup",
              email: resolvedEmail,
            });
            showCodeStep(resolvedEmail, !resendErrorResult);
          } catch {
            showCodeStep(resolvedEmail, false);
          }
          return;
        }
        setError(signInError.message);
        return;
      }

      const pending = getPendingGuestLink();
      const hasExplicitIds = Boolean(guestRef || sessionId);
      const normalizedEmail = resolvedEmail || null;

      if (hasExplicitIds || pending) {
        setPendingGuestLink({
          guestRef: guestRef || undefined,
          sessionId: sessionId || undefined,
          email: normalizedEmail,
        });

        const body = buildLinkBody();
        if (body.guest_ref || body.session_id) {
          const { error: linkError } = await supabase.functions.invoke("link-guest-checkout", {
            body,
          });
          if (!linkError) clearPendingGuestLink();
        }
      }

      try {
        window.dispatchEvent(new Event("subscription:changed"));
        window.dispatchEvent(new Event("auth:changed"));
      } catch {}

      onClose();
      await redirectAfterLogin();
    } catch {
      setError("Login failed. Please try again.");
    } finally {
      busyRef.current = false;
      setLoading(false);
    }
  };

  const performSignUp = async (resolvedEmail: string, resolvedPassword: string) => {
    if (busyRef.current) return;
    if (!resolvedEmail) {
      setError("Enter your email to continue.");
      return;
    }
    if (resolvedPassword.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    busyRef.current = true;
    setLoading(true);
    setError(null);
    setAccountExists(false);
    try {
      stashPendingLegalAcceptance();
      const outcome = await signUpWithEmail({
        email: resolvedEmail,
        password: resolvedPassword,
        emailRedirectTo: signupCallbackUrl(),
      });

      if (outcome.status === "error") {
        setError(outcome.message);
        return;
      }
      if (outcome.status === "existing") {
        setAccountExists(true);
        return;
      }
      if (outcome.status === "confirm_email") {
        showCodeStep(resolvedEmail, true);
        return;
      }

      finishVerifiedSignup();
    } catch {
      setError("Sign up failed. Please try again.");
    } finally {
      busyRef.current = false;
      setLoading(false);
    }
  };

  const verifyCode = async (rawCode: string) => {
    const token = rawCode.replace(/\D/g, "").slice(0, 6);
    if (token.length !== 6) {
      setError("Enter the 6-digit code from the email.");
      return;
    }
    if (busyRef.current) return;
    busyRef.current = true;
    setLoading(true);
    setError(null);
    try {
      const { error: verifyError } = await supabase.auth.verifyOtp({
        email: confirmEmail,
        token,
        type: "signup",
      });
      if (verifyError) {
        setError(friendlyCodeError(verifyError));
        setCode("");
        return;
      }
      finishVerifiedSignup();
    } catch {
      setError("Couldn't verify that code. Try again.");
      setCode("");
    } finally {
      busyRef.current = false;
      setLoading(false);
    }
  };

  const switchMode = (next: AuthFormMode) => {
    setMode(next);
    setPassword("");
    setError(null);
    setAccountExists(false);
    setAwaitingCode(false);
    setCode("");
    setResendUi({ status: "ready" });
    setResendError(false);
  };

  const handleResendCode = async () => {
    if (resendBusy || resendUi.status !== "ready" || loading) return;
    setResendBusy(true);
    setResendError(false);
    try {
      const { error: resendErrorResult } = await supabase.auth.resend({
        type: "signup",
        email: confirmEmail,
      });
      if (resendErrorResult) {
        setResendError(true);
        return;
      }
      setResendUi({ status: "cooldown", seconds: RESEND_COOLDOWN_SECONDS });
    } catch {
      setResendError(true);
    } finally {
      setResendBusy(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (loading || busyRef.current) return;
    const form = e.currentTarget;
    const formData = new FormData(form);
    const emailFromForm = String(formData.get("email") ?? "").trim();
    const passwordFromForm = String(formData.get("password") ?? "");
    const submitEmail = emailFromForm || localEmail.trim();
    const submitPassword = passwordFromForm || password;
    if (mode === "signup") {
      gate(legalAgreed, () => void performSignUp(submitEmail, submitPassword));
      return;
    }
    await performSignIn(submitEmail, submitPassword);
  };

  const handleCodeSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    void verifyCode(code);
  };

  const handleCodeChange = (value: string) => {
    const next = value.replace(/\D/g, "").slice(0, 6);
    setCode(next);
    if (error) setError(null);
    if (next.length === 6) void verifyCode(next);
  };

  return (
    <>
      <LegalAgreementRequiredModal
        open={legalModalOpen}
        onClose={closeModal}
        onAgree={() => confirmAgreement(setLegalAgreed)}
      />
    <div className="auth-modal-backdrop fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="auth-modal-panel w-full max-w-md p-6 sm:p-8">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h2 className="mb-2 break-words font-['Fraunces'] text-xl font-bold leading-snug text-[#101A26] sm:text-2xl">
              {awaitingCode ? "Check your email" : mode === "signup" ? "Create your account" : "Welcome back"}
            </h2>
            {awaitingCode ? (
              <p className="break-words font-['Plus_Jakarta_Sans'] text-sm leading-relaxed text-[#101A26]/70">
                We sent a 6-digit code to <span className="break-all font-semibold text-[#101A26]">{confirmEmail}</span>.
              </p>
            ) : (
              <p className="font-['Plus_Jakarta_Sans'] text-sm leading-relaxed text-[#101A26]/70">
                New here? Signing in with Google creates your account automatically.
              </p>
            )}
          </div>
          <button
            onClick={() => {
              void handleClose();
            }}
            className="auth-modal-close p-2 font-['Plus_Jakarta_Sans'] transition-colors"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {awaitingCode ? (
          <form onSubmit={handleCodeSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="login-code" className="font-['Plus_Jakarta_Sans'] font-medium text-[#101A26]">
                Code
              </Label>
              <Input
                id="login-code"
                name="code"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                autoFocus
                value={code}
                onChange={(e) => handleCodeChange(e.target.value)}
                disabled={loading}
                aria-invalid={error ? true : undefined}
                className="auth-modal-input px-4 text-center text-base tracking-[0.3em]"
              />
            </div>
            {error ? (
              <p className="auth-modal-error font-['Plus_Jakarta_Sans'] text-sm">{error}</p>
            ) : (
              <p className="font-['Plus_Jakarta_Sans'] text-sm leading-relaxed text-[#101A26]/70">
                Can't see it? Check your junk or spam folder.
              </p>
            )}
            <Button
              type="submit"
              data-track-id="auth_verify_code"
              data-track-location="auth_modal"
              disabled={loading}
              className="auth-modal-primary h-auto w-full rounded-full px-6 py-3 font-['Plus_Jakarta_Sans'] font-semibold hover:bg-[#EBFD84]/90 hover:shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
            >
              {loading ? "Verifying..." : "Verify"}
            </Button>
            <div className="flex flex-col items-start gap-3">
              <button
                type="button"
                data-track-id="auth_resend_code"
                data-track-location="auth_modal"
                onClick={() => void handleResendCode()}
                disabled={resendBusy || loading || resendUi.status === "cooldown"}
                className="min-h-11 text-left font-['Plus_Jakarta_Sans'] text-sm text-[#101A26]/70 underline-offset-4 transition-colors hover:text-[#101A26] hover:underline disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:text-[#101A26]/70 disabled:hover:no-underline"
              >
                {resendUi.status === "cooldown" ? `Resend code (${resendUi.seconds}s)` : "Resend code"}
              </button>
              {resendError ? (
                <p className="auth-modal-error font-['Plus_Jakarta_Sans'] text-sm">
                  Couldn't resend. Please try again shortly.
                </p>
              ) : null}
              <button
                type="button"
                onClick={() => {
                  setAwaitingCode(false);
                  setCode("");
                  setError(null);
                  setResendError(false);
                  setResendUi({ status: "ready" });
                  setMode("signup");
                }}
                className="min-h-11 text-left font-['Plus_Jakarta_Sans'] text-sm text-[#101A26]/70 underline-offset-4 transition-colors hover:text-[#101A26] hover:underline"
              >
                Use a different email
              </button>
            </div>
          </form>
        ) : (
        <>
        <div className="mb-6">
          <LegalAgreementCheckbox
            id="login-modal-legal"
            checked={legalAgreed}
            onCheckedChange={setLegalAgreed}
            disabled={loading || googleLoading}
          />
        </div>

        <button
          type="button"
          onClick={() => void handleGoogle()}
          disabled={googleLoading || loading}
          className="auth-modal-google flex w-full items-center justify-center gap-3 px-4 py-3 text-sm disabled:opacity-50"
        >
          <GoogleIcon />
          {googleLoading ? "Redirecting…" : "Continue with Google"}
        </button>

        <div className="relative my-5">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-[#101A26]/15" />
          </div>
          <div className="relative flex justify-center text-xs">
            <span className="bg-[#FBFAF0] px-2 font-['Plus_Jakarta_Sans'] text-[#101A26]/55">
              or continue with email
            </span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="login-email" className="font-['Plus_Jakarta_Sans'] font-medium text-[#101A26]">
              Email
            </Label>
          <Input
            id="login-email"
            type="email"
            name="email"
            autoComplete="email"
            value={localEmail}
            onChange={(e) => setLocalEmail(e.target.value)}
            onInput={(e) => setLocalEmail((e.target as HTMLInputElement).value)}
            readOnly={Boolean(email)}
            required
            className="auth-modal-input px-4"
          />
          </div>

          <div className="space-y-2">
            <Label htmlFor="login-password" className="font-['Plus_Jakarta_Sans'] font-medium text-[#101A26]">
              Password
            </Label>
            <Input
              id="login-password"
              type="password"
              name="password"
              autoComplete={mode === "signup" ? "new-password" : "current-password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onInput={(e) => setPassword((e.target as HTMLInputElement).value)}
              minLength={mode === "signup" ? 8 : undefined}
              className="auth-modal-input px-4"
              required
            />
          </div>

          {accountExists ? (
            <div className="space-y-2">
              <p className="auth-modal-error font-['Plus_Jakarta_Sans'] text-sm">
                An account with this email already exists.
              </p>
              <button
                type="button"
                data-track-id="auth_switch_to_signin"
                onClick={() => switchMode("signin")}
                className="font-['Plus_Jakarta_Sans'] text-sm text-[#101A26] underline-offset-4 transition-colors hover:underline"
              >
                Sign in instead
              </button>
            </div>
          ) : error ? (
            <p className="auth-modal-error font-['Plus_Jakarta_Sans'] text-sm">{error}</p>
          ) : null}

          <Button
            type="submit"
            disabled={loading}
            onMouseDown={(e) => {
              // Avoid blur/autofill sync swallowing the first submit click.
              e.preventDefault();
            }}
            className="auth-modal-primary h-auto w-full rounded-full px-6 py-3 font-['Plus_Jakarta_Sans'] font-semibold hover:bg-[#EBFD84]/90 hover:shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
          >
            {loading
              ? mode === "signup"
                ? "Creating account..."
                : "Signing in..."
              : mode === "signup"
                ? "Create account"
                : "Sign in"}
          </Button>

          <button
            type="button"
            data-track-id={mode === "signin" ? "auth_switch_to_signup" : "auth_switch_to_signin"}
            onClick={() => switchMode(mode === "signin" ? "signup" : "signin")}
            className="w-full text-left font-['Plus_Jakarta_Sans'] text-sm text-[#101A26]/70 underline-offset-4 transition-colors hover:text-[#101A26] hover:underline"
          >
            {mode === "signin"
              ? "New here? Create an account"
              : "Already have an account? Sign in"}
          </button>
        </form>
        </>
        )}
      </div>
    </div>
    </>
  );
}
