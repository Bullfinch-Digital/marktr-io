/**
 * Best-effort internal mail to hello@bullfinchdigital.com.
 * Reuses the Gmail API sender. Never throws. Recipients come from env/default only.
 */

import {
  createGmailSender,
  readGmailEnv,
  type SendEmailInput,
  type SendEmailResult,
} from "./sendEmail.ts";

export const DEFAULT_ADMIN_TO = "hello@bullfinchdigital.com";
export const SUBJECT_PREFIX = "[marktr]";
export const VOLUME_CAP_24H = 100;
export const ERROR_THROTTLE_MS = 15 * 60 * 1000;
export const PROD_PROJECT_REF = "txpuoncdlocqwyddvcid";

export type AdminNotifyType =
  | "signup"
  | "lead"
  | "trial"
  | "purchase"
  | "error"
  | "volume_high";

export type NotifyAdminInput = {
  type: AdminNotifyType;
  dedupeKey: string;
  subject: string;
  lines: string[];
  replyTo?: string;
  /** Used only for ignore/dry-run filters. Never taken from the client as a recipient. */
  email?: string;
};

export type NotifyAdminResult = {
  sent: boolean;
  reason:
    | "sent"
    | "dry_run"
    | "ignored"
    | "duplicate"
    | "throttled"
    | "volume_high"
    | "gmail_failed"
    | "log_failed"
    | "caught";
};

export type AdminNotifyEnv = {
  to: string;
  ignoreEmails: string[];
  dryRun: boolean;
};

export type AdminNotifyLogRow = {
  id: string;
  created_at: string;
  suppressed_count: number;
};

export type AdminNotifyDb = {
  insertLog(row: { event_type: string; dedupe_key: string }): Promise<"inserted" | "duplicate" | "failed">;
  countSince(sinceIso: string): Promise<number | null>;
  latestByType(eventType: string): Promise<AdminNotifyLogRow | null>;
  bumpSuppressed(id: string, nextCount: number): Promise<void>;
};

type GmailLike = { send: (input: SendEmailInput) => Promise<SendEmailResult> };

function envGet(key: string): string | undefined {
  const deno = (globalThis as { Deno?: { env: { get(name: string): string | undefined } } }).Deno;
  return deno?.env.get(key);
}

export function readAdminNotifyEnv(
  get: (key: string) => string | undefined = envGet,
): AdminNotifyEnv {
  const to = get("ADMIN_NOTIFY_TO")?.trim() || DEFAULT_ADMIN_TO;
  const dryRaw = get("NOTIFY_DRY_RUN")?.trim().toLowerCase();
  return {
    to,
    ignoreEmails: parseIgnoreEmails(get("NOTIFY_IGNORE_EMAILS")),
    dryRun: dryRaw === "1" || dryRaw === "true" || dryRaw === "yes",
  };
}

export function parseIgnoreEmails(raw: string | undefined): string[] {
  if (!raw?.trim()) return [];
  return raw
    .split(",")
    .map((part) => part.trim().toLowerCase())
    .filter(Boolean);
}

export function normaliseNotifyEmail(email: string | undefined): string {
  return (email ?? "").trim().toLowerCase();
}

/** @example.com, plus-address +test, and NOTIFY_IGNORE_EMAILS (Jon/QA list — default empty). */
export function shouldIgnoreEmail(email: string | undefined, ignoreEmails: string[] = []): boolean {
  const normalised = normaliseNotifyEmail(email);
  if (!normalised || !normalised.includes("@")) return false;
  const [local, domain] = normalised.split("@");
  if (domain === "example.com") return true;
  if (local.includes("+test")) return true;
  return ignoreEmails.includes(normalised);
}

export function prefixedSubject(subject: string): string {
  const trimmed = subject.trim();
  return trimmed.startsWith(SUBJECT_PREFIX) ? trimmed : `${SUBJECT_PREFIX} ${trimmed}`;
}

export function renderAdminEmail(input: {
  subject: string;
  lines: string[];
  suppressedCount?: number;
}): { subject: string; text: string; html: string } {
  const lines = [...input.lines];
  if (input.suppressedCount && input.suppressedCount > 0) {
    lines.push(
      `${input.suppressedCount} similar notice${input.suppressedCount === 1 ? " was" : "s were"} suppressed since the last email.`,
    );
  }
  const text = lines.join("\n");
  const escaped = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  return {
    subject: prefixedSubject(input.subject),
    text,
    html: `<!DOCTYPE html><html><body style="margin:0;padding:24px;background:#ffffff;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.5;color:#0B0B0C;"><pre style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.5;white-space:pre-wrap;">${escaped}</pre></body></html>`,
  };
}

export function functionLogsUrl(functionName: string, supabaseUrl?: string): string {
  const fromUrl = supabaseUrl?.match(/^https:\/\/([a-z0-9]+)\.supabase\.co/i)?.[1];
  const ref = fromUrl || PROD_PROJECT_REF;
  return `https://supabase.com/dashboard/project/${ref}/functions/${functionName}/logs`;
}

export function projectRefFromUrl(supabaseUrl?: string): string {
  return supabaseUrl?.match(/^https:\/\/([a-z0-9]+)\.supabase\.co/i)?.[1] || PROD_PROJECT_REF;
}

export function adminNotifyDbFromSupabase(supabase: { from: (table: string) => any }): AdminNotifyDb {
  return {
    async insertLog(row) {
      const { error } = await supabase.from("admin_notification_log").insert({
        event_type: row.event_type,
        dedupe_key: row.dedupe_key,
      });
      if (!error) return "inserted";
      const code = String(error.code ?? "");
      const message = String(error.message ?? "");
      if (code === "23505" || /duplicate|unique/i.test(message)) return "duplicate";
      console.error("admin_notification_log insert failed");
      return "failed";
    },
    async countSince(sinceIso) {
      const { count, error } = await supabase
        .from("admin_notification_log")
        .select("id", { count: "exact", head: true })
        .gte("created_at", sinceIso);
      if (error) return null;
      return count ?? 0;
    },
    async latestByType(eventType) {
      const { data, error } = await supabase
        .from("admin_notification_log")
        .select("id, created_at, suppressed_count")
        .eq("event_type", eventType)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error || !data) return null;
      return data as AdminNotifyLogRow;
    },
    async bumpSuppressed(id, nextCount) {
      await supabase.from("admin_notification_log").update({ suppressed_count: nextCount }).eq("id", id);
    },
  };
}

export function memoryAdminNotifyDb(now: () => number = Date.now): AdminNotifyDb & {
  rows: Array<{
    id: string;
    event_type: string;
    dedupe_key: string;
    created_at: string;
    suppressed_count: number;
  }>;
} {
  const rows: Array<{
    id: string;
    event_type: string;
    dedupe_key: string;
    created_at: string;
    suppressed_count: number;
  }> = [];
  let seq = 0;
  return {
    rows,
    async insertLog(row) {
      if (rows.some((existing) => existing.dedupe_key === row.dedupe_key)) return "duplicate";
      rows.push({
        id: `log-${++seq}`,
        event_type: row.event_type,
        dedupe_key: row.dedupe_key,
        created_at: new Date(now()).toISOString(),
        suppressed_count: 0,
      });
      return "inserted";
    },
    async countSince(sinceIso) {
      const since = Date.parse(sinceIso);
      return rows.filter((row) => Date.parse(row.created_at) >= since).length;
    },
    async latestByType(eventType) {
      const match = [...rows].reverse().find((row) => row.event_type === eventType);
      return match
        ? { id: match.id, created_at: match.created_at, suppressed_count: match.suppressed_count }
        : null;
    },
    async bumpSuppressed(id, nextCount) {
      const row = rows.find((item) => item.id === id);
      if (row) row.suppressed_count = nextCount;
    },
  };
}

export function createAdminNotifier(opts: {
  env?: AdminNotifyEnv;
  db: AdminNotifyDb;
  gmail: GmailLike;
  now?: () => number;
  log?: (message: string, extra?: Record<string, unknown>) => void;
}) {
  const env = opts.env ?? readAdminNotifyEnv();
  const now = opts.now ?? Date.now;
  const log = opts.log ?? ((message, extra) => console.error(message, extra ?? ""));

  async function sendRendered(
    type: AdminNotifyType,
    dedupeKey: string,
    rendered: { subject: string; text: string; html: string },
    replyTo?: string,
  ): Promise<NotifyAdminResult> {
    const insert = await opts.db.insertLog({ event_type: type, dedupe_key: dedupeKey });
    if (insert === "duplicate") return { sent: false, reason: "duplicate" };
    if (insert === "failed") return { sent: false, reason: "log_failed" };
    if (env.dryRun) {
      log("admin notify dry run", { type, subject: rendered.subject });
      return { sent: false, reason: "dry_run" };
    }
    const result = await opts.gmail.send({
      to: env.to,
      subject: rendered.subject,
      text: rendered.text,
      html: rendered.html,
      replyTo,
    });
    if (!result.ok) {
      log("admin notify gmail failed", { type, error: result.error });
      return { sent: false, reason: "gmail_failed" };
    }
    return { sent: true, reason: "sent" };
  }

  async function notifyAdmin(input: NotifyAdminInput): Promise<NotifyAdminResult> {
    try {
      if (shouldIgnoreEmail(input.email, env.ignoreEmails)) {
        log("admin notify ignored", { type: input.type });
        return { sent: false, reason: "ignored" };
      }

      if (input.type !== "volume_high") {
        const since = new Date(now() - 24 * 60 * 60 * 1000).toISOString();
        const count = (await opts.db.countSince(since)) ?? 0;
        if (count >= VOLUME_CAP_24H) {
          const day = new Date(now()).toISOString().slice(0, 10);
          await sendRendered(
            "volume_high",
            `volume_high:${day}`,
            renderAdminEmail({
              subject: "Notification volume high",
              lines: [
                `${count} admin notifications were logged in the last 24 hours (cap ${VOLUME_CAP_24H}).`,
                "Further notices are paused until the volume drops.",
                `Skipped: ${prefixedSubject(input.subject)}`,
              ],
            }),
          );
          return { sent: false, reason: "volume_high" };
        }
      }

      let suppressedCount = 0;
      if (input.type === "error") {
        const latest = await opts.db.latestByType("error");
        if (latest && now() - Date.parse(latest.created_at) < ERROR_THROTTLE_MS) {
          await opts.db.bumpSuppressed(latest.id, (latest.suppressed_count ?? 0) + 1);
          return { sent: false, reason: "throttled" };
        }
        suppressedCount = latest?.suppressed_count ?? 0;
      }

      const rendered = renderAdminEmail({
        subject: input.subject,
        lines: input.lines,
        suppressedCount,
      });
      return await sendRendered(input.type, input.dedupeKey, rendered, input.replyTo);
    } catch (err) {
      log("admin notify failed", { name: err instanceof Error ? err.name : "error" });
      return { sent: false, reason: "caught" };
    }
  }

  return { notifyAdmin, env };
}

/** Production convenience: Gmail + Supabase log table. Never throws. */
export function createDefaultAdminNotifier(supabase: { from: (table: string) => any }) {
  return createAdminNotifier({
    env: readAdminNotifyEnv(),
    db: adminNotifyDbFromSupabase(supabase),
    gmail: createGmailSender({ env: readGmailEnv() }),
  });
}

/** Keep the isolate alive without delaying the user response. */
export function scheduleAdminNotify(work: Promise<unknown>): void {
  const done = Promise.resolve(work).catch((err) => {
    console.error("admin notify failed", err instanceof Error ? err.name : "error");
  });
  const runtime = (globalThis as { EdgeRuntime?: { waitUntil?: (p: Promise<unknown>) => void } }).EdgeRuntime;
  try {
    runtime?.waitUntil?.(done);
  } catch {
    /* no waitUntil in this isolate */
  }
}

export async function emailHasExistingAccount(
  supabase: { from: (table: string) => any },
  email: string,
): Promise<boolean> {
  const normalised = normaliseNotifyEmail(email);
  if (!normalised) return false;
  try {
    const { data } = await supabase.from("profiles").select("id").ilike("email", normalised).limit(1).maybeSingle();
    return Boolean(data?.id);
  } catch {
    return false;
  }
}

export function shouldNotifyNewLead(opts: { isNewRow: boolean; hasExistingAccount: boolean }): boolean {
  return opts.isNewRow && !opts.hasExistingAccount;
}

export function signupMethodFromAuthRecord(record: {
  raw_app_meta_data?: { provider?: string; providers?: string[] } | null;
  app_metadata?: { provider?: string; providers?: string[] } | null;
}): "google" | "email" | string {
  const meta = record.raw_app_meta_data ?? record.app_metadata ?? {};
  const provider = meta.provider || meta.providers?.[0] || "email";
  if (provider === "google") return "google";
  if (provider === "email") return "email";
  return String(provider);
}

export type AuthUserRecord = {
  id?: string;
  email?: string | null;
  created_at?: string | null;
  is_anonymous?: boolean | null;
  raw_app_meta_data?: { provider?: string; providers?: string[] } | null;
  app_metadata?: { provider?: string; providers?: string[] } | null;
  raw_user_meta_data?: { beta_user?: boolean } | null;
  user_metadata?: { beta_user?: boolean } | null;
};

export function parseAuthUserWebhook(body: unknown): AuthUserRecord | null {
  if (!body || typeof body !== "object") return null;
  const payload = body as Record<string, unknown>;
  const record = (payload.record ?? payload.user ?? payload) as Record<string, unknown>;
  if (!record || typeof record !== "object") return null;
  const id = typeof record.id === "string" ? record.id : "";
  if (!id) return null;
  return {
    id,
    email: typeof record.email === "string" ? record.email : null,
    created_at: typeof record.created_at === "string" ? record.created_at : null,
    is_anonymous: record.is_anonymous === true,
    raw_app_meta_data: (record.raw_app_meta_data as AuthUserRecord["raw_app_meta_data"]) ?? null,
    app_metadata: (record.app_metadata as AuthUserRecord["app_metadata"]) ?? null,
    raw_user_meta_data: (record.raw_user_meta_data as AuthUserRecord["raw_user_meta_data"]) ?? null,
    user_metadata: (record.user_metadata as AuthUserRecord["user_metadata"]) ?? null,
  };
}

export function shouldNotifySignup(record: AuthUserRecord): boolean {
  if (record.is_anonymous) return false;
  return Boolean(normaliseNotifyEmail(record.email ?? undefined));
}

export function formatMoney(amountMinor: number, currency: string): string {
  const code = (currency || "gbp").toUpperCase();
  const value = (amountMinor / 100).toFixed(2);
  return `${code} ${value}`;
}

export function firstTouchSourceFromUnknown(value: unknown): string | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const source = (value as Record<string, unknown>).first_touch_source;
  return typeof source === "string" && source.trim() ? source.trim().slice(0, 100) : null;
}
