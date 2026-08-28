import { useEffect, useState } from "react";
// NOTE: LoginModal can render outside <Router> (it lives under providers),
// so we must NOT use react-router hooks like useNavigate() here.
import { supabase } from "../../config/supabase";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { useAuth } from "../../contexts/AuthContext";
import { GoogleIcon } from "../icons/GoogleIcon";
import {
  buildLinkBody,
  clearPendingGuestLink,
  getPendingGuestLink,
  setPendingGuestLink,
} from "../../utils/pendingGuestLink";
import { isRealUser } from "../../utils/isRealUser";
import {
  LegalAgreementCheckbox,
  LEGAL_AGREEMENT_REQUIRED_MESSAGE,
} from "../legal/LegalAgreement";
import { stashPendingLegalAcceptance } from "../../lib/legal";

type LoginModalProps = {
  isOpen: boolean;
  email: string | null;
  guestRef: string | null;
  sessionId: string | null;
  onClose: () => void;
};

export function LoginModal({
  isOpen,
  email,
  guestRef,
  sessionId,
  onClose,
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
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [legalAgreed, setLegalAgreed] = useState(true);

  useEffect(() => {
    setLocalEmail(email ?? "");
  }, [email]);

  if (!isOpen) return null;

  const handleGoogle = async () => {
    if (!legalAgreed) {
      setError(LEGAL_AGREEMENT_REQUIRED_MESSAGE);
      return;
    }
    setError(null);
    stashPendingLegalAcceptance();
    setGoogleLoading(true);
    const params = new URLSearchParams(window.location.search);
    const next = params.get("next");
    const redirectPath =
      next && next.startsWith("/") ? next : "/dashboard";
    const { error: oauthError } = await signInWithGoogle(redirectPath);
    if (oauthError) {
      setError(oauthError.message);
      setGoogleLoading(false);
    }
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

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    const emailFromForm = String(formData.get("email") ?? "").trim();
    const passwordFromForm = String(formData.get("password") ?? "");
    await performSignIn(
      emailFromForm || localEmail.trim(),
      passwordFromForm || password
    );
  };

  const handleSubmitClick = async () => {
    const emailEl = document.getElementById("login-email") as HTMLInputElement | null;
    const passwordEl = document.getElementById("login-password") as HTMLInputElement | null;
    await performSignIn(
      (emailEl?.value ?? localEmail).trim(),
      passwordEl?.value ?? password
    );
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
      <div className="bg-background border border-black rounded-design shadow-2xl w-full max-w-md p-6">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <h2 className="font-['Fraunces'] text-2xl mb-1">Sign in to marktr.</h2>
            <p className="font-['Inter'] text-sm text-foreground/70">
              New here? Signing in with Google creates your account automatically.
            </p>
          </div>
          <button
            onClick={() => {
              void handleClose();
            }}
            className="p-2 hover:bg-accent-grey/20 rounded-design transition-colors"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <LegalAgreementCheckbox
          id="login-modal-legal"
          checked={legalAgreed}
          onCheckedChange={setLegalAgreed}
          disabled={loading || googleLoading}
        />

        <button
          type="button"
          onClick={handleGoogle}
          disabled={googleLoading || loading || !legalAgreed}
          className="w-full flex items-center justify-center gap-3 border border-black rounded-design px-4 py-3 bg-white font-['DM_Sans'] text-sm font-medium hover:bg-gray-50 transition-colors disabled:opacity-60"
        >
          <GoogleIcon />
          {googleLoading ? "Redirecting…" : "Continue with Google"}
        </button>

        <div className="relative my-4">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-warm-grey" />
          </div>
          <div className="relative flex justify-center text-xs">
            <span className="bg-background px-2 text-muted-foreground">
              or continue with email
            </span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="login-email" className="font-medium">
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
            className="border border-black rounded-design px-4 py-3 bg-white"
          />
          </div>

          <div className="space-y-2">
            <Label htmlFor="login-password" className="font-medium">
              Password
            </Label>
            <Input
              id="login-password"
              type="password"
              name="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onInput={(e) => setPassword((e.target as HTMLInputElement).value)}
              className="border border-black rounded-design px-4 py-3 bg-white"
              required
            />
          </div>

          {error && (
            <p className="text-sm text-red-600 font-['Inter']">{error}</p>
          )}

          <Button
            type="button"
            disabled={loading}
            onMouseDown={(e) => {
              // Avoid blur/autofill sync swallowing the first submit click.
              e.preventDefault();
            }}
            onClick={() => void handleSubmitClick()}
            className="w-full bg-button-green text-text-dark hover:bg-button-green/90 border border-black rounded-design px-6 py-4 font-['Fraunces']"
          >
            {loading ? "Signing in..." : "Log in"}
          </Button>
        </form>
      </div>
    </div>
  );
}
