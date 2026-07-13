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
