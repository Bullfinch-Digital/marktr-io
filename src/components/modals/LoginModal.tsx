import { useEffect, useState } from "react";
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

const RESEND_COOLDOWN_SECONDS = 60;
const RESEND_SENT_NOTICE_MS = 3000;

type ResendUiState =
  | { status: "ready" }
  | { status: "cooldown"; seconds: number }
  | { status: "sent" };

export type AuthFormMode = "signin" | "signup";

type LoginModalProps = {
  isOpen: boolean;
  email: string | null;
  guestRef: string | null;
  sessionId: string | null;
  onClose: () => void;
  /** Decided by the entry point that opened the modal. Defaults to signup. */
  initialMode?: AuthFormMode;
};

export function LoginModal({
  isOpen,
  email,
  guestRef,
  sessionId,
  onClose,
  initialMode = "signup",
}: LoginModalProps) {
  const { signInWithGoogle } = useAuth();
  const handleClose = () => {
    onClose();
  };

  const redirectAfterLogin = async () => {
    const params = new URLSearchParams(window.location.search);
    const next = params.get("next");
    if (next && next.startsWith("/")) {
      window.location.assign(`${window.location.origin}${next}`);
      return;
    }
    const { data } = await supabase.auth.getSession();
    const sessionUser = data?.session?.user ?? null;
    const target = isRealUser(sessionUser) ? "/dashboard" : "/guest-dashboard";
    window.location.assign(`${window.location.origin}${target}`);
  };
  const [localEmail, setLocalEmail] = useState(email ?? "");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<AuthFormMode>(initialMode);
  const [appliedOpenKey, setAppliedOpenKey] = useState<AuthFormMode | null>(null);
  const [accountExists, setAccountExists] = useState(false);
  const [awaitingConfirm, setAwaitingConfirm] = useState(false);
  const [confirmEmail, setConfirmEmail] = useState("");
  const [confirmRedirectTo, setConfirmRedirectTo] = useState("");
  const [resendUi, setResendUi] = useState<ResendUiState>({ status: "ready" });
  const [resendError, setResendError] = useState(false);
  const [resendBusy, setResendBusy] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [legalAgreed, setLegalAgreed] = useState(true);
  const { open: legalModalOpen, gate, closeModal, confirmAgreement } = useLegalAgreementGate();

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
      setAwaitingConfirm(false);
      setResendUi({ status: "ready" });
      setResendError(false);
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
    if (resendUi.status === "cooldown") {
      const timer = window.setTimeout(() => {
        setResendUi((current) => {
          if (current.status !== "cooldown") return current;
          if (current.seconds <= 1) return { status: "sent" };
          return { status: "cooldown", seconds: current.seconds - 1 };
        });
      }, 1000);
      return () => window.clearTimeout(timer);
    }
    if (resendUi.status === "sent") {
      const timer = window.setTimeout(() => {
        setResendUi({ status: "ready" });
      }, RESEND_SENT_NOTICE_MS);
      return () => window.clearTimeout(timer);
    }
  }, [resendUi]);

  if (!isOpen) return null;

  const handleGoogle = () => {
    gate(legalAgreed, async () => {
      setError(null);
      stashPendingLegalAcceptance();
      setGoogleLoading(true);
      const params = new URLSearchParams(window.location.search);
      const next = params.get("next");
      const redirectPath = next && next.startsWith("/") ? next : "/dashboard";
      const { error: oauthError } = await signInWithGoogle(redirectPath);
      if (oauthError) {
        setError(oauthError.message);
        setGoogleLoading(false);
      }
    });
  };

  const performSignIn = async (resolvedEmail: string, resolvedPassword: string) => {
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
    setLoading(true);
    setError(null);
    setAccountExists(false);
    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: resolvedEmail,
        password: resolvedPassword,
      });
      if (signInError) {
        setError(signInError.message);
        setLoading(false);
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
    } catch (err) {
      setError("Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const performSignUp = async (resolvedEmail: string, resolvedPassword: string) => {
    if (!resolvedEmail) {
      setError("Enter your email to continue.");
      return;
    }
    if (resolvedPassword.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    setLoading(true);
    setError(null);
    setAccountExists(false);
    try {
      stashPendingLegalAcceptance();
      const params = new URLSearchParams(window.location.search);
      const next = params.get("next");
      const redirectPath = next && next.startsWith("/") ? next : "/dashboard";
      const emailRedirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(redirectPath)}`;
      const outcome = await signUpWithEmail({
        email: resolvedEmail,
        password: resolvedPassword,
        emailRedirectTo,
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
        track("sign_up", { method: "email", ...getFirstTouchParams() });
        setConfirmEmail(resolvedEmail);
        setConfirmRedirectTo(emailRedirectTo);
        setResendUi({ status: "ready" });
        setResendError(false);
        setAwaitingConfirm(true);
        return;
      }

      onClose();
      await redirectAfterLogin();
    } catch {
      setError("Sign up failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const switchMode = (next: AuthFormMode) => {
    setMode(next);
    setPassword("");
    setError(null);
    setAccountExists(false);
    setAwaitingConfirm(false);
    setResendUi({ status: "ready" });
    setResendError(false);
  };

  const handleResendConfirmation = async () => {
    if (resendBusy || resendUi.status !== "ready") return;
    setResendBusy(true);
    setResendError(false);
    try {
      const { error: resendErrorResult } = await supabase.auth.resend({
        type: "signup",
        email: confirmEmail,
        options: { emailRedirectTo: confirmRedirectTo },
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

  const handleSubmitClick = async () => {
    const emailEl = document.getElementById("login-email") as HTMLInputElement | null;
    const passwordEl = document.getElementById("login-password") as HTMLInputElement | null;
    const submitEmail = (emailEl?.value ?? localEmail).trim();
    const submitPassword = passwordEl?.value ?? password;
    if (mode === "signup") {
      gate(legalAgreed, () => void performSignUp(submitEmail, submitPassword));
      return;
    }
    await performSignIn(submitEmail, submitPassword);
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
            <h2 className="mb-2 font-['Fraunces'] text-2xl font-bold text-[#101A26]">
              {mode === "signup" ? "Create your account" : "Welcome back"}
            </h2>
            <p className="font-['Plus_Jakarta_Sans'] text-sm leading-relaxed text-[#101A26]/70">
              New here? Signing in with Google creates your account automatically.
            </p>
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

        {awaitingConfirm ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <p className="font-['Plus_Jakarta_Sans'] text-sm leading-relaxed text-[#101A26]">
                Check your email to confirm.
              </p>
              <p className="font-['Plus_Jakarta_Sans'] text-sm leading-relaxed text-[#101A26]/70">
                Can't see it? Check your junk or spam folder.
              </p>
            </div>
            {resendUi.status === "sent" ? (
              <p className="font-['Plus_Jakarta_Sans'] text-sm text-[#101A26]">Email sent again</p>
            ) : (
              <button
                type="button"
                onClick={() => void handleResendConfirmation()}
                disabled={resendBusy || resendUi.status === "cooldown"}
                className="font-['Plus_Jakarta_Sans'] text-sm text-[#101A26]/70 underline-offset-4 transition-colors hover:text-[#101A26] hover:underline disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:text-[#101A26]/70 disabled:hover:no-underline"
              >
                {resendUi.status === "cooldown"
                  ? `Resend confirmation email (${resendUi.seconds}s)`
                  : "Resend confirmation email"}
              </button>
            )}
            {resendError ? (
              <p className="auth-modal-error font-['Plus_Jakarta_Sans'] text-sm">
                Couldn't resend. Please try again shortly.
              </p>
            ) : null}
            <button
              type="button"
              data-track-id="auth_switch_to_signin"
              onClick={() => switchMode("signin")}
              className="font-['Plus_Jakarta_Sans'] text-sm text-[#101A26]/70 underline-offset-4 transition-colors hover:text-[#101A26] hover:underline"
            >
              Already have an account? Sign in
            </button>
          </div>
        ) : (
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
            type="button"
            disabled={loading}
            onMouseDown={(e) => {
              // Avoid blur/autofill sync swallowing the first submit click.
              e.preventDefault();
            }}
            onClick={() => void handleSubmitClick()}
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
        )}
      </div>
    </div>
    </>
  );
}
