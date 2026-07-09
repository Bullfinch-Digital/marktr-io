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
import { useAuth } from "../contexts/AuthContext";
import DashboardShell from "../layouts/DashboardShell";
import { ICPProfileLayout } from "../components/icp/ICPProfileLayout";
import { IcpVersionHistorySection } from "../components/icp/IcpVersionHistorySection";
import ICPColorModal from "../components/ICPColorModal";
import ICPAvatarModal from "../components/ICPAvatarModal";
import IcpArchiveModal from "../components/IcpArchiveModal";
import { ARCHIVE_ACTION_TOOLTIP } from "../components/ArchiveActionTooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../components/ui/dropdown-menu";
import { getAvatarSrc } from "../utils/avatarLibrary";
import { EditableListSection } from "../components/EditableListSection";
import {
  buildStrategyLauncherIntent,
  STRATEGY_LAUNCHER_STATE_KEY,
} from "../lib/strategyLauncherState";
import "../styles/Modal.css";
import {
  ArrowLeft,
  Save,
  Copy,
  Download,
  FileText,
  Lock,
  Archive,
  MoreVertical,
  Palette,
  Image as ImageIcon,
  FolderPlus,
  Target,
} from "lucide-react";

export default function ICPEditor() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { getICP, updateICP, duplicateICP, deleteICP } = useICPs();
  const { brands, isLoading: brandsLoading } = useBrands();
  const { tier: userTier, trialActive } = useSubscription();
  const { openPaywall } = usePaywall();
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
  const [archiveModalOpen, setArchiveModalOpen] = useState(false);
  const [isArchiving, setIsArchiving] = useState(false);

  const handleBuildStrategyForPersona = () => {
    if (!id || !icpData.lineage_id) return;
    navigate("/strategy", {
      state: {
        [STRATEGY_LAUNCHER_STATE_KEY]: buildStrategyLauncherIntent({
          icpLineageId: icpData.lineage_id,
          icpId: id,
          icpName: icpData.name || "this persona",
          brandId: ((icpData as { brand_id?: string | null }).brand_id ?? null),
        }),
      },
    });
  };

  useEffect(() => {
    const loadICP = async () => {
      if (!id) return;
      // Avoid re-showing the full-page loader if we already have data (prevents flicker)
      if (!originalDataRef.current) setIsLoading(true);
      const icp = await getICP(id);
      if (icp) {
        if (icp.id !== id) {
          navigate(`/icp/${icp.id}`, { replace: true });
          return;
        }
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

  // Warn on browser/tab close if there are unsaved changes
  useEffect(() => {
    const handler = (event: BeforeUnloadEvent) => {
      if (!isDirty) return;
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty]);

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
    if (!isDirty) return;

    const onClickCapture = (e: MouseEvent) => {
      if (!isDirty) return;
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
  }, [isDirty]);

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

    const saved = await updateICP(id, updates);
    if (!saved) {
      setSaveStatus("error");
      setTimeout(() => setSaveStatus("idle"), 3000);
      alert("Failed to save changes. Please try again.");
      setIsSaving(false);
      return false;
    }
    if (saved.id !== id) {
      navigate(`/icp/${saved.id}`, { replace: true });
    }
    setICPData(saved);
    originalDataRef.current = saved;
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
    const ok = await handleSave();
    if (!ok) return;
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

  const handleOpenArchiveModal = () => {
    if (!id) return;
    if (isFreeTier) {
      openPaywall();
      return;
    }
    setArchiveModalOpen(true);
  };

  const handleArchiveConfirm = async () => {
    if (!id) return;
    setIsArchiving(true);
    try {
      const ok = await deleteICP(id);
      if (!ok) throw new Error("Archive failed");
      setArchiveModalOpen(false);
      try {
        window.dispatchEvent(new Event("icps:changed"));
      } catch {}
      navigate("/icps");
    } catch (err) {
      console.error("ICPEditor archive error:", err);
    } finally {
      setIsArchiving(false);
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
              {isDirty && saveStatus !== "saving" && (
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
                          className="text-sm"
                          aria-label="Archive customer profile"
                          title={ARCHIVE_ACTION_TOOLTIP}
                          onSelect={(e) => {
                            e.preventDefault();
                            (e as any).stopPropagation?.();
                            handleOpenArchiveModal();
                          }}
                        >
                          <Archive className="h-4 w-4 mr-2" />
                          Archive
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
                  isLocked={false}
                  onChange={(items) => setICPData({ ...icpData, goals: items })}
                />
              </div>

              {/* Pain Points */}
              <div className="bg-background border border-black rounded-design p-6 shadow-md animate-fade-in-up delay-150">
                <EditableListSection
                  title="Pain Points"
                  items={icpData.pain_points || []}
                  isLocked={false}
                  onChange={(items) => setICPData({ ...icpData, pain_points: items })}
                />
              </div>

              {/* Decision Makers */}
              <div className="bg-background border border-black rounded-design p-6 shadow-md animate-fade-in-up delay-200">
                <EditableListSection
                  title="Decision Makers"
                  items={icpData.decision_makers || []}
                  isLocked={false}
                  onChange={(items) => setICPData({ ...icpData, decision_makers: items })}
                />
              </div>

              {/* Digital Tools & Platforms */}
              <div className="bg-background border border-black rounded-design p-6 shadow-md animate-fade-in-up delay-250">
                <EditableListSection
                  title="Digital Tools & Platforms"
                  items={icpData.tech_stack || []}
                  isLocked={false}
                  onChange={(items) => setICPData({ ...icpData, tech_stack: items })}
                />
              </div>

              {/* Challenges */}
              <div className="bg-background border border-black rounded-design p-6 shadow-md animate-fade-in-up delay-300">
                <EditableListSection
                  title="Challenges"
                  items={icpData.challenges || []}
                  isLocked={false}
                  onChange={(items) => setICPData({ ...icpData, challenges: items })}
                />
              </div>

              {/* Opportunities */}
              <div className="bg-background border border-black rounded-design p-6 shadow-md animate-fade-in-up delay-350">
                <EditableListSection
                  title="Opportunities"
                  items={icpData.opportunities || []}
                  isLocked={false}
                  onChange={(items) => setICPData({ ...icpData, opportunities: items })}
                />
              </div>

            </div>

            {icpData.lineage_id && id && user?.id ? (
              <IcpVersionHistorySection
                lineageId={icpData.lineage_id}
                currentIcpId={id}
                userId={user.id}
                disabled={isFreeTier}
                onVersionRestored={(newIcp) => {
                  setICPData(newIcp);
                  originalDataRef.current = newIcp;
                  setIsDirty(false);
                  setSaveStatus("idle");
                  navigate(`/icp/${newIcp.id}`, { replace: true });
                  try {
                    window.dispatchEvent(new Event("icps:changed"));
                  } catch {}
                }}
              />
            ) : null}

            <div className="border-t border-black/10 pt-4 mt-2">
              <div className="rounded-design border border-black/15 bg-accent-grey/15 px-4 py-4 flex flex-wrap items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="font-['Fraunces'] text-lg text-[#0D1833]">Strategy</p>
                  <p className="font-['Inter'] text-sm text-foreground/65 mt-1 max-w-xl">
                    Strategies live in the Strategy pillar — build one for this persona there, then refine
                    through edits and version history.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  className="border-black rounded-design gap-2 shrink-0"
                  disabled={!icpData.lineage_id || !id}
                  onClick={handleBuildStrategyForPersona}
                >
                  <Target className="h-4 w-4" />
                  Build a strategy for this persona
                </Button>
              </div>
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
        onSaved={(avatarKey) => {
          const nextKey = avatarKey ?? null;
          setIcpAvatarModal({ open: false, id: null, currentAvatarKey: null, gender: null, ageRange: null });

          // Update UI immediately (and avoid "dirty" since it was already saved in modal)
          setICPData((prev) => ({ ...prev, avatar_key: nextKey as any }));
          if (originalDataRef.current) {
            originalDataRef.current = { ...originalDataRef.current, avatar_key: nextKey as any };
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

      <IcpArchiveModal
        isOpen={archiveModalOpen}
        isArchiving={isArchiving}
        onClose={() => {
          if (!isArchiving) setArchiveModalOpen(false);
        }}
        onConfirm={() => void handleArchiveConfirm()}
      />
    </DashboardShell>
  );
}
