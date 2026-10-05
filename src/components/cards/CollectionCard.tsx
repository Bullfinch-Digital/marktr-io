import React from "react";
import { Card } from "../ui/card";
import { MoreVertical, Edit, Trash2, Folder } from "lucide-react";
import { useNavigate } from "react-router-dom";
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

const fallbackColors = ["#FF9922", "#F28482", "#84A59D", "#4EA8DE", "#9D4EDD", "#F2C94C"];

interface Collection {
  id: string;
  name: string;
  description?: string;
  icpCount: number;
  createdAt: string;
  color?: string | null;
  tags?: string[] | null;
}

interface CollectionCardProps {
  collection: Collection;
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
  isLocked?: boolean;
  onOpenMenu?: () => void;
  onClick?: () => void;
}

export default function CollectionCard({
  collection,
  onEdit,
  onDelete,
  isLocked,
  onOpenMenu,
  onClick,
}: CollectionCardProps) {
  const navigate = useNavigate();
  const locked = !!isLocked;
  const bgColor =
    collection.color || fallbackColors[Math.floor(Math.random() * fallbackColors.length)];
  const formattedDate = new Date(collection.createdAt).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  return (
    <div
      onClick={(e) => {
        if ((e.target as HTMLElement).closest("[data-no-card-click='true']")) return;
        if (locked) return;
        if (onClick) {
          onClick();
          return;
        }
        navigate(`/collections/${collection.id}`);
      }}
      className={`cursor-pointer active:scale-[0.98] transition-transform group h-full ${
        locked ? "collection-locked" : "collection-clickable"
      }`}
    >
      <Card className="hover:shadow-lg transition-all duration-300 group cursor-pointer h-full border border-black rounded-design overflow-hidden">
        <div
          className="h-24 border-b border-black relative"
          style={{ backgroundColor: bgColor }}
        >
          <div className="absolute top-3 right-3">
            <DropdownMenu onOpenChange={(open) => open && onOpenMenu?.()}>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  data-no-card-click="true"
                  onClick={(e) => stop(e)}
                  className="p-1.5 bg-background rounded-full border border-black hover:scale-105 transition-transform h-8 w-8 flex items-center justify-center"
                >
                  <MoreVertical className="h-4 w-4" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="min-w-[160px] border border-black rounded-design bg-neutral-light text-foreground shadow-lg"
              >
                <DropdownMenuItem
                  data-no-card-click="true"
                  className="text-sm"
                  onSelect={(e) => {
                    stop(e);
                    onEdit?.(collection.id);
                  }}
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Rename
                </DropdownMenuItem>
                <DropdownMenuItem
                  data-no-card-click="true"
                  className="text-sm text-red-600 focus:text-red-600"
                  onSelect={(e) => {
                    stop(e);
                    onDelete?.(collection.id);
                  }}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2">
            <div className="w-16 h-16 bg-background rounded-full border-2 border-black flex items-center justify-center shadow-md">
              <Folder className="w-8 h-8" />
            </div>
          </div>
        </div>

        <div className="p-6 pt-10 text-center bg-background">
          <h3 className="font-['Fraunces'] text-lg mb-2">{collection.name}</h3>

          {collection.tags?.length ? (
            <div className="flex flex-wrap gap-1 justify-center mb-2">
              {collection.tags.slice(0, 3).map((tag) => (
                <span
                  key={tag}
                  className="px-2 py-0.5 text-xs border border-black rounded-design bg-foreground/5"
                >
                  {tag}
                </span>
              ))}
            </div>
          ) : null}

          <p className="font-['Plus_Jakarta_Sans'] text-sm text-foreground/70">
            {collection.icpCount} {collection.icpCount === 1 ? "ICP" : "ICPs"}
          </p>

          <p className="font-['Plus_Jakarta_Sans'] text-xs text-foreground/50 mt-1">
            Created {formattedDate}
          </p>
        </div>
      </Card>
    </div>
  );
}
