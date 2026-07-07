import { useState, useEffect, useRef, useCallback } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Textarea } from "../components/ui/textarea";
import { useICPs, ICP } from "../hooks/useICPs";
import { useBrands } from "../hooks/useBrands";
import useSubscription from "../hooks/useSubscription";
import { exportICPAsPDF } from "../utils/exportICP";
import { canExportICP } from "../config/accessRules";
import { usePaywall } from "../contexts/PaywallContext";
import { useICPStrategy } from "../hooks/useICPStrategy";
import { MetaActivationPackPanel } from "../components/icp/MetaActivationPackPanel";
import DashboardShell from "../layouts/DashboardShell";
import { ICPProfileLayout } from "../components/icp/ICPProfileLayout";
import ICPColorModal from "../components/ICPColorModal";
import ICPAvatarModal from "../components/ICPAvatarModal";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../components/ui/dropdown-menu";
import { getAvatarSrc } from "../utils/avatarLibrary";
import { supabase } from "../config/supabase";
import "../styles/Modal.css";
import {
  ArrowLeft,
  Save,
  Copy,
  Download,
  FileText,
  Lock,
  Plus,
  X,
  Pencil,
  Check,
  Trash2,
  Undo2,
  MoreVertical,
  Palette,
  Image as ImageIcon,
  FolderPlus,
  Loader2,
} from "lucide-react";

export default function ICPEditor() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { getICP, updateICP, duplicateICP } = useICPs();
  const { brands, isLoading: brandsLoading } = useBrands();
  const { tier: userTier, trialActive } = useSubscription();
  const { openPaywall } = usePaywall();
  const {
    strategy,
    record: strategyRecord,
    records: strategyRecords,
    selectedId: selectedStrategyId,
    selectStrategy,
    isLoading: strategyLoading,
    isGenerating: strategyGenerating,
    error: strategyError,
    generateStrategy,
    renameStrategy,
    deleteStrategy,
    maxStrategies,
  } = useICPStrategy(id);
  // Treat trial users as "pro" for export gating.
  const effectiveTier = userTier === "free" && !trialActive ? "free" : "pro";
  const isFreeTier = effectiveTier === "free";
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [brandSaveStatus, setBrandSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [isLoading, setIsLoading] = useState(true);
  const [isDirty, setIsDirty] = useState(false);
  const originalDataRef = useRef<Partial<ICP> | null>(null);
  const [leaveDialogOpen, setLeaveDialogOpen] = useState(false);
  const pendingNavRef = useRef<string | null>(null);
  const [icpData, setICPData] = useState<Partial<ICP>>({
    name: "",
    description: "",
    industry: "",
    company_size: "",
    location: "",
    goals: [],
    pain_points: [],
    budget: "",
    decision_makers: [],
    tech_stack: [],
    challenges: [],
    opportunities: [],
  });
  const [icpColorModal, setIcpColorModal] = useState({
    open: false,
    id: null as string | null,
    currentColor: null as string | null,
  });

  const [icpAvatarModal, setIcpAvatarModal] = useState({
    open: false,
    id: null as string | null,
    currentAvatarKey: null as string | null,
    gender: null as string | null,
    ageRange: null as string | null,
  });

  const [moveBrandOpen, setMoveBrandOpen] = useState(false);
  const [moveBrandId, setMoveBrandId] = useState<string | null>(null);
  const [strategyGoal, setStrategyGoal] = useState("Generate qualified leads");
  const [strategyChannel, setStrategyChannel] = useState("");
  const [strategyOfferType, setStrategyOfferType] = useState("");
  const [strategyTone, setStrategyTone] = useState("");
  const [strategyBusinessStage, setStrategyBusinessStage] = useState("");
  const [strategyMonthlyBudgetBand, setStrategyMonthlyBudgetBand] = useState("");
  const [strategyObjectiveHorizon, setStrategyObjectiveHorizon] = useState("next_30_days");
  const [strategyMarketingCapacity, setStrategyMarketingCapacity] = useState("");
  const [showNewStrategyForm, setShowNewStrategyForm] = useState(false);
  const [isRenamingStrategy, setIsRenamingStrategy] = useState(false);
  const [renameStrategyValue, setRenameStrategyValue] = useState("");
  const [hasUnsavedMetaPackRename, setHasUnsavedMetaPackRename] = useState(false);
  const metaPackSavePendingRenameRef = useRef<null | (() => Promise<boolean>)>(null);
  const activeStrategyIndex = strategyRecord
    ? strategyRecords.findIndex((r) => r.id === strategyRecord.id)
    : -1;
  const activeStrategyFallbackName =
    activeStrategyIndex >= 0 ? `Strategy ${strategyRecords.length - activeStrategyIndex}` : "Strategy";
  const activeStrategySavedName = strategyRecord?.strategy_name || activeStrategyFallbackName;
  const hasUnsavedStrategyRename =
    isRenamingStrategy && renameStrategyValue.trim() !== activeStrategySavedName.trim();
  const hasUnsavedChanges = isDirty || hasUnsavedStrategyRename || hasUnsavedMetaPackRename;

  const handleGenerateNewStrategy = useCallback(async () => {
    const res = await generateStrategy({
      goal: strategyGoal,
      channel: strategyChannel || null,
      offerType: strategyOfferType || null,
      tone: strategyTone || null,
      businessStage: strategyBusinessStage || null,
      monthlyBudgetBand: strategyMonthlyBudgetBand || null,
      objectiveHorizon: strategyObjectiveHorizon || null,
      marketingCapacity: strategyMarketingCapacity || null,
    });
    if (res?.record) {
      setShowNewStrategyForm(false);
    }
  }, [
    generateStrategy,
    strategyGoal,
    strategyChannel,
    strategyOfferType,
    strategyTone,
    strategyBusinessStage,
    strategyMonthlyBudgetBand,
    strategyObjectiveHorizon,
    strategyMarketingCapacity,
  ]);

  useEffect(() => {
    if (!strategyRecord) {
      setRenameStrategyValue("");
      return;
    }
    const index = strategyRecords.findIndex((r) => r.id === strategyRecord.id);
    const fallbackName = index >= 0 ? `Strategy ${strategyRecords.length - index}` : "Strategy";
    setRenameStrategyValue(strategyRecord.strategy_name || fallbackName);
  }, [strategyRecord?.id, strategyRecord?.strategy_name, strategyRecords]);

  useEffect(() => {
    const loadICP = async () => {
      if (!id) return;
      // Avoid re-showing the full-page loader if we already have data (prevents flicker)
      if (!originalDataRef.current) setIsLoading(true);
      const icp = await getICP(id);
      if (icp) {
        setICPData(icp);
        originalDataRef.current = icp;
        setIsDirty(false);
        setMoveBrandId((icp as any)?.brand_id ?? null);
      } else {
        navigate("/dashboard");
      }
      setIsLoading(false);
    };
    loadICP();
  }, [id, getICP, navigate]);

  useEffect(() => {
    const count = strategyRecords?.length ?? 0;
    // Show generation form only when there are no saved strategies;
    // otherwise default to showing the selected saved strategy.
    if (count === 0) {
      setShowNewStrategyForm(true);
    } else {
      setShowNewStrategyForm(false);
    }
  }, [strategyRecords?.length]);

  // Warn on browser/tab close if there are unsaved changes
  useEffect(() => {
    const handler = (event: BeforeUnloadEvent) => {
      if (!hasUnsavedChanges) return;
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [hasUnsavedChanges]);

  // Track dirty state whenever icpData changes
  useEffect(() => {
    if (!originalDataRef.current) return;
    const serialize = (data: Partial<ICP>) => JSON.stringify({
      name: data.name || "",
      description: data.description || "",
      industry: data.industry || "",
      company_size: data.company_size || "",
      location: data.location || "",
      goals: data.goals || [],
      pain_points: data.pain_points || [],
      budget: data.budget || "",
      decision_makers: data.decision_makers || [],
      tech_stack: data.tech_stack || [],
      challenges: data.challenges || [],
      opportunities: data.opportunities || [],
    });
    const current = serialize(icpData);
    const original = serialize(originalDataRef.current);
    setIsDirty(current !== original);
  }, [icpData]);

  // Intercept in-app navigation clicks and prompt to save/discard
  useEffect(() => {
    if (!hasUnsavedChanges) return;

    const onClickCapture = (e: MouseEvent) => {
      if (!hasUnsavedChanges) return;
      if (e.defaultPrevented) return;
      if (e.button !== 0) return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;

      const target = e.target as HTMLElement | null;
      if (!target) return;
      if (target.closest("[data-allow-navigation='true']")) return;

      const anchor = target.closest("a[href]") as HTMLAnchorElement | null;
      if (!anchor) return;

      const href = anchor.getAttribute("href");
      if (!href) return;
      if (href.startsWith("#")) return;
      if (anchor.target === "_blank") return;

      const url = new URL(href, window.location.origin);
      if (url.origin !== window.location.origin) return;

      const nextPath = `${url.pathname}${url.search}${url.hash}`;
      const currentPath = `${window.location.pathname}${window.location.search}${window.location.hash}`;
      if (nextPath === currentPath) return;

      e.preventDefault();
      e.stopPropagation();
      pendingNavRef.current = nextPath;
      setLeaveDialogOpen(true);
    };

    document.addEventListener("click", onClickCapture, true);
    return () => document.removeEventListener("click", onClickCapture, true);
  }, [hasUnsavedChanges]);

  const handleSave = useCallback(async (): Promise<boolean> => {
    if (!id) return false;
    if (isFreeTier) {
      openPaywall();
      return false;
    }
    setIsSaving(true);
    setSaveStatus("saving");
    
    const updates = {
      name: icpData.name,
      description: icpData.description,
      industry: icpData.industry,
      company_size: icpData.company_size,
      location: icpData.location,
      goals: icpData.goals,
      pain_points: icpData.pain_points,
      budget: icpData.budget,
      decision_makers: icpData.decision_makers,
      tech_stack: icpData.tech_stack,
      challenges: icpData.challenges,
      opportunities: icpData.opportunities,
    };

    const success = await updateICP(id, updates);
    if (!success) {
      setSaveStatus("error");
      setTimeout(() => setSaveStatus("idle"), 3000);
      alert("Failed to save changes. Please try again.");
      setIsSaving(false);
      return false;
    }
    originalDataRef.current = { ...icpData, ...updates };
    setIsDirty(false);
    setSaveStatus("saved");
    setTimeout(() => setSaveStatus("idle"), 3000);
    setIsSaving(false);
    return true;
  }, [id, icpData, updateICP, isFreeTier, openPaywall]);

  const performPendingNavigation = (path: string | null) => {
    if (!path) return;
    pendingNavRef.current = null;
    navigate(path);
  };

  const handleLeaveWithoutSaving = () => {
    setLeaveDialogOpen(false);
    performPendingNavigation(pendingNavRef.current);
  };

  const handleCloseLeaveDialog = () => {
    pendingNavRef.current = null;
    setLeaveDialogOpen(false);
  };

  const handleSaveAndLeave = async () => {
    if (isDirty) {
      const ok = await handleSave();
      if (!ok) return;
    }
    if (hasUnsavedStrategyRename && strategyRecord) {
      const renamed = await renameStrategy(strategyRecord.id, renameStrategyValue);
      if (!renamed) return;
      setIsRenamingStrategy(false);
    }
    if (metaPackSavePendingRenameRef.current) {
      const ok = await metaPackSavePendingRenameRef.current();
      if (!ok) return;
    }
    setLeaveDialogOpen(false);
    performPendingNavigation(pendingNavRef.current);
  };

  // (Navigation guarding is handled via click-capture + AlertDialog; no useBlocker here.)

  const handleExport = () => {
    if (!id) return;
    if (isFreeTier) {
      openPaywall();
      return;
    }
    const exportIndex = (icpData as any)?._index ?? 0;
    if (!canExportICP(exportIndex, effectiveTier as any)) {
      alert("Upgrade to unlock this export");
      return;
    }
    const payload = { ...icpData, id };
    exportICPAsPDF(payload);
  };

  const icpHeaderColor = (icpData as any)?.color || "#EDEDED";
  const icpAvatarKey = (icpData as any)?.avatar_key || null;
  const icpAvatarSrc = getAvatarSrc(icpAvatarKey);

  const currentBrandId = ((icpData as any)?.brand_id ?? null) as string | null;

  const handleBrandChange = async (nextBrandIdRaw: string) => {
    if (!id) return;
    if (isFreeTier) {
      openPaywall();
      return;
    }

    // HTML select gives "" for empty option
    const nextBrandId = nextBrandIdRaw ? nextBrandIdRaw : null;

    setBrandSaveStatus("saving");
    const ok = await updateICP(id, { brand_id: nextBrandId } as any);
    if (!ok) {
      setBrandSaveStatus("error");
      setTimeout(() => setBrandSaveStatus("idle"), 2500);
      return;
    }

    // Update local UI and keep page "not dirty" since it's already persisted
    setICPData((prev) => ({ ...(prev as any), brand_id: nextBrandId } as any));
    if (originalDataRef.current) {
      originalDataRef.current = { ...(originalDataRef.current as any), brand_id: nextBrandId } as any;
    }
    setIsDirty(false);

    setBrandSaveStatus("saved");
    setTimeout(() => setBrandSaveStatus("idle"), 1500);
    try {
      window.dispatchEvent(new Event("icps:changed"));
    } catch {}
  };

  const handleDuplicate = async () => {
    if (!id) return;
    if (isFreeTier) {
      openPaywall();
      return;
    }
    try {
      const created = await duplicateICP(id);
      if (created?.id) {
        try {
          window.dispatchEvent(new Event("icps:changed"));
        } catch {}
        navigate(`/icp/${created.id}`);
      }
    } catch (err) {
      console.error("ICPEditor duplicate error:", err);
    }
  };

  const handleDelete = async () => {
    if (!id) return;
    if (isFreeTier) {
      openPaywall();
      return;
    }
    const ok = window.confirm("Are you sure you want to delete this ICP? This action cannot be undone.");
    if (!ok) return;
    try {
      const { error } = await supabase.from("icps").delete().eq("id", id);
      if (error) throw error;
      try {
        window.dispatchEvent(new Event("icps:changed"));
      } catch {}
      navigate("/icps");
    } catch (err) {
      console.error("ICPEditor delete error:", err);
    }
  };

  const handleOpenColorModal = () => {
    if (!id) return;
    if (isFreeTier) {
      openPaywall();
      return;
    }
    setIcpColorModal({
      open: true,
      id,
      currentColor: (icpData as any)?.color ?? null,
    });
  };

  const handleOpenAvatarModal = () => {
    if (!id) return;
    if (isFreeTier) {
      openPaywall();
      return;
    }
    setIcpAvatarModal({
      open: true,
      id,
      currentAvatarKey: (icpData as any)?.avatar_key ?? null,
      gender: (icpData as any)?.gender ?? (icpData as any)?.avatar_gender ?? null,
      ageRange: (icpData as any)?.age_range ?? (icpData as any)?.avatar_age_range ?? null,
    });
  };

  const handleSaveMoveBrand = async () => {
    if (!id) return;
    if (isFreeTier) {
      openPaywall();
      return;
    }
    const ok = await updateICP(id, { brand_id: moveBrandId ?? null } as any);
    if (!ok) return;

    setICPData((prev) => ({ ...(prev as any), brand_id: moveBrandId } as any));
    if (originalDataRef.current) {
      originalDataRef.current = { ...(originalDataRef.current as any), brand_id: moveBrandId } as any;
    }
    setIsDirty(false);
    setMoveBrandOpen(false);
    try {
      window.dispatchEvent(new Event("icps:changed"));
    } catch {}
  };

  const EditableListSection = ({ 
    title, 
    items, 
    isLocked = false,
    onChange,
  }: { 
    title: string; 
    items: string[]; 
    isLocked?: boolean;
    onChange?: (items: string[]) => void;
  }) => {
    const [localItems, setLocalItems] = useState(items);
    const [newItem, setNewItem] = useState("");
    const [editingIndex, setEditingIndex] = useState<number | null>(null);
    const [editingText, setEditingText] = useState("");
    const [history, setHistory] = useState<string[][]>([items]);
    const [historyIndex, setHistoryIndex] = useState(0);
    const [showUndo, setShowUndo] = useState(false);

    // Keep local state in sync when parent data changes (e.g., navigating between ICPs)
    useEffect(() => {
      setLocalItems(items);
      setHistory([items]);
      setHistoryIndex(0);
    }, [items]);

    const saveToHistory = (newItems: string[]) => {
      const newHistory = history.slice(0, historyIndex + 1);
      newHistory.push(newItems);
      setHistory(newHistory);
      setHistoryIndex(newHistory.length - 1);
      setLocalItems(newItems);
      onChange?.(newItems);
      
      // Show undo button briefly
      setShowUndo(true);
      setTimeout(() => setShowUndo(false), 3000);
    };

    const handleUndo = () => {
      if (historyIndex > 0) {
        const newIndex = historyIndex - 1;
        setHistoryIndex(newIndex);
        setLocalItems(history[newIndex]);
        setShowUndo(true);
        setTimeout(() => setShowUndo(false), 3000);
      }
    };

    const addItem = () => {
      if (newItem.trim() && !isLocked) {
        const newItems = [...localItems, newItem.trim()];
        saveToHistory(newItems);
        setNewItem("");
      }
    };

    const removeItem = (index: number) => {
      if (!isLocked) {
        const newItems = localItems.filter((_, i) => i !== index);
        saveToHistory(newItems);
      }
    };

    const startEditing = (index: number, text: string) => {
      if (!isLocked) {
        setEditingIndex(index);
        setEditingText(text);
      }
    };

    const saveEdit = (index: number) => {
      if (editingText.trim()) {
        const updatedItems = [...localItems];
        updatedItems[index] = editingText.trim();
        saveToHistory(updatedItems);
      }
      setEditingIndex(null);
      setEditingText("");
    };

    const cancelEdit = () => {
      setEditingIndex(null);
      setEditingText("");
    };

    return (
      <div className={`relative ${isLocked ? 'opacity-60' : ''}`}>
        {isLocked && (
          <div className="absolute inset-0 bg-background/60 backdrop-blur-[2px] rounded-design z-10 flex items-center justify-center">
            <Lock className="w-6 h-6 text-foreground/60" />
          </div>
        )}
        
        <h3 className="font-['Fraunces'] text-lg mb-3">{title}</h3>
        
        <ul className="space-y-2 mb-3">
          {localItems.map((item, index) => (
            <li key={index} className="flex items-start gap-2 group">
              {editingIndex === index ? (
                <>
                  <Input
                    type="text"
                    value={editingText}
                    onChange={(e) => setEditingText(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') saveEdit(index);
                      if (e.key === 'Escape') cancelEdit();
                    }}
                    className="flex-1 border-black rounded-design font-['Inter'] text-sm"
                    autoFocus
                  />
                  <button
                    onClick={() => saveEdit(index)}
                    className="p-1 hover:bg-green-100 rounded transition-colors"
                    title="Save"
                  >
                    <Check className="w-4 h-4 text-green-600" />
                  </button>
                  <button
                    onClick={cancelEdit}
                    className="p-1 hover:bg-red-100 rounded transition-colors"
                    title="Cancel"
                  >
                    <X className="w-4 h-4 text-red-600" />
                  </button>
                </>
              ) : (
                <>
                  <span 
                    className="font-['Inter'] text-sm text-foreground/80 flex-1 cursor-pointer hover:text-foreground transition-colors py-1 px-2 -mx-2 rounded hover:bg-accent-grey/20"
                    onClick={() => !isLocked && startEditing(index, item)}
                    title={!isLocked ? "Click to edit" : ""}
                  >
                    • {item}
                  </span>
                  {!isLocked && (
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => startEditing(index, item)}
                        className="p-1 hover:bg-blue-100 rounded transition-colors"
                        title="Edit"
                      >
                        <Pencil className="w-3 h-3 text-blue-600" />
                      </button>
                      <button
                        onClick={() => removeItem(index)}
                        className="p-1 hover:bg-red-100 rounded transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-3 h-3 text-red-600" />
                      </button>
                    </div>
                  )}
                </>
              )}
            </li>
          ))}
        </ul>

        {!isLocked && (
          <div className="flex gap-2">
            <Input
              type="text"
              value={newItem}
              onChange={(e) => setNewItem(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && addItem()}
              placeholder={`Add ${title.toLowerCase()}...`}
              className="flex-1 border-black rounded-design font-['Inter'] text-sm"
            />
            <Button
              onClick={addItem}
              size="sm"
              variant="outline"
              className="border-black rounded-design px-3"
            >
              <Plus className="w-4 h-4" />
            </Button>
          </div>
        )}

        {showUndo && (
          <div className="mt-2">
            <Button
              onClick={handleUndo}
              size="sm"
              variant="outline"
              className="border-black rounded-design px-3"
            >
              <Undo2 className="w-4 h-4" />
              Undo
            </Button>
          </div>
        )}
      </div>
    );
  };

  // Show loading state (after hooks so hook order is consistent)
  if (isLoading) {
    return (
      <DashboardShell contentClassName="flex-1 px-6 py-8 lg:px-12">
        {/* Reserve enough vertical space so the footer never pops into view */}
        <div className="min-h-[calc(100vh-220px)] flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 border-4 border-button-green border-t-transparent rounded-full animate-spin" />
            <p className="text-foreground/70">Loading ICP...</p>
          </div>
        </div>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell contentClassName="flex-1 px-6 py-8 lg:px-12">
      {leaveDialogOpen && (
        <div
          className="modal-overlay"
          onClick={() => {
            pendingNavRef.current = null;
            setLeaveDialogOpen(false);
          }}
        >
          <div
            className="modal-content modal-content-wide"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close X */}
            <button
              className="modal-close"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleCloseLeaveDialog();
              }}
              aria-label="Close"
            >
              ×
            </button>

            <h2>Save changes before leaving?</h2>

            <p>
              You have unsaved edits.
              <br />
              Leave without saving or save and continue.
            </p>

            <div className="modal-buttons modal-buttons-2">
              <button
                className="modal-cancel"
                onClick={handleLeaveWithoutSaving}
              >
                Leave without saving
              </button>

              <button
                className="modal-save"
                onClick={handleSaveAndLeave}
                disabled={isSaving}
              >
                {isSaving ? "Saving…" : "Save & leave"}
              </button>
            </div>
          </div>
        </div>
      )}

      <ICPProfileLayout
        headerLeft={
          <div className="space-y-3">
            <div className="flex items-center gap-3 flex-wrap">
              <Link
                to="/dashboard"
                className="flex items-center gap-2 hover:opacity-70 transition-opacity"
              >
                <ArrowLeft className="w-5 h-5" />
                <span className="font-['Inter']">Back to Dashboard</span>
              </Link>
              {hasUnsavedChanges && saveStatus !== "saving" && (
                <span className="text-sm text-amber-700 bg-amber-100 border border-amber-300 rounded-full px-3 py-1 font-['Inter']">
                  Unsaved changes
                </span>
              )}
            </div>
            <div>
              <h1 className="font-['Fraunces'] text-3xl lg:text-4xl">ICP Profile</h1>
              <p className="font-['Inter'] text-foreground/70">
                Review and edit your ideal customer profile.
              </p>
            </div>
          </div>
        }
        headerRight={
          <div className="flex items-center gap-3 flex-wrap">
            <Button
              onClick={handleExport}
              variant="outline"
              className="border-black rounded-design px-4 py-2 flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">Export PDF</span>
            </Button>
            <Button
              onClick={handleSave}
              disabled={isSaving}
              className="bg-button-green hover:bg-button-green/90 text-foreground border border-black rounded-design px-6 py-2 flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              {isSaving ? "Saving..." : "Save Changes"}
            </Button>
            {saveStatus === "saved" && !isDirty && (
              <span className="text-sm text-green-700 bg-green-100 border border-green-300 rounded-full px-3 py-1 font-['Inter']">
                Saved
              </span>
            )}
            {saveStatus === "error" && (
              <span className="text-sm text-red-700 bg-red-100 border border-red-300 rounded-full px-3 py-1 font-['Inter']">
                Save failed
              </span>
            )}
          </div>
        }
        profileCardTopRow={
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="w-full sm:max-w-md">
              <p className="font-['Inter'] text-xs text-foreground/60 mb-1">Brand</p>
              <select
                value={currentBrandId ?? ""}
                onChange={(e) => handleBrandChange(e.target.value)}
                className="w-full border border-black rounded-design px-4 py-3 bg-white font-['Inter'] text-foreground"
                disabled={isFreeTier || brandsLoading || brandSaveStatus === "saving"}
              >
                <option value="">
                  {brandsLoading ? "Loading brands…" : "No brand allocated"}
                </option>
                {(brands || []).map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
              <div className="mt-2 flex items-center gap-3 text-xs font-['Inter'] text-foreground/60">
                <span>Changing this saves immediately (no need to hit Save Changes).</span>
                <span>
                  {brandSaveStatus === "saving" && "Saving…"}
                  {brandSaveStatus === "saved" && "Saved"}
                  {brandSaveStatus === "error" && "Failed"}
                </span>
              </div>
            </div>
          </div>
        }
        profileMain={
          <div className="space-y-8">
            <div>
              {/* ICP “card-style” banner with avatar + menu */}
              <div>
                {/* Banner strip (clipped so corners stay clean) */}
                <div className="relative border border-black rounded-design overflow-hidden">
                  <div
                    className="h-24 sm:h-28 md:h-32 border-b border-black"
                    style={{ backgroundColor: icpHeaderColor }}
                  />

                  <div className="absolute top-3 right-3">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button
                          type="button"
                          className="p-1.5 bg-background rounded-full border border-black hover:scale-105 transition-transform h-9 w-9 flex items-center justify-center"
                          aria-label="ICP actions"
                        >
                          <MoreVertical className="h-4 w-4" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent
                        align="end"
                        className="min-w-[200px] border border-black rounded-design bg-neutral-light text-foreground shadow-lg"
                      >
                        <DropdownMenuItem
                          className="text-sm"
                          onSelect={(e) => {
                            e.preventDefault();
                            (e as any).stopPropagation?.();
                            handleDuplicate();
                          }}
                        >
                          <Copy className="h-4 w-4 mr-2" />
                          Duplicate
                        </DropdownMenuItem>

                        <DropdownMenuItem
                          className="text-sm"
                          onSelect={(e) => {
                            e.preventDefault();
                            (e as any).stopPropagation?.();
                            handleExport();
                          }}
                        >
                          <FileText className="h-4 w-4 mr-2" />
                          Export as PDF
                        </DropdownMenuItem>

                        <DropdownMenuItem
                          className="text-sm"
                          onSelect={(e) => {
                            e.preventDefault();
                            (e as any).stopPropagation?.();
                            handleOpenColorModal();
                          }}
                        >
                          <Palette className="h-4 w-4 mr-2" />
                          Change Colour
                        </DropdownMenuItem>

                        <DropdownMenuItem
                          className="text-sm"
                          onSelect={(e) => {
                            e.preventDefault();
                            (e as any).stopPropagation?.();
                            handleOpenAvatarModal();
                          }}
                        >
                          <ImageIcon className="h-4 w-4 mr-2" />
                          Change Avatar
                        </DropdownMenuItem>

                        <DropdownMenuItem
                          className="text-sm"
                          onSelect={(e) => {
                            e.preventDefault();
                            (e as any).stopPropagation?.();
                            setMoveBrandId(((icpData as any)?.brand_id ?? null) as any);
                            setMoveBrandOpen(true);
                          }}
                        >
                          <FolderPlus className="h-4 w-4 mr-2" />
                          Move to brand…
                        </DropdownMenuItem>

                        <DropdownMenuSeparator />

                        <DropdownMenuItem
                          className="text-sm text-red-600 focus:text-red-600"
                          onSelect={(e) => {
                            e.preventDefault();
                            (e as any).stopPropagation?.();
                            handleDelete();
                          }}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete ICP
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>

                {/* Avatar (NOT clipped; overlaps banner via negative margin) */}
                <div className="relative flex justify-center -mt-10 sm:-mt-12 md:-mt-16">
                  <div className="rounded-full border-2 border-black shadow-md overflow-hidden bg-white w-24 h-24 sm:w-32 sm:h-32 md:w-40 md:h-40">
                    <img
                      src={icpAvatarSrc}
                      alt={icpData.name || "ICP avatar"}
                      className="w-full h-full object-cover bg-white"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="border border-black rounded-design p-6 md:p-8 bg-[#F8F5EE]/60 shadow-md space-y-6">
              <div>
                <h3 className="font-['Fraunces'] text-xl mb-1">ICP Details</h3>
                <p className="font-['Inter'] text-sm text-foreground/70">
                  Core customer profile details and signals.
                </p>
              </div>

              {/* Basic Information */}
              <div className="space-y-4">
                <div className="border border-black rounded-design p-4 bg-white">
                  <p className="font-['Inter'] text-xs text-foreground/60 mb-1">Name</p>
                  <Input
                    type="text"
                    value={icpData.name || ""}
                    onChange={(e) => setICPData({ ...icpData, name: e.target.value })}
                    disabled={isFreeTier}
                    placeholder="ICP Name"
                    className="font-['Fraunces'] text-2xl border-none bg-transparent p-0 h-auto focus-visible:ring-0 focus-visible:ring-offset-0"
                  />
                </div>

                <div className="border border-black rounded-design p-4 bg-white">
                  <p className="font-['Inter'] text-xs text-foreground/60 mb-1">Description</p>
                  <Textarea
                    value={icpData.description || ""}
                    onChange={(e) => setICPData({ ...icpData, description: e.target.value })}
                    disabled={isFreeTier}
                    placeholder="Description"
                    className="font-['Inter'] text-sm border-none bg-transparent p-0 resize-none focus-visible:ring-0 focus-visible:ring-offset-0"
                    rows={3}
                  />
                </div>
              </div>

              {/* Additional Details */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="border border-black rounded-design p-4 bg-white">
                  <p className="font-['Inter'] text-xs text-foreground/60 mb-1">Industry</p>
                  <Input
                    type="text"
                    value={icpData.industry || ""}
                    onChange={(e) => setICPData({ ...icpData, industry: e.target.value })}
                    disabled={isFreeTier}
                    placeholder="Industry"
                    className="font-['Inter'] text-sm border-none bg-transparent p-0 h-auto focus-visible:ring-0 focus-visible:ring-offset-0"
                  />
                </div>

                <div className="border border-black rounded-design p-4 bg-white">
                  <p className="font-['Inter'] text-xs text-foreground/60 mb-1">Company size</p>
                  <Input
                    type="text"
                    value={icpData.company_size || ""}
                    onChange={(e) => setICPData({ ...icpData, company_size: e.target.value })}
                    disabled={isFreeTier}
                    placeholder="Company Size"
                    className="font-['Inter'] text-sm border-none bg-transparent p-0 h-auto focus-visible:ring-0 focus-visible:ring-offset-0"
                  />
                </div>

                <div className="border border-black rounded-design p-4 bg-white">
                  <p className="font-['Inter'] text-xs text-foreground/60 mb-1">Location</p>
                  <Input
                    type="text"
                    value={icpData.location || ""}
                    onChange={(e) => setICPData({ ...icpData, location: e.target.value })}
                    disabled={isFreeTier}
                    placeholder="Location"
                    className="font-['Inter'] text-sm border-none bg-transparent p-0 h-auto focus-visible:ring-0 focus-visible:ring-offset-0"
                  />
                </div>
              </div>

              {/* Budget */}
              <div className="border border-black rounded-design p-4 bg-white">
                <p className="font-['Inter'] text-xs text-foreground/60 mb-1">Budget</p>
                <Input
                  type="text"
                  value={icpData.budget || ""}
                  onChange={(e) => setICPData({ ...icpData, budget: e.target.value })}
                  disabled={isFreeTier}
                  placeholder="Budget"
                  className="font-['Inter'] text-sm border-none bg-transparent p-0 h-auto focus-visible:ring-0 focus-visible:ring-offset-0"
                />
              </div>
            </div>

              {/* Sections */}
              <div className="space-y-4">
              {/* Goals */}
              <div className="bg-background border border-black rounded-design p-6 shadow-md animate-fade-in-up delay-100">
                <EditableListSection
                  title="Goals & Motivations"
                  items={icpData.goals || []}
                  isLocked={isFreeTier}
                  onChange={(items) => setICPData({ ...icpData, goals: items })}
                />
              </div>

              {/* Pain Points */}
              <div className="bg-background border border-black rounded-design p-6 shadow-md animate-fade-in-up delay-150">
                <EditableListSection
                  title="Pain Points"
                  items={icpData.pain_points || []}
                  isLocked={isFreeTier}
                  onChange={(items) => setICPData({ ...icpData, pain_points: items })}
                />
              </div>

              {/* Decision Makers */}
              <div className="bg-background border border-black rounded-design p-6 shadow-md animate-fade-in-up delay-200">
                <EditableListSection
                  title="Decision Makers"
                  items={icpData.decision_makers || []}
                  isLocked={isFreeTier}
                  onChange={(items) => setICPData({ ...icpData, decision_makers: items })}
                />
              </div>

              {/* Digital Tools & Platforms */}
              <div className="bg-background border border-black rounded-design p-6 shadow-md animate-fade-in-up delay-250">
                <EditableListSection
                  title="Digital Tools & Platforms"
                  items={icpData.tech_stack || []}
                  isLocked={isFreeTier}
                  onChange={(items) => setICPData({ ...icpData, tech_stack: items })}
                />
              </div>

              {/* Challenges */}
              <div className="bg-background border border-black rounded-design p-6 shadow-md animate-fade-in-up delay-300">
                <EditableListSection
                  title="Challenges"
                  items={icpData.challenges || []}
                  isLocked={isFreeTier}
                  onChange={(items) => setICPData({ ...icpData, challenges: items })}
                />
              </div>

              {/* Opportunities */}
              <div className="bg-background border border-black rounded-design p-6 shadow-md animate-fade-in-up delay-350">
                <EditableListSection
                  title="Opportunities"
                  items={icpData.opportunities || []}
                  isLocked={isFreeTier}
                  onChange={(items) => setICPData({ ...icpData, opportunities: items })}
                />
              </div>

            </div>

            {/* Marketing Strategy */}
            <div className="bg-[#F1F7FF]/60 border border-black rounded-design p-6 shadow-md animate-fade-in-up delay-[400ms]">
                <h3 className="font-['Fraunces'] text-xl mb-2">Marketing Strategy</h3>
                {isFreeTier ? (
                  <div className="relative">
                    <div className="space-y-4 blur-sm pointer-events-none select-none">
                      <div className="border border-black rounded-design p-4 bg-white">
                        <h4 className="font-['Fraunces'] text-lg mb-2">Positioning</h4>
                        <p className="text-sm font-['Inter'] text-foreground/80">
                          Your ICP positioning, messaging and differentiators will appear here.
                        </p>
                      </div>

                      <div className="border border-black rounded-design p-4 bg-white">
                        <h4 className="font-['Fraunces'] text-lg mb-2">Campaign Ideas</h4>
                        <p className="text-sm font-['Inter'] text-foreground/80">
                          Ready-to-use campaign hooks, angles and CTAs tailored to this ICP.
                        </p>
                      </div>
                    </div>

                    <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-6">
                      <h4 className="font-['Fraunces'] text-lg mb-2">
                        Unlock your marketing strategy
                      </h4>
                      <p className="text-sm font-['Inter'] text-foreground/70 mb-4 max-w-sm">
                        Generate positioning, messaging, campaigns and ad ideas tailored to this ICP.
                      </p>
                      <Button
                        className="bg-button-green hover:bg-button-green/90 text-foreground border border-black rounded-design px-6 py-3"
                        onClick={() => openPaywall()}
                      >
                        Start your FREE 7-day trial
                      </Button>
                    </div>
                  </div>
                ) : strategyLoading ? (
                  <p className="text-sm text-foreground/60 font-['Inter']">Loading strategy…</p>
                ) : strategy && !showNewStrategyForm ? (
                  <div className="space-y-4">
                    {strategyRecords.length > 0 && (
                      <div className="border border-black rounded-design p-3 bg-white">
                        <div className="flex flex-wrap items-center gap-2">
                          {strategyRecords.map((r, index) => {
                            const isActive = r.id === selectedStrategyId;
                            const displayName = r.strategy_name || `Strategy ${strategyRecords.length - index}`;
                            return (
                              <button
                                key={r.id}
                                type="button"
                                onClick={() => selectStrategy(r.id)}
                                className={`px-3 py-1.5 rounded-design border text-xs font-['Inter'] ${
                                  isActive
                                    ? "bg-button-green/40 border-black text-foreground"
                                    : "bg-white border-black/40 text-foreground/70 hover:bg-accent-grey/30"
                                }`}
                              >
                                {displayName}
                              </button>
                            );
                          })}
                          <Button
                            type="button"
                            variant="outline"
                            className="border-black rounded-design ml-auto"
                            onClick={() => setShowNewStrategyForm(true)}
                            disabled={strategyRecords.length >= maxStrategies}
                          >
                            Generate new strategy
                          </Button>
                        </div>
                        {strategyRecords.length >= maxStrategies && (
                          <p className="text-xs font-['Inter'] text-foreground/60 mt-2">
                            Maximum of {maxStrategies} strategies reached. Delete one to create another.
                          </p>
                        )}
                        {strategyRecord?.created_at && (
                          <p className="text-xs font-['Inter'] text-foreground/60 mt-2">
                            Viewing strategy created{" "}
                            {new Date(strategyRecord.created_at).toLocaleString("en-GB", {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </p>
                        )}
                        <div className="mt-3 flex flex-wrap items-center gap-2">
                          {isRenamingStrategy ? (
                            <>
                              <Input
                                value={renameStrategyValue}
                                onChange={(e) => setRenameStrategyValue(e.target.value)}
                                className="h-9 border-black rounded-design max-w-xs"
                                maxLength={80}
                              />
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                className="border-black rounded-design"
                                onClick={async () => {
                                  if (!strategyRecord) return;
                                  const ok = await renameStrategy(strategyRecord.id, renameStrategyValue);
                                  if (ok) setIsRenamingStrategy(false);
                                }}
                              >
                                Save name
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                className="border-black rounded-design"
                                onClick={() => {
                                  setIsRenamingStrategy(false);
                                  setRenameStrategyValue(activeStrategySavedName);
                                }}
                              >
                                Cancel
                              </Button>
                            </>
                          ) : (
                            <>
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                className="border-black rounded-design"
                                onClick={() => setIsRenamingStrategy(true)}
                              >
                                Rename strategy
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                className="border-red-500 text-red-700 hover:bg-red-50 rounded-design"
                                onClick={async () => {
                                  if (!strategyRecord) return;
                                  const ok = window.confirm(
                                    "Delete this strategy? This action cannot be undone."
                                  );
                                  if (!ok) return;
                                  await deleteStrategy(strategyRecord.id);
                                }}
                              >
                                Delete strategy
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    )}

                    <div className="border border-black rounded-design p-4 bg-white">
                      <h4 className="font-['Fraunces'] text-lg mb-2">Positioning</h4>
                      <p className="text-sm font-['Inter'] text-foreground/80">
                        <span className="font-semibold">One-liner:</span> {strategy.positioning?.one_liner}
                      </p>
                      <p className="text-sm font-['Inter'] text-foreground/80 mt-2">
                        <span className="font-semibold">Why us:</span> {strategy.positioning?.why_us}
                      </p>
                      <ul className="list-disc list-inside text-sm text-foreground/80 font-['Inter'] mt-2 space-y-1">
                        {(strategy.positioning?.differentiators || []).map((item, index) => (
                          <li key={`diff-${index}`}>{item}</li>
                        ))}
                      </ul>
                    </div>

                    <div className="border border-black rounded-design p-4 bg-white">
                      <h4 className="font-['Fraunces'] text-lg mb-2">Messaging</h4>
                      <p className="text-xs font-['Inter'] text-foreground/60 mb-1">Value props</p>
                      <ul className="list-disc list-inside text-sm text-foreground/80 font-['Inter'] space-y-1">
                        {(strategy.messaging?.value_props || []).map((item, index) => (
                          <li key={`vp-${index}`}>{item}</li>
                        ))}
                      </ul>
                      <p className="text-xs font-['Inter'] text-foreground/60 mb-1 mt-3">Pain to promise</p>
                      <ul className="list-disc list-inside text-sm text-foreground/80 font-['Inter'] space-y-1">
                        {(strategy.messaging?.pain_to_promise || []).map((item, index) => (
                          <li key={`ptp-${index}`}>{item}</li>
                        ))}
                      </ul>
                      <p className="text-xs font-['Inter'] text-foreground/60 mb-1 mt-3">Objections & rebuttals</p>
                      <ul className="list-disc list-inside text-sm text-foreground/80 font-['Inter'] space-y-1">
                        {(strategy.messaging?.objections_and_rebuttals || []).map((item, index) => (
                          <li key={`obr-${index}`}>{item}</li>
                        ))}
                      </ul>
                    </div>

                    <div className="border border-black rounded-design p-4 bg-white">
                      <h4 className="font-['Fraunces'] text-lg mb-2">Campaign ideas</h4>
                      <div className="space-y-3">
                        {(strategy.campaign_ideas || []).map((idea, index) => (
                          <div key={`campaign-${index}`} className="border border-black/10 rounded-design p-3 bg-white">
                            <p className="text-sm font-['Inter'] text-foreground/80">
                              <span className="font-semibold">{idea.name}:</span> {idea.hook}
                            </p>
                            <p className="text-sm font-['Inter'] text-foreground/70 mt-1">{idea.angle}</p>
                            <p className="text-sm font-['Inter'] text-foreground/70 mt-1">CTA: {idea.cta}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="border border-black rounded-design p-4 bg-white">
                        <h4 className="font-['Fraunces'] text-lg mb-2">Channel plan</h4>
                        <p className="text-sm font-['Inter'] text-foreground/80">
                          <span className="font-semibold">Primary:</span> {strategy.channel_plan?.primary_channel}
                        </p>
                        <p className="text-xs font-['Inter'] text-foreground/60 mb-1 mt-2">Secondary</p>
                        <ul className="list-disc list-inside text-sm text-foreground/80 font-['Inter'] space-y-1">
                          {(strategy.channel_plan?.secondary_channels || []).map((item, index) => (
                            <li key={`secondary-${index}`}>{item}</li>
                          ))}
                        </ul>
                        <p className="text-xs font-['Inter'] text-foreground/60 mb-1 mt-3">First 14 days</p>
                        <ul className="list-disc list-inside text-sm text-foreground/80 font-['Inter'] space-y-1">
                          {(strategy.channel_plan?.first_14_days || []).map((item, index) => (
                            <li key={`first14-${index}`}>{item}</li>
                          ))}
                        </ul>
                      </div>

                      <div className="border border-black rounded-design p-4 bg-white">
                        <h4 className="font-['Fraunces'] text-lg mb-2">Offer</h4>
                        <p className="text-sm font-['Inter'] text-foreground/80">
                          <span className="font-semibold">Recommended:</span> {strategy.offer?.recommended_offer}
                        </p>
                        <p className="text-sm font-['Inter'] text-foreground/80 mt-2">
                          <span className="font-semibold">Lead magnet:</span>{" "}
                          {strategy.offer?.lead_magnet_idea || "—"}
                        </p>
                        <p className="text-xs font-['Inter'] text-foreground/60 mb-1 mt-3">Landing page sections</p>
                        <ul className="list-disc list-inside text-sm text-foreground/80 font-['Inter'] space-y-1">
                          {(strategy.offer?.landing_page_sections || []).map((item, index) => (
                            <li key={`landing-${index}`}>{item}</li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="border border-black rounded-design p-4 bg-white">
                        <h4 className="font-['Fraunces'] text-lg mb-2">Ad assets</h4>
                        {strategy.ad_assets ? (
                          <>
                            <p className="text-xs font-['Inter'] text-foreground/60 mb-1">Headlines</p>
                            <ul className="list-disc list-inside text-sm text-foreground/80 font-['Inter'] space-y-1">
                              {(strategy.ad_assets?.headlines || []).map((item, index) => (
                                <li key={`headline-${index}`}>{item}</li>
                              ))}
                            </ul>
                            <p className="text-xs font-['Inter'] text-foreground/60 mb-1 mt-3">Primary text</p>
                            <ul className="list-disc list-inside text-sm text-foreground/80 font-['Inter'] space-y-1">
                              {(strategy.ad_assets?.primary_texts || []).map((item, index) => (
                                <li key={`primary-${index}`}>{item}</li>
                              ))}
                            </ul>
                            <p className="text-xs font-['Inter'] text-foreground/60 mb-1 mt-3">Creative briefs</p>
                            <ul className="list-disc list-inside text-sm text-foreground/80 font-['Inter'] space-y-1">
                              {(strategy.ad_assets?.creative_briefs || []).map((item, index) => (
                                <li key={`brief-${index}`}>{item}</li>
                              ))}
                            </ul>
                          </>
                        ) : (
                          <p className="text-sm font-['Inter'] text-foreground/60">Not included</p>
                        )}
                      </div>

                      <div className="border border-black rounded-design p-4 bg-white">
                        <h4 className="font-['Fraunces'] text-lg mb-2">Success metrics</h4>
                        <p className="text-xs font-['Inter'] text-foreground/60 mb-1">KPIs</p>
                        <ul className="list-disc list-inside text-sm text-foreground/80 font-['Inter'] space-y-1">
                          {(strategy.success_metrics?.kpis || []).map((item, index) => (
                            <li key={`kpi-${index}`}>{item}</li>
                          ))}
                        </ul>
                        <p className="text-xs font-['Inter'] text-foreground/60 mb-1 mt-3">Targets</p>
                        <ul className="list-disc list-inside text-sm text-foreground/80 font-['Inter'] space-y-1">
                          {(strategy.success_metrics?.targets || []).map((item, index) => (
                            <li key={`target-${index}`}>{item}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="border border-black rounded-design p-4 bg-white">
                    <p className="text-sm font-['Inter'] text-foreground/70 mb-4">
                      Generate a tailored marketing strategy for this ICP.
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs font-['Inter'] text-foreground/60 mb-1">Goal</p>
                        <select
                          value={strategyGoal}
                          onChange={(e) => setStrategyGoal(e.target.value)}
                          className="w-full border border-black rounded-design px-4 py-3 bg-white font-['Inter'] text-foreground"
                        >
                          <option value="Generate qualified leads">Generate qualified leads</option>
                          <option value="Increase conversions">Increase conversions</option>
                          <option value="Launch a new offer">Launch a new offer</option>
                          <option value="Improve retention">Improve retention</option>
                        </select>
                      </div>
                      <div>
                        <p className="text-xs font-['Inter'] text-foreground/60 mb-1">Channel (optional)</p>
                        <select
                          value={strategyChannel}
                          onChange={(e) => setStrategyChannel(e.target.value)}
                          className="w-full border border-black rounded-design px-4 py-3 bg-white font-['Inter'] text-foreground"
                        >
                          <option value="">No preference</option>
                          <option value="Paid social">Paid social</option>
                          <option value="Search">Search</option>
                          <option value="LinkedIn organic">LinkedIn organic</option>
                          <option value="Email">Email</option>
                          <option value="Content">Content</option>
                        </select>
                      </div>
                      <div>
                        <p className="text-xs font-['Inter'] text-foreground/60 mb-1">Offer type (optional)</p>
                        <select
                          value={strategyOfferType}
                          onChange={(e) => setStrategyOfferType(e.target.value)}
                          className="w-full border border-black rounded-design px-4 py-3 bg-white font-['Inter'] text-foreground"
                        >
                          <option value="">No preference</option>
                          <option value="Audit">Audit</option>
                          <option value="Consultation">Consultation</option>
                          <option value="Demo">Demo</option>
                          <option value="Free trial">Free trial</option>
                          <option value="Download">Download</option>
                        </select>
                      </div>
                      <div>
                        <p className="text-xs font-['Inter'] text-foreground/60 mb-1">Tone (optional)</p>
                        <select
                          value={strategyTone}
                          onChange={(e) => setStrategyTone(e.target.value)}
                          className="w-full border border-black rounded-design px-4 py-3 bg-white font-['Inter'] text-foreground"
                        >
                          <option value="">No preference</option>
                          <option value="Direct">Direct</option>
                          <option value="Friendly">Friendly</option>
                          <option value="Premium">Premium</option>
                          <option value="Educational">Educational</option>
                        </select>
                      </div>
                      <div>
                        <p className="text-xs font-['Inter'] text-foreground/60 mb-1">Business stage / size</p>
                        <select
                          value={strategyBusinessStage}
                          onChange={(e) => setStrategyBusinessStage(e.target.value)}
                          className="w-full border border-black rounded-design px-4 py-3 bg-white font-['Inter'] text-foreground"
                        >
                          <option value="">Not specified</option>
                          <option value="Solo founder">Solo founder</option>
                          <option value="Small team (2-10)">Small team (2-10)</option>
                          <option value="Growing business (11-50)">Growing business (11-50)</option>
                          <option value="Established business (50+)">Established business (50+)</option>
                        </select>
                      </div>
                      <div>
                        <p className="text-xs font-['Inter'] text-foreground/60 mb-1">Monthly marketing budget</p>
                        <select
                          value={strategyMonthlyBudgetBand}
                          onChange={(e) => setStrategyMonthlyBudgetBand(e.target.value)}
                          className="w-full border border-black rounded-design px-4 py-3 bg-white font-['Inter'] text-foreground"
                        >
                          <option value="">Not specified</option>
                          <option value="£0-500">£0-500</option>
                          <option value="£500-2,000">£500-2,000</option>
                          <option value="£2,000-10,000">£2,000-10,000</option>
                          <option value="£10,000+">£10,000+</option>
                        </select>
                      </div>
                      <div>
                        <p className="text-xs font-['Inter'] text-foreground/60 mb-1">Primary objective horizon</p>
                        <select
                          value={strategyObjectiveHorizon}
                          onChange={(e) => setStrategyObjectiveHorizon(e.target.value)}
                          className="w-full border border-black rounded-design px-4 py-3 bg-white font-['Inter'] text-foreground"
                        >
                          <option value="next_30_days">Next 30 days</option>
                          <option value="next_quarter">Next quarter</option>
                          <option value="next_6_months">Next 6 months</option>
                          <option value="next_12_months">Next 12 months</option>
                        </select>
                      </div>
                      <div>
                        <p className="text-xs font-['Inter'] text-foreground/60 mb-1">Weekly marketing capacity</p>
                        <select
                          value={strategyMarketingCapacity}
                          onChange={(e) => setStrategyMarketingCapacity(e.target.value)}
                          className="w-full border border-black rounded-design px-4 py-3 bg-white font-['Inter'] text-foreground"
                        >
                          <option value="">Not specified</option>
                          <option value="1-3 hours/week">1-3 hours/week</option>
                          <option value="4-7 hours/week">4-7 hours/week</option>
                          <option value="8-15 hours/week">8-15 hours/week</option>
                          <option value="16+ hours/week">16+ hours/week</option>
                        </select>
                      </div>
                    </div>
                    {strategyError && (
                      <p className="text-xs font-['Inter'] text-red-600 mt-3">
                        {strategyError}
                      </p>
                    )}
                    <div className="mt-4 flex items-center gap-3">
                      {strategy && (
                        <Button
                          type="button"
                          variant="outline"
                          className="border-black rounded-design"
                          onClick={() => setShowNewStrategyForm(false)}
                        >
                          Cancel
                        </Button>
                      )}
                      <Button
                        onClick={handleGenerateNewStrategy}
                        disabled={
                          strategyGenerating || !strategyGoal || strategyRecords.length >= maxStrategies
                        }
                        className="bg-button-green hover:bg-button-green/90 text-foreground border border-black rounded-design px-6 py-3"
                      >
                        {strategyGenerating ? (
                          <span className="inline-flex items-center gap-2">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Generating strategy...
                          </span>
                        ) : (
                          "Generate Strategy"
                        )}
                      </Button>
                    </div>
                    {strategyGenerating && (
                      <p className="text-xs font-['Inter'] text-foreground/70 mt-3 animate-pulse">
                        Working through your ICP and brand context. This can take up to 30 seconds. Please do not refresh
                        or navigate away.
                      </p>
                    )}
                  </div>
                )}
              </div>

              <div className="mt-6">
                <MetaActivationPackPanel
                  icpId={id}
                  selectedStrategyId={selectedStrategyId}
                  isFreeTier={isFreeTier}
                  onUpgrade={() => openPaywall()}
                  onUnsavedRenameChange={setHasUnsavedMetaPackRename}
                  registerSavePendingRename={(saveFn) => {
                    metaPackSavePendingRenameRef.current = saveFn;
                  }}
                />
              </div>
            </div>
        }
        footerCta={
          effectiveTier === "free" ? (
            <div className="text-center animate-fade-in-up">
              <div className="bg-gradient-to-br from-[#FFD336]/20 to-[#FF9922]/20 rounded-design p-8">
                <Lock className="w-8 h-8 mx-auto mb-4 text-foreground/60" />
                <h3 className="font-['Fraunces'] text-xl mb-3">
                  Unlock full editing & exports
                </h3>
                <p className="font-['Inter'] text-foreground/70 mb-6 max-w-md mx-auto">
                  Upgrade to edit all sections, export to PDF, and unlock advanced features.
                </p>
                <Button
                  className="bg-button-green hover:bg-button-green/90 text-foreground border border-black rounded-design px-8 py-6 transition-all hover:scale-[1.02] hover:shadow-lg"
                  onClick={() => openPaywall()}
                >
                  Upgrade Now
                </Button>
              </div>
            </div>
          ) : null
        }
      />

      <ICPColorModal
        isOpen={icpColorModal.open}
        id={icpColorModal.id}
        currentColor={icpColorModal.currentColor}
        onClose={() => setIcpColorModal({ open: false, id: null, currentColor: null })}
        onSaved={(color) => {
          const nextColor = color ?? null;
          setIcpColorModal({ open: false, id: null, currentColor: null });

          // Update UI immediately (and avoid "dirty" since it was already saved in modal)
          setICPData((prev) => ({ ...prev, color: nextColor as any }));
          if (originalDataRef.current) {
            originalDataRef.current = { ...originalDataRef.current, color: nextColor as any };
          }
          setIsDirty(false);
          setSaveStatus("idle");
        }}
      />

      <ICPAvatarModal
        isOpen={icpAvatarModal.open}
        icpId={icpAvatarModal.id}
        currentAvatarKey={icpAvatarModal.currentAvatarKey}
        gender={icpAvatarModal.gender}
        ageRange={icpAvatarModal.ageRange}
        onClose={() =>
          setIcpAvatarModal({
            open: false,
            id: null,
            currentAvatarKey: null,
            gender: null,
            ageRange: null,
          })
        }
        onSaved={({ avatarKey, gender, ageRange }) => {
          const nextKey = avatarKey ?? null;
          setIcpAvatarModal({ open: false, id: null, currentAvatarKey: null, gender: null, ageRange: null });

          // Update UI immediately (and avoid "dirty" since it was already saved in modal)
          setICPData((prev) => ({
            ...prev,
            avatar_key: nextKey as any,
            avatar_gender: gender as any,
            avatar_age_range: ageRange as any,
          }));
          if (originalDataRef.current) {
            originalDataRef.current = {
              ...originalDataRef.current,
              avatar_key: nextKey as any,
              avatar_gender: gender as any,
              avatar_age_range: ageRange as any,
            };
          }
          setIsDirty(false);
          setSaveStatus("idle");
        }}
      />
      {moveBrandOpen && (
        <div
          className="modal-overlay"
          onClick={() => setMoveBrandOpen(false)}
        >
          <div
            className="modal-content modal-content-wide"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="font-['Fraunces'] text-2xl mb-2">Move ICP to brand</h2>
            <p className="font-['Inter'] text-sm text-foreground/70 mb-4">
              Choose a brand for this ICP. Selecting “No brand” will unassign it.
            </p>

            <select
              value={moveBrandId ?? ""}
              onChange={(e) => setMoveBrandId(e.target.value || null)}
              className="w-full border border-black rounded-design px-4 py-3 bg-white font-['Inter'] text-foreground"
            >
              <option value="">No brand allocated</option>
              {(brands || []).map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>

            <div className="modal-buttons modal-buttons-2 mt-6">
              <button
                className="modal-cancel"
                onClick={(e) => {
                  e.stopPropagation();
                  setMoveBrandOpen(false);
                }}
              >
                Cancel
              </button>
              <button
                className="modal-save"
                onClick={(e) => {
                  e.stopPropagation();
                  handleSaveMoveBrand();
                }}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardShell>
  );
}
