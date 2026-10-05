import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../config/supabase";

export default function ResetPassword() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [hasSession, setHasSession] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const checkSession = async () => {
      setLoading(true);
      const { data, error } = await supabase.auth.getSession();
      console.log("ResetPassword: getSession", {
        hasSession: !!data.session,
        error: error?.message,
      });
      if (data.session && !error) {
        setHasSession(true);
      } else {
        setHasSession(false);
      }
      setLoading(false);
    };
    checkSession();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    if (!password || password.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      const { data, error } = await supabase.auth.updateUser({
        password,
      });

      console.log("ResetPassword: updateUser result", { data, error });

      if (error) {
        setError(error.message || "Failed to update password.");
        return;
      }

      setSuccess(true);
      setTimeout(() => {
        navigate("/login", { replace: true });
      }, 1500);
    } catch (err) {
      console.error("ResetPassword: unexpected error", err);
      setError(err instanceof Error ? err.message : "Failed to update password.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 border-4 border-button-green border-t-transparent rounded-full animate-spin" />
          <p className="text-foreground/70">Checking your reset link...</p>
        </div>
      </div>
    );
  }

  if (!hasSession) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="max-w-md w-full text-center">
          <h1 className="font-['Fraunces'] text-2xl mb-3">Reset link expired or invalid</h1>
          <p className="font-['Plus_Jakarta_Sans'] text-sm text-foreground/70 mb-4">
            Try requesting a new password reset from the login page.
          </p>
          <button
            type="button"
            onClick={() => navigate("/login")}
            className="font-['Plus_Jakarta_Sans'] px-4 py-2 border border-black rounded-design bg-button-green hover:bg-button-green/90"
          >
            Back to login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="max-w-md w-full border border-black rounded-design p-6 bg-white shadow-md">
        <h1 className="font-['Fraunces'] text-2xl mb-2">Choose a new password</h1>
        <p className="font-['Plus_Jakarta_Sans'] text-sm text-foreground/70 mb-4">
          You&apos;re almost done. Enter your new password below.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="font-['Plus_Jakarta_Sans'] text-sm" htmlFor="new-password">
              New password
            </label>
            <input
              id="new-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border border-black rounded-design px-3 py-2 font-['Plus_Jakarta_Sans']"
              required
            />
          </div>
          <div className="space-y-2">
            <label className="font-['Plus_Jakarta_Sans'] text-sm" htmlFor="confirm-password">
              Confirm new password
            </label>
            <input
              id="confirm-password"
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="w-full border border-black rounded-design px-3 py-2 font-['Plus_Jakarta_Sans']"
              required
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}
          {success && <p className="text-sm text-foreground/80">Password updated. Redirecting to login…</p>}

          <button
            type="submit"
            disabled={submitting}
            className="mt-2 w-full font-['Plus_Jakarta_Sans'] px-4 py-2 border border-black rounded-design bg-button-green hover:bg-button-green/90 disabled:opacity-60"
          >
            {submitting ? "Updating..." : "Update password"}
          </button>
        </form>
      </div>
    </div>
  );
}
