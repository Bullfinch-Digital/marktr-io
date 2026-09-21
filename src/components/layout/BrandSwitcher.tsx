import { Link, useNavigate } from "react-router-dom";
import { Building2, ChevronDown, Plus } from "lucide-react";
import { useBrand } from "../../contexts/BrandContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";

export function BrandSwitcher() {
  const navigate = useNavigate();
  const { brands, activeBrand, activeBrandId, setActiveBrand, loading } = useBrand();

  if (loading) {
    return (
      <div className="hidden h-9 w-36 animate-pulse rounded-design bg-muted/60 sm:block" aria-hidden />
    );
  }

  if (brands.length === 0) {
    return (
      <Link
        to="/my-brands"
        className="hidden items-center gap-1.5 font-['Inter'] text-sm text-muted-foreground transition-colors hover:text-foreground sm:inline-flex"
      >
        <Building2 className="h-4 w-4 shrink-0" />
        Set up your brand
      </Link>
    );
  }

  const displayName = activeBrand?.name || "Untitled Brand";

  if (brands.length === 1) {
    return (
      <div className="hidden items-center gap-1.5 font-['Inter'] text-sm text-[#0D1833] sm:flex">
        <Building2 className="h-4 w-4 shrink-0 text-muted-foreground" />
        <span className="max-w-[12rem] truncate font-medium">{displayName}</span>
      </div>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="hidden items-center gap-1.5 rounded-design border border-warm-grey bg-white px-3 py-1.5 font-['Inter'] text-sm text-[#0D1833] transition-colors hover:border-black sm:inline-flex"
          aria-label="Switch active brand"
        >
          <Building2 className="h-4 w-4 shrink-0 text-muted-foreground" />
          <span className="max-w-[10rem] truncate font-medium">{displayName}</span>
          <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-[12rem]">
        {brands.map((brand) => (
          <DropdownMenuItem
            key={brand.id}
            onClick={() => setActiveBrand(brand.id)}
            className={brand.id === activeBrandId ? "font-medium" : undefined}
          >
            <span className="truncate">{brand.name || "Untitled Brand"}</span>
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => navigate("/my-brands")}>
          <Plus className="h-4 w-4" />
          Add brand
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
