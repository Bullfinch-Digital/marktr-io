import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.2";
import {
  REPORT_PUBLIC_COLUMNS,
  sanitizeHealthCheckReportRow,
} from "./publicFields.ts";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(supabaseUrl, serviceRoleKey);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  try {
    const body = await req.json();
    const publicToken =
      typeof body?.publicToken === "string"
        ? body.publicToken.trim()
        : typeof body?.token === "string"
          ? body.token.trim()
          : "";
    if (!publicToken) {
      return json({ error: "publicToken is required" }, 400);
    }

    const { data, error } = await supabase
      .from("health_check_reports")
      .select(REPORT_PUBLIC_COLUMNS.join(","))
      .eq("public_token", publicToken)
      .maybeSingle();

    if (error) {
      console.error("get-health-check-report query failed", error);
      return json({ error: "Server error" }, 500);
    }
    if (!data) {
      return json({ error: "Report not found" }, 404);
    }

    return json({
      report: sanitizeHealthCheckReportRow(data as Record<string, unknown>),
    });
  } catch (err) {
    console.error("get-health-check-report error", err);
    return json({ error: "Server error" }, 500);
  }
});
