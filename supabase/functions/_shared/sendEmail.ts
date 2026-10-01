/**
 * Gmail API sender (users.messages.send) using a refresh token.
 * From is fixed. Callers cannot set it. Safe to reuse for marktr later.
 */

export const GMAIL_FROM = "Bullfinch Digital <hello@bullfinchdigital.com>";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const SEND_URL = "https://gmail.googleapis.com/gmail/v1/users/me/messages/send";
const EXPIRY_SKEW_MS = 60_000;

export type GmailEnv = {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
};

export type SendEmailInput = {
  to: string;
  subject: string;
  text: string;
  html: string;
};

export type SendEmailResult =
  | { ok: true }
  | { ok: false; error: "gmail_not_configured" | "gmail_token_failed" | "gmail_send_failed" };

type FetchLike = typeof fetch;

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

function base64Url(bytes: Uint8Array): string {
  return bytesToBase64(bytes).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
}

function encodeHeader(value: string): string {
  if (/^[\u0020-\u007E]*$/.test(value)) return value;
  return `=?UTF-8?B?${bytesToBase64(new TextEncoder().encode(value))}?=`;
}

export function buildRawMessage(input: SendEmailInput): string {
  const boundary = "bf-score-email";
  const lines = [
    `From: ${GMAIL_FROM}`,
    `To: ${input.to}`,
    `Subject: ${encodeHeader(input.subject)}`,
    "MIME-Version: 1.0",
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    "",
    `--${boundary}`,
    "Content-Type: text/plain; charset=UTF-8",
    "Content-Transfer-Encoding: 8bit",
    "",
    input.text,
    "",
    `--${boundary}`,
    "Content-Type: text/html; charset=UTF-8",
    "Content-Transfer-Encoding: 8bit",
    "",
    input.html,
    "",
    `--${boundary}--`,
    "",
  ];
  return lines.join("\r\n");
}

export function readGmailEnv(
  get: (key: string) => string | undefined = (key) => {
    const deno = (globalThis as { Deno?: { env: { get(name: string): string | undefined } } }).Deno;
    return deno?.env.get(key);
  },
): GmailEnv | null {
  const clientId = get("GMAIL_CLIENT_ID")?.trim() ?? "";
  const clientSecret = get("GMAIL_CLIENT_SECRET")?.trim() ?? "";
  const refreshToken = get("GMAIL_REFRESH_TOKEN")?.trim() ?? "";
  if (!clientId || !clientSecret || !refreshToken) return null;
  return { clientId, clientSecret, refreshToken };
}

export function createGmailSender(opts: {
  env: GmailEnv | null;
  fetchImpl?: FetchLike;
  now?: () => number;
  log?: (message: string, extra?: Record<string, unknown>) => void;
}) {
  const fetchImpl = opts.fetchImpl ?? fetch;
  const now = opts.now ?? Date.now;
  const log = opts.log ?? ((message, extra) => console.error(message, extra ?? ""));
  let cached: { token: string; expiresAt: number } | null = null;

  async function accessToken(): Promise<string | null> {
    if (!opts.env) return null;
    if (cached && cached.expiresAt - EXPIRY_SKEW_MS > now()) return cached.token;

    let response: Response;
    try {
      response = await fetchImpl(TOKEN_URL, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: opts.env.clientId,
          client_secret: opts.env.clientSecret,
          refresh_token: opts.env.refreshToken,
          grant_type: "refresh_token",
        }),
      });
    } catch {
      log("gmail token exchange failed", { reason: "network" });
      return null;
    }

    if (!response.ok) {
      log("gmail token exchange failed", { status: response.status });
      return null;
    }

    let payload: { access_token?: string; expires_in?: number };
    try {
      payload = await response.json();
    } catch {
      log("gmail token exchange failed", { reason: "invalid-json" });
      return null;
    }
    if (!payload.access_token || typeof payload.expires_in !== "number") {
      log("gmail token exchange failed", { reason: "missing-token" });
      return null;
    }
    cached = {
      token: payload.access_token,
      expiresAt: now() + payload.expires_in * 1000,
    };
    return cached.token;
  }

  return {
    async send(input: SendEmailInput): Promise<SendEmailResult> {
      if (!opts.env) {
        log("gmail send failed", { reason: "not-configured" });
        return { ok: false, error: "gmail_not_configured" };
      }
      const token = await accessToken();
      if (!token) return { ok: false, error: "gmail_token_failed" };

      const raw = base64Url(new TextEncoder().encode(buildRawMessage(input)));
      let response: Response;
      try {
        response = await fetchImpl(SEND_URL, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ raw }),
        });
      } catch {
        log("gmail send failed", { reason: "network" });
        return { ok: false, error: "gmail_send_failed" };
      }
      if (!response.ok) {
        log("gmail send failed", { status: response.status });
        return { ok: false, error: "gmail_send_failed" };
      }
      return { ok: true };
    },
  };
}
