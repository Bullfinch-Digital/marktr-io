import { useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { useBrand } from "../contexts/BrandContext";
import { supabase } from "../config/supabase";
import { isBrandScopeReady, resolveScopedBrandId, scopeQueryToActiveBrand } from "../lib/brandScopedReads";
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
  const { activeBrandId, loading: brandLoading, brands } = useBrand();
  const [report, setReport] = useState<HealthCheckRow | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user?.id) {
      setLoading(false);
      return;
    }
    if (!isBrandScopeReady(brandLoading, brands, resolveScopedBrandId(activeBrandId, brands))) {
      return;
    }

    const scopedBrandId = resolveScopedBrandId(activeBrandId, brands);
    let cancelled = false;
    setLoading(true);

    let query = supabase
      .from("health_check_results")
      .select("domain, instagram_handle, facebook_url, scores")
      .eq("user_id", user.id);
    query = scopeQueryToActiveBrand(query, scopedBrandId);

    void query
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
  }, [authLoading, user?.id, activeBrandId, brandLoading, brands]);

  if (!authLoading && !user?.id) {
    return <Navigate to="/" replace />;
  }

  if (authLoading || brandLoading || loading) {
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
        onGoToDashboard={() => navigate("/dashboard")}
      />
    </DashboardShell>
  );
}
