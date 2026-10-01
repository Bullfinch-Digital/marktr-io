import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { HealthCheckReportView } from "../components/healthCheck/HealthCheckReportView";
import { supabase } from "../config/supabase";
import { useEdition } from "../contexts/EditionContext";
import { useEditionDocumentMeta } from "../hooks/useEditionDocumentMeta";
import {
  mapPublicHealthCheckReport,
  type PublicHealthCheckReportView,
} from "../lib/healthCheck/publicReport";

export default function HealthCheckPublicReport() {
  const { token } = useParams();
  const { config } = useEdition();
  useEditionDocumentMeta("healthCheckReport");
  const [status, setStatus] = useState<"loading" | "missing" | "error" | "ready">(
    "loading",
  );
  const [view, setView] = useState<PublicHealthCheckReportView | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      const publicToken = token?.trim() ?? "";
      if (!publicToken) {
        setStatus("missing");
        return;
      }

      const { data, error } = await supabase.functions.invoke("get-health-check-report", {
        body: { publicToken },
      });
      if (cancelled) return;

      const payload = data as { error?: string; report?: unknown } | null;
      if (error || payload?.error || !payload?.report) {
        const message = `${payload?.error ?? error?.message ?? ""}`.toLowerCase();
        setStatus(message.includes("not found") ? "missing" : "error");
        return;
      }

      const mapped = mapPublicHealthCheckReport(payload.report);
      if (!mapped) {
        setStatus("missing");
        return;
      }
      setView(mapped);
      setStatus("ready");
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [token]);

  if (status === "loading") {
    return (
      <main className="min-h-screen bg-background px-6 py-16 text-center">
        <p className="font-body text-sm text-muted-foreground">Loading your report…</p>
      </main>
    );
  }

  if (status !== "ready" || !view) {
    return (
      <main className="min-h-screen bg-background px-6 py-16 text-center">
        <h1 className="font-display text-3xl font-bold">Report not found</h1>
        <p className="mt-3 font-body text-sm text-muted-foreground">
          This link may have expired, or the report was never saved.
        </p>
        <Link
          to={{ pathname: "/", search: window.location.search }}
          className="mt-6 inline-block font-body text-sm underline"
        >
          Run a health check
        </Link>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background">
      <HealthCheckReportView
        scores={view.scores}
        input={view.input}
        bfRoute={view.bfRoute}
        publicToken={view.publicToken}
        showPaywallUpsell={config.showPaywallUpsell}
        showDashboardCta={false}
      />
    </main>
  );
}
