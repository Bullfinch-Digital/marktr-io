import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  createAdminNotifier,
  ERROR_THROTTLE_MS,
  functionLogsUrl,
  memoryAdminNotifyDb,
  parseAuthUserWebhook,
  parseIgnoreEmails,
  prefixedSubject,
  renderAdminEmail,
  shouldIgnoreEmail,
  shouldNotifyNewLead,
  shouldNotifySignup,
  signupMethodFromAuthRecord,
  VOLUME_CAP_24H,
  type NotifyAdminInput,
} from "../../supabase/functions/_shared/adminNotify.ts";

function signupInput(overrides: Partial<NotifyAdminInput> = {}): NotifyAdminInput {
  return {
    type: "signup",
    dedupeKey: "signup:user-1",
    subject: "Sign-up: ada@company.com (email)",
    lines: [
      "Email: ada@company.com",
      "Method: email",
      "Time: 2026-10-08T11:00:00.000Z",
      "Guest checkout: no",
      "Health-check lead: no",
      "First-touch source: —",
    ],
    email: "ada@company.com",
    ...overrides,
  };
}

describe("admin notify filters", () => {
  it("ignores example.com, +test plus-addresses, and the ignore list", () => {
    expect(shouldIgnoreEmail("ada@example.com")).toBe(true);
    expect(shouldIgnoreEmail("jon+test@bullfinchdigital.com")).toBe(true);
    expect(shouldIgnoreEmail("jon+test1@bullfinchdigital.com")).toBe(true);
    expect(shouldIgnoreEmail("ada@company.com")).toBe(false);
    expect(shouldIgnoreEmail("qa@bullfinchdigital.com", parseIgnoreEmails("qa@bullfinchdigital.com, other@x.com"))).toBe(
      true,
    );
    expect(parseIgnoreEmails("")).toEqual([]);
    expect(parseIgnoreEmails(undefined)).toEqual([]);
  });

  it("skips repeat upserts and existing accounts", () => {
    expect(shouldNotifyNewLead({ isNewRow: true, hasExistingAccount: false })).toBe(true);
    expect(shouldNotifyNewLead({ isNewRow: false, hasExistingAccount: false })).toBe(false);
    expect(shouldNotifyNewLead({ isNewRow: true, hasExistingAccount: true })).toBe(false);
  });

  it("maps google vs email from auth metadata", () => {
    expect(signupMethodFromAuthRecord({ raw_app_meta_data: { provider: "google" } })).toBe("google");
    expect(signupMethodFromAuthRecord({ raw_app_meta_data: { provider: "email" } })).toBe("email");
    expect(signupMethodFromAuthRecord({})).toBe("email");
  });

  it("skips anonymous auth users and email-less webhook rows", () => {
    const record = parseAuthUserWebhook({
      type: "INSERT",
      table: "users",
      schema: "auth",
      record: {
        id: "user-1",
        email: "ada@company.com",
        is_anonymous: false,
        raw_app_meta_data: { provider: "email" },
      },
    });
    expect(record?.email).toBe("ada@company.com");
    expect(shouldNotifySignup(record!)).toBe(true);
    expect(
      shouldNotifySignup({
        id: "anon",
        email: null,
        is_anonymous: true,
      }),
    ).toBe(false);
  });
});

describe("admin notify copy", () => {
  it("prefixes subjects and renders plain text plus simple HTML", () => {
    const rendered = renderAdminEmail({
      subject: "Sign-up: ada@company.com (email)",
      lines: ["Email: ada@company.com", "Method: email"],
      suppressedCount: 2,
    });
    expect(rendered.subject).toBe("[marktr] Sign-up: ada@company.com (email)");
    expect(prefixedSubject("[marktr] already")).toBe("[marktr] already");
    expect(rendered.text).toContain("Email: ada@company.com");
    expect(rendered.text).toContain("2 similar notices were suppressed since the last email.");
    expect(rendered.html).toContain("Email: ada@company.com");
    expect(functionLogsUrl("stripe-webhook")).toContain("/functions/stripe-webhook/logs");
  });
});

describe("admin notify sender", () => {
  it("dry-run logs instead of sending, and duplicates send once", async () => {
    const sent: string[] = [];
    const db = memoryAdminNotifyDb(() => Date.parse("2026-10-08T12:00:00.000Z"));
    const logs: string[] = [];
    const notifier = createAdminNotifier({
      env: { to: "hello@bullfinchdigital.com", ignoreEmails: [], dryRun: true },
      db,
      now: () => Date.parse("2026-10-08T12:00:00.000Z"),
      log: (message) => logs.push(message),
      gmail: {
        send: async (input) => {
          sent.push(input.to);
          return { ok: true };
        },
      },
    });

    const first = await notifier.notifyAdmin(signupInput());
    const again = await notifier.notifyAdmin(signupInput());
    expect(first).toEqual({ sent: false, reason: "dry_run" });
    expect(again).toEqual({ sent: false, reason: "duplicate" });
    expect(sent).toEqual([]);
    expect(logs.some((line) => line.includes("dry run"))).toBe(true);
    expect(db.rows).toHaveLength(1);
  });

  it("honours the ignore list without inserting", async () => {
    const db = memoryAdminNotifyDb();
    const notifier = createAdminNotifier({
      env: { to: "hello@bullfinchdigital.com", ignoreEmails: ["qa@bullfinchdigital.com"], dryRun: false },
      db,
      gmail: { send: async () => ({ ok: true }) },
    });
    const result = await notifier.notifyAdmin(
      signupInput({ email: "qa@bullfinchdigital.com", dedupeKey: "signup:qa" }),
    );
    expect(result.reason).toBe("ignored");
    expect(db.rows).toHaveLength(0);
  });

  it("does not throw when Gmail fails", async () => {
    const notifier = createAdminNotifier({
      env: { to: "hello@bullfinchdigital.com", ignoreEmails: [], dryRun: false },
      db: memoryAdminNotifyDb(),
      gmail: { send: async () => ({ ok: false, error: "gmail_send_failed" }) },
    });
    await expect(notifier.notifyAdmin(signupInput())).resolves.toEqual({
      sent: false,
      reason: "gmail_failed",
    });
  });

  it("does not throw when the notifier itself throws", async () => {
    const notifier = createAdminNotifier({
      env: { to: "hello@bullfinchdigital.com", ignoreEmails: [], dryRun: false },
      db: {
        insertLog: async () => {
          throw new Error("boom");
        },
        countSince: async () => 0,
        latestByType: async () => null,
        bumpSuppressed: async () => undefined,
      },
      gmail: { send: async () => ({ ok: true }) },
    });
    await expect(notifier.notifyAdmin(signupInput())).resolves.toEqual({ sent: false, reason: "caught" });
  });

  it("throttles errors to one per 15 minutes and reports the suppressed count next time", async () => {
    let now = Date.parse("2026-10-08T12:00:00.000Z");
    const db = memoryAdminNotifyDb(() => now);
    const sent: string[] = [];
    const notifier = createAdminNotifier({
      env: { to: "hello@bullfinchdigital.com", ignoreEmails: [], dryRun: false },
      db,
      now: () => now,
      gmail: {
        send: async (input) => {
          sent.push(input.text);
          return { ok: true };
        },
      },
    });

    const errorAt = (key: string): NotifyAdminInput => ({
      type: "error",
      dedupeKey: key,
      subject: "Error: stripe-webhook",
      lines: ["Function: stripe-webhook", "Error: handler_exception"],
    });

    expect((await notifier.notifyAdmin(errorAt("error:a"))).reason).toBe("sent");
    expect((await notifier.notifyAdmin(errorAt("error:b"))).reason).toBe("throttled");
    expect((await notifier.notifyAdmin(errorAt("error:c"))).reason).toBe("throttled");
    now += ERROR_THROTTLE_MS + 1;
    const next = await notifier.notifyAdmin(errorAt("error:d"));
    expect(next.reason).toBe("sent");
    expect(sent[1]).toContain("2 similar notices were suppressed since the last email.");
  });

  it(`pauses after ${VOLUME_CAP_24H} logged notices and sends one volume-high email`, async () => {
    const now = Date.parse("2026-10-08T12:00:00.000Z");
    const db = memoryAdminNotifyDb(() => now);
    for (let i = 0; i < VOLUME_CAP_24H; i += 1) {
      await db.insertLog({ event_type: "lead", dedupe_key: `lead:${i}` });
    }
    const subjects: string[] = [];
    const notifier = createAdminNotifier({
      env: { to: "hello@bullfinchdigital.com", ignoreEmails: [], dryRun: false },
      db,
      now: () => now,
      gmail: {
        send: async (input) => {
          subjects.push(input.subject);
          return { ok: true };
        },
      },
    });
    const first = await notifier.notifyAdmin(signupInput({ dedupeKey: "signup:overflow-1" }));
    const second = await notifier.notifyAdmin(signupInput({ dedupeKey: "signup:overflow-2" }));
    expect(first.reason).toBe("volume_high");
    expect(second.reason).toBe("volume_high");
    expect(subjects).toEqual(["[marktr] Notification volume high"]);
  });

  it("sends each event type with the expected subject and body", async () => {
    const captured: Array<{ subject: string; text: string }> = [];
    const db = memoryAdminNotifyDb();
    const notifier = createAdminNotifier({
      env: { to: "hello@bullfinchdigital.com", ignoreEmails: [], dryRun: false },
      db,
      gmail: {
        send: async (input) => {
          captured.push({ subject: input.subject, text: input.text });
          expect(input.to).toBe("hello@bullfinchdigital.com");
          return { ok: true };
        },
      },
    });

    await notifier.notifyAdmin(signupInput());
    await notifier.notifyAdmin({
      type: "lead",
      dedupeKey: "lead:newsletter:ada@company.com",
      subject: "Lead: newsletter (footer)",
      lines: [
        "Email: ada@company.com",
        "Source: footer",
        "Time: 2026-10-08T11:00:00.000Z",
        "Marketing opt-in: —",
      ],
      email: "ada@company.com",
    });
    await notifier.notifyAdmin({
      type: "trial",
      dedupeKey: "trial:cs_test",
      subject: "Trial started: ada@company.com",
      lines: ["Email: ada@company.com", "Plan: annual", "Time: 2026-10-08T11:00:00.000Z"],
      email: "ada@company.com",
    });
    await notifier.notifyAdmin({
      type: "purchase",
      dedupeKey: "purchase:cs_paid",
      subject: "Purchase: ada@company.com · GBP 300.00",
      lines: [
        "Email: ada@company.com",
        "Plan: annual",
        "Amount: GBP 300.00",
        "Time: 2026-10-08T11:00:00.000Z",
      ],
      email: "ada@company.com",
    });
    await notifier.notifyAdmin({
      type: "error",
      dedupeKey: "error:stripe-webhook:handler",
      subject: "Error: stripe-webhook",
      lines: [
        "Function: stripe-webhook",
        "Error: handler_exception",
        "Logs: https://supabase.com/dashboard/project/txpuoncdlocqwyddvcid/functions/stripe-webhook/logs",
      ],
    });

    expect(captured.map((row) => row.subject)).toEqual([
      "[marktr] Sign-up: ada@company.com (email)",
      "[marktr] Lead: newsletter (footer)",
      "[marktr] Trial started: ada@company.com",
      "[marktr] Purchase: ada@company.com · GBP 300.00",
      "[marktr] Error: stripe-webhook",
    ]);
    expect(captured[0].text).toContain("Method: email");
    expect(captured[1].text).toContain("Source: footer");
    expect(captured[3].text).toContain("Amount: GBP 300.00");
    expect(captured[4].text).toContain(
      "https://supabase.com/dashboard/project/txpuoncdlocqwyddvcid/functions/stripe-webhook/logs",
    );
  });
});

describe("admin_notification_log migration", () => {
  it("enables RLS with no public policies", () => {
    const sql = readFileSync(
      path.join(process.cwd(), "supabase/migrations/20261008123000_admin_notification_log.sql"),
      "utf8",
    );
    expect(sql).toContain("admin_notification_log");
    expect(sql).toContain("dedupe_key text NOT NULL");
    expect(sql).toContain("suppressed_count integer NOT NULL DEFAULT 0");
    expect(sql).toContain("ENABLE ROW LEVEL SECURITY");
    expect(sql).toContain("REVOKE ALL ON public.admin_notification_log FROM anon, authenticated");
    expect(sql).not.toMatch(/create policy/i);
  });
});
