import React from "react";
import { Card } from "../ui/card";
import { MoreVertical, Eye, Trash2, Building2, Palette, Copy, FileText } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";

const stop = (e: React.MouseEvent | Event) => {
  e.stopPropagation();
  const target = e.target as HTMLElement;
  if (target) target.setAttribute("data-no-card-click", "true");
};

type BrandCardProps = {
  brand: {
    id: string;
    name?: string | null;
    color?: string | null;
    business_type?: string | null;
    country?: string | null;
    updated_at?: string | null;
    created_at?: string | null;
  };
  onView: () => void;
  onChangeColor?: () => void;
  onDuplicate?: () => void;
  onExportPDF?: () => void;
  onDelete: () => void;
};

export function BrandCard({
  brand,
  onView,
  onDelete,
  onChangeColor,
  onDuplicate,
  onExportPDF,
}: BrandCardProps) {
  const bgColor = brand.color || "#EDEDED";
  const lastUpdated =
    brand.updated_at || brand.created_at
      ? new Date(brand.updated_at || brand.created_at as string).toLocaleDateString()
      : "—";

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={(e) => {
        if ((e.target as HTMLElement).closest("[data-no-card-click='true']")) return;
        onView();
      }}
      onKeyDown={(e) => {
        if ((e.target as HTMLElement).closest("[data-no-card-click='true']")) return;
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onView();
        }
      }}
      className="cursor-pointer active:scale-[0.98] transition-transform group h-full"
    >
      <Card className="flex h-full flex-col overflow-hidden border-2 border-brand-stroke rounded-[24px] hover:shadow-[var(--brand-shadow)] transition-all duration-300 group cursor-pointer">
        <div
          className="relative h-24 shrink-0 border-b border-black"
          style={{ backgroundColor: bgColor }}
        >
          <div className="absolute top-3 right-3">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  data-no-card-click="true"
                  onClick={(e) => stop(e)}
                  className="p-1.5 bg-background rounded-full border border-black hover:scale-105 transition-transform h-8 w-8 flex items-center justify-center"
                  aria-label="Brand actions"
                >
                  <MoreVertical className="h-4 w-4" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="min-w-[180px] border border-black rounded-design bg-neutral-light text-foreground shadow-lg"
              >
                <DropdownMenuItem
                  data-no-card-click="true"
                  className="text-sm"
                  onSelect={(e) => {
                    stop(e);
                    onView();
                  }}
                >
                  <Eye className="h-4 w-4 mr-2" />
                  View Brand
                </DropdownMenuItem>
                <DropdownMenuItem
                  data-no-card-click="true"
                  className="text-sm"
                  onSelect={(e) => {
                    stop(e);
                    onDuplicate?.();
                  }}
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Duplicate Brand
                </DropdownMenuItem>
                <DropdownMenuItem
                  data-no-card-click="true"
                  className="text-sm"
                  onSelect={(e) => {
                    stop(e);
                    onExportPDF?.();
                  }}
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Export as PDF
                </DropdownMenuItem>
                <DropdownMenuItem
                  data-no-card-click="true"
                  className="text-sm"
                  onSelect={(e) => {
                    stop(e);
                    onChangeColor?.();
                  }}
                >
                  <Palette className="h-4 w-4 mr-2" />
                  Change Colour
                </DropdownMenuItem>
                <DropdownMenuItem
                  data-no-card-click="true"
                  className="text-sm text-red-600 focus:text-red-600"
                  onSelect={(e) => {
                    stop(e);
                    onDelete();
                  }}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Brand
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2">
            <div className="w-20 h-20 bg-background rounded-full border-2 border-black flex items-center justify-center shadow-md overflow-hidden">
              <Building2 className="w-8 h-8 text-foreground" />
            </div>
          </div>
        </div>

        <div className="flex-1 p-6 pt-12 text-left bg-background">
          <h3 className="app-heading font-['Fraunces'] text-xl mb-1 truncate">
            {brand.name || "Untitled Brand"}
          </h3>
          <p className="font-['Plus_Jakarta_Sans'] text-sm text-foreground/70 mb-2">
            {brand.business_type ? `${brand.business_type} • ` : ""}
            {brand.country ? brand.country : "No location set yet"}
          </p>
          <p className="text-xs text-foreground/50 font-['Plus_Jakarta_Sans']">
            Last updated: {lastUpdated}
          </p>
        </div>
      </Card>
    </div>
  );
}
