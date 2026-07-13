/** Single source of truth for Marktr Pro commercial copy (paywall + pricing page). */

export const MARKTR_DEFAULT_CHECKOUT_PLAN = "annual" as const;

export const MARKTR_PRO_MONTHLY_EQUIVALENT_GBP = 25;
export const MARKTR_PRO_ANNUAL_TOTAL_GBP = 300;

export const MARKTR_TRIAL_DAYS = 14;
export const MARKTR_MONEY_BACK_DAYS = 30;

export const MARKTR_PRO_PLAN_NAME = "Marktr Pro";

export const MARKTR_PRO_PRICE_HEADLINE = `£${MARKTR_PRO_MONTHLY_EQUIVALENT_GBP}/month`;

export const MARKTR_PRO_BILLING_LINE = `billed annually (£${MARKTR_PRO_ANNUAL_TOTAL_GBP}/year)`;

export const MARKTR_PRO_CARD_SUBTITLE = `£${MARKTR_PRO_MONTHLY_EQUIVALENT_GBP}/month, billed annually (£${MARKTR_PRO_ANNUAL_TOTAL_GBP}/year)`;

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
 * Only ship claims that are actually built. ICP + Brand export are real;
 * Strategy/Content/Health PDF export and Meta/social integrations are not.
 */
export type MarktrProBenefit = {
  id: string;
  /** Full copy used in the paywall modal and pricing card checklist. */
  label: string;
  /** Short label for the Compare Plans table. */
  compareLabel: string;
  /** Free-column value: true = check, false = em dash, string = text. */
  free: boolean | string;
  /** Pro-column value: true = check, string = text. */
  pro: boolean | string;
};

export const MARKTR_PRO_BENEFITS: readonly MarktrProBenefit[] = [
  {
    id: "brand-story",
    label:
      "Full Brand Story System — beyond your free story: the messaging, value props, and objection-handling to help you know exactly what to say about your business, on your website, in ads, anywhere.",
    compareLabel: "Full Brand Story System",
    free: "Free story preview",
    pro: true,
  },
  {
    id: "unlimited-icps",
    label:
      "Unlimited ICPs — go past the free 3 personas, with full detail for every type of customer you sell to.",
    compareLabel: "ICPs included",
    free: "3 ICP previews (read-only)",
    pro: "Unlimited ICPs",
  },
  {
    id: "health-report",
    label:
      "Your complete health report — see exactly why each score is what it is, with specific suggestions on what to fix first.",
    compareLabel: "Complete health report",
    free: "Score overview",
    pro: true,
  },
  {
    id: "content-strategy",
    label:
      "A content strategy built from your brand and customers — campaign ideas and clear content briefs, so you're never starting from a blank page.",
    compareLabel: "Content strategy & campaign ideas",
    free: false,
    pro: true,
  },
  {
    id: "multiple-brands",
    label: "Manage multiple brands in one place.",
    compareLabel: "Manage multiple brands",
    free: false,
    pro: true,
  },
  {
    id: "export-icp-brand",
    label: "Export and share your ICPs and brand story.",
    compareLabel: "Export ICPs and brand stories as PDFs",
    free: false,
    pro: true,
  },
] as const;

/** Convenience strings for checklists that only need the full benefit copy. */
export const MARKTR_PRO_BENEFIT_LABELS = MARKTR_PRO_BENEFITS.map((b) => b.label);
