import { useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../config/supabase";
import { Button } from "../components/ui/button";

export default function IcpReport() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [icpCount, setIcpCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user?.id) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    void supabase
      .from("icps")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .then(({ count, error }) => {
        if (cancelled) return;
        if (error) {
          console.warn("[IcpReport] load failed", error);
          setIcpCount(0);
        } else {
          setIcpCount(count ?? 0);
        }
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [authLoading, user?.id]);

  if (authLoading || loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </main>
    );
  }

  if (!user?.id) {
    return <Navigate to="/" replace />;
  }

  if (icpCount === 0) {
    return <Navigate to="/onboarding-build" replace />;
  }

  return (
    <main className="min-h-screen bg-background">
      <section className="mx-auto max-w-2xl px-6 py-12">
        <span className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 font-['DM_Sans'] text-xs font-medium text-primary">
          Your ICPs
        </span>
        <h1 className="mt-4 font-['Fraunces'] text-4xl font-bold text-[#0D1833]">
          You have {icpCount} ICP{icpCount === 1 ? "" : "s"} saved.
        </h1>
        <p className="mt-4 font-['DM_Sans'] text-base text-muted-foreground">
          View and edit your ideal customer profiles in your dashboard.
        </p>
        <Button
          type="button"
          onClick={() => navigate("/icps")}
          className="mt-8 rounded-full bg-primary px-6 py-6 font-['DM_Sans'] text-base font-medium text-primary-foreground hover:opacity-90"
        >
          View your ICPs →
        </Button>
      </section>
    </main>
  );
}
