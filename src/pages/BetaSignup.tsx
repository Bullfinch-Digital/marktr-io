import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { AuthHero } from "../components/auth/AuthHero";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { supabase } from "../config/supabase";
import { useAuth } from "../contexts/AuthContext";
import {
  LegalAgreementCheckbox,
  LEGAL_AGREEMENT_REQUIRED_MESSAGE,
} from "../components/legal/LegalAgreement";
import { LEGAL_VERSION } from "../lib/legal";

/** Edge Functions return JSON errors on non-2xx bodies; supabase-js does not put that in `data`. */
async function readEdgeFunctionErrorMessage(err: unknown): Promise<string | undefined> {
  if (!err || typeof err !== "object" || !("context" in err)) return undefined;
  const res = (err as { context?: Response }).context;
  if (!res || typeof res.clone !== "function") return undefined;
  try {
    const clone = res.clone();
    const ct = clone.headers.get("Content-Type") ?? "";
    if (ct.includes("application/json")) {
      const j = (await clone.json()) as { error?: string; details?: string };
      if (j?.error && j?.details) return `${j.error} (${j.details})`;
      if (typeof j?.error === "string") return j.error;
    }
    const t = await clone.text();
    return t?.trim() || undefined;
  } catch {
    return undefined;
  }
}

export default function BetaSignup() {
  const navigate = useNavigate();
  const { signInWithPassword, user, loading: authLoading } = useAuth();

  const [fullName, setFullName] = useState("");
  const [contactNumber, setContactNumber] = useState("");
  const [email, setEmail] = useState("");
  const [accessCode, setAccessCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [legalAgreed, setLegalAgreed] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    if (!authLoading && user) {
      navigate("/dashboard", { replace: true });
    }
  }, [authLoading, user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    const trimmedEmail = email.trim().toLowerCase();
    const trimmedPassword = password.trim();
    const trimmedFullName = fullName.trim();
    const trimmedContactNumber = contactNumber.trim();
    const trimmedCode = accessCode.trim();

    if (!trimmedEmail || !trimmedPassword || !trimmedCode || !trimmedFullName || !trimmedContactNumber) {
      setError("Please fill in all required fields.");
      return;
    }
    if (trimmedPassword !== confirmPassword.trim()) {
      setError("Passwords do not match.");
      return;
    }
    if (trimmedPassword.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (!legalAgreed) {
      setError(LEGAL_AGREEMENT_REQUIRED_MESSAGE);
      return;
    }

    setLoading(true);
    try {
      const { data, error: invokeError } = await supabase.functions.invoke("beta-signup", {
        body: {
          email: trimmedEmail,
          password: trimmedPassword,
          fullName: trimmedFullName,
          contactNumber: trimmedContactNumber,
          accessCode: trimmedCode,
          legalAccepted: true,
          legalVersion: LEGAL_VERSION,
        },
      });

      if (invokeError) {
        const fromBody = await readEdgeFunctionErrorMessage(invokeError);
        throw new Error(fromBody || invokeError.message || "Beta signup failed.");
      }

      if (!data?.ok) {
        throw new Error((data as { error?: string })?.error || "Beta signup failed.");
      }

      const { error: signInError } = await signInWithPassword({
        email: trimmedEmail,
        password: trimmedPassword,
      });
      if (signInError) {
        setSuccess("Account created. Please sign in from the login page.");
        navigate("/login?message=Beta account created. Please sign in.", { replace: true });
        return;
      }

      navigate("/dashboard", { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to create beta account.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="bg-background">
      <div className="min-h-[calc(100vh-200px)] flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <AuthHero
            title="Private Beta Sign Up"
            subtitle="Create your beta account with your email-specific access code."
          />

          <form onSubmit={handleSubmit} className="space-y-6 animate-fade-in-up delay-100">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-design text-sm">
                {error}
              </div>
            )}
            {success && (
              <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-design text-sm">
                {success}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="fullName">Full Name</Label>
              <Input
                id="fullName"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Your full name"
                className="border border-black rounded-design px-4 py-6 bg-white"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="contactNumber">Contact Number</Label>
              <Input
                id="contactNumber"
                type="tel"
                value={contactNumber}
                onChange={(e) => setContactNumber(e.target.value)}
                placeholder="+44 7..."
                className="border border-black rounded-design px-4 py-6 bg-white"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                className="border border-black rounded-design px-4 py-6 bg-white"
                required
                autoFocus
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="accessCode">Beta Access Code</Label>
              <Input
                id="accessCode"
                type="text"
                value={accessCode}
                onChange={(e) => setAccessCode(e.target.value)}
                placeholder="Enter your invite code"
                className="border border-black rounded-design px-4 py-6 bg-white"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="border border-black rounded-design px-4 py-6 bg-white"
                required
                minLength={6}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className="border border-black rounded-design px-4 py-6 bg-white"
                required
                minLength={6}
              />
            </div>

            <LegalAgreementCheckbox
              id="beta-signup-legal"
              checked={legalAgreed}
              onCheckedChange={setLegalAgreed}
              disabled={loading}
            />

            <Button
              type="submit"
              disabled={loading || !legalAgreed}
              className="w-full bg-button-green text-text-dark hover:bg-button-green/90 border-[1px] border-black rounded-design px-8 py-6 font-['Fraunces'] font-bold transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              {loading ? "Creating beta account..." : "Create beta account"}
              {!loading && <ArrowRight className="ml-2 w-5 h-5" />}
            </Button>
          </form>

          <div className="mt-8 text-center text-sm text-foreground/70 animate-fade-in-up delay-200">
            Already have an account?{" "}
            <Link to="/login" className="text-button-green hover:underline font-medium">
              Sign in
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
