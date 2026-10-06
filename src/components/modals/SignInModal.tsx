import { useEffect, useState } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { GoogleIcon } from "../icons/GoogleIcon";

type SignInModalProps = {
  isOpen: boolean;
  onClose: () => void;
  redirectPath?: string;
  heading?: string;
  subheading?: string;
  onEmailClick: () => void;
};

export function SignInModal({
  isOpen,
  onClose,
  redirectPath = "/dashboard",
  heading = "Sign in to start your trial",
  subheading = "Your results are saved. Sign in to unlock your 14-day free trial.",
  onEmailClick,
}: SignInModalProps) {
  const { signInWithGoogle } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleGoogle = async () => {
    setError(null);
    setLoading(true);
    const { error: oauthError } = await signInWithGoogle(redirectPath);
    if (oauthError) {
      setError(oauthError.message);
      setLoading(false);
    }
  };

  const handleEmail = () => {
    onClose();
    onEmailClick();
  };

  return (
    <div className="auth-modal-backdrop fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="auth-modal-panel w-full max-w-md p-6 sm:p-8">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h2 className="mb-2 font-['Fraunces'] text-2xl font-bold text-[#101A26]">{heading}</h2>
            <p className="font-['Plus_Jakarta_Sans'] text-sm leading-relaxed text-[#101A26]/70">{subheading}</p>
          </div>
          <button
            onClick={onClose}
            className="auth-modal-close p-2 font-['Plus_Jakarta_Sans'] transition-colors"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <button
          type="button"
          onClick={handleGoogle}
          disabled={loading}
          className="auth-modal-google flex w-full items-center justify-center gap-3 px-4 py-3 text-sm disabled:opacity-50"
        >
          <GoogleIcon />
          {loading ? "Redirecting…" : "Continue with Google"}
        </button>

        <div className="relative my-5">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-[#101A26]/15" />
          </div>
          <div className="relative flex justify-center text-xs">
            <span className="bg-[#FBFAF0] px-2 font-['Plus_Jakarta_Sans'] text-[#101A26]/55">or</span>
          </div>
        </div>

        <button
          type="button"
          onClick={handleEmail}
          className="w-full font-['Plus_Jakarta_Sans'] text-sm text-[#101A26]/70 underline-offset-4 transition-colors hover:text-[#101A26] hover:underline"
        >
          Continue with email
        </button>

        {error && (
          <p className="auth-modal-error mt-5 font-['Plus_Jakarta_Sans'] text-sm">{error}</p>
        )}
      </div>
    </div>
  );
}
