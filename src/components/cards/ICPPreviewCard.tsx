import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Card } from "../ui/card";
import { Button } from "../ui/button";
import {
  Eye,
  Copy,
  Trash2,
  MoreVertical,
  Lock,
  Palette,
  FileText,
  FolderPlus,
  FolderMinus,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../ui/tooltip";
import { supabase } from "../../config/supabase";
import { exportICPAsPDF } from "../../utils/exportICP";
import { canExportICP } from "../../config/accessRules";
import { avatarUrlFromKey } from "../../utils/avatarLibrary";
import "../../styles/Modal.css";
import { useICPs, generateIcpCopyName } from "../../hooks/useICPs";
import useSubscription from "../../hooks/useSubscription";
import { resolveBrandIdForIcpOps } from "../../lib/icpBrandAttach";

// EXACT same helper pattern as CollectionCard
const stop = (e: React.MouseEvent | Event) => {
  e.stopPropagation();
  const target = e.target as HTMLElement;
  if (target) target.setAttribute("data-no-card-click", "true");
};

// Helper to merge class names
function cls(...c: (string | false | null | undefined)[]) {
  return c.filter(Boolean).join(" ");
}

interface ICPPreviewCardProps {
  icp: {
    id: string;
    brand_id?: string | null;
    brandName?: string | null;
    brand?: { name?: string | null } | null;
    brands?: { name?: string | null } | null;
    name: string;
    description: string;
    industry?: string;
    color?: string | null;
    companySize?: string;
    location?: string;
    painPoints?: string[];
    goals?: string[];
    budget?: string;
    techStack?: string[];
    decisionMakers?: string[];
    challenges?: string[];
    opportunities?: string[];
    createdAt?: string;
    created_at?: string;
    avatar_key?: string | null;
    gender?: string | null;
    age_range?: string | null;
    avatar_gender?: string | null;
    avatar_age_range?: string | null;
    avatar?: string | null; // legacy
    isLocked?: boolean;
    tags?: string[];
    _index?: number;
  };
  userTier: string;
  onUpgrade: () => void;
  isInCollection?: boolean;
  onRemoveFromCollection?: () => void;
  onAddToCollection?: () => void;
  isLocked?: boolean;
  onChangeColor?: (id: string, currentColor?: string | null) => void;
  onChangeAvatar?: (
    id: string,
    currentAvatarKey?: string | null,
    gender?: string | null,
    ageRange?: string | null
  ) => void;
  onDelete?: () => void;
  onMoveToBrand?: (icpId: string, brandId: string | null) => Promise<void> | void;
  onCardClickOverride?: () => void;
  /** Guest preview — card is display-only, no navigation on click */
  previewOnly?: boolean;
  // Optional brand list so the card can resolve a brand name globally
  brands?: Array<{ id: string; name: string }>;
}

export function ICPPreviewCard(props: ICPPreviewCardProps) {
  const {
    icp,
    userTier,
    onUpgrade,
    brands,
    onRemoveFromCollection,
    onAddToCollection,
    isInCollection = false,
    isLocked,
    onChangeColor,
    onChangeAvatar,
    onDelete,
    onMoveToBrand,
    onCardClickOverride,
    previewOnly = false,
  } = props;
  const [isHovered, setIsHovered] = useState(false);
  const [shake, setShake] = useState(false);
  const [moveBrandOpen, setMoveBrandOpen] = useState(false);
  const [moveBrandId, setMoveBrandId] = useState<string | null>(icp.brand_id ?? null);
  const [isDuplicating, setIsDuplicating] = useState(false);
  const { duplicateICP, icps: allIcps } = useICPs();
  const { effectiveTier, hasFullAccess } = useSubscription();
  const resolvedTier = effectiveTier ?? (userTier as any);
  const navigate = useNavigate();
  const locked = !!isLocked;

  const createdAt = (icp.createdAt ?? (icp as any).created_at) as string;

  const avatarSrc = icp.avatar_key
    ? avatarUrlFromKey(icp.avatar_key)
    : icp.avatar ?? avatarUrlFromKey(null);

  // Global brand label resolution
  const joinedBrandName =
    (icp as any)?.brand?.name ??
    (icp as any)?.brands?.name ??
    null;

  const lookedUpBrandName =
    icp.brand_id && brands?.length
      ? brands.find((b) => b.id === icp.brand_id)?.name ?? null
      : null;

  const displayBrandName =
    icp.brandName ??
    joinedBrandName ??
    lookedUpBrandName ??
    null;

  const hasBrand = !!displayBrandName || !!icp.brand_id;

  const companySize = (icp as any).company_size ?? icp.companySize;
  const previewMetaLine = [icp.industry, companySize, icp.location]
    .filter(Boolean)
    .join(" · ");
  const previewPainPoints =
    ((icp as any).pain_points as string[] | undefined) ?? icp.painPoints ?? [];
  const previewGoals = icp.goals ?? [];
  const previewBullets = (
    previewPainPoints.length ? previewPainPoints : previewGoals
  ).slice(0, 2);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return "Invalid Date";
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const triggerShake = () => setShake(true);
  const handleAnimationEnd = () => shake && setShake(false);

  const handleAction = async (action: string) => {
    // General lock guard (except collection add/remove)
    if (locked && action !== "remove-from-collection" && action !== "add-to-collection") {
      triggerShake();
      onUpgrade?.();
      return;
    }

    if (action === "remove-from-collection" && onRemoveFromCollection) {
      onRemoveFromCollection();
      return;
    }

    if (action === "add-to-collection" && onAddToCollection) {
      onAddToCollection();
      return;
    }

    if (action === "view" || action === "edit") {
      navigate(`/icp/${icp.id}`);
      return;
    }

    if (action === "duplicate") {
      // Paywall gate for free tier
      if (!hasFullAccess) {
        triggerShake();
        onUpgrade?.();
        return;
      }
      if (isDuplicating) return;

      setIsDuplicating(true);
      try {
        if (duplicateICP) {
          const created = await duplicateICP(icp.id);
          if (created?.id) {
            navigate(`/icp/${created.id}`);
          }
        } else {
          // Fallback direct duplication if hook not available
          const { data: original } = await supabase
            .from("icps")
            .select("*")
            .eq("id", icp.id)
            .single();
          if (!original) {
            return;
          }

          const names = Array.isArray(allIcps) ? allIcps.map((i: any) => i?.name || "") : [];
          const {
            data: { user: authUser },
          } = await supabase.auth.getUser();
          const resolvedBrandId = authUser?.id
            ? await resolveBrandIdForIcpOps(
                authUser.id,
                (original as any).brand_id ?? null
              )
            : (original as any).brand_id ?? null;
          const payload: any = {
            ...original,
            id: undefined,
            _index: undefined,
            brandName: undefined,
            brands: undefined,
            brand_id: resolvedBrandId,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            name: generateIcpCopyName(original.name || "ICP", names),
          };
          const { data: inserted } = await supabase
            .from("icps")
            .insert(payload)
            .select()
            .single();
          if (inserted) {
            try {
              window.dispatchEvent(new Event("icps:changed"));
            } catch {}
            navigate(`/icp/${inserted.id}`);
          }
        }
      } catch (err) {
        console.error("Duplicate error:", err);
      } finally {
        setIsDuplicating(false);
      }
      return;
    }

    if (action === "export-pdf") {
      const allowed = canExportICP(icp._index ?? 0, resolvedTier as any);
      if (!allowed) {
        console.log("[ICPPreviewCard] export blocked", { tier: resolvedTier, index: icp._index });
        triggerShake();
        onUpgrade?.();
        return;
      }
      exportICPAsPDF(icp as any);
      return;
    }

    if (action === "change-color") {
      if (!hasFullAccess) {
        triggerShake();
        onUpgrade?.();
        return;
      }
      onChangeColor?.(icp.id, icp.color ?? null);
      return;
    }

    if (action === "change-avatar") {
      if (!hasFullAccess) {
        triggerShake();
        onUpgrade?.();
        return;
      }
      onChangeAvatar?.(
        icp.id,
        icp.avatar_key ?? null,
        icp.gender ?? icp.avatar_gender ?? null,
        (icp as any).age_range ?? icp.avatar_age_range ?? null
      );
      return;
    }

    if (action === "move-brand") {
      if (!hasFullAccess) {
        triggerShake();
        onUpgrade?.();
        return;
      }
      setMoveBrandId(icp.brand_id ?? null);
      setMoveBrandOpen(true);
      return;
    }

    if (action === "delete") {
      if (!hasFullAccess) {
        triggerShake();
        onUpgrade?.();
        return;
      }
      const confirmed = window.confirm(
        "Are you sure you want to delete this ICP? This action cannot be undone."
      );
      if (!confirmed) return;
      try {
        const { error } = await supabase.from("icps").delete().eq("id", icp.id);
        if (error) {
          console.error("Failed to delete ICP:", error);
          return;
        }
        onDelete?.();
      } catch (err) {
        console.error("Unexpected delete error:", err);
      }
      return;
    }
  };

  return (
    <div
      onAnimationEnd={handleAnimationEnd}
      className={cls(
        "relative group animate-fade-in-up h-full",
        locked ? "icp-locked" : "icp-clickable",
        shake && "shake-card"
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={(e) => {
        // EXACT same pattern as CollectionCard
        if ((e.target as HTMLElement).closest("[data-no-card-click='true']")) return;

        if (onCardClickOverride) {
          onCardClickOverride();
          return;
        }

        if (previewOnly) return;

        if (locked) {
          triggerShake();
          onUpgrade?.();
          return;
        }

        navigate(`/icp/${icp.id}`);
      }}
    >
      <Card className="hover:shadow-lg transition-all duration-300 group cursor-pointer h-full border border-black rounded-design overflow-hidden">
        {/* Header area: colour + avatar + menu (mirrors CollectionCard structure) */}
        <div
          className="h-24 border-b border-black relative"
          style={{ backgroundColor: icp.color || "#EDEDED" }}
        >
          {/* Lock icon (if locked) */}
          {locked && (
            <div className="absolute top-3 left-3">
              <button
                type="button"
                data-no-card-click="true"
                onClick={(e) => {
                  stop(e);
                  triggerShake();
                  onUpgrade?.();
                }}
                className="p-1.5 bg-background rounded-full border border-black h-8 w-8 flex items-center justify-center shadow-sm"
              >
                <Lock className="h-4 w-4" />
              </button>
            </div>
          )}

          {/* Three-dots menu — hidden in guest preview mode */}
          {!previewOnly && (
          <div className="absolute top-3 right-3">
            <DropdownMenu>
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
                className="min-w-[180px] border border-black rounded-design bg-neutral-light text-foreground shadow-lg"
              >
                <DropdownMenuItem
                  data-no-card-click="true"
                  className="text-sm"
                  onSelect={(e) => {
                    stop(e);
                    handleAction("view");
                  }}
                >
                  <Eye className="h-4 w-4 mr-2" />
                  View ICP
                </DropdownMenuItem>

                <DropdownMenuItem
                  data-no-card-click="true"
                  className="text-sm"
                  onSelect={(e) => {
                    stop(e);
                    handleAction("duplicate");
                  }}
                  disabled={isDuplicating}
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Duplicate
                </DropdownMenuItem>

                <DropdownMenuItem
                  data-no-card-click="true"
                  className="text-sm"
                  onSelect={(e) => {
                    stop(e);
                    handleAction("export-pdf");
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
                    handleAction("change-color");
                  }}
                >
                  <Palette className="h-4 w-4 mr-2" />
                  Change Colour
                </DropdownMenuItem>

                <DropdownMenuItem
                  data-no-card-click="true"
                  className="text-sm"
                  onSelect={(e) => {
                    stop(e);
                    handleAction("change-avatar");
                  }}
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Change Avatar
                </DropdownMenuItem>

                {brands?.length && onMoveToBrand ? (
                  <DropdownMenuItem
                    data-no-card-click="true"
                    className="text-sm"
                    onSelect={(e) => {
                      stop(e);
                      handleAction("move-brand");
                    }}
                  >
                    <FolderPlus className="h-4 w-4 mr-2" />
                    Move to brand…
                  </DropdownMenuItem>
                ) : null}

                {onAddToCollection && !isInCollection ? (
                  <DropdownMenuItem
                    data-no-card-click="true"
                    className="text-sm"
                    onSelect={(e) => {
                      stop(e);
                      handleAction("add-to-collection");
                    }}
                  >
                    <FolderPlus className="h-4 w-4 mr-2" />
                    Add to collection
                  </DropdownMenuItem>
                ) : null}

                {onRemoveFromCollection && isInCollection ? (
                  <DropdownMenuItem
                    data-no-card-click="true"
                    className="text-sm"
                    onSelect={(e) => {
                      stop(e);
                      handleAction("remove-from-collection");
                    }}
                  >
                    <FolderMinus className="h-4 w-4 mr-2" />
                    Remove from collection
                  </DropdownMenuItem>
                ) : null}

                <DropdownMenuSeparator />

                <DropdownMenuItem
                  data-no-card-click="true"
                  className="text-sm text-red-600 focus:text-red-600"
                  onSelect={(e) => {
                    stop(e);
                    handleAction("delete");
                  }}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete ICP
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          )}

          {/* Avatar badge (image placeholder or custom avatar) */}
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2">
            <div className="w-20 h-20 bg-background rounded-full border-2 border-black flex items-center justify-center shadow-md overflow-hidden">
              <img
                src={avatarSrc}
                alt={icp.name}
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        </div>

        {moveBrandOpen && onMoveToBrand && (
          <div
            className="modal-overlay"
            data-no-card-click="true"
            onClick={(e) => {
              stop(e);
              setMoveBrandOpen(false);
            }}
          >
            <div
              className="modal-content"
              data-no-card-click="true"
              onClick={(e) => {
                stop(e);
              }}
            >
              <h2 className="text-lg font-['Fraunces'] mb-1">Move ICP to brand</h2>
              <p className="text-sm font-['Inter'] text-foreground/70 mb-4">
                Choose a brand for this ICP. Selecting “No brand” will unassign it.
              </p>

              <select
                className="w-full border border-black rounded-design px-3 py-2 font-['Inter'] text-sm mb-4"
                value={moveBrandId ?? ""}
                onChange={(e) => setMoveBrandId(e.target.value || null)}
              >
                <option value="">No brand allocated</option>
                {(brands || []).map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>

              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  className="border-black rounded-design"
                  onClick={(e) => {
                    stop(e);
                    setMoveBrandOpen(false);
                  }}
                >
                  Cancel
                </Button>
                <Button
                  className="bg-button-green hover:bg-button-green/90 text-foreground border border-black rounded-design"
                  onClick={async (e) => {
                    stop(e);
                    await onMoveToBrand(icp.id, moveBrandId ?? null);
                    setMoveBrandOpen(false);
                    try {
                      window.dispatchEvent(new Event("icps:changed"));
                    } catch {}
                  }}
                >
                  Save
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Body */}
        {previewOnly ? (
          <div className="p-6 pt-12 bg-background text-left">
            <h3 className="font-['Fraunces'] text-lg mb-1 truncate">{icp.name}</h3>

            {previewMetaLine && (
              <p className="font-['Inter'] text-xs text-foreground/60 mb-3 truncate">
                {previewMetaLine}
              </p>
            )}

            {icp.description && (
              <p className="font-['Inter'] text-sm text-foreground/70 mb-3 line-clamp-3">
                {icp.description}
              </p>
            )}

            {previewBullets.length > 0 && (
              <ul className="mb-4 space-y-1">
                {previewBullets.map((item, idx) => (
                  <li
                    key={`preview-bullet-${idx}`}
                    className="font-['Inter'] text-xs text-foreground/70 flex gap-1.5"
                  >
                    <span className="text-foreground/40 shrink-0">•</span>
                    <span className="line-clamp-2">{item}</span>
                  </li>
                ))}
              </ul>
            )}

            <p className="font-['DM_Sans'] text-sm font-medium text-primary">
              View full profile →
            </p>
          </div>
        ) : (
        <div className="p-6 pt-12 text-center bg-background">
          <h3 className="font-['Fraunces'] text-lg mb-2 truncate">
            {icp.name}
          </h3>

          <p className="font-['Inter'] text-xs text-foreground/60 mb-2">
            {hasBrand
              ? `Brand: ${displayBrandName || "Unknown brand"}`
              : "No brand allocated"}
          </p>

          {icp.industry && (
            <p className="font-['Inter'] text-xs text-foreground/60 mb-2">
              {icp.industry}
            </p>
          )}

          {icp.tags?.length ? (
            <div className="flex flex-wrap gap-1 justify-center mb-2">
              {icp.tags.slice(0, 3).map((tag) => (
                <span
                  key={tag}
                  className="px-2 py-0.5 text-xs border border-black rounded-design bg-foreground/5"
                >
                  {tag}
                </span>
              ))}
            </div>
          ) : null}

          <p className="font-['Inter'] text-sm text-foreground/70 mb-3 line-clamp-2">
            {icp.description}
          </p>

          <p className="font-['Inter'] text-xs text-foreground/50 mb-4">
            Created {formatDate(createdAt)}
          </p>

          {/* Hover quick actions (view / duplicate / export PDF) */}
          <TooltipProvider>
            <div
              className={cls(
                "grid grid-cols-3 gap-2 transition-opacity duration-200",
                isHovered && !locked ? "opacity-100" : "opacity-0"
              )}
              data-no-card-click="true"
              onClick={(e) => stop(e)}
            >
              <Tooltip>
                <TooltipTrigger asChild>
                  <Link
                    to={`/icp/${icp.id}`}
                    className="block"
                    onClick={(e) => {
                      if (locked) {
                        e.preventDefault();
                        triggerShake();
                        onUpgrade?.();
                        return;
                      }
                    }}
                  >
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full border-black rounded-design hover:bg-accent-grey/20 transition-all"
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                  </Link>
                </TooltipTrigger>
                <TooltipContent className="border-black rounded-design font-['Inter']">
                  <p>View full ICP profile</p>
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleAction("duplicate")}
                      disabled={isDuplicating}
                      className="w-full border-black rounded-design hover:bg-button-green/20 transition-all"
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                </TooltipTrigger>
                <TooltipContent className="border-black rounded-design font-['Inter']">
                  <p>Duplicate this ICP</p>
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleAction("export-pdf")}
                      className="w-full border-black rounded-design hover:bg-accent-grey/20 transition-all"
                      disabled={locked}
                    >
                      <FileText className="w-4 h-4" />
                    </Button>
                  </div>
                </TooltipTrigger>
                <TooltipContent className="border-black rounded-design font-['Inter']">
                  <p>{locked ? "Upgrade to export" : "Export ICP data"}</p>
                </TooltipContent>
              </Tooltip>
            </div>
          </TooltipProvider>
        </div>
        )}
      </Card>
    </div>
  );
}
