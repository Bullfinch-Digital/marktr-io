import { useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../config/supabase";
import DashboardShell from "../layouts/DashboardShell";
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
  const [report, setReport] = useState<HealthCheckRow | null>(null);
  const [loading, setLoading] = useState(true);

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

  if (!authLoading && !user?.id) {
    return <Navigate to="/" replace />;
  }

  if (authLoading || loading) {
    return (
      <DashboardShell>
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardShell>
    );
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
    <DashboardShell onCreateNew={() => navigate("/onboarding-build")}>
      <HealthCheckReportView
        embedded
        scores={parsed.scores}
        input={{
          websiteUrl,
          instagramHandle: report.instagram_handle ?? "",
          facebookUrl: report.facebook_url ?? "",
          websiteScore: parsed.websiteScore,
        }}
        showPaywallUpsell={false}
        showDashboardCta={false}
        onOpenPaywall={() => navigate("/health-check")}
        onGoToDashboard={() => navigate("/dashboard")}
      />
    </DashboardShell>
  );
}
