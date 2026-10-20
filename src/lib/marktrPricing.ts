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

export const PRICING_SALES = {
  pill: "One plan. Everything included.",
  h1: "Your own dedicated marketing team for less than one month of agency fees.",
  subhead:
    `Agencies and freelancers charge hundreds, often thousands, to work out who your customers are, what to say and what to post. marktr does that thinking in minutes for £${MARKTR_PRO_MONTHLY_EQUIVALENT_GBP} a month, billed annually (£${MARKTR_PRO_ANNUAL_TOTAL_GBP} a year).`,
  costsLabel: "What marketing usually costs",
  costs: [
    {
      title: "Brand strategy and messaging",
      usualCost: "From £2,500, and often £5,000–£20,000 for strategy plus identity.",
      withMarktr: "Your brand story, messaging and value props, included.",
    },
    {
      title: "Social media management",
      usualCost: "Typically £500–£1,500 a month for UK small businesses.",
      withMarktr: "A content strategy with ready-to-use briefs and scripts, included.",
    },
    {
      title: "Your own time",
      usualCost:
        "Hours each week deciding what to post and who it's for. For example, at £30 an hour, 10 hours a month is £300.",
      withMarktr: "You never start from a blank page.",
    },
  ],
  usualCostLabel: "Usual cost",
  withMarktrLabel: "With marktr",
  bridgeBefore: "A whole year of marktr costs ",
  bridgeHighlight: "less than one month",
  bridgeAfter: " of a typical agency retainer.",
  honest:
    "marktr isn't an agency. It gives you the strategy and the content, and you stay in control of your brand.",
  cta: "Start your 14-day free trial",
  ctaFinePrint: "£0 today · Cancel anytime before day 14 · 30-day money-back guarantee",
  footnoteBefore: "Based on published UK pricing guides, 2026. Your quotes will vary. Sources: ",
  sources: [
    {
      id: "pricing_source_whito_social",
      label: "UK social media management costs",
      href: "https://whito.co.uk/research/uk-social-media-management-costs/",
    },
    {
      id: "pricing_source_whito_branding",
      label: "UK branding design costs",
      href: "https://whito.co.uk/research/branding-design-costs-uk/",
    },
  ],
} as const;
