import { useCallback, useEffect, useState } from "react";
import { ChevronDown, ChevronUp, History } from "lucide-react";
import type { BrandAim } from "../../hooks/useBrandAims";
import {
  fetchBrandAimVersionsForLineage,
  restoreBrandAimVersionFromRow,
  type BrandAimVersionRow,
} from "../../lib/brandAimVersioning";
import { AIM_TYPE_LABELS } from "./StrategyCompositionBanner";

function formatVersionDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

type Props = {
  lineageId: string;
  currentAimId: string;
  userId: string;
  disabled?: boolean;
  onVersionRestored: (aim: BrandAim) => void;
};

export function BrandAimVersionHistorySection({
  lineageId,
  currentAimId,
  userId,
  disabled = false,
  onVersionRestored,
}: Props) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [versions, setVersions] = useState<BrandAimVersionRow[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadVersions = useCallback(async () => {
    if (!userId || !lineageId) {
      setVersions([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const rows = await fetchBrandAimVersionsForLineage(userId, lineageId);
      setVersions(rows);
    } catch (err) {
      console.error("[BrandAimVersionHistory] load failed", err);
      setError("Could not load version history.");
      setVersions([]);
    } finally {
      setLoading(false);
    }
  }, [userId, lineageId]);

  useEffect(() => {
    void loadVersions();
  }, [loadVersions]);

  if (!loading && versions.length <= 1) {
    return null;
  }

  const handleRestore = async (row: BrandAimVersionRow) => {
    if (disabled || row.id === currentAimId || restoringId) return;
    setRestoringId(row.id);
    setError(null);
    try {
      const restored = (await restoreBrandAimVersionFromRow(currentAimId, row)) as BrandAim;
      await loadVersions();
      onVersionRestored(restored);
    } catch (err) {
      console.error("[BrandAimVersionHistory] restore failed", err);
      setError("Could not restore that version. Please try again.");
    } finally {
      setRestoringId(null);
    }
  };

  return (
    <div className="border-t border-black/10 pt-4 mt-3">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="inline-flex items-center gap-1.5 font-['Inter'] text-xs text-foreground/55 hover:text-foreground/80 transition-colors"
      >
        <History className="h-3.5 w-3.5" />
        Version history
        {versions.length > 0 ? ` (${versions.length})` : ""}
        {open ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
      </button>

      {error ? <p className="mt-2 font-['Inter'] text-xs text-red-700">{error}</p> : null}

      {open ? (
        <div className="mt-3 rounded-design border border-black/15 bg-accent-grey/20 px-4 py-3">
          {loading ? (
            <p className="font-['Inter'] text-xs text-foreground/50">Loading version history…</p>
          ) : (
            <ul className="space-y-3">
              {versions.map((row) => {
                const isCurrent = !row.superseded_at && !row.deleted_at;
                const isExpanded = expandedId === row.id;
                const dateLabel = formatVersionDate(row.updated_at || row.created_at);

                return (
                  <li
                    key={row.id}
                    className="border-b border-black/10 pb-3 last:border-0 last:pb-0"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          setExpandedId((prev) => (prev === row.id ? null : row.id))
                        }
                        className="text-left min-w-0 flex-1"
                      >
                        <p className="font-['Inter'] text-sm text-foreground">
                          Version {row.version ?? "?"}
                          {isCurrent ? (
                            <span className="ml-2 text-xs text-foreground/50">(current)</span>
                          ) : null}
                        </p>
                        <p className="font-['Inter'] text-xs text-foreground/50">{dateLabel}</p>
                      </button>

                      {!isCurrent && !disabled ? (
                        <button
                          type="button"
                          disabled={!!restoringId}
                          onClick={() => void handleRestore(row)}
                          className="font-['Inter'] text-xs text-foreground/70 underline-offset-2 hover:underline disabled:opacity-50"
                        >
                          {restoringId === row.id ? "Restoring…" : "Restore this version"}
                        </button>
                      ) : null}
                    </div>

                    {isExpanded ? (
                      <div className="mt-3 rounded-design border border-black/10 bg-white/80 px-3 py-2 space-y-1">
                        <p className="font-['Inter'] text-sm font-medium text-foreground">
                          {row.title}
                        </p>
                        <p className="font-['Inter'] text-xs text-foreground/55">
                          {AIM_TYPE_LABELS[row.aim_type]}
                        </p>
                        {row.description ? (
                          <p className="font-['Inter'] text-xs text-foreground/70 whitespace-pre-wrap">
                            {row.description}
                          </p>
                        ) : null}
                      </div>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}
