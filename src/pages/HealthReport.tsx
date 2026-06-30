import { useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { useBrand } from "../contexts/BrandContext";
import { isBrandScopeReady, resolveScopedBrandId } from "../lib/brandScopedReads";
import { fetchLatestHealthCheck } from "../lib/healthCheckPersistence";
import DashboardShell from "../layouts/DashboardShell";
import { HealthCheckReportView } from "../components/healthCheck/HealthCheckReportView";
import { parseStoredScores } from "../lib/healthCheckReportStorage";

export default function HealthReport() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { activeBrandId, loading: brandLoading, brands } = useBrand();
  const [report, setReport] = useState<Awaited<
    ReturnType<typeof fetchLatestHealthCheck>
  > | null>(null);
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

    void fetchLatestHealthCheck(user.id, scopedBrandId).then((row) => {
      if (cancelled) return;
      setReport(row);
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
