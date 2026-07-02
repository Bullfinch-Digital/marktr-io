import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Textarea } from "../components/ui/textarea";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "../components/ui/dropdown-menu";
import DashboardShell from "../layouts/DashboardShell";
import { useBrands, Brand } from "../hooks/useBrands";
import "../styles/Modal.css";
import { ArrowLeft, Save, MoreVertical, Trash2, Palette, Copy, FileText } from "lucide-react";
import { TagInput } from "../components/ui/tag-input";
import { WhisperButton } from "../components/ui/WhisperButton";
import useSubscription from "../hooks/useSubscription";
import { usePaywall } from "../contexts/PaywallContext";
import { useICPs } from "../hooks/useICPs";
import { generateICPs } from "../lib/ai/pipeline";
import { ICPPreviewCard } from "../components/cards/ICPPreviewCard";
import ICPColorModal from "../components/ICPColorModal";
import ICPAvatarModal from "../components/ICPAvatarModal";
import { CollectionPickerModal } from "../components/modals/CollectionPickerModal";
import { useCollections } from "../hooks/useCollections";
import BrandDeleteModal from "../components/BrandDeleteModal";
import BrandColorModal from "../components/BrandColorModal";
import { exportBrandAsPDF } from "../utils/exportBrand";
import { canCreateBrand, canExportBrand } from "../config/accessRules";

type DirtyTrackFields = Partial<Brand>;

export default function BrandEditor() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { brands, getBrand, updateBrand, deleteBrand, createBrand } = useBrands();
  const { tier: userTier, effectiveTier, trialActive, isLoading: subscriptionLoading } = useSubscription();
  const { openPaywall } = usePaywall();
  const { icps, createICP, fetchICPs, updateICP } = useICPs();

  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [isLoading, setIsLoading] = useState(true);
  const [isDirty, setIsDirty] = useState(false);
  const [leaveDialogOpen, setLeaveDialogOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generateStatus, setGenerateStatus] = useState<"idle" | "generating" | "success" | "error">("idle");

  // ------------------------------------------------------------
  // Generating UX (mirrors onboarding "what's happening" lines)
  // ------------------------------------------------------------
  const GENERATE_LINES = useMemo(
    () => [
      "Analysing your brand details…",
      "Mapping motivations and buying triggers…",
      "Optimising pain points and objections…",
      "Shaping your new customer profiles…",
      "Turning insights into clear next steps…",
    ],
    []
  );
  const [generateLineIndex, setGenerateLineIndex] = useState(0);
  const [generateLineOverride, setGenerateLineOverride] = useState<string | null>(null);

  useEffect(() => {
    if (!isGenerating) return;
    setGenerateLineIndex(0);
    setGenerateLineOverride(null);
    const t = setInterval(() => {
      setGenerateLineIndex((prev) => (prev + 1) % GENERATE_LINES.length);
    }, 2000);
    return () => clearInterval(t);
  }, [isGenerating, GENERATE_LINES.length]);
  const pendingNavRef = useRef<string | null>(null);
  const originalDataRef = useRef<DirtyTrackFields | null>(null);
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
  const [addToCollectionIcpId, setAddToCollectionIcpId] = useState<string | null>(null);
  const { addICPToCollection, createCollection } = useCollections();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [brandColorModal, setBrandColorModal] = useState({
    open: false,
    id: null as string | null,
    currentColor: null as string | null,
  });
  const [, setIsExporting] = useState(false);
  const [activeTab, setActiveTab] = useState<"details" | "overview">("details");

  const handleOpenIcpColorModal = (icpId: string, currentColor?: string | null) => {
    setIcpColorModal({
      open: true,
      id: icpId,
      currentColor: currentColor ?? null,
    });
  };

  const handleOpenIcpAvatarModal = (
    icpId: string,
    currentAvatarKey?: string | null,
    gender?: string | null,
    ageRange?: string | null
  ) => {
    setIcpAvatarModal({
      open: true,
      id: icpId,
      currentAvatarKey: currentAvatarKey ?? null,
      gender: gender ?? null,
      ageRange: ageRange ?? null,
    });
  };

  const [brandData, setBrandData] = useState<DirtyTrackFields>({
    name: "",
    business_description: "",
    product_or_service: "",
    business_type: "B2C",
    assumed_audience: [],
    marketing_channels: [],
    country: "",
    region_or_city: "",
    currency: "GBP",
    website: "",
  });

  // Load brand
  useEffect(() => {
    const load = async () => {
      if (!id) return;
      setIsLoading(true);
      const brand = await getBrand(id);
      if (brand) {
        setBrandData(brand);
        originalDataRef.current = brand;
        setIsDirty(false);
      } else {
        navigate("/my-brands");
      }
      setIsLoading(false);
    };
    load();
  }, [id, getBrand, navigate]);

  // Warn on browser/tab close if dirty
  useEffect(() => {
    const handler = (event: BeforeUnloadEvent) => {
      if (!isDirty) return;
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty]);

  // Track dirty
  useEffect(() => {
    if (!originalDataRef.current) return;
    const serialize = (data: DirtyTrackFields) =>
      JSON.stringify({
        name: data.name || "",
        business_description: data.business_description || "",
        product_or_service: data.product_or_service || "",
        business_type: data.business_type || "",
        assumed_audience: data.assumed_audience || [],
        marketing_channels: data.marketing_channels || [],
        country: data.country || "",
        region_or_city: data.region_or_city || "",
        currency: data.currency || "",
        website: data.website || "",
        founding_story: data.founding_story || "",
        core_values: data.core_values || [],
        want_known_for: data.want_known_for || "",
        never_associated_with: data.never_associated_with || "",
        voice_adjectives: data.voice_adjectives || [],
        admired_brands: data.admired_brands || "",
        brand_voice_profile: data.brand_voice_profile || "",
        competitors: data.competitors ?? null,
        active_platforms: data.active_platforms || [],
        runs_paid_ads: data.runs_paid_ads ?? false,
        monthly_ad_spend: data.monthly_ad_spend ?? null,
        email_list_size: data.email_list_size ?? null,
        email_platform: data.email_platform || "",
        primary_goal: data.primary_goal || "",
        platform_focus: data.platform_focus || "",
        monthly_content_volume: data.monthly_content_volume || "",
        success_markers: data.success_markers || [],
      });
    const current = serialize(brandData);
    const original = serialize(originalDataRef.current);
    setIsDirty(current !== original);
  }, [brandData]);

  // Intercept in-app navigation
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
    setIsSaving(true);
    setSaveStatus("saving");

    const updates = {
      name: brandData.name,
      business_description: brandData.business_description,
      product_or_service: brandData.product_or_service,
      business_type: brandData.business_type,
      assumed_audience: brandData.assumed_audience,
      marketing_channels: brandData.marketing_channels,
      country: brandData.country,
      region_or_city: brandData.region_or_city,
      currency: brandData.currency,
      website: brandData.website,
      founding_story: brandData.founding_story,
      core_values: brandData.core_values,
      want_known_for: brandData.want_known_for,
      never_associated_with: brandData.never_associated_with,
      voice_adjectives: brandData.voice_adjectives,
      admired_brands: brandData.admired_brands,
      brand_voice_profile: brandData.brand_voice_profile,
      competitors: brandData.competitors,
      active_platforms: brandData.active_platforms,
      runs_paid_ads: brandData.runs_paid_ads,
      monthly_ad_spend: brandData.monthly_ad_spend,
      email_list_size: brandData.email_list_size,
      email_platform: brandData.email_platform,
      primary_goal: brandData.primary_goal,
      platform_focus: brandData.platform_focus,
      monthly_content_volume: brandData.monthly_content_volume,
      success_markers: brandData.success_markers,
    };

    const success = await updateBrand(id, updates);
    if (!success) {
      setSaveStatus("error");
      setTimeout(() => setSaveStatus("idle"), 3000);
      alert("Failed to save changes. Please try again.");
      setIsSaving(false);
      return false;
    }

    originalDataRef.current = { ...brandData, ...updates };
    setIsDirty(false);
    setSaveStatus("saved");
    setTimeout(() => setSaveStatus("idle"), 3000);
    setIsSaving(false);
    return true;
  }, [brandData, id, updateBrand]);

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

  const handleConfirmDelete = async () => {
    if (!id) return;
    setIsDeleting(true);
    setDeleteError(null);
    const ok = await deleteBrand(id);
    setIsDeleting(false);
    if (ok) {
      setDeleteOpen(false);
      navigate("/my-brands");
    } else {
      setDeleteError("Couldn’t delete this brand. Please try again.");
    }
  };

  const handleDuplicateBrand = async () => {
    if (!id) return;
    if (!canCreateBrand((brands || []).length, effectiveTier as any)) {
      openPaywall();
      return;
    }
    try {
      const getUniqueName = (baseInput: string, suffixWord: string, existingNames: string[]) => {
        const existing = new Set(existingNames.map((n) => (n || "").trim().toLowerCase()));
        const stripSuffix = (name: string) => {
          let candidate = name.trim();
          const re = new RegExp(`\\s\\(${suffixWord}(?:\\s\\d+)?\\)$`, "i");
          while (re.test(candidate)) {
            candidate = candidate.replace(re, "").trim();
          }
          return candidate;
        };
        const base = stripSuffix(baseInput || "Untitled Brand") || "Untitled Brand";
        if (!existing.has(base.toLowerCase())) return base;
        let i = 1;
        while (true) {
          const candidate = `${base} (${suffixWord}${i === 1 ? "" : ` ${i}`})`;
          if (!existing.has(candidate.toLowerCase())) return candidate;
          i += 1;
        }
      };

      const uniqueName = getUniqueName(
        brandData.name || "Brand",
        "Copy",
        (brands || []).map((b) => b?.name || "")
      );

      const copyPayload = {
        ...brandData,
        name: uniqueName,
      };
      delete (copyPayload as any).id;
      delete (copyPayload as any).user_id;
      delete (copyPayload as any).created_at;
      delete (copyPayload as any).updated_at;

      const created = await createBrand(copyPayload as any);
      if (created?.id) {
        navigate(`/my-brands/${created.id}`);
      }
    } catch (err) {
      console.error("Duplicate brand failed", err);
    }
  };

  const handleExportBrand = async () => {
    if (!brandData) return;
    if (!canExportBrand(effectiveTier as any)) {
      if (!subscriptionLoading) openPaywall();
      return;
    }
    setIsExporting(true);
    try {
      exportBrandAsPDF(brandData as any);
    } finally {
      setIsExporting(false);
    }
  };

  const handleSaveAndLeave = async () => {
    const ok = await handleSave();
    if (!ok) return;
    setLeaveDialogOpen(false);
    performPendingNavigation(pendingNavRef.current);
  };

  const handleGenerate = async () => {
    if (userTier === "free" && !trialActive) {
      if (!subscriptionLoading) openPaywall();
      return;
    }
    if (!id) return;
    setIsGenerating(true);
    setGenerateStatus("generating");
    try {
      setGenerateLineOverride(null);
      const safeText = (v: unknown, fallback: string) => {
        const s = typeof v === "string" ? v.trim() : "";
        return s.length ? s : fallback;
      };

      const payload = {
        // Edge function requires these to be non-empty strings
        name: safeText(brandData.name, "Founder"),
        brandName: safeText(brandData.name, "Brand"),
        businessDescription: safeText(
          brandData.business_description,
          "Not provided"
        ),
        productOrService: safeText(
          brandData.product_or_service,
          "Not provided"
        ),
        assumedAudience: brandData.assumed_audience ?? [],
        marketingChannels: brandData.marketing_channels ?? [],
        country: safeText(brandData.country, "United Kingdom"),
        regionOrCity: safeText(brandData.region_or_city, ""),
        currency: safeText(brandData.currency, "GBP"),
      };

      const result = await generateICPs(payload as any);
      const generated = (result as any)?.icps ?? [];
      const created: any[] = [];
      for (const icp of generated) {
        const createdRow = await createICP({
          ...icp,
          brand_id: id,
        } as any);
        if (createdRow) created.push(createdRow);
      }

      setGenerateStatus("success");
      try {
        window.dispatchEvent(new Event("icps:changed"));
      } catch {}
      try {
        await fetchICPs(true);
      } catch {}

      // Give the user a clear final cue before navigation
      setGenerateLineOverride("Taking you to your new ICPs…");
      await new Promise((r) => setTimeout(r, 350));

      if (created[0]?.id) {
        navigate(`/icp/${created[0].id}`);
      } else {
        navigate("/icps");
      }
    } catch (err) {
      console.error("BrandEditor: generate ICPS error", err);
      setGenerateStatus("error");
      alert("Generation failed. Please check your Brand fields and try again.");
    } finally {
      setIsGenerating(false);
      setTimeout(() => setGenerateStatus("idle"), 3000);
    }
  };

  if (isLoading) {
    return (
      <DashboardShell contentClassName="flex-1 px-6 py-8 lg:px-12">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 border-4 border-button-green border-t-transparent rounded-full animate-spin" />
            <p className="text-foreground/70">Loading brand...</p>
          </div>
        </div>
      </DashboardShell>
    );
  }

  if (import.meta.env.DEV) {
    console.log("[BrandEditor] tier", { userTier, subscriptionLoading });
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
              <button className="modal-cancel" onClick={handleLeaveWithoutSaving}>
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

      <div className="max-w-4xl mx-auto w-full">
        <header className="border-b border-warm-grey bg-background sticky top-0 z-40">
          <div className="container mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Link to="/my-brands" className="flex items-center gap-2 hover:opacity-70 transition-opacity">
                  <ArrowLeft className="w-5 h-5" />
                  <span className="font-['Inter']">Back to My Brands</span>
                </Link>
                {isDirty && saveStatus !== "saving" && (
                  <span className="text-sm text-amber-700 bg-amber-100 border border-amber-300 rounded-full px-3 py-1 font-['Inter']">
                    Unsaved changes
                  </span>
                )}
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
                <Button
                  onClick={handleGenerate}
                  disabled={isGenerating}
                  className="bg-background hover:bg-accent-grey/20 text-foreground border border-black rounded-design px-6 py-2 flex items-center gap-2"
                >
                  {isGenerating ? (
                    <>
                      <span
                        className="w-4 h-4 rounded-full border-2 border-black border-t-transparent animate-spin"
                        aria-hidden="true"
                      />
                      <span>Generating…</span>
                    </>
                  ) : (
                    "Generate new ICPs"
                  )}
                </Button>

                {/* Live status line while generating */}
                {isGenerating && (
                  <div className="mt-3 flex items-center gap-2">
                    <span className="text-xs font-['Inter'] text-foreground/70">
                      {generateLineOverride ?? GENERATE_LINES[generateLineIndex]}
                    </span>
                  </div>
                )}

                {generateStatus === "success" && !isGenerating && (
                  <span className="text-sm text-green-700 bg-green-100 border border-green-300 rounded-full px-3 py-1 font-['Inter']">
                    Generated
                  </span>
                )}
                {generateStatus === "error" && (
                  <span className="text-sm text-red-700 bg-red-100 border border-red-300 rounded-full px-3 py-1 font-['Inter']">
                    Generation failed
                  </span>
                )}
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className="p-2 bg-background rounded-full border border-black hover:scale-105 transition-transform h-10 w-10 flex items-center justify-center"
                    aria-label="Brand actions"
                  >
                    <MoreVertical className="h-4 w-4" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="min-w-[180px] border border-black rounded-design bg-neutral-light text-foreground shadow-lg">
                  <DropdownMenuItem
                    className="text-sm"
                    onSelect={(e) => {
                      e.preventDefault();
                      (e as any).stopPropagation?.();
                      handleDuplicateBrand();
                    }}
                  >
                    <Copy className="h-4 w-4 mr-2" />
                    Duplicate Brand
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="text-sm"
                    onSelect={(e) => {
                      e.preventDefault();
                      (e as any).stopPropagation?.();
                      handleExportBrand();
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
                      setBrandColorModal({
                        open: true,
                        id: id ?? null,
                        currentColor: (brandData as any)?.color ?? null,
                      });
                    }}
                  >
                    <Palette className="h-4 w-4 mr-2" />
                    Change Colour
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="text-sm text-red-600 focus:text-red-600"
                    onSelect={(e) => {
                      e.preventDefault();
                      (e as any).stopPropagation?.();
                      setDeleteError(null);
                      setDeleteOpen(true);
                    }}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Brand
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </header>

        <div className="border-b border-border bg-background sticky top-[65px] z-30">
          <div className="container mx-auto px-6">
            <div className="flex gap-0">
              {(
                [
                  { id: "details" as const, label: "Brand Details" },
                  { id: "overview" as const, label: "Brand Overview" },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-6 py-3 font-['DM_Sans'] text-sm font-medium border-b-2 transition-colors ${
                    activeTab === tab.id
                      ? "border-primary text-primary"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <main className="container mx-auto px-6 py-12 max-w-4xl space-y-8">
          {activeTab === "details" && (
            <>
          <div className="bg-background border border-black rounded-design p-8 shadow-md animate-fade-in-up space-y-6">
            <div className="space-y-4">
              <label className="font-['Inter'] text-sm text-foreground/70">Brand name</label>
              <Input
                value={brandData.name || ""}
                onChange={(e) => setBrandData((prev) => ({ ...prev, name: e.target.value }))}
                className="font-['Fraunces'] text-2xl border-black rounded-design"
                placeholder="Apostle Coffee"
              />
            </div>

            <div className="space-y-3">
              <label className="font-['Inter'] text-sm text-foreground/70">Business description</label>
              <Textarea
                value={brandData.business_description || ""}
                onChange={(e) => setBrandData((prev) => ({ ...prev, business_description: e.target.value }))}
                className="border-black rounded-design resize-none"
                rows={3}
                placeholder="Describe what the business does"
              />
            </div>

            <div className="space-y-3">
              <label className="font-['Inter'] text-sm text-foreground/70">Product or service</label>
              <Input
                value={brandData.product_or_service || ""}
                onChange={(e) => setBrandData((prev) => ({ ...prev, product_or_service: e.target.value }))}
                className="border-black rounded-design"
                placeholder="e.g., Marketing consultancy, Organic coffee subscription"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <label className="font-['Inter'] text-sm text-foreground/70">Business type</label>
                <select
                  value={brandData.business_type || "B2C"}
                  onChange={(e) => setBrandData((prev) => ({ ...prev, business_type: e.target.value }))}
                  className="border border-black rounded-design px-4 py-3 bg-white font-['Inter'] text-foreground"
                >
                  {["B2C", "B2B", "Both"].map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-3">
                <label className="font-['Inter'] text-sm text-foreground/70">Currency</label>
                <Input
                  value={brandData.currency || ""}
                  onChange={(e) => setBrandData((prev) => ({ ...prev, currency: e.target.value }))}
                  className="border-black rounded-design"
                  placeholder="e.g., GBP, USD"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <label className="font-['Inter'] text-sm text-foreground/70">Country</label>
                <Input
                  value={brandData.country || ""}
                  onChange={(e) => setBrandData((prev) => ({ ...prev, country: e.target.value }))}
                  className="border-black rounded-design"
                  placeholder="United States"
                />
              </div>
              <div className="space-y-3">
                <label className="font-['Inter'] text-sm text-foreground/70">Region / City (optional)</label>
                <Input
                  value={brandData.region_or_city || ""}
                  onChange={(e) => setBrandData((prev) => ({ ...prev, region_or_city: e.target.value }))}
                  className="border-black rounded-design"
                  placeholder="California, London, Berlin"
                />
              </div>
            </div>

            <TagInput
              label="Assumed audience (comma-separated)"
              value={brandData.assumed_audience ?? []}
              onChange={(next) =>
                setBrandData((prev) => ({ ...prev, assumed_audience: next }))
              }
              placeholder="e.g. Busy professionals, Parents, Students"
            />

            <TagInput
              label="Marketing channels (comma-separated)"
              value={brandData.marketing_channels ?? []}
              onChange={(next) =>
                setBrandData((prev) => ({ ...prev, marketing_channels: next }))
              }
              placeholder="e.g. Instagram, Email, Google Ads"
            />
            <div className="space-y-3">
              <label className="font-['Inter'] text-sm text-foreground/70">Website (optional)</label>
              <Input
                value={brandData.website || ""}
                onChange={(e) => setBrandData((prev) => ({ ...prev, website: e.target.value }))}
                className="border-black rounded-design"
                placeholder="https://example.com"
              />
            </div>
          </div>

          {/* Associated ICPs */}
          <div className="bg-background border border-black rounded-design p-8 shadow-md animate-fade-in-up space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="font-['Fraunces'] text-2xl">ICPs for this brand</h2>
                <p className="font-['Inter'] text-sm text-foreground/70">
                  These profiles are linked to this brand. If you delete the brand, they’ll stay and become “No brand allocated”.
                </p>
              </div>
              <Button
                onClick={() => navigate("/icps")}
                className="bg-background hover:bg-accent-grey/20 text-foreground border border-black rounded-design px-4 py-2"
              >
                View all ICPs
              </Button>
            </div>

            {(() => {
              const brandICPs = (icps || [])
                .filter((x: any) => x?.brand_id === id)
                .map((x: any) => ({
                  ...x,
                  brandName: (brandData?.name as any) || "Untitled Brand",
                }));

              if (!brandICPs.length) {
                return (
                  <div className="text-sm text-foreground/70 font-['Inter']">
                    No ICPs linked to this brand yet. Click <span className="font-medium">Generate new ICPs</span> to create some.
                  </div>
                );
              }

              return (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {brandICPs.map((icp: any) => (
                    <ICPPreviewCard
                      key={icp.id}
                      icp={icp}
                      userTier={userTier}
                      onUpgrade={() => {
                        if (!subscriptionLoading) openPaywall();
                      }}
                      isLocked={false}
                      onDelete={() => fetchICPs(true)}
                      onChangeColor={handleOpenIcpColorModal}
                      onChangeAvatar={handleOpenIcpAvatarModal}
                      brands={brands?.map((b) => ({ id: b.id, name: b.name })) || []}
                      onMoveToBrand={async (icpId, brandId) => {
                        await updateICP(icpId, { brand_id: brandId } as any);
                        try {
                          window.dispatchEvent(new Event("icps:changed"));
                        } catch {}
                        await fetchICPs(true);
                      }}
                      onAddToCollection={() => setAddToCollectionIcpId(icp.id)}
                    />
                  ))}
                </div>
              );
            })()}
          </div>
            </>
          )}

          {activeTab === "overview" && (
            <div className="space-y-6">
              <div className="bg-white rounded-xl border border-border p-8 space-y-4">
                <div>
                  <h2 className="font-['Fraunces'] text-2xl font-bold text-[#0D1833]">Founding story</h2>
                  <p className="font-['DM_Sans'] text-sm text-muted-foreground mt-1">
                    The story behind why this business exists. This is the most differentiating content most founders never use.
                  </p>
                </div>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="font-['DM_Sans'] text-sm text-[#0D1833]">Founding story</label>
                    <div className="flex items-start gap-2">
                      <Textarea
                        value={brandData.founding_story ?? ""}
                        onChange={(e) =>
                          setBrandData((prev) => ({ ...prev, founding_story: e.target.value }))
                        }
                        placeholder="Why did you start this business? What was the moment that made it inevitable?"
                        className="min-h-[120px] resize-none border border-black rounded-design"
                      />
                      <WhisperButton
                        onTranscript={(t) => {
                          const trimmed = t.trim();
                          if (!trimmed) return;
                          setBrandData((prev) => ({
                            ...prev,
                            founding_story: prev.founding_story?.trim()
                              ? `${prev.founding_story.trim()} ${trimmed}`
                              : trimmed,
                          }));
                        }}
                        className="pt-1"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="font-['DM_Sans'] text-sm text-[#0D1833]">What do you want to be known for?</label>
                    <div className="flex items-start gap-2">
                      <Textarea
                        value={brandData.want_known_for ?? ""}
                        onChange={(e) =>
                          setBrandData((prev) => ({ ...prev, want_known_for: e.target.value }))
                        }
                        placeholder="The thing you'd most want a customer to say about you"
                        className="min-h-[80px] resize-none border border-black rounded-design"
                      />
                      <WhisperButton
                        onTranscript={(t) => {
                          const trimmed = t.trim();
                          if (!trimmed) return;
                          setBrandData((prev) => ({
                            ...prev,
                            want_known_for: prev.want_known_for?.trim()
                              ? `${prev.want_known_for.trim()} ${trimmed}`
                              : trimmed,
                          }));
                        }}
                        className="pt-1"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="font-['DM_Sans'] text-sm text-[#0D1833]">
                      What do you never want to be associated with?
                    </label>
                    <div className="flex items-start gap-2">
                      <Textarea
                        value={brandData.never_associated_with ?? ""}
                        onChange={(e) =>
                          setBrandData((prev) => ({ ...prev, never_associated_with: e.target.value }))
                        }
                        placeholder="Values, approaches or associations to avoid entirely"
                        className="min-h-[80px] resize-none border border-black rounded-design"
                      />
                      <WhisperButton
                        onTranscript={(t) => {
                          const trimmed = t.trim();
                          if (!trimmed) return;
                          setBrandData((prev) => ({
                            ...prev,
                            never_associated_with: prev.never_associated_with?.trim()
                              ? `${prev.never_associated_with.trim()} ${trimmed}`
                              : trimmed,
                          }));
                        }}
                        className="pt-1"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl border border-border p-8 space-y-4">
                <div>
                  <h2 className="font-['Fraunces'] text-2xl font-bold text-[#0D1833]">Brand voice and tone</h2>
                  <p className="font-['DM_Sans'] text-sm text-muted-foreground mt-1">
                    How the brand sounds. Captured once, applied to everything marktr creates.
                  </p>
                </div>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="font-['DM_Sans'] text-sm text-[#0D1833]">Voice adjectives</label>
                    <TagInput
                      label=""
                      value={brandData.voice_adjectives ?? []}
                      onChange={(next) =>
                        setBrandData((prev) => ({ ...prev, voice_adjectives: next }))
                      }
                      placeholder="e.g. Warm, Direct, Expert, Honest"
                    />
                    <p className="font-['DM_Sans'] text-xs text-muted-foreground">
                      3–5 adjectives that describe the brand tone
                    </p>
                  </div>
                  <div className="space-y-2">
                    <label className="font-['DM_Sans'] text-sm text-[#0D1833]">Brands or creators you admire</label>
                    <div className="flex items-start gap-2">
                      <Textarea
                        value={brandData.admired_brands ?? ""}
                        onChange={(e) =>
                          setBrandData((prev) => ({ ...prev, admired_brands: e.target.value }))
                        }
                        placeholder="Brands or people whose communication style you admire and why"
                        className="min-h-[80px] resize-none border border-black rounded-design"
                      />
                      <WhisperButton
                        onTranscript={(t) => {
                          const trimmed = t.trim();
                          if (!trimmed) return;
                          setBrandData((prev) => ({
                            ...prev,
                            admired_brands: prev.admired_brands?.trim()
                              ? `${prev.admired_brands.trim()} ${trimmed}`
                              : trimmed,
                          }));
                        }}
                        className="pt-1"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl border border-border p-8 space-y-4">
                <div>
                  <h2 className="font-['Fraunces'] text-2xl font-bold text-[#0D1833]">Competitor landscape</h2>
                  <p className="font-['DM_Sans'] text-sm text-muted-foreground mt-1">
                    Up to 3 competitors. Understanding what they do well helps marktr position you differently.
                  </p>
                </div>
                {[0, 1, 2].map((i) => {
                  const empty = {
                    name: "",
                    url: "",
                    does_well: "",
                    we_do_instead: "",
                  } as NonNullable<Brand["competitors"]>[number];
                  const comp = (brandData.competitors ?? [])[i] ?? empty;
                  const updateComp = (
                    field: keyof NonNullable<Brand["competitors"]>[number],
                    value: string
                  ) => {
                    setBrandData((prev) => {
                      const list = [...(prev.competitors ?? [])];
                      while (list.length <= i) list.push({ ...empty });
                      list[i] = { ...empty, ...list[i], [field]: value };
                      return { ...prev, competitors: list };
                    });
                  };
                  return (
                    <div key={i} className="border border-border rounded-xl p-5 space-y-3 bg-background">
                      <p className="font-['DM_Sans'] text-xs font-medium uppercase tracking-widest text-muted-foreground">
                        Competitor {i + 1}
                      </p>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="font-['DM_Sans'] text-xs text-muted-foreground">Name</label>
                          <Input
                            value={comp.name}
                            onChange={(e) => updateComp("name", e.target.value)}
                            placeholder="Competitor name"
                            className="border-black rounded-design text-sm"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="font-['DM_Sans'] text-xs text-muted-foreground">Website</label>
                          <Input
                            value={comp.url}
                            onChange={(e) => updateComp("url", e.target.value)}
                            placeholder="https://..."
                            className="border-black rounded-design text-sm"
                          />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <label className="font-['DM_Sans'] text-xs text-muted-foreground">What they do well online</label>
                        <Input
                          value={comp.does_well}
                          onChange={(e) => updateComp("does_well", e.target.value)}
                          placeholder="Their content strength"
                          className="border-black rounded-design text-sm"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="font-['DM_Sans'] text-xs text-muted-foreground">What you do that they don&apos;t</label>
                        <Input
                          value={comp.we_do_instead}
                          onChange={(e) => updateComp("we_do_instead", e.target.value)}
                          placeholder="Your differentiator"
                          className="border-black rounded-design text-sm"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="bg-white rounded-xl border border-border p-8 space-y-4">
                <div>
                  <h2 className="font-['Fraunces'] text-2xl font-bold text-[#0D1833]">Current marketing</h2>
                  <p className="font-['DM_Sans'] text-sm text-muted-foreground mt-1">
                    Where you&apos;re currently active and what you&apos;re spending.
                  </p>
                </div>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="font-['DM_Sans'] text-sm text-[#0D1833]">Active platforms</label>
                    <div className="flex flex-wrap gap-2">
                      {["Instagram", "Facebook", "LinkedIn", "TikTok", "X", "YouTube", "Email", "Pinterest"].map(
                        (platform) => {
                          const active = (brandData.active_platforms ?? []).includes(platform);
                          return (
                            <button
                              key={platform}
                              type="button"
                              onClick={() => {
                                setBrandData((prev) => {
                                  const current = prev.active_platforms ?? [];
                                  const isOn = current.includes(platform);
                                  return {
                                    ...prev,
                                    active_platforms: isOn ? current.filter((p) => p !== platform) : [...current, platform],
                                  };
                                });
                              }}
                              className={`px-4 py-2 rounded-full font-['DM_Sans'] text-sm border transition-colors ${
                                active
                                  ? "bg-primary text-white border-primary"
                                  : "bg-white text-foreground border-border hover:border-primary/40"
                              }`}
                            >
                              {platform}
                            </button>
                          );
                        }
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="runs_paid_ads"
                      checked={brandData.runs_paid_ads ?? false}
                      onChange={(e) =>
                        setBrandData((prev) => ({ ...prev, runs_paid_ads: e.target.checked }))
                      }
                      className="w-4 h-4 accent-primary"
                    />
                    <label htmlFor="runs_paid_ads" className="font-['DM_Sans'] text-sm text-[#0D1833]">
                      Currently running paid ads
                    </label>
                  </div>
                  {brandData.runs_paid_ads && (
                    <div className="space-y-2">
                      <label className="font-['DM_Sans'] text-sm text-[#0D1833]">Monthly ad spend</label>
                      <Input
                        type="number"
                        value={brandData.monthly_ad_spend ?? ""}
                        onChange={(e) =>
                          setBrandData((prev) => ({
                            ...prev,
                            monthly_ad_spend: parseFloat(e.target.value) || undefined,
                          }))
                        }
                        placeholder="Monthly spend in your currency"
                        className="border-black rounded-design max-w-xs"
                      />
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-white rounded-xl border border-border p-8 space-y-4">
                <div>
                  <h2 className="font-['Fraunces'] text-2xl font-bold text-[#0D1833]">Email list</h2>
                  <p className="font-['DM_Sans'] text-sm text-muted-foreground mt-1">
                    Your email list is your most valuable owned asset.
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="font-['DM_Sans'] text-sm text-[#0D1833]">List size</label>
                    <Input
                      type="number"
                      value={brandData.email_list_size ?? ""}
                      onChange={(e) =>
                        setBrandData((prev) => ({
                          ...prev,
                          email_list_size: parseInt(e.target.value, 10) || undefined,
                        }))
                      }
                      placeholder="Number of subscribers"
                      className="border-black rounded-design"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="font-['DM_Sans'] text-sm text-[#0D1833]">Platform</label>
                    <Input
                      value={brandData.email_platform ?? ""}
                      onChange={(e) =>
                        setBrandData((prev) => ({ ...prev, email_platform: e.target.value }))
                      }
                      placeholder="Mailchimp, Klaviyo, etc."
                      className="border-black rounded-design"
                    />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl border border-border p-8 space-y-4">
                <div>
                  <h2 className="font-['Fraunces'] text-2xl font-bold text-[#0D1833]">Goals and focus</h2>
                  <p className="font-['DM_Sans'] text-sm text-muted-foreground mt-1">
                    What success looks like for the next 90 days.
                  </p>
                </div>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="font-['DM_Sans'] text-sm text-[#0D1833]">Primary goal</label>
                    <select
                      value={brandData.primary_goal ?? ""}
                      onChange={(e) =>
                        setBrandData((prev) => ({ ...prev, primary_goal: e.target.value }))
                      }
                      className="w-full border border-black rounded-design px-4 py-3 bg-white font-['DM_Sans'] text-foreground text-sm"
                    >
                      <option value="">Select a goal</option>
                      {["Lead generation", "Brand awareness", "Sales", "Audience growth", "Community building"].map((g) => (
                        <option key={g} value={g}>
                          {g}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="font-['DM_Sans'] text-sm text-[#0D1833]">Platform focus (next 90 days)</label>
                    <select
                      value={brandData.platform_focus ?? ""}
                      onChange={(e) =>
                        setBrandData((prev) => ({ ...prev, platform_focus: e.target.value }))
                      }
                      className="w-full border border-black rounded-design px-4 py-3 bg-white font-['DM_Sans'] text-foreground text-sm"
                    >
                      <option value="">Select a platform</option>
                      {["Instagram", "Facebook", "LinkedIn", "TikTok", "X", "YouTube", "Email", "Pinterest"].map((p) => (
                        <option key={p} value={p}>
                          {p}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="font-['DM_Sans'] text-sm text-[#0D1833]">Monthly content volume</label>
                    <select
                      value={brandData.monthly_content_volume ?? ""}
                      onChange={(e) =>
                        setBrandData((prev) => ({ ...prev, monthly_content_volume: e.target.value }))
                      }
                      className="w-full border border-black rounded-design px-4 py-3 bg-white font-['DM_Sans'] text-foreground text-sm"
                    >
                      <option value="">How much can you commit to?</option>
                      {["1–4 posts", "5–10 posts", "11–20 posts", "20+ posts"].map((v) => (
                        <option key={v} value={v}>
                          {v}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="font-['DM_Sans'] text-sm text-[#0D1833]">Success markers</label>
                    <div className="flex flex-wrap gap-2">
                      {["Reach", "Engagement", "Leads", "Sales", "Followers"].map((marker) => {
                        const active = (brandData.success_markers ?? []).includes(marker);
                        return (
                          <button
                            key={marker}
                            type="button"
                            onClick={() => {
                              setBrandData((prev) => {
                                const current = prev.success_markers ?? [];
                                const isOn = current.includes(marker);
                                return {
                                  ...prev,
                                  success_markers: isOn ? current.filter((m) => m !== marker) : [...current, marker],
                                };
                              });
                            }}
                            className={`px-4 py-2 rounded-full font-['DM_Sans'] text-sm border transition-colors ${
                              active
                                ? "bg-primary text-white border-primary"
                                : "bg-white text-foreground border-border hover:border-primary/40"
                            }`}
                          >
                            {marker}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>

      <ICPColorModal
        isOpen={icpColorModal.open}
        id={icpColorModal.id}
        currentColor={icpColorModal.currentColor}
        onClose={() => setIcpColorModal({ open: false, id: null, currentColor: null })}
        onSaved={async () => {
          setIcpColorModal({ open: false, id: null, currentColor: null });
          try {
            window.dispatchEvent(new Event("icps:changed"));
          } catch {}
          await fetchICPs(true);
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
        onSaved={async () => {
          try {
            window.dispatchEvent(new Event("icps:changed"));
          } catch {}
          await fetchICPs(true);
        }}
      />

      <CollectionPickerModal
        isOpen={!!addToCollectionIcpId}
        onClose={() => setAddToCollectionIcpId(null)}
        onSelectCollection={async (collectionId) => {
          if (!addToCollectionIcpId) return false;
          const ok = await addICPToCollection(collectionId, addToCollectionIcpId);
          if (ok) setAddToCollectionIcpId(null);
          return ok;
        }}
        onCreateCollection={async (data) => {
          const created = await createCollection(data);
          return created?.id ?? null;
        }}
      />

      <BrandColorModal
        open={brandColorModal.open}
        id={brandColorModal.id}
        currentColor={brandColorModal.currentColor}
        onClose={() => setBrandColorModal({ open: false, id: null, currentColor: null })}
        onSaved={(color) => {
          setBrandColorModal({ open: false, id: null, currentColor: null });
          if (color) {
            setBrandData((prev) => ({ ...prev, color }));
            if (originalDataRef.current) {
              originalDataRef.current = { ...(originalDataRef.current as any), color };
            }
          }
        }}
      />
      <BrandDeleteModal
        isOpen={deleteOpen}
        onClose={() => {
          if (isDeleting) return;
          setDeleteOpen(false);
          setDeleteError(null);
        }}
        onConfirm={handleConfirmDelete}
        brandName={brandData?.name || "this brand"}
        isDeleting={isDeleting}
        error={deleteError}
      />
      </div>
    </DashboardShell>
  );
}
