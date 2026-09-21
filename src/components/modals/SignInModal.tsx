import { useState } from "react";
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
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
      <div className="bg-background border border-black rounded-design shadow-2xl w-full max-w-md p-6">
        <div className="flex items-start justify-between gap-4 mb-6">
          <div>
            <h2 className="font-['Fraunces'] text-2xl mb-1">{heading}</h2>
            <p className="font-['Inter'] text-sm text-foreground/70">{subheading}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-accent-grey/20 rounded-design transition-colors"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <button
          type="button"
          onClick={handleGoogle}
          disabled={loading}
          className="w-full flex items-center justify-center gap-3 border border-black rounded-design px-4 py-3 bg-white font-['DM_Sans'] text-sm font-medium hover:bg-gray-50 transition-colors disabled:opacity-60"
        >
          <GoogleIcon />
          {loading ? "Redirecting…" : "Continue with Google"}
        </button>

        <div className="relative my-4">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-warm-grey" />
          </div>
          <div className="relative flex justify-center text-xs">
            <span className="bg-background px-2 text-muted-foreground">or</span>
          </div>
        </div>

        <button
          type="button"
          onClick={handleEmail}
          className="w-full text-sm text-foreground/60 hover:text-foreground transition-colors font-['Inter']"
        >
          Continue with email
        </button>

        {error && (
          <p className="mt-4 text-sm text-red-600 font-['Inter']">{error}</p>
        )}
      </div>
    </div>
  );
}
