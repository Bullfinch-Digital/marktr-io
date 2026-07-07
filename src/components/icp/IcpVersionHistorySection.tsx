import { useCallback, useEffect, useState } from "react";
import { ChevronDown, ChevronUp, History } from "lucide-react";
import type { ICP } from "../../hooks/useICPs";
import {
  fetchIcpVersionsForLineage,
  restoreIcpVersionFromRow,
  type IcpVersionRow,
} from "../../lib/icpVersioning";

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
  currentIcpId: string;
  userId: string;
  disabled?: boolean;
  onVersionRestored: (icp: ICP) => void;
};

export function IcpVersionHistorySection({
  lineageId,
  currentIcpId,
  userId,
  disabled = false,
  onVersionRestored,
}: Props) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [versions, setVersions] = useState<IcpVersionRow[]>([]);
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
      const rows = await fetchIcpVersionsForLineage(userId, lineageId);
      setVersions(rows);
    } catch (err) {
      console.error("[IcpVersionHistory] load failed", err);
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

  const handleRestore = async (row: IcpVersionRow) => {
    if (disabled || row.id === currentIcpId || restoringId) return;
    setRestoringId(row.id);
    setError(null);
    try {
      const restored = await restoreIcpVersionFromRow(currentIcpId, row);
      await loadVersions();
      onVersionRestored(restored);
    } catch (err) {
      console.error("[IcpVersionHistory] restore failed", err);
      setError("Could not restore that version. Please try again.");
    } finally {
      setRestoringId(null);
    }
  };

  return (
    <div className="border-t border-black/10 pt-6 mt-2">
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

      {error && (
        <p className="mt-3 font-['Inter'] text-xs text-red-700">{error}</p>
      )}

      {open && (
        <div className="mt-4 rounded-design border border-black/15 bg-accent-grey/20 px-4 py-3">
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

                    {isExpanded && (
                      <div className="mt-3 rounded-design border border-black/10 bg-white/80 px-3 py-2 space-y-2">
                        <p className="font-['Inter'] text-sm font-medium text-foreground">
                          {row.name || "Untitled profile"}
                        </p>
                        {row.description ? (
                          <p className="font-['Inter'] text-xs text-foreground/70 whitespace-pre-wrap">
                            {row.description}
                          </p>
                        ) : null}
                        {(row.goals?.length ?? 0) > 0 && (
                          <p className="font-['Inter'] text-xs text-foreground/60">
                            <span className="font-medium">Goals:</span> {row.goals?.join(" · ")}
                          </p>
                        )}
                        {(row.pain_points?.length ?? 0) > 0 && (
                          <p className="font-['Inter'] text-xs text-foreground/60">
                            <span className="font-medium">Pain points:</span>{" "}
                            {row.pain_points?.join(" · ")}
                          </p>
                        )}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
