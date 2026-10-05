import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { useAuth } from "../contexts/AuthContext";
import { ArrowRight } from "lucide-react";
import { supabase } from "../config/supabase";
import { AuthHero } from "../components/auth/AuthHero";
import { usePaywall } from "../contexts/PaywallContext";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [resetOpen, setResetOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetStatus, setResetStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [resetError, setResetError] = useState<string | null>(null);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { signInWithPassword, user, loading: authLoading } = useAuth();
  const { openPaywall } = usePaywall();

  const redirectTo = searchParams.get("redirect") || "/dashboard";

  useEffect(() => {
    const messageParam = searchParams.get("message");
    if (messageParam) {
      setMessage(messageParam);
    }
  }, [searchParams]);

  useEffect(() => {
    if (!authLoading && user) {
      console.log("Login: already authenticated");
      navigate(redirectTo, { replace: true });
    }
  }, [user, authLoading, navigate, redirectTo]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const { error: signInError } = await signInWithPassword({ email, password });

      if (signInError) {
        setError(signInError.message);
        setLoading(false);
      } else {
        console.log("Login success, redirecting...");
        // Redirect immediately - the useEffect will also catch it when session updates
        // This ensures redirect happens even if there's a slight delay in state update
        navigate(redirectTo, { replace: true });
      }
    } catch (err) {
      console.error("Error during sign in:", err);
      setError("An unexpected error occurred. Please try again.");
      setLoading(false);
    }
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmail.trim()) return;

    try {
      setResetStatus("sending");
      setResetError(null);

      const { error: resetErr } = await supabase.auth.resetPasswordForEmail(resetEmail.trim(), {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (resetErr) {
        console.error("Login: resetPasswordForEmail error", resetErr);
        setResetStatus("error");
        setResetError(resetErr.message || "Failed to send reset email.");
        return;
      }

      setResetStatus("sent");
    } catch (err) {
      console.error("Login: resetPasswordForEmail unexpected error", err);
      setResetStatus("error");
      setResetError(err instanceof Error ? err.message : "Failed to send reset email.");
    }
  };

  return (
    <main className="bg-background">
      <div className="min-h-[calc(100vh-200px)] flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <AuthHero
            title="Welcome Back"
            subtitle="Log in to access your ICP Dashboard"
          />

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6 animate-fade-in-up delay-100">
          {message && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-design text-sm">
              {message}
            </div>
          )}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-design text-sm">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="email" className="font-medium">
              Email
            </Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              className="border border-black rounded-design px-4 py-6 bg-white"
              required
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password" className="font-medium">
              Password
            </Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="border border-black rounded-design px-4 py-6 bg-white"
              required
            />
            <button
              type="button"
              onClick={() => {
                setResetOpen(true);
                setResetEmail(email);
                setResetStatus("idle");
                setResetError(null);
              }}
              className="mt-2 text-sm text-foreground/70 hover:text-foreground underline-offset-2 hover:underline"
            >
              Forgot your password?
            </button>
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-button-green text-text-dark hover:bg-button-green/90 border-[1px] border-black rounded-design px-8 py-6 font-['Fraunces'] font-bold transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
          >
            {loading ? "Signing in..." : "Sign in"}
            {!loading && <ArrowRight className="ml-2 w-5 h-5" />}
          </Button>
        </form>

        {/* Sign Up */}
        <div className="mt-8 text-center text-sm text-foreground/70 animate-fade-in-up delay-300">
          Don't have an account?{" "}
          <button
            type="button"
            onClick={() => openPaywall()}
            className="text-button-green hover:underline font-medium"
          >
            Start free trial
          </button>
        </div>
      </div>
      </div>

      {resetOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-background border border-black rounded-design p-6 w-full max-w-md shadow-lg relative">
            <button
              type="button"
              onClick={() => setResetOpen(false)}
              className="absolute top-3 right-3 text-foreground/60 hover:text-foreground"
            >
              ✕
            </button>

            <h2 className="font-['Fraunces'] text-2xl mb-2">Reset your password</h2>
            <p className="font-['Plus_Jakarta_Sans'] text-sm text-foreground/70 mb-4">
              Enter the email you used to sign up and we'll send you a link to choose a new password.
            </p>

            <form onSubmit={handlePasswordReset} className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="reset-email" className="font-['Plus_Jakarta_Sans'] text-sm">
                  Email address
                </label>
                <input
                  id="reset-email"
                  type="email"
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  className="w-full border border-black rounded-design px-3 py-2 font-['Plus_Jakarta_Sans']"
                  required
                />
              </div>

              {resetError && <p className="text-sm text-red-600">{resetError}</p>}

              {resetStatus === "sent" && (
                <p className="text-sm text-foreground/80">Check your email for a password reset link.</p>
              )}

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setResetOpen(false)}
                  className="font-['Plus_Jakarta_Sans'] text-sm px-3 py-2 border border-black rounded-design bg-background hover:bg-foreground/5"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={resetStatus === "sending"}
                  className="font-['Plus_Jakarta_Sans'] text-sm px-4 py-2 border border-black rounded-design bg-button-green hover:bg-button-green/90 disabled:opacity-60"
                >
                  {resetStatus === "sending" ? "Sending..." : "Send reset link"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
