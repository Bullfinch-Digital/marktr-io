import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { usePaywall } from "../contexts/PaywallContext";
import useSubscription from "../hooks/useSubscription";
import { useBrands } from "../hooks/useBrands";
import DashboardShell from "../layouts/DashboardShell";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Plus, Building2, AlertCircle, Search } from "lucide-react";
import { BrandCard } from "../components/cards/BrandCard";
import BrandColorModal from "../components/BrandColorModal";
import { exportBrandAsPDF } from "../utils/exportBrand";
import { canCreateBrand } from "../config/accessRules";
import { canExportBrand } from "../config/accessRules";

export default function MyBrands() {
  const navigate = useNavigate();
  const { openPaywall } = usePaywall();
  const { tier: userTier, effectiveTier, trialActive, isLoading: subscriptionLoading } = useSubscription();
  const { brands, isLoading, error, createBrand, deleteBrand, refetch } = useBrands();

  const [isCreating, setIsCreating] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [brandColorModal, setBrandColorModal] = useState({
    open: false,
    id: null as string | null,
    currentColor: null as string | null,
  });
  const canCreateBrandFlag = canCreateBrand(brands?.length ?? 0, effectiveTier as any);

  // Sort newest first (fallbacks included)
  const sortedBrands = useMemo(() => {
    const list = [...(brands || [])];
    return list.sort((a: any, b: any) => {
      const ad = new Date(a.updated_at || a.created_at || 0).getTime();
      const bd = new Date(b.updated_at || b.created_at || 0).getTime();
      return bd - ad;
    });
  }, [brands]);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  useEffect(() => {
    if (import.meta.env.DEV) {
      console.log("[MyBrands] loaded", { count: brands?.length ?? 0, first: brands?.[0] });
    }
  }, [brands]);

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
    const baseKey = base.toLowerCase();
    if (!existing.has(baseKey)) return base;

    let i = 1;
    while (true) {
      const candidate = `${base} (${suffixWord}${i === 1 ? "" : ` ${i}`})`;
      if (!existing.has(candidate.toLowerCase())) return candidate;
      i += 1;
    }
  };

  const filteredBrands = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return sortedBrands;
    return sortedBrands.filter((b: any) => {
      const name = (b?.name ?? "").toLowerCase();
      const country = (b?.country ?? "").toLowerCase();
      const type = (b?.business_type ?? "").toLowerCase();
      return name.includes(q) || country.includes(q) || type.includes(q);
    });
  }, [sortedBrands, searchQuery]);

  const handleCreate = async () => {
    if (!canCreateBrandFlag) {
      openPaywall();
      return;
    }
    setIsCreating(true);
    try {
      const uniqueName = getUniqueName(
        "Untitled Brand",
        "New",
        (brands || []).map((b: any) => b?.name || "")
      );
      const created = await createBrand({ name: uniqueName });
      await refetch();
      if (created && (created as any).id) {
        navigate(`/my-brands/${created.id}`);
      }
    } catch (e) {
      console.error("MyBrands: createBrand failed", e);
    } finally {
      setIsCreating(false);
    }
  };

  const showLoading = isLoading || subscriptionLoading;

  return (
    <DashboardShell contentClassName="flex-1 px-6 py-8 lg:px-12">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="app-heading-page font-['Fraunces'] text-3xl lg:text-4xl mb-2">My Brands</h1>
            <p className="font-['Plus_Jakarta_Sans'] text-foreground/70">
              Manage the business details you use to generate new ICPs.
            </p>
          </div>
          <Button
            onClick={handleCreate}
            disabled={isCreating}
            className="bg-button-green hover:bg-button-green/90 text-foreground border border-black rounded-design px-4 py-2"
          >
            {isCreating ? (
              <>
                <div className="w-4 h-4 border-2 border-foreground border-t-transparent rounded-full animate-spin mr-2" />
                Creating…
              </>
            ) : (
              <>
                <Plus className="w-4 h-4 mr-2" />
                New Brand
              </>
            )}
          </Button>
        </div>

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-design p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm text-red-800 font-['Plus_Jakarta_Sans']">
                Couldn’t load your brands. {String(error)}
              </p>
            </div>
          </div>
        )}

        {showLoading ? (
          <div className="flex items-center justify-center min-h-[300px]">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 border-4 border-button-green border-t-transparent rounded-full animate-spin" />
              <p className="text-foreground/70">Loading…</p>
            </div>
          </div>
        ) : sortedBrands.length === 0 ? (
          <div className="flex items-center justify-center min-h-[380px] animate-fade-in-up">
            <div className="text-center max-w-lg px-6">
              <div className="w-24 h-24 mx-auto mb-6 bg-accent-grey/30 rounded-full border-2 border-black flex items-center justify-center shadow-sm">
                <Building2 className="w-10 h-10 text-foreground" />
              </div>
              <h2 className="app-heading font-['Fraunces'] text-2xl mb-3">Add your first brand</h2>
              <p className="font-['Plus_Jakarta_Sans'] text-foreground/70 mb-6">
                Create a brand once, then generate new ICPs without repeating the onboarding flow.
              </p>
              <Button
                onClick={handleCreate}
                disabled={isCreating}
                className="bg-button-green hover:bg-button-green/90 text-foreground border border-black rounded-design px-8 py-6"
              >
                <Plus className="w-5 h-5 mr-2" />
                Create Brand
              </Button>
            </div>
          </div>
        ) : (
          <>
            <div className="mb-6">
              <div className="relative max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground/40" />
                <Input
                  type="text"
                  placeholder="Search brands..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 border-black rounded-design font-['Plus_Jakarta_Sans']"
                />
              </div>
            </div>

            {filteredBrands.length === 0 ? (
              <p className="text-sm text-foreground/60">No brands found.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredBrands.map((brand: any) => (
                  <BrandCard
                    key={brand.id}
                    brand={brand}
                    onView={() => navigate(`/my-brands/${brand.id}`)}
                    onChangeColor={() =>
                      setBrandColorModal({
                        open: true,
                        id: brand.id,
                        currentColor: brand.color ?? null,
                      })
                    }
                    onDuplicate={async () => {
                      if (!canCreateBrandFlag) {
                        openPaywall();
                        return;
                      }
                      try {
                        const uniqueName = getUniqueName(
                          brand?.name || "Brand",
                          "Copy",
                          (brands || []).map((b: any) => b?.name || "")
                        );
                        const copyPayload = {
                          ...brand,
                          name: uniqueName,
                        };
                        delete (copyPayload as any).id;
                        delete (copyPayload as any).user_id;
                        delete (copyPayload as any).created_at;
                        delete (copyPayload as any).updated_at;
                        const created = await createBrand(copyPayload);
                        if (created?.id) {
                          await refetch();
                          navigate(`/my-brands/${created.id}`);
                        }
                      } catch (err) {
                        console.error("Duplicate brand failed", err);
                      }
                    }}
                    onExportPDF={() => {
                      if (!canExportBrand(effectiveTier as any)) {
                        openPaywall();
                        return;
                      }
                      exportBrandAsPDF(brand);
                    }}
                    onDelete={async () => {
                      const ok = window.confirm(
                        "Delete this brand? ICPs will remain but will be unassigned."
                      );
                      if (!ok) return;
                      try {
                        await deleteBrand(brand.id);
                        await refetch();
                      } catch (err) {
                        console.error("Delete brand failed", err);
                      }
                    }}
                  />
                ))}
              </div>
            )}

            {/* Free User Limit Message (reuse collections copy) */}
            {userTier === "free" && !trialActive && (brands?.length ?? 0) >= 1 && (
              <div className="mt-12 text-center animate-fade-in-up">
                <div className="bg-accent-grey/30 border border-black rounded-design p-8 max-w-2xl mx-auto">
                  <h3 className="font-['Fraunces'] text-xl mb-3">
                    You've reached your free collection limit
                  </h3>
                  <p className="font-['Plus_Jakarta_Sans'] text-foreground/70 mb-6">
                    Unlock unlimited collections, advanced organisation, and team collaboration.
                  </p>
                  <Button
                    onClick={() => openPaywall()}
                    className="bg-button-green hover:bg-button-green/90 text-foreground border border-black rounded-design px-8 py-6 transition-all hover:scale-[1.02] hover:shadow-lg"
                  >
                    Upgrade to unlock unlimited collections
                  </Button>
                </div>
              </div>
            )}
          </>
        )}

      <BrandColorModal
        open={brandColorModal.open}
        id={brandColorModal.id}
        currentColor={brandColorModal.currentColor}
        onClose={() =>
          setBrandColorModal({ open: false, id: null, currentColor: null })
        }
        onSaved={async () => {
          setBrandColorModal({ open: false, id: null, currentColor: null });
          await refetch();
        }}
      />
      </div>
    </DashboardShell>
  );
}
