import { describe, expect, it } from "vitest";
import {
  REPORT_PUBLIC_COLUMNS,
  reportResponseHasOnlyPublicKeys,
  sanitizeHealthCheckReportRow,
} from "../../../supabase/functions/get-health-check-report/publicFields.ts";

describe("get-health-check-report public fields", () => {
  it("never emits PII or internal columns, even if new ones are added to the row", () => {
    const row: Record<string, unknown> = {
      public_token: "tok",
      edition: "bullfinch",
      url: "https://example.com",
      overall: 70,
      capped: false,
      website_score: 70,
      brand_story_score: 70,
      content_score: 70,
      social_score: 70,
      findings: [],
      scores: {},
      bf_route: null,
      scoring_version: "1.0.2",
      created_at: "2026-09-30T00:00:00Z",
      id: "should-not-appear",
      run_id: "should-not-appear",
      utm: { utm_source: "secret" },
      facts: { valueProp: "clear" },
      lead_email: "ceo@example.com",
      lead_first_name: "Ada",
      lead_business: "Ada Ltd",
      marketing_consent: true,
      consent_at: "2026-09-30T00:00:00Z",
      lead_phone: "+44000000000",
      ssn: "accidentally-added-pii",
    };

    const report = sanitizeHealthCheckReportRow(row);

    expect(reportResponseHasOnlyPublicKeys(report)).toBe(true);
    expect(Object.keys(report).sort()).toEqual([...REPORT_PUBLIC_COLUMNS].sort());

    for (const forbidden of [
      "id",
      "run_id",
      "utm",
      "facts",
      "lead_email",
      "lead_first_name",
      "lead_business",
      "marketing_consent",
      "consent_at",
      "lead_phone",
      "ssn",
    ]) {
      expect(report).not.toHaveProperty(forbidden);
    }
  });
});
