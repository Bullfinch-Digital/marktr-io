import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { editionConfig } from "./editionConfig";
import {
  businessDisplayName,
  captureFailureBody,
  decideCapture,
  emailContactUrl,
  emailMarktrUrl,
  isReportLeadOrigin,
  reportPageUrl,
  SENDS_PER_IP_PER_HOUR,
  SENDS_PER_REPORT_PER_HOUR,
  storedBusinessName,
} from "../../supabase/functions/_shared/reportLeadCapture.ts";
import {
  bullfinchScoreEmailCopy,
  renderInternalLeadEmail,
  renderResendNote,
  renderVisitorScoreEmail,
  type VisitorEmailInput,
} from "../../supabase/functions/_shared/reportLeadEmail.ts";
import { sendScoreOutcome } from "./sendScoreOutcome";
import {
  buildRawMessage,
  createGmailSender,
  GMAIL_FROM,
  type SendEmailInput,
} from "../../supabase/functions/_shared/sendEmail.ts";

const PREVIEW = "https://marktr-app-git-bullfinch-preview-bullfinch-digital.vercel.app";

const baseDecision = {
  originAllowed: true,
  turnstileOk: true,
  email: "ada@example.com",
  reportFound: true,
  leadEmail: null as string | null,
  recentReportSends: 0,
  recentIpSends: 0,
};

function visitor(overrides: Partial<VisitorEmailInput> = {}): VisitorEmailInput {
  return {
    firstName: "Ada",
    domain: "example.com",
    overall: 60,
    website: 95,
    brandStory: 95,
    social: 0,
    content: 0,
    socialNotChecked: false,
    route: "talk",
    reportUrl: "https://check.bullfinchdigital.com/r/tok",
    contactUrl: emailContactUrl("https://example.com", "tok", "talk"),
    marktrUrl: emailMarktrUrl(),
    ...overrides,
  };
}

describe("capture decision", () => {
  it("keeps the first address and sends the full note only then", () => {
    const first = decideCapture(baseDecision);
    expect(first).toEqual({ ok: true, send: true, setLead: true, internal: "full" });

    const sameAddress = decideCapture({
      ...baseDecision,
      leadEmail: "Ada@example.com",
      email: "ada@example.com",
      recentReportSends: 1,
    });
    expect(sameAddress).toEqual({ ok: true, send: true, setLead: false, internal: "none" });

    const newAddress = decideCapture({
      ...baseDecision,
      leadEmail: "ada@example.com",
      email: "someone-else@example.com",
      recentReportSends: 1,
    });
    expect(newAddress).toEqual({ ok: true, send: true, setLead: false, internal: "resend" });
  });

  it("allows three sends per report per hour and throttles the fourth", () => {
    const third = decideCapture({
      ...baseDecision,
      leadEmail: "ada@example.com",
      recentReportSends: SENDS_PER_REPORT_PER_HOUR - 1,
    });
    expect(third).toMatchObject({ ok: true, send: true });

    const fourth = decideCapture({
      ...baseDecision,
      leadEmail: "ada@example.com",
      email: "other@example.com",
      recentReportSends: SENDS_PER_REPORT_PER_HOUR,
    });
    expect(fourth).toEqual({ ok: false, status: 429, error: "throttled" });
    expect(captureFailureBody("throttled")).toEqual({ ok: false, code: "throttled" });
  });

  it("caps sends per IP across reports", () => {
    const allowed = decideCapture({
      ...baseDecision,
      recentIpSends: SENDS_PER_IP_PER_HOUR - 1,
    });
    expect(allowed).toMatchObject({ ok: true, send: true });

    const blocked = decideCapture({
      ...baseDecision,
      recentReportSends: 0,
      recentIpSends: SENDS_PER_IP_PER_HOUR,
    });
    expect(blocked).toEqual({ ok: false, status: 429, error: "throttled" });
  });

  it("shows the throttle message and never treats a throttle as Sent", () => {
    expect(editionConfig.bullfinch.sendScore?.throttled).toBe(
      "We've just sent it. Give it a few minutes and check your spam folder.",
    );
    expect(sendScoreOutcome({ ok: false, code: "throttled" }, null)).toBe("throttled");
    expect(sendScoreOutcome(null, { context: { status: 429 } })).toBe("throttled");
    expect(sendScoreOutcome({ ok: true, code: "throttled" }, null)).toBe("throttled");
    expect(sendScoreOutcome({ ok: true }, null)).toBe("sent");
    expect(sendScoreOutcome({ ok: false, error: "gmail_send_failed" }, null)).toBe("error");
  });

  it("rejects origins outside the Bullfinch check host and preview pattern", () => {
    expect(isReportLeadOrigin("https://check.bullfinchdigital.com")).toBe(true);
    expect(isReportLeadOrigin(PREVIEW)).toBe(true);
    expect(isReportLeadOrigin("https://marktr.io")).toBe(false);
    expect(isReportLeadOrigin("http://localhost:5173")).toBe(false);
    expect(isReportLeadOrigin("https://marktr-evil.vercel.app")).toBe(false);

    expect(decideCapture({ ...baseDecision, originAllowed: false })).toEqual({
      ok: false,
      status: 403,
      error: "origin_not_allowed",
    });
  });

  it("fails closed when Turnstile does not pass", () => {
    expect(decideCapture({ ...baseDecision, turnstileOk: false })).toEqual({
      ok: false,
      status: 403,
      error: "turnstile_failed",
    });
  });

  it("returns 404 for an unknown report before looking at the email", () => {
    expect(
      decideCapture({ ...baseDecision, reportFound: false, email: "not-an-email" }),
    ).toEqual({ ok: false, status: 404, error: "not_found" });
  });
});

describe("score email templates", () => {
  const copy = editionConfig.bullfinch.scoreEmail!;

  it("keeps the copy on the Bullfinch edition only", () => {
    expect(editionConfig.marktr.sendScore).toBeUndefined();
    expect(editionConfig.marktr.scoreEmail).toBeUndefined();
    expect(editionConfig.bullfinch.scoreEmail).toBe(bullfinchScoreEmailCopy);
    expect(copy.subject).toBe("Your marketing health check: {overall}/100");
    expect(copy.signOffName).toBe("Jon Stanford");
    expect(copy.signOffOrg).toBe("Bullfinch Digital · Shrewsbury");
  });

  function visibleText(html: string): string {
    return html.replace(/<[^>]+>/g, " ");
  }

  it("renders talk, polish and diy route lines", () => {
    const talk = renderVisitorScoreEmail(copy, visitor());
    expect(talk.subject).toBe("Your marketing health check: 60/100");
    expect(talk.text).toContain("Hi Ada, here's your health check for example.\u200Dcom.");
    expect(talk.text).toContain("Overall\n60/100");
    expect(talk.text).toContain("If you'd like a hand closing the gaps");
    expect(talk.text).toContain("Check availability\n");
    expect(talk.text).toContain("utm_medium=email");
    expect(talk.text).toContain("utm_content=talk");
    expect(talk.text).toContain("report=tok");
    expect(talk.text).toContain("Your full report\nhttps://check.bullfinchdigital.com/r/tok");
    expect(talk.text).toContain("Jon Stanford\nBullfinch Digital · Shrewsbury");
    expect(talk.html).toContain('alt="Bullfinch"');
    expect(talk.html).toContain("width:140px");
    expect(talk.html).toContain("See your full report");
    expect(talk.html).toContain(">check availability</a>");
    expect(talk.html).toContain("font-family:Arial,Helvetica,sans-serif");
    expect(talk.html).not.toContain("Georgia");
    expect(visibleText(talk.html)).not.toMatch(/https?:/);
    expect(talk.html).toContain("background:#0B0B0C");

    const polish = renderVisitorScoreEmail(
      copy,
      visitor({ route: "polish", overall: 81, socialNotChecked: false, social: 70, content: 72 }),
    );
    expect(polish.text).toContain("Strong result. If you'd like a second pair of eyes");
    expect(polish.text).not.toContain("marktr.io walks you through it");
    expect(polish.html).toContain("See your full report");
    expect(polish.html).not.toContain("check availability");
    expect(visibleText(polish.html)).not.toMatch(/https?:/);

    const diy = renderVisitorScoreEmail(
      copy,
      visitor({ route: "diy", overall: 22, website: 18, brandStory: 12 }),
    );
    expect(diy.text).toContain("marktr.io walks you through it");
    expect(diy.text).toContain("utm_medium=email");
    expect(diy.text).toContain("utm_content=diy");
    expect(diy.text).toContain(`marktr.io\n${emailMarktrUrl()}`);
    expect(diy.html).toContain(">marktr.io</a>");
    expect(diy.html).toContain("See your full report");
    expect(diy.text).toContain("Jon Stanford");
    expect(visibleText(diy.html)).not.toMatch(/https?:/);
  });

  it("says Not checked when no social handles were entered", () => {
    const rendered = renderVisitorScoreEmail(
      copy,
      visitor({ socialNotChecked: true, firstName: null }),
    );
    expect(rendered.text).toContain("Hi there, here's your health check for example.\u200Dcom.");
    expect(rendered.text.indexOf("Based on your website and story. Add your Instagram for a full score.")).toBeLessThan(
      rendered.text.indexOf("Website: 95"),
    );
    expect(rendered.text).toContain("Social: Not checked");
    expect(rendered.text).toContain("Content: Not checked");
    expect(rendered.html.indexOf("Based on your website and story. Add your Instagram for a full score.")).toBeLessThan(
      rendered.html.indexOf(">Website<"),
    );
    expect(rendered.html).toContain("#6B7280");
    expect(rendered.html).toContain("Arial,Helvetica,sans-serif");
  });

  it("builds the internal note with the report link first and UTMs on one line", () => {
    const note = renderInternalLeadEmail(copy, {
      ...visitor({ socialNotChecked: true }),
      businessName: "Phase 4 test",
      websiteUrl: "https://example.com",
      email: "ada@example.com",
      marketingOptIn: false,
      utm: { utm_campaign: "phase4-test", utm_source: "healthcheck" },
    });
    expect(note.subject).toBe("New health check lead: Phase 4 test (60/100, talk)");
    expect(note.text.startsWith("Open their report\nhttps://check.bullfinchdigital.com/r/tok")).toBe(true);
    expect(note.text).toContain("Business: Phase 4 test");
    expect(note.subject).toContain("Phase 4 test");
    expect(note.text).toContain("Website: https://example.com");
    expect(note.text).toContain("Email: ada@example.com");
    expect(note.text).toContain("Marketing opt-in: no");
    expect(note.text).toContain("Social score: Not checked");
    expect(note.text).toContain("UTMs: utm_campaign=phase4-test, utm_source=healthcheck");
    expect(note.text).not.toContain("Based on your website and story");
    expect(note.html).toContain(">Open their report</a>");
    expect(visibleText(note.html)).not.toContain("https://check.bullfinchdigital.com");
  });

  it("falls back to the domain when the report has no business name", () => {
    const note = renderInternalLeadEmail(copy, {
      ...visitor(),
      businessName: "  ",
      websiteUrl: "https://www.example.com",
      email: "ada@example.com",
      marketingOptIn: false,
      utm: null,
    });
    expect(note.text).toContain("Business: example.com");
    expect(note.text).not.toContain("Business: —");
    expect(note.subject).toContain("example.com");
    expect(storedBusinessName("  Phase 4 test 3  ")).toBe("Phase 4 test 3");
    expect(storedBusinessName("   ")).toBeNull();
    expect(businessDisplayName(null, "example.com")).toBe("example.com");
    expect(businessDisplayName("Phase 4 test 3", "example.com")).toBe("Phase 4 test 3");
  });

  it("sends a one-line note when the report goes to a new address", () => {
    const note = renderResendNote({
      businessName: "Phase 4 test 3",
      domain: "example.com",
      email: "other@example.com",
    });
    expect(note.text).toBe("Phase 4 test 3: report re-sent to a new address other@example.com");
    expect(note.subject).toBe(note.text);
    const fallback = renderResendNote({
      businessName: null,
      domain: "example.com",
      email: "other@example.com",
    });
    expect(fallback.text).toBe("example.com: report re-sent to a new address other@example.com");
  });

  it("uses the production report host, and the preview origin on previews", () => {
    expect(reportPageUrl("https://check.bullfinchdigital.com", "tok")).toBe(
      "https://check.bullfinchdigital.com/r/tok",
    );
    expect(reportPageUrl(PREVIEW, "tok")).toBe(`${PREVIEW}/r/tok?edition=bullfinch`);
    expect(emailContactUrl("https://example.com", "tok", "talk")).toContain("utm_medium=email");
    expect(emailMarktrUrl()).toContain("utm_medium=email");
  });
});

describe("gmail sender", () => {
  const env = {
    clientId: "client-id",
    clientSecret: "super-secret-value",
    refreshToken: "refresh-token-value",
  };

  it("keeps From fixed and posts to users/me/messages/send", async () => {
    const raw = buildRawMessage({
      to: "ada@example.com",
      subject: "Hello",
      text: "plain",
      html: "<p>html</p>",
      ...({ from: "Evil <evil@example.com>" } as Partial<SendEmailInput>),
    });
    expect(raw.startsWith(`From: ${GMAIL_FROM}`)).toBe(true);
    expect(raw).not.toContain("evil@example.com");
    expect(raw).not.toContain("Reply-To:");
    const withReply = buildRawMessage({
      to: "jon@example.com",
      replyTo: "ada@example.com",
      subject: "Hello",
      text: "plain",
      html: "<p>html</p>",
    });
    expect(withReply).toContain("Reply-To: ada@example.com");
    expect(withReply.startsWith(`From: ${GMAIL_FROM}`)).toBe(true);
    const injected = buildRawMessage({
      to: "jon@example.com",
      replyTo: "ada@example.com\nBcc: evil@example.com",
      subject: "Hello",
      text: "plain",
      html: "<p>html</p>",
    });
    expect(injected).not.toContain("Reply-To:");
    expect(injected).not.toContain("Bcc:");
    expect(raw).toContain("Content-Type: text/plain");
    expect(raw).toContain("Content-Type: text/html");

    const calls: string[] = [];
    let now = 1_000_000;
    const fetchImpl = async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      calls.push(url);
      if (url.includes("oauth2.googleapis.com")) {
        return new Response(JSON.stringify({ access_token: "access-1", expires_in: 3600 }), {
          status: 200,
        });
      }
      const rawBody = JSON.parse(String(init?.body)) as { raw: string };
      const b64 = rawBody.raw.replaceAll("-", "+").replaceAll("_", "/");
      const padded = b64 + "=".repeat((4 - (b64.length % 4)) % 4);
      const decoded = new TextDecoder().decode(
        Uint8Array.from(atob(padded), (c) => c.charCodeAt(0)),
      );
      expect(decoded.startsWith(`From: ${GMAIL_FROM}`)).toBe(true);
      expect(url).toBe("https://gmail.googleapis.com/gmail/v1/users/me/messages/send");
      return new Response("{}", { status: 200 });
    };

    const caching = createGmailSender({
      env,
      now: () => now,
      log: () => undefined,
      fetchImpl,
    });
    const message = { to: "ada@example.com", subject: "Hi", text: "t", html: "<p>h</p>" };
    expect(await caching.send(message)).toEqual({ ok: true });
    expect(await caching.send(message)).toEqual({ ok: true });
    expect(calls.filter((url) => url.includes("oauth2.googleapis.com"))).toHaveLength(1);

    now += 3600 * 1000;
    expect(await caching.send(message)).toEqual({ ok: true });
    expect(calls.filter((url) => url.includes("oauth2.googleapis.com"))).toHaveLength(2);
  });

  it("logs a token failure without secrets or the recipient", async () => {
    const logs: string[] = [];
    const sender = createGmailSender({
      env,
      log: (message, extra) => logs.push(`${message} ${JSON.stringify(extra ?? {})}`),
      fetchImpl: async () => new Response("nope", { status: 401 }),
    });
    expect(
      await sender.send({
        to: "ada@example.com",
        subject: "Hi",
        text: "t",
        html: "<p>h</p>",
      }),
    ).toEqual({ ok: false, error: "gmail_token_failed" });
    const joined = logs.join("\n");
    expect(joined).toContain("gmail token exchange failed");
    expect(joined).not.toContain("super-secret-value");
    expect(joined).not.toContain("refresh-token-value");
    expect(joined).not.toContain("ada@example.com");
  });
});

describe("lead email migration", () => {
  it("locks lead columns set-once and leaves email_sent_at writable", () => {
    const sql = readFileSync(
      path.join(
        process.cwd(),
        "supabase/migrations/20261001193000_health_check_report_lead_email.sql",
      ),
      "utf8",
    );
    expect(sql).toContain("marketing_opt_in");
    expect(sql).toContain("lead_captured_at");
    expect(sql).toContain("email_sent_at");
    expect(sql).toContain("OLD.marketing_opt_in IS NOT NULL");
    expect(sql).toContain("OLD.lead_captured_at IS NOT NULL");
    expect(sql).not.toContain("OLD.email_sent_at");
    expect(sql).not.toMatch(/create policy/i);
  });

  it("logs every send in a closed table", () => {
    const sql = readFileSync(
      path.join(process.cwd(), "supabase/migrations/20261001220000_health_check_report_sends.sql"),
      "utf8",
    );
    expect(sql).toContain("health_check_report_sends");
    expect(sql).toContain("report_id");
    expect(sql).toContain("email");
    expect(sql).toContain("sent_at");
    expect(sql).toContain("ok");
    expect(sql).toContain("client_ip");
    expect(sql).toContain("ENABLE ROW LEVEL SECURITY");
    expect(sql).not.toMatch(/create policy/i);

    const persist = readFileSync(
      path.join(process.cwd(), "supabase/functions/score-website/persistReport.ts"),
      "utf8",
    );
    expect(persist).toContain("lead_business: storedBusinessName(opts.businessName)");
  });
});
