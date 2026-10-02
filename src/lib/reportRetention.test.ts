import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  reportIdsPastRetention,
  reportRetentionCutoff,
} from "../../supabase/functions/_shared/reportRetention.ts";

describe("24 month report retention", () => {
  const now = new Date("2026-10-02T09:00:00.000Z");

  it("deletes a report only once it is older than 24 months", () => {
    expect(reportRetentionCutoff(now).toISOString()).toBe("2024-10-02T09:00:00.000Z");
    expect(
      reportIdsPastRetention(
        [
          { id: "old", createdAt: "2024-10-02T08:59:59.000Z" },
          { id: "boundary", createdAt: "2024-10-02T09:00:00.000Z" },
          { id: "newer", createdAt: "2024-10-03T09:00:00.000Z" },
          { id: "blank", createdAt: "not-a-date" },
        ],
        now,
      ),
    ).toEqual(["old"]);
  });

  it("schedules a daily delete that logs only the count and cascades sends", () => {
    const sql = readFileSync(
      path.join(process.cwd(), "supabase/migrations/20261002091500_health_check_report_retention.sql"),
      "utf8",
    );
    const sends = readFileSync(
      path.join(process.cwd(), "supabase/migrations/20261001220000_health_check_report_sends.sql"),
      "utf8",
    );
    expect(sql).toContain("DELETE FROM public.health_check_reports");
    expect(sql).toContain("created_at < now() - interval '24 months'");
    expect(sql).toContain("RAISE LOG 'health_check_reports retention deleted %', deleted_count");
    expect(sql).toContain("'purge-expired-health-check-reports'");
    expect(sql).toContain("'15 3 * * *'");
    expect(sql).not.toMatch(/lead_email|public_token|client_ip|lead_business/);
    expect(sends).toContain("ON DELETE CASCADE");
  });
});
