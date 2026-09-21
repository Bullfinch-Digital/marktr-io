import type { Brand } from "../hooks/useBrands";

const MIN_DESCRIPTION_LENGTH = 20;
const MIN_PRODUCT_LENGTH = 10;

function hasText(value: string | null | undefined, minLength: number): boolean {
  return (value?.trim().length ?? 0) >= minLength;
}

function hasItems(value: string[] | null | undefined): boolean {
  return Array.isArray(value) && value.some((item) => item.trim().length > 0);
}

/**
 * Returns true when brand fields used by strategy generation (buildMultiPrompt) are
 * mostly empty — typical of a stub brand created with only a name.
 *
 * Generation prompt uses: name, business_description, product_or_service,
 * business_type, assumed_audience, marketing_channels, country, region_or_city, currency.
 *
 * "Enough" context = at least one substantive signal beyond the brand name:
 * description, product/service, audience, or channels.
 */
export function isBrandContextThin(brand: Brand | null | undefined): boolean {
  if (!brand) return true;

  const substantiveSignals = [
    hasText(brand.business_description, MIN_DESCRIPTION_LENGTH),
    hasText(brand.product_or_service, MIN_PRODUCT_LENGTH),
    hasItems(brand.assumed_audience),
    hasItems(brand.marketing_channels),
    !!brand.business_type?.trim(),
  ];

  return substantiveSignals.filter(Boolean).length === 0;
}
