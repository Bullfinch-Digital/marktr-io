/** Homepage brand accents for app chrome (ICP bands, colour pickers, fallbacks). */
export const BRAND_ICP_BANDS = ["#F4B6AC", "#A9B7DC", "#EBFD84"] as const;

export const BRAND_SWATCHES = [
  "#F4B6AC",
  "#A9B7DC",
  "#EBFD84",
  "#EC9F95",
  "#7B8CB4",
  "#101A26",
] as const;

export function brandBandForIndex(index: number): (typeof BRAND_ICP_BANDS)[number] {
  return BRAND_ICP_BANDS[Math.abs(index) % BRAND_ICP_BANDS.length];
}
