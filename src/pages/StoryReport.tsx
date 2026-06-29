import { useCallback, useEffect, useRef, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { Loader2, Pencil, RotateCcw, History, ChevronDown, ChevronUp } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { useBrand } from "../contexts/BrandContext";
import { supabase } from "../config/supabase";
import { isBrandScopeReady, resolveScopedBrandId } from "../lib/brandScopedReads";
import { parseBrandStoryFromApi, type BrandStoryOutput } from "../lib/brandStory";
import {
  buildStoryStoredPayload,
  fetchBrandStoryHistory,
  fetchLatestBrandStory,
  insertBrandStoryResult,
  parseAnswersFromStored,
  parseEmailFromStored,
  storyOutputFromRow,
  type BrandStoryRow,
} from "../lib/brandStoryPersistence";
import { getGuestBusinessName } from "../lib/guestContext";
import { BrandStoryFindingsSection } from "../components/story/BrandStoryFindingsSection";
import DashboardShell from "../layouts/DashboardShell";
import { Button } from "../components/ui/button";
import { Textarea } from "../components/ui/textarea";

type StorySectionKey =
  | "foundingStory"
  | "pointOfView"
  | "positioningStatement"
  | "brandPurpose";

const STORY_SECTIONS: { key: StorySectionKey; label: string }[] = [
  { key: "foundingStory", label: "FOUNDING STORY" },
  { key: "pointOfView", label: "YOUR POINT OF VIEW" },
  { key: "positioningStatement", label: "POSITIONING STATEMENT" },
  { key: "brandPurpose", label: "YOUR PURPOSE" },
];

function formatStoryDate(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "Unknown date";
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function StoryReport() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { activeBrandId, activeBrand, loading: brandLoading, brands } = useBrand();

  const [currentRow, setCurrentRow] = useState<BrandStoryRow | null>(null);
  const [story, setStory] = useState<BrandStoryOutput | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editDraft, setEditDraft] = useState<BrandStoryOutput | null>(null);
  const [saving, setSaving] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyRows, setHistoryRows] = useState<BrandStoryRow[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const saveInFlightRef = useRef(false);

  const scopedBrandId = resolveScopedBrandId(activeBrandId, brands);

  const loadCurrent = useCallback(async () => {
    if (!user?.id || !scopedBrandId) return;
    setLoading(true);
    setActionError(null);
    const row = await fetchLatestBrandStory(user.id, scopedBrandId);
    setCurrentRow(row);
    setStory(storyOutputFromRow(row));
    setIsEditing(false);
    setEditDraft(null);
    setLoading(false);
  }, [user?.id, scopedBrandId]);

  useEffect(() => {
    if (authLoading || brandLoading) return;
    if (!user?.id) {
      setLoading(false);
      return;
    }
    if (!isBrandScopeReady(brandLoading, brands, scopedBrandId)) return;
    void loadCurrent();
  }, [authLoading, brandLoading, user?.id, scopedBrandId, brands, loadCurrent]);

  useEffect(() => {
    const onRefresh = () => {
      void loadCurrent();
    };
    window.addEventListener("marktr:guest-data-ready", onRefresh);
    return () => window.removeEventListener("marktr:guest-data-ready", onRefresh);
  }, [loadCurrent]);

  const loadHistory = async () => {
    if (!user?.id || !scopedBrandId) return;
    setHistoryLoading(true);
    const rows = await fetchBrandStoryHistory(user.id, scopedBrandId);
    setHistoryRows(rows);
    setHistoryLoading(false);
  };

  const toggleHistory = () => {
    const next = !historyOpen;
    setHistoryOpen(next);
    if (next && historyRows.length === 0) {
      void loadHistory();
    }
  };

  const persistStory = async (
    output: BrandStoryOutput,
    opts?: { answers?: string[]; email?: string }
  ): Promise<boolean> => {
    if (!user?.id || !scopedBrandId || saveInFlightRef.current) return false;
    saveInFlightRef.current = true;
    setSaving(true);
    setActionError(null);

    const answers =
      opts?.answers ??
      (currentRow ? parseAnswersFromStored(currentRow.story_data) : undefined);
    const email =
      opts?.email ??
      (currentRow ? parseEmailFromStored(currentRow.story_data) : user.email ?? "");

    const payload = buildStoryStoredPayload(output, {
      answers: answers?.length === 7 ? answers : undefined,
      email: email || undefined,
      brandId: scopedBrandId,
    });

    const inserted = await insertBrandStoryResult(user.id, scopedBrandId, payload);
    saveInFlightRef.current = false;
    setSaving(false);

    if (!inserted) {
      setActionError("Could not save your story. Please try again.");
      return false;
    }

    setCurrentRow(inserted);
    setStory(storyOutputFromRow(inserted));
    setIsEditing(false);
    setEditDraft(null);
    if (historyOpen) {
      void loadHistory();
    }
    return true;
  };

  const startEditing = () => {
    if (!story) return;
    setEditDraft({ ...story, findings: story.findings ? [...story.findings] : [] });
    setIsEditing(true);
    setActionError(null);
  };

  const cancelEditing = () => {
    setIsEditing(false);
    setEditDraft(null);
  };

  const handleSaveEdits = async () => {
    if (!editDraft) return;
    await persistStory(editDraft);
  };

  const handleRegenerate = async () => {
    if (!user?.id || !scopedBrandId || regenerating || saveInFlightRef.current) return;

    const answers = currentRow ? parseAnswersFromStored(currentRow.story_data) : [];
    if (answers.length !== 7) {
      setActionError(
        "We need your original answers to regenerate. Use “Re-run questionnaire” to refresh your answers."
      );
      return;
    }

    const email =
      parseEmailFromStored(currentRow?.story_data) || user.email?.trim() || "";
    if (!email) {
      setActionError("Missing email for regeneration.");
      return;
    }

    setRegenerating(true);
    setActionError(null);

    try {
      const businessName =
        activeBrand?.name?.trim() || getGuestBusinessName() || undefined;

      const { data, error: invokeError } = await supabase.functions.invoke(
        "generate-brand-story",
        {
          body: {
            answers,
            email,
            ...(businessName ? { businessName } : {}),
          },
        }
      );

      if (invokeError) throw invokeError;

      const parsed = parseBrandStoryFromApi(data as Record<string, unknown> | null);
      if (!parsed) {
        throw new Error("Invalid story response from server.");
      }

      await persistStory(parsed, { answers, email });
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Regeneration failed.");
    } finally {
      setRegenerating(false);
    }
  };

  const handleRestore = async (row: BrandStoryRow) => {
    const output = storyOutputFromRow(row);
    if (!output) return;
    const answers = parseAnswersFromStored(row.story_data);
    const email = parseEmailFromStored(row.story_data);
    await persistStory(output, {
      answers: answers.length === 7 ? answers : undefined,
      email: email || undefined,
    });
  };

  if (authLoading || brandLoading || loading) {
    return (
      <DashboardShell contentClassName="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </DashboardShell>
    );
  }

  if (!user?.id) {
    return <Navigate to="/" replace />;
  }

  if (!scopedBrandId) {
    return (
      <DashboardShell contentClassName="mx-auto max-w-2xl px-6 py-12">
        <p className="font-['DM_Sans'] text-muted-foreground">
          Select or create a brand to view your brand story.
        </p>
        <Link
          to="/dashboard"
          className="mt-6 inline-flex rounded-full bg-primary px-6 py-3 font-['DM_Sans'] text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          Go to dashboard
        </Link>
      </DashboardShell>
    );
  }

  if (!story) {
    return (
      <DashboardShell contentClassName="mx-auto max-w-2xl px-6 py-12">
        <span className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 font-['DM_Sans'] text-xs font-medium text-primary">
          Brand Story
        </span>
        <h1 className="mt-4 font-['Fraunces'] text-4xl font-bold text-[#0D1833]">
          Set up your brand story
        </h1>
        <p className="mt-4 font-['DM_Sans'] text-base text-muted-foreground">
          {activeBrand?.name
            ? `Tell us about ${activeBrand.name} — we'll turn your answers into a founding story, point of view, and positioning you can edit anytime.`
            : "Answer seven questions and we'll write the story behind your brand."}
        </p>
        <Button
          type="button"
          className="mt-8 rounded-full bg-primary px-6 py-6 font-['DM_Sans']"
          onClick={() => navigate("/story")}
        >
          Build your brand story →
        </Button>
      </DashboardShell>
    );
  }

  const displayStory = isEditing && editDraft ? editDraft : story;
  const latestDate = currentRow?.created_at;

  return (
    <DashboardShell contentClassName="mx-auto max-w-2xl px-6 py-10 lg:py-12">
      {(saving || regenerating) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/60">
          <div className="flex flex-col items-center gap-3 rounded-2xl border border-border bg-white px-8 py-6 shadow-lg">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="font-['DM_Sans'] text-sm text-muted-foreground">
              {regenerating ? "Regenerating your story…" : "Saving your story…"}
            </p>
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <span className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 font-['DM_Sans'] text-xs font-medium text-primary">
            Your Brand Story
          </span>
          {activeBrand?.name && (
            <p className="mt-2 font-['DM_Sans'] text-xs text-muted-foreground">
              {activeBrand.name}
            </p>
          )}
          <h1 className="mt-2 font-['Fraunces'] text-3xl font-bold text-[#0D1833] sm:text-4xl">
            This is your story.
          </h1>
          {latestDate && (
            <p className="mt-2 font-['DM_Sans'] text-xs text-muted-foreground">
              Last updated {formatStoryDate(latestDate)}
            </p>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          {!isEditing ? (
            <>
              <Button
                type="button"
                variant="outline"
                className="rounded-full border-black font-['DM_Sans'] text-sm"
                onClick={startEditing}
                disabled={saving || regenerating}
              >
                <Pencil className="mr-2 h-4 w-4" />
                Edit your story
              </Button>
              <Button
                type="button"
                variant="outline"
                className="rounded-full border-black font-['DM_Sans'] text-sm"
                onClick={() => void handleRegenerate()}
                disabled={saving || regenerating}
              >
                <RotateCcw className="mr-2 h-4 w-4" />
                Regenerate
              </Button>
            </>
          ) : (
            <>
              <Button
                type="button"
                variant="outline"
                className="rounded-full border-black font-['DM_Sans'] text-sm"
                onClick={cancelEditing}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button
                type="button"
                className="rounded-full bg-primary font-['DM_Sans'] text-sm"
                onClick={() => void handleSaveEdits()}
                disabled={saving}
              >
                Save changes
              </Button>
            </>
          )}
        </div>
      </div>

      <p className="mt-4 font-['DM_Sans'] text-base text-muted-foreground">
        {isEditing
          ? "Update any section below. Saving writes your latest story — you can always look back at earlier versions."
          : "Based on everything you've shared, here's the foundation marktr uses for your brand."}
      </p>

      {actionError && (
        <p className="mt-4 font-['DM_Sans'] text-sm text-destructive">{actionError}</p>
      )}

      <div className="mt-8 space-y-4">
        {STORY_SECTIONS.map(({ key, label }) => (
          <article key={key} className="rounded-2xl border border-border bg-white p-6">
            <p className="font-['DM_Sans'] text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
              {label}
            </p>
            {isEditing && editDraft ? (
              <Textarea
                value={editDraft[key]}
                onChange={(e) =>
                  setEditDraft((prev) =>
                    prev ? { ...prev, [key]: e.target.value } : prev
                  )
                }
                className="mt-3 min-h-[120px] resize-y border border-black font-['Fraunces'] text-lg leading-relaxed"
              />
            ) : (
              <p className="mt-3 font-['Fraunces'] text-lg leading-relaxed text-[#0D1833]">
                {displayStory[key]}
              </p>
            )}
          </article>
        ))}
      </div>

      <BrandStoryFindingsSection
        findings={displayStory.findings ?? []}
        variant="authenticated"
      />

      <div className="mt-8 flex flex-wrap items-center justify-between gap-4 border-t border-border pt-6">
        <button
          type="button"
          onClick={toggleHistory}
          className="inline-flex items-center gap-1.5 font-['DM_Sans'] text-xs text-muted-foreground hover:text-foreground"
        >
          <History className="h-3.5 w-3.5" />
          Past versions
          {historyOpen ? (
            <ChevronUp className="h-3.5 w-3.5" />
          ) : (
            <ChevronDown className="h-3.5 w-3.5" />
          )}
        </button>
        <Button
          type="button"
          variant="outline"
          className="rounded-full border-black font-['DM_Sans'] text-sm"
          onClick={() => navigate("/story")}
        >
          Re-run questionnaire →
        </Button>
      </div>

      {historyOpen && (
        <div className="mt-4 rounded-xl border border-border bg-muted/30 px-4 py-3">
          {historyLoading ? (
            <p className="font-['DM_Sans'] text-xs text-muted-foreground">Loading…</p>
          ) : historyRows.length <= 1 ? (
            <p className="font-['DM_Sans'] text-xs text-muted-foreground">
              No earlier versions yet.
            </p>
          ) : (
            <ul className="space-y-2">
              {historyRows.map((row, index) => (
                <li
                  key={row.id}
                  className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 py-2 last:border-0"
                >
                  <span className="font-['DM_Sans'] text-xs text-foreground/80">
                    {formatStoryDate(row.created_at)}
                    {index === 0 ? (
                      <span className="ml-2 text-muted-foreground">(current)</span>
                    ) : null}
                  </span>
                  {index > 0 && (
                    <button
                      type="button"
                      className="font-['DM_Sans'] text-xs text-primary underline-offset-2 hover:underline"
                      onClick={() => void handleRestore(row)}
                      disabled={saving || regenerating}
                    >
                      Use this version
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <div className="mt-10">
        <Button
          type="button"
          className="rounded-full bg-primary px-6 py-3 font-['DM_Sans'] text-sm"
          onClick={() => navigate("/dashboard")}
        >
          Go to your dashboard →
        </Button>
      </div>
    </DashboardShell>
  );
}
