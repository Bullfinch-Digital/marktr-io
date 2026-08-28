import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { useAuth } from "../contexts/AuthContext";
import { ArrowRight } from "lucide-react";
import { AuthHero } from "../components/auth/AuthHero";
import {
  LegalAgreementCheckbox,
  LEGAL_AGREEMENT_REQUIRED_MESSAGE,
} from "../components/legal/LegalAgreement";

export default function Signup() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [legalAgreed, setLegalAgreed] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { signUp } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const trimmedEmail = email.trim();
    const trimmedPassword = password.trim();
    const trimmedName = name.trim();

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    if (!legalAgreed) {
      setError(LEGAL_AGREEMENT_REQUIRED_MESSAGE);
      return;
    }

    setLoading(true);

    try {
      console.log("Signup.tsx: calling signUp with:", {
        email: trimmedEmail,
        password: "***",
        name: trimmedName,
      });

      const { error } = await signUp({
        email: trimmedEmail,
        password: trimmedPassword,
        name: trimmedName,
        legalAccepted: legalAgreed,
      });

      if (error) {
        setError(error.message);
      } else {
        navigate(`/check-email?email=${encodeURIComponent(trimmedEmail)}`);
      }
    } catch (err) {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="bg-background">
      <div className="min-h-[calc(100vh-200px)] flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <AuthHero
            title="Sign up"
            subtitle="Access your free ICPs - and unlock the full toolkit."
          />

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6 animate-fade-in-up delay-100">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-design text-sm">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="name" className="font-medium">
                Name
              </Label>
              <div className="border border-black rounded-design px-4 py-3 bg-white">
                <Input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your name"
                  className="border-none bg-transparent p-0 h-auto focus-visible:ring-0 focus-visible:ring-offset-0 rounded-none"
                  required
                  autoFocus
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="font-medium">
                Email
              </Label>
              <div className="border border-black rounded-design px-4 py-3 bg-white">
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  className="border-none bg-transparent p-0 h-auto focus-visible:ring-0 focus-visible:ring-offset-0 rounded-none"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="font-medium">
                Password
              </Label>
              <div className="border border-black rounded-design px-4 py-3 bg-white">
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="border-none bg-transparent p-0 h-auto focus-visible:ring-0 focus-visible:ring-offset-0 rounded-none"
                  required
                  minLength={6}
                />
              </div>
              <p className="text-xs text-foreground/60">Must be at least 6 characters</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="font-medium">
                Confirm Password
              </Label>
              <div className="border border-black rounded-design px-4 py-3 bg-white">
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="border-none bg-transparent p-0 h-auto focus-visible:ring-0 focus-visible:ring-offset-0 rounded-none"
                  required
                  minLength={6}
                />
              </div>
            </div>

            <LegalAgreementCheckbox
              id="signup-legal"
              checked={legalAgreed}
              onCheckedChange={setLegalAgreed}
              disabled={loading}
            />

            <Button
              type="submit"
              disabled={loading || !legalAgreed}
              className="w-full bg-button-green text-text-dark hover:bg-button-green/90 border-[1px] border-black rounded-design px-8 py-6 font-['Fraunces'] font-bold transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              {loading ? "Creating account..." : "Create account"}
              {!loading && <ArrowRight className="ml-2 w-5 h-5" />}
            </Button>
          </form>

          {/* Sign In */}
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
