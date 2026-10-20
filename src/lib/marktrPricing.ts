/** Single source of truth for Marktr Pro commercial copy (paywall + pricing page). */

export const MARKTR_DEFAULT_CHECKOUT_PLAN = "annual" as const;

export const MARKTR_PRO_MONTHLY_EQUIVALENT_GBP = 15;
export const MARKTR_PRO_ANNUAL_TOTAL_GBP = 180;
/** Standalone monthly plan. Savings = monthly × 12 − annual total. */
export const MARKTR_PRO_MONTHLY_PLAN_GBP = 25;
export const MARKTR_PRO_ANNUAL_SAVINGS_GBP =
  MARKTR_PRO_MONTHLY_PLAN_GBP * 12 - MARKTR_PRO_ANNUAL_TOTAL_GBP;

export const MARKTR_TRIAL_DAYS = 14;
/**
 * Stripe sends the trial-ending email this many days before the first charge.
 * The paywall reminder date is the charge date minus this one constant.
 */
export const MARKTR_TRIAL_REMINDER_DAYS_BEFORE = 7;
export const MARKTR_MONEY_BACK_DAYS = 30;

export const MARKTR_PRO_PLAN_NAME = "Marktr Pro";

/** Existing support channel used on marketing/legal pages — reuse, don't invent a new one. */
export const MARKTR_SUPPORT_EMAIL = "hello@bullfinchdigital.com";
export const MARKTR_SUPPORT_MAILTO = `mailto:${MARKTR_SUPPORT_EMAIL}`;

export const MARKTR_PRO_PRICE_HEADLINE = `£${MARKTR_PRO_MONTHLY_EQUIVALENT_GBP}/month`;

export const MARKTR_PRO_BILLING_LINE = `billed annually (£${MARKTR_PRO_ANNUAL_TOTAL_GBP}/year)`;

export const MARKTR_PRO_CARD_SUBTITLE = `£${MARKTR_PRO_MONTHLY_EQUIVALENT_GBP}/month, billed annually (£${MARKTR_PRO_ANNUAL_TOTAL_GBP} a year)`;

/** Paywall plan price, monthly figure first. Pricing-page copy stays on the constants above. */
export const MARKTR_PAYWALL_ANNUAL_PRICE_LINE = `£${MARKTR_PRO_MONTHLY_EQUIVALENT_GBP}/month, billed annually (£${MARKTR_PRO_ANNUAL_TOTAL_GBP} a year)`;
export const MARKTR_PAYWALL_MONTHLY_PRICE_LINE = `£${MARKTR_PRO_MONTHLY_PLAN_GBP}/month, billed monthly`;
export const MARKTR_PAYWALL_ANNUAL_SAVINGS_BADGE = `Save £${MARKTR_PRO_ANNUAL_SAVINGS_GBP} a year`;

export function paywallPlanPriceLine(plan: "annual" | "monthly"): string {
  return plan === "monthly" ? MARKTR_PAYWALL_MONTHLY_PRICE_LINE : MARKTR_PAYWALL_ANNUAL_PRICE_LINE;
}

/** Same price line as the chooser, the plan card, and the monthly offer. */
export function paywallOfferPriceLine(plan: "annual" | "monthly"): string {
  return paywallPlanPriceLine(plan);
}

export function paywallFirstChargeAmount(plan: "annual" | "monthly"): string {
  return plan === "monthly"
    ? `£${MARKTR_PRO_MONTHLY_PLAN_GBP}/month`
    : `£${MARKTR_PRO_ANNUAL_TOTAL_GBP}/year`;
}

const PAYWALL_MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"] as const;

function addLocalDays(from: Date, days: number): Date {
  const date = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  date.setDate(date.getDate() + days);
  return date;
}

/** Local calendar day the first payment is taken: today + the trial length. */
export function paywallFirstChargeDate(from: Date = new Date()): Date {
  return addLocalDays(from, MARKTR_TRIAL_DAYS);
}

/** Local calendar day of the trial-ending reminder email. */
export function paywallReminderDate(from: Date = new Date()): Date {
  return addLocalDays(from, MARKTR_TRIAL_DAYS - MARKTR_TRIAL_REMINDER_DAYS_BEFORE);
}

/** "24 Oct" */
export function formatPaywallDay(date: Date): string {
  return `${date.getDate()} ${PAYWALL_MONTHS[date.getMonth()]}`;
}

/** Trial + post-trial billing — distinct from the money-back guarantee. */
export const MARKTR_TRIAL_LEGAL_STRIP = `£0 today • Cancel anytime before day ${MARKTR_TRIAL_DAYS} • Then £${MARKTR_PRO_ANNUAL_TOTAL_GBP}/year`;

export const MARKTR_TRIAL_CTA_SUBCOPY = `£0 today • Cancel anytime before day ${MARKTR_TRIAL_DAYS}`;

export const MARKTR_TRIAL_FINE_PRINT = `£0 today • then £${MARKTR_PRO_ANNUAL_TOTAL_GBP}/year after ${MARKTR_TRIAL_DAYS} days`;

/**
 * Money-back after first charge — separate protection from the free-trial cancel window.
 * Do not merge with trial copy or invent a combined day count.
 */
export const MARKTR_MONEY_BACK_GUARANTEE = `${MARKTR_MONEY_BACK_DAYS}-day money-back guarantee — full refund if you're not happy within ${MARKTR_MONEY_BACK_DAYS} days of your first payment.`;

/**
 * Pro feature-benefit list — single source for PaywallModal + Pricing.
 * Only ship claims that are actually built. ICP, Brand, Strategy, and Content
 * export are real; Health PDF export and Meta/social integrations are not.
 */
export type MarktrProBenefit = {
  id: string;
  /** Full copy used on the pricing card checklist. */
  label: string;
  /** One-line paywall checklist. Same claim, fewer words. */
  paywallLabel: string;
};

export const MARKTR_PRO_BENEFITS: readonly MarktrProBenefit[] = [
  {
    id: "brand-story",
    label:
      "Full Brand Story System — the messaging, value props, and objection-handling to help you know exactly what to say about your business, on your website, in ads, anywhere.",
    paywallLabel: "Full brand story system",
  },
  {
    id: "unlimited-icps",
    label:
      "Unlimited ICPs — full detail for every type of customer you sell to.",
    paywallLabel: "Unlimited ICPs",
  },
  {
    id: "health-report",
    label:
      "Your complete health report — see exactly why each score is what it is, with specific suggestions on what to fix first.",
    paywallLabel: "Complete health report, with fixes",
  },
  {
    id: "content-strategy",
    label:
      "A content strategy built from your brand and customers — campaign ideas and clear content briefs, so you're never starting from a blank page.",
    paywallLabel: "Content strategy and briefs from your brand",
  },
  {
    id: "multiple-brands",
    label: "Manage multiple brands in one place.",
    paywallLabel: "Multiple brands in one place",
  },
  {
    id: "export-icp-brand",
    label: "Export and share your ICPs, brand stories, strategies, and content.",
    paywallLabel: "Export and share everything",
  },
] as const;

/** Convenience strings for checklists that only need the full benefit copy. */
export const MARKTR_PRO_BENEFIT_LABELS = MARKTR_PRO_BENEFITS.map((b) => b.label);

/** Anchor for /pricing#pricing-pro. The page CTA lives here; the hash does not open the paywall. */
export const PRICING_PRO_CARD_ID = "pricing-pro";

export const MARKTR_PRICING_LEGAL_LINE = `£0 today, then £${MARKTR_PRO_ANNUAL_TOTAL_GBP} a year after your ${MARKTR_TRIAL_DAYS}-day free trial. Cancel any time before day ${MARKTR_TRIAL_DAYS}. ${MARKTR_MONEY_BACK_DAYS}-day money-back guarantee. Prices in GBP, VAT may apply, renews automatically.`;

export const PRICING_SALES = {
  pill: "One plan. Everything included.",
  h1: "One place for your marketing. A clear plan for every week.",
  subhead: `marktr turns what you know about your business into a plan you can follow: what to post, where, and when. Everything in one place, for £${MARKTR_PRO_MONTHLY_EQUIVALENT_GBP} a month, billed annually (£${MARKTR_PRO_ANNUAL_TOTAL_GBP} a year).`,
  problemsLabel: "WHAT GETS IN THE WAY",
  problems: [
    {
      title: "Your time",
      problem: "Hours every week deciding what to post and who it's for.",
      withMarktr: "A plan and ready-to-use content briefs, so you never start from a blank page.",
    },
    {
      title: "Everything scattered",
      problem: "Ideas in notes, drafts in one app, plans in another, and no single place to look.",
      withMarktr: "Your brand story, customers, strategy and content in one organised space.",
    },
    {
      title: "No clear plan",
      problem: "Posting when you remember, and never sure what to do next.",
      withMarktr: "A week-by-week plan with what to post, where and when, and progress you can tick off.",
    },
  ],
  everythingLine: "Everything included, nothing to unlock later.",
  includedLabel: "What's included",
  included: [
    "A clear marketing plan: where to post, what to post and when.",
    "Content briefs and scripts for every post, ready to use.",
    "Your brand story and customer profiles, always to hand.",
    "A weekly progress tracker so you can see what you've done.",
  ],
  cta: `Start your ${MARKTR_TRIAL_DAYS}-day free trial`,
  legalLine: MARKTR_PRICING_LEGAL_LINE,
} as const;
