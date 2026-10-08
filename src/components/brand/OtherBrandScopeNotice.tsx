import { Button } from "../ui/button";
import type { BrandCount } from "../../lib/otherBrandCounts";

export function OtherBrandScopeNotice({
  noun,
  activeBrandName,
  otherCount,
  otherBrands,
  onSwitchBrand,
}: {
  noun: string;
  activeBrandName: string;
  otherCount: number;
  otherBrands: BrandCount[];
  onSwitchBrand: (brandId: string) => void;
}) {
  if (otherCount <= 0) return null;

  return (
    <div className="mb-8 rounded-design border-2 border-brand-stroke bg-accent-grey/20 px-5 py-4 max-w-2xl">
      <p className="font-['Plus_Jakarta_Sans'] text-sm text-foreground">
        No {noun} for {activeBrandName}. You have {otherCount} {noun} under other brands.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        {otherBrands.map((brand) => (
          <Button
            key={brand.id}
            type="button"
            variant="outline"
            onClick={() => onSwitchBrand(brand.id)}
            className="border-black rounded-design font-['Plus_Jakarta_Sans'] text-xs h-8 px-3"
          >
            {brand.name}
            {brand.count ? ` (${brand.count})` : ""}
          </Button>
        ))}
      </div>
    </div>
  );
}
