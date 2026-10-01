export type BfEmailRoute = "talk" | "polish" | "diy";

export type ScoreEmailCopy = {
  subject: string;
  opening: string;
  notCheckedLine: string;
  notCheckedValue: string;
  reportLine: string;
  signOff: string;
  labels: {
    website: string;
    brandStory: string;
    social: string;
    content: string;
  };
  routes: Record<BfEmailRoute, string>;
  buttons: Record<BfEmailRoute, string>;
  internalSubject: string;
};

export const bullfinchScoreEmailCopy: ScoreEmailCopy = {
  subject: "Your marketing health check: {overall}/100",
  opening: "Hi {greeting}, here's your health check for {domain}.",
  notCheckedLine: "Based on your website and story. Add your Instagram for a full score.",
  notCheckedValue: "Not checked",
  reportLine: "Your full report, with what's working and what to fix first: {reportUrl}",
  signOff: "Jon, Bullfinch Digital · Shrewsbury",
  labels: {
    website: "Website",
    brandStory: "Brand story",
    social: "Social",
    content: "Content",
  },
  routes: {
    talk: "If you'd like a hand closing the gaps, just reply to this email or check availability: {contactUrl}",
    polish: "Strong result. If you'd like a second pair of eyes on the next step, just reply.",
    diy: "If you want to build the foundations yourself, marktr.io walks you through it: {marktrUrl}",
  },
  buttons: {
    talk: "Check availability",
    polish: "View your report",
    diy: "Start free on marktr.io",
  },
  internalSubject: "New health check lead: {who} ({overall}/100, {route})",
};

export type VisitorEmailInput = {
  firstName: string | null;
  domain: string;
  overall: number | null;
  website: number | null;
  brandStory: number | null;
  social: number | null;
  content: number | null;
  socialNotChecked: boolean;
  route: BfEmailRoute | null;
  reportUrl: string;
  contactUrl: string;
  marktrUrl: string;
};

export type InternalEmailInput = VisitorEmailInput & {
  businessName: string | null;
  websiteUrl: string;
  email: string;
  marketingOptIn: boolean;
  utm: Record<string, string> | null;
};

const SCORE_HIGH = "#18202D";
const SCORE_MID = "#9A5510";
const SCORE_LOW = "#B33F30";
const SCORE_MUTED = "#6B7280";
const INK = "#0B0B0C";
const CREAM = "#F8F0E6";

function fill(template: string, vars: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => vars[key] ?? "");
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function scoreColor(score: number): string {
  if (score >= 75) return SCORE_HIGH;
  if (score >= 50) return SCORE_MID;
  return SCORE_LOW;
}

function scoreText(value: number | null, notChecked: boolean, copy: ScoreEmailCopy): string {
  if (notChecked) return copy.notCheckedValue;
  if (value === null || Number.isNaN(value)) return "—";
  return String(value);
}

function greeting(firstName: string | null): string {
  const name = firstName?.trim();
  return name ? name : "there";
}

function routeOrTalk(route: BfEmailRoute | null): BfEmailRoute {
  return route === "polish" || route === "diy" || route === "talk" ? route : "talk";
}

export function renderVisitorScoreEmail(
  copy: ScoreEmailCopy,
  input: VisitorEmailInput,
): { subject: string; text: string; html: string } {
  const route = routeOrTalk(input.route);
  const overallText = input.overall === null ? "—" : String(input.overall);
  const vars = {
    overall: overallText,
    greeting: greeting(input.firstName),
    domain: input.domain,
    reportUrl: input.reportUrl,
    contactUrl: input.contactUrl,
    marktrUrl: input.marktrUrl,
  };
  const lines = [
    fill(copy.opening, vars),
    "",
    `${copy.labels.website}: ${scoreText(input.website, false, copy)}`,
    `${copy.labels.brandStory}: ${scoreText(input.brandStory, false, copy)}`,
    `${copy.labels.social}: ${scoreText(input.social, input.socialNotChecked, copy)}`,
    `${copy.labels.content}: ${scoreText(input.content, input.socialNotChecked, copy)}`,
  ];
  if (input.socialNotChecked) lines.push(copy.notCheckedLine);
  lines.push("", fill(copy.reportLine, vars), "", fill(copy.routes[route], vars), "", copy.signOff);

  const buttonHref =
    route === "talk" ? input.contactUrl : route === "diy" ? input.marktrUrl : input.reportUrl;
  const rows: Array<{ label: string; value: string; color: string }> = [
    {
      label: copy.labels.website,
      value: scoreText(input.website, false, copy),
      color: input.website === null ? SCORE_MUTED : scoreColor(input.website),
    },
    {
      label: copy.labels.brandStory,
      value: scoreText(input.brandStory, false, copy),
      color: input.brandStory === null ? SCORE_MUTED : scoreColor(input.brandStory),
    },
    {
      label: copy.labels.social,
      value: scoreText(input.social, input.socialNotChecked, copy),
      color: input.socialNotChecked
        ? SCORE_MUTED
        : input.social === null
          ? SCORE_MUTED
          : scoreColor(input.social),
    },
    {
      label: copy.labels.content,
      value: scoreText(input.content, input.socialNotChecked, copy),
      color: input.socialNotChecked
        ? SCORE_MUTED
        : input.content === null
          ? SCORE_MUTED
          : scoreColor(input.content),
    },
  ];

  const scoreRows = rows
    .map(
      (row) =>
        `<tr><td style="padding:6px 0;font-family:Arial,Helvetica,sans-serif;font-size:16px;color:${INK};">${escapeHtml(row.label)}</td><td align="right" style="padding:6px 0;font-family:Georgia,'Times New Roman',serif;font-size:16px;font-weight:bold;color:${row.color};">${escapeHtml(row.value)}</td></tr>`,
    )
    .join("");

  const note = input.socialNotChecked
    ? `<p style="margin:16px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.5;color:${SCORE_MUTED};">${escapeHtml(copy.notCheckedLine)}</p>`
    : "";

  const html = `<!DOCTYPE html><html><body style="margin:0;padding:0;background:${CREAM};">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${CREAM};">
<tr><td align="center" style="padding:32px 16px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">
<tr><td style="font-family:Georgia,'Times New Roman',serif;font-size:28px;line-height:1.2;color:${INK};padding-bottom:24px;">Bullfinch</td></tr>
<tr><td style="font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.5;color:${INK};">${escapeHtml(fill(copy.opening, vars))}</td></tr>
<tr><td style="padding-top:20px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0">${scoreRows}</table>
${note}
</td></tr>
<tr><td style="padding-top:20px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.5;color:${INK};">${escapeHtml(fill(copy.reportLine, vars).replace(input.reportUrl, "")).trim()} <a href="${escapeHtml(input.reportUrl)}" style="color:${INK};">${escapeHtml(input.reportUrl)}</a></td></tr>
<tr><td style="padding-top:16px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.5;color:${INK};">${escapeHtml(fill(copy.routes[route], vars))}</td></tr>
<tr><td style="padding-top:24px;">
<table role="presentation" cellpadding="0" cellspacing="0"><tr><td bgcolor="${INK}" style="border-radius:999px;background:${INK};">
<a href="${escapeHtml(buttonHref)}" style="display:inline-block;background:${INK};color:#ffffff;text-decoration:none;border-radius:999px;padding:12px 22px;font-family:Arial,Helvetica,sans-serif;font-size:14px;">${escapeHtml(copy.buttons[route])}</a>
</td></tr></table>
</td></tr>
<tr><td style="padding-top:28px;font-family:Georgia,'Times New Roman',serif;font-size:16px;color:${INK};">${escapeHtml(copy.signOff)}</td></tr>
</table>
</td></tr>
</table>
</body></html>`;

  return {
    subject: fill(copy.subject, vars),
    text: lines.join("\n"),
    html,
  };
}

export function renderInternalLeadEmail(
  copy: ScoreEmailCopy,
  input: InternalEmailInput,
): { subject: string; text: string; html: string } {
  const who = input.businessName?.trim() || input.domain;
  const route = input.route ?? "unknown";
  const overall = input.overall === null ? "—" : String(input.overall);
  const utmLines = input.utm
    ? Object.entries(input.utm)
        .filter(([, value]) => value.trim())
        .map(([key, value]) => `${key}: ${value}`)
    : [];
  const lines = [
    `Business: ${input.businessName?.trim() || "—"}`,
    `Website: ${input.websiteUrl}`,
    `Email: ${input.email}`,
    `First name: ${input.firstName?.trim() || "—"}`,
    `Marketing opt-in: ${input.marketingOptIn ? "yes" : "no"}`,
    `Website score: ${scoreText(input.website, false, copy)}`,
    `Brand story score: ${scoreText(input.brandStory, false, copy)}`,
    `Social score: ${scoreText(input.social, input.socialNotChecked, copy)}`,
    `Content score: ${scoreText(input.content, input.socialNotChecked, copy)}`,
    `Route: ${route}`,
    ...(input.socialNotChecked ? [copy.notCheckedLine] : []),
    ...(utmLines.length ? ["UTMs:", ...utmLines] : ["UTMs: —"]),
    `Report: ${input.reportUrl}`,
  ];
  const text = lines.join("\n");
  const html = `<!DOCTYPE html><html><body style="margin:0;padding:24px;background:#ffffff;">
<pre style="font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.5;color:#0B0B0C;white-space:pre-wrap;">${escapeHtml(text)}</pre>
</body></html>`;
  return {
    subject: fill(copy.internalSubject, { who, overall, route }),
    text,
    html,
  };
}

export function domainFromUrl(url: string): string {
  try {
    const prefixed = /^https?:\/\//i.test(url) ? url : `https://${url}`;
    return new URL(prefixed).hostname.replace(/^www\./, "");
  } catch {
    return url.trim() || "the site";
  }
}

export function socialHandlesMissing(inputs: {
  instagramHandle?: string | null;
  facebookUrl?: string | null;
} | null | undefined): boolean {
  return !inputs?.instagramHandle?.trim() && !inputs?.facebookUrl?.trim();
}
