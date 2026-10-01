export type BfEmailRoute = "talk" | "polish" | "diy";

export type ScoreEmailCopy = {
  subject: string;
  opening: string;
  notCheckedLine: string;
  notCheckedValue: string;
  overallLabel: string;
  reportLine: string;
  reportLinkLabel: string;
  reportButton: string;
  wordmarkUrl: string;
  wordmarkAlt: string;
  signOffName: string;
  signOffOrg: string;
  labels: {
    website: string;
    brandStory: string;
    social: string;
    content: string;
  };
  routes: Record<BfEmailRoute, string>;
  routeLinkLabels: { talk: string; diy: string };
  internalSubject: string;
  internalReportLabel: string;
};

export const bullfinchScoreEmailCopy: ScoreEmailCopy = {
  subject: "Your marketing health check: {overall}/100",
  opening: "Hi {greeting}, here's your health check for {domain}.",
  notCheckedLine: "Based on your website and story. Add your Instagram for a full score.",
  notCheckedValue: "Not checked",
  overallLabel: "Overall",
  reportLine: "Your full report, with what's working and what to fix first.",
  reportLinkLabel: "Your full report",
  reportButton: "See your full report",
  wordmarkUrl: "https://bullfinchdigital.com/wp-content/uploads/2026/09/bullfinch-wordmark.png",
  wordmarkAlt: "Bullfinch",
  signOffName: "Jon Stanford",
  signOffOrg: "Bullfinch Digital · Shrewsbury",
  labels: {
    website: "Website",
    brandStory: "Brand story",
    social: "Social",
    content: "Content",
  },
  routes: {
    talk: "If you'd like a hand closing the gaps, just reply to this email or check availability.",
    polish: "Strong result. If you'd like a second pair of eyes on the next step, just reply.",
    diy: "If you want to build the foundations yourself, marktr.io walks you through it.",
  },
  routeLinkLabels: {
    talk: "check availability",
    diy: "marktr.io",
  },
  internalSubject: "New health check lead: {who} ({overall}/100, {route})",
  internalReportLabel: "Open their report",
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
const SANS = "Arial,Helvetica,sans-serif";
const ZWJ = "\u200D";

function fill(template: string, vars: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => vars[key] ?? "");
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
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

/** Stops Gmail turning "example.com" in the greeting into a link. */
function unlinkDomain(domain: string): string {
  return domain.replace(/\./g, `.${ZWJ}`);
}

function linkPhrase(sentence: string, phrase: string, href: string): string {
  const linked = `<a href="${escapeHtml(href)}" style="color:${INK};">${escapeHtml(phrase)}</a>`;
  const index = sentence.indexOf(phrase);
  if (index < 0) return escapeHtml(sentence);
  return (
    escapeHtml(sentence.slice(0, index)) +
    linked +
    escapeHtml(sentence.slice(index + phrase.length))
  );
}

function routeOrTalk(route: BfEmailRoute | null): BfEmailRoute {
  return route === "polish" || route === "diy" || route === "talk" ? route : "talk";
}

function routePlain(route: BfEmailRoute, copy: ScoreEmailCopy, input: VisitorEmailInput): string[] {
  const sentence = copy.routes[route];
  if (route === "talk") {
    return [sentence, "", "Check availability", input.contactUrl];
  }
  if (route === "diy") {
    return [sentence, "", copy.routeLinkLabels.diy, input.marktrUrl];
  }
  return [sentence];
}

function routeHtml(route: BfEmailRoute, copy: ScoreEmailCopy, input: VisitorEmailInput): string {
  if (route === "talk") return linkPhrase(copy.routes.talk, copy.routeLinkLabels.talk, input.contactUrl);
  if (route === "diy") return linkPhrase(copy.routes.diy, copy.routeLinkLabels.diy, input.marktrUrl);
  return escapeHtml(copy.routes.polish);
}

export function renderVisitorScoreEmail(
  copy: ScoreEmailCopy,
  input: VisitorEmailInput,
): { subject: string; text: string; html: string } {
  const route = routeOrTalk(input.route);
  const overallText = input.overall === null ? "—" : String(input.overall);
  const domain = unlinkDomain(input.domain);
  const vars = {
    overall: overallText,
    greeting: greeting(input.firstName),
    domain,
  };
  const lines = [
    fill(copy.opening, vars),
    "",
    copy.overallLabel,
    `${overallText}/100`,
  ];
  if (input.socialNotChecked) lines.push("", copy.notCheckedLine);
  lines.push(
    "",
    `${copy.labels.website}: ${scoreText(input.website, false, copy)}`,
    `${copy.labels.brandStory}: ${scoreText(input.brandStory, false, copy)}`,
    `${copy.labels.social}: ${scoreText(input.social, input.socialNotChecked, copy)}`,
    `${copy.labels.content}: ${scoreText(input.content, input.socialNotChecked, copy)}`,
    "",
    copy.reportLinkLabel,
    input.reportUrl,
    "",
    ...routePlain(route, copy, input),
    "",
    copy.signOffName,
    copy.signOffOrg,
  );

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
        `<tr><td style="padding:6px 0;font-family:${SANS};font-size:16px;color:${INK};">${escapeHtml(row.label)}</td><td align="right" style="padding:6px 0;font-family:${SANS};font-size:16px;font-weight:bold;color:${row.color};">${escapeHtml(row.value)}</td></tr>`,
    )
    .join("");

  const overallColor = input.overall === null ? SCORE_MUTED : scoreColor(input.overall);
  const note = input.socialNotChecked
    ? `<p style="margin:12px 0 0;font-family:${SANS};font-size:14px;line-height:1.5;color:${SCORE_MUTED};">${escapeHtml(copy.notCheckedLine)}</p>`
    : "";

  const html = `<!DOCTYPE html><html><body style="margin:0;padding:0;background:${CREAM};">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${CREAM};">
<tr><td align="center" style="padding:32px 16px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">
<tr><td style="padding-bottom:24px;"><img src="${escapeHtml(copy.wordmarkUrl)}" alt="${escapeHtml(copy.wordmarkAlt)}" width="140" style="display:block;width:140px;max-width:140px;height:auto;border:0;"></td></tr>
<tr><td style="font-family:${SANS};font-size:16px;line-height:1.5;color:${INK};">${escapeHtml(fill(copy.opening, vars))}</td></tr>
<tr><td style="padding-top:24px;">
<p style="margin:0;font-family:${SANS};font-size:13px;color:${INK};">${escapeHtml(copy.overallLabel)}</p>
<p style="margin:4px 0 0;font-family:${SANS};font-size:40px;line-height:1;font-weight:bold;color:${overallColor};">${escapeHtml(overallText)}/100</p>
${note}
</td></tr>
<tr><td style="padding-top:16px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0">${scoreRows}</table>
</td></tr>
<tr><td style="padding-top:20px;font-family:${SANS};font-size:16px;line-height:1.5;color:${INK};">${escapeHtml(copy.reportLine)}</td></tr>
<tr><td style="padding-top:24px;">
<table role="presentation" cellpadding="0" cellspacing="0"><tr><td bgcolor="${INK}" style="border-radius:999px;background:${INK};">
<a href="${escapeHtml(input.reportUrl)}" style="display:inline-block;background:${INK};color:#ffffff;text-decoration:none;border-radius:999px;padding:12px 22px;font-family:${SANS};font-size:14px;">${escapeHtml(copy.reportButton)}</a>
</td></tr></table>
</td></tr>
<tr><td style="padding-top:16px;font-family:${SANS};font-size:16px;line-height:1.5;color:${INK};">${routeHtml(route, copy, input)}</td></tr>
<tr><td style="padding-top:28px;font-family:${SANS};font-size:16px;line-height:1.5;color:${INK};">${escapeHtml(copy.signOffName)}<br>${escapeHtml(copy.signOffOrg)}</td></tr>
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
  const utmParts = input.utm
    ? Object.entries(input.utm)
        .filter(([, value]) => value.trim())
        .map(([key, value]) => `${key}=${value}`)
    : [];
  const detailLines = [
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
    utmParts.length ? `UTMs: ${utmParts.join(", ")}` : "UTMs: —",
  ];
  const text = [copy.internalReportLabel, input.reportUrl, "", ...detailLines].join("\n");
  const html = `<!DOCTYPE html><html><body style="margin:0;padding:24px;background:#ffffff;font-family:${SANS};font-size:14px;line-height:1.5;color:${INK};">
<p style="margin:0 0 16px;font-family:${SANS};font-size:14px;"><a href="${escapeHtml(input.reportUrl)}" style="color:${INK};">${escapeHtml(copy.internalReportLabel)}</a></p>
<pre style="margin:0;font-family:${SANS};font-size:14px;line-height:1.5;color:${INK};white-space:pre-wrap;">${escapeHtml(detailLines.join("\n"))}</pre>
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
