import { useState } from "react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { supabase } from "../config/supabase";

type AdminUser = {
  id: string;
  email: string;
  name: string | null;
  subscription_tier: string | null;
  trial_started_at: string | null;
  trial_ends_at: string | null;
  trial_converted_at: string | null;
  role: string | null;
};

type AdminSubscription = {
  user_id: string;
  stripe_subscription_id: string;
  stripe_customer_id: string;
  price_id: string | null;
  status: string | null;
  cancel_at_period_end: boolean | null;
  current_period_end: string | null;
  trial_start: string | null;
  trial_end: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export default function Admin() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resultUser, setResultUser] = useState<AdminUser | null>(null);
  const [resultSubscription, setResultSubscription] =
    useState<AdminSubscription | null>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = email.trim();
    if (!trimmed) {
      setError("Enter an email to search.");
      return;
    }

    setLoading(true);
    setError(null);
    setResultUser(null);
    setResultSubscription(null);

    try {
      const { data, error: invokeError } = await supabase.functions.invoke(
        "admin-get-user",
        { body: { email: trimmed } }
      );

      if (invokeError) {
        throw invokeError;
      }

      setResultUser((data as any)?.user ?? null);
      setResultSubscription((data as any)?.subscription ?? null);
    } catch (err: any) {
      setError(err?.message ?? "Search failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-6 py-12 space-y-8">
        <div>
          <h1 className="font-['Fraunces'] text-4xl mb-2">Admin</h1>
          <p className="font-['Plus_Jakarta_Sans'] text-foreground/70">
            Lookup a user by email.
          </p>
        </div>

        <form onSubmit={handleSearch} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="admin-email" className="font-['Plus_Jakarta_Sans'] text-sm">
              Email
            </Label>
            <Input
              id="admin-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="border-black rounded-design font-['Plus_Jakarta_Sans']"
              placeholder="user@example.com"
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <Button
            type="submit"
            disabled={loading}
            className="bg-button-green hover:bg-button-green/90 text-foreground border border-black rounded-design font-['Plus_Jakarta_Sans']"
          >
            {loading ? "Searching..." : "Search"}
          </Button>
        </form>

        <div className="bg-[#E5E5E5]/30 border border-black rounded-design p-6 space-y-6">
          <h2 className="font-['Fraunces'] text-2xl">Result</h2>

          {!loading && !resultUser && (
            <p className="font-['Plus_Jakarta_Sans'] text-sm text-foreground/70">
              No user found.
            </p>
          )}

          {resultUser && (
            <div className="space-y-2">
              <p className="font-['Plus_Jakarta_Sans'] text-sm">
                <span className="font-medium">ID:</span> {resultUser.id}
              </p>
              <p className="font-['Plus_Jakarta_Sans'] text-sm">
                <span className="font-medium">Email:</span> {resultUser.email}
              </p>
              <p className="font-['Plus_Jakarta_Sans'] text-sm">
                <span className="font-medium">Name:</span>{" "}
                {resultUser.name ?? "-"}
              </p>
              <p className="font-['Plus_Jakarta_Sans'] text-sm">
                <span className="font-medium">Tier:</span>{" "}
                {resultUser.subscription_tier ?? "-"}
              </p>
              <p className="font-['Plus_Jakarta_Sans'] text-sm">
                <span className="font-medium">Trial Started:</span>{" "}
                {resultUser.trial_started_at ?? "-"}
              </p>
              <p className="font-['Plus_Jakarta_Sans'] text-sm">
                <span className="font-medium">Trial Ends:</span>{" "}
                {resultUser.trial_ends_at ?? "-"}
              </p>
              <p className="font-['Plus_Jakarta_Sans'] text-sm">
                <span className="font-medium">Trial Converted:</span>{" "}
                {resultUser.trial_converted_at ?? "-"}
              </p>
              <p className="font-['Plus_Jakarta_Sans'] text-sm">
                <span className="font-medium">Role:</span>{" "}
                {resultUser.role ?? "user"}
              </p>
            </div>
          )}

          {resultUser && (
            <div className="space-y-2">
              <h3 className="font-['Fraunces'] text-xl">Subscription</h3>
              <p className="font-['Plus_Jakarta_Sans'] text-sm">
                <span className="font-medium">Status:</span>{" "}
                {resultSubscription?.status ?? "-"}
              </p>
              <p className="font-['Plus_Jakarta_Sans'] text-sm">
                <span className="font-medium">Price ID:</span>{" "}
                {resultSubscription?.price_id ?? "-"}
              </p>
              <p className="font-['Plus_Jakarta_Sans'] text-sm">
                <span className="font-medium">Trial End:</span>{" "}
                {resultSubscription?.trial_end ?? "-"}
              </p>
              <p className="font-['Plus_Jakarta_Sans'] text-sm">
                <span className="font-medium">Current Period End:</span>{" "}
                {resultSubscription?.current_period_end ?? "-"}
              </p>
              <p className="font-['Plus_Jakarta_Sans'] text-sm">
                <span className="font-medium">Updated At:</span>{" "}
                {resultSubscription?.updated_at ?? "-"}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
