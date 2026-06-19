import { useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../config/supabase";
import useSubscription from "../hooks/useSubscription";
import useProfile from "../hooks/useProfile";
import { HealthCheckReportView } from "../components/healthCheck/HealthCheckReportView";
import { parseStoredScores } from "../lib/healthCheckReportStorage";

type HealthCheckRow = {
  domain: string | null;
  instagram_handle: string | null;
  facebook_url: string | null;
  scores: unknown;
};

export default function HealthReport() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { isPro: subscriptionIsPro, loading: subscriptionLoading } = useSubscription();
  const { profile } = useProfile(user?.id ?? null);
  const [report, setReport] = useState<HealthCheckRow | null>(null);
  const [loading, setLoading] = useState(true);

  const isLoggedInReal = Boolean(
    user && !(user as { is_anonymous?: boolean }).is_anonymous
  );
  const hasPaidAccess =
    subscriptionIsPro || profile?.subscription_tier === "pro";
  const showDashboardCta =
    hasPaidAccess || (isLoggedInReal && subscriptionLoading);
  const showPaywallUpsell = !showDashboardCta;

  useEffect(() => {
    if (authLoading) return;
    if (!user?.id) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    void supabase
      .from("health_check_results")
      .select("domain, instagram_handle, facebook_url, scores")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) {
          console.warn("[HealthReport] load failed", error);
          setReport(null);
        } else {
          setReport((data as HealthCheckRow | null) ?? null);
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
    return <Navigate to="/login" replace />;
  }

  const parsed = report ? parseStoredScores(report.scores) : null;
  if (!report || !parsed) {
    return <Navigate to="/health-check" replace />;
  }

  const websiteUrl = report.domain
    ? report.domain.startsWith("http")
      ? report.domain
      : `https://${report.domain}`
    : "";

  return (
    <HealthCheckReportView
      scores={parsed.scores}
      input={{
        websiteUrl,
        instagramHandle: report.instagram_handle ?? "",
        facebookUrl: report.facebook_url ?? "",
        websiteScore: parsed.websiteScore,
      }}
      showPaywallUpsell={showPaywallUpsell}
      showDashboardCta={showDashboardCta}
      onOpenPaywall={() => navigate("/health-check")}
      onGoToDashboard={() => navigate("/dashboard")}
    />
  );
}
