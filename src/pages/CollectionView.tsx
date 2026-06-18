import { useState, useEffect, useMemo } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { DashboardHeader } from "../components/layout/DashboardHeader";
import { DashboardSidebar } from "../components/layout/DashboardSidebar";
import { ICPPreviewCard } from "../components/cards/ICPPreviewCard";
import { CollectionPickerModal } from "../components/modals/CollectionPickerModal";
import ICPColorModal from "../components/ICPColorModal";
import ICPAvatarModal from "../components/ICPAvatarModal";
import { useCollections } from "../hooks/useCollections";
import { useICPs } from "../hooks/useICPs";
import { useBrands } from "../hooks/useBrands";
import useSubscription from "../hooks/useSubscription";
import { canViewICP } from "../config/accessRules";
import EditTags from "../components/collections/EditTags";
import { supabase } from "../config/supabase";
import { usePaywall } from "../contexts/PaywallContext";
import { resolveAvatarSrc } from "../utils/avatar";
import { 
  ArrowLeft, 
  Plus, 
  Edit2, 
  Trash2, 
  FolderPlus,
  Search
} from "lucide-react";

// UI-friendly ICP interface with camelCase
interface ICP {
  id: string;
  name: string;
  description: string;
  industry?: string;
  color?: string | null;
  companySize?: string;
  location?: string;
  painPoints?: string[];
  goals?: string[];
  budget?: string;
  decisionMakers?: string[];
  techStack?: string[];
  challenges?: string[];
  opportunities?: string[];
  createdAt: string;
  avatar?: string | null;
  avatar_key?: string | null;
  avatar_gender?: string | null;
  avatar_age_range?: string | null;
  gender?: string | null;
  age_range?: string | null;
  isLocked?: boolean;
  _index?: number;
}

export default function CollectionView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [isEditingName, setIsEditingName] = useState(false);
  const [tempName, setTempName] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [icpsInCollection, setICPsInCollection] = useState<ICP[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
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

  const { getCollection, getCollectionICPs, updateCollection, deleteCollection, removeICPFromCollection, addICPToCollection } = useCollections();
  const { icps: allICPs, updateICP, fetchICPs } = useICPs();
  const { brands } = useBrands();
  const { tier: userTier, effectiveTier, trialActive } = useSubscription();
  const { openPaywall } = usePaywall();

  const [collection, setCollection] = useState<{
    id: string;
    name: string;
    color: string;
    description?: string;
    tags?: string[] | null;
  } | null>(null);

  const transformICPs = (icps: any[]) =>
    icps.map((icp, index) => ({
      id: icp.id,
      name: icp.name,
      description: icp.description,
      industry: icp.industry,
      companySize: icp.company_size,
      location: icp.location,
      painPoints: icp.pain_points || [],
      goals: icp.goals || [],
      budget: icp.budget,
      decisionMakers: icp.decision_makers || [],
      techStack: icp.tech_stack || [],
      challenges: icp.challenges || [],
      opportunities: icp.opportunities || [],
      createdAt: icp.created_at,
      color: icp.color || "#EDEDED",
      brand_id: icp.brand_id ?? null,
      brandName:
        icp.brandName ??
        (icp.brand && icp.brand.name) ??
        (icp.brands && icp.brands.name) ??
        null,
      brand: icp.brand ?? null,
      brands: icp.brands ?? null,
      // New avatar system fields (if present in DB) + legacy fallback
      avatar_key: icp.avatar_key ?? null,
      gender: icp.gender ?? icp.avatar_gender ?? null,
      age_range: icp.age_range ?? icp.avatar_age_range ?? null,
      avatar_gender: icp.avatar_gender ?? null,
      avatar_age_range: icp.avatar_age_range ?? null,
      avatar: resolveAvatarSrc(
        {
          avatar_key: icp.avatar_key ?? null,
          avatar_gender: icp.avatar_gender ?? icp.gender ?? null,
          avatar_age_range: icp.avatar_age_range ?? icp.age_range ?? null,
        },
        icp.avatar ?? null
      ),
      isLocked: !canViewICP(effectiveTier as any, icp._index ?? index),
      _index: icp._index ?? index,
    }));

  // Fetch collection and ICPs
  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      if (!id) {
        navigate("/collections");
        return;
      }

      setIsLoading(true);

      const collectionData = await getCollection(id);
      if (!isMounted) return;

      if (!collectionData) {
        navigate("/collections");
        return;
      }

      setCollection({
        id: collectionData.id,
        name: collectionData.name,
        color: collectionData.color || "#BBA0E5",
        description: collectionData.description,
        tags: collectionData.tags || [],
      });
      setTempName(collectionData.name);

      const icps = await getCollectionICPs(id);
      if (!isMounted) return;

      setICPsInCollection(transformICPs(icps));
      setIsLoading(false);
    };

    load();

    return () => {
      isMounted = false;
    };
  }, [id, getCollection, getCollectionICPs, effectiveTier]);

  const handleSaveName = async () => {
    if (!collection || !tempName.trim()) return;
    
    const success = await updateCollection(collection.id, { name: tempName.trim() });
    if (success) {
      setCollection({ ...collection, name: tempName.trim() });
      setIsEditingName(false);
    }
  };

  const handleCancelEdit = () => {
    if (collection) {
      setTempName(collection.name);
    }
    setIsEditingName(false);
  };

  const handleDeleteCollection = async () => {
    if (!collection) return;
    
    if (window.confirm("Are you sure you want to delete this collection? All ICPs will remain but will be removed from this collection.")) {
      const success = await deleteCollection(collection.id);
      if (success) {
        navigate("/collections");
      }
    }
  };

  const handleRemoveICP = async (icpId: string) => {
    if (!collection) return;
    
    const success = await removeICPFromCollection(collection.id, icpId);
    if (success) {
      // Optimistic update
      setICPsInCollection(prev => prev.filter(icp => icp.id !== icpId));
    }
  };

  const handleAddICPs = () => {
    setIsPickerOpen(true);
  };

  const handleAssignICPs = async (selectedIcpIds: string[]) => {
    if (!collection?.id || selectedIcpIds.length === 0) return;
    setIsAdding(true);
    setAddError(null);
    try {
      for (const icpId of selectedIcpIds) {
        await addICPToCollection(collection.id, icpId);
      }
      const updated = await getCollectionICPs(collection.id);
      setICPsInCollection(transformICPs(updated));
    } catch (err) {
      console.error("Error adding ICPs to collection:", err);
      setAddError(err instanceof Error ? err.message : "Failed to add ICPs to collection.");
    } finally {
      setIsAdding(false);
      setIsPickerOpen(false);
    }
  };

  const handleUpgrade = () => {
    openPaywall();
  };

  const handleOpenIcpColorModal = (id: string, currentColor?: string | null) => {
    setIcpColorModal({
      open: true,
      id,
      currentColor: currentColor ?? null,
    });
  };

  const handleOpenIcpAvatarModal = (
    id: string,
    currentAvatarKey?: string | null,
    gender?: string | null,
    ageRange?: string | null
  ) => {
    setIcpAvatarModal({
      open: true,
      id,
      currentAvatarKey: currentAvatarKey ?? null,
      gender: gender ?? null,
      ageRange: ageRange ?? null,
    });
  };

  const handleMoveIcpToBrand = async (icpId: string, brandId: string | null) => {
    await updateICP(icpId, { brand_id: brandId } as any);
    try {
      window.dispatchEvent(new Event("icps:changed"));
    } catch {}
    try {
      await fetchICPs(true);
    } catch {}
  };

  const refreshCollectionICPs = async () => {
    if (!id) return;
    const updated = await getCollectionICPs(id);
    setICPsInCollection(transformICPs(updated));
  };

  const handleTagsChange = async (newTags: string[]) => {
    if (!collection) return;
    setCollection((prev) => (prev ? { ...prev, tags: newTags } : prev));
    try {
      await supabase.from("collections").update({ tags: newTags }).eq("id", collection.id);
    } catch (err) {
      console.error("Failed to update tags", err);
    }
  };

  const filteredICPs = useMemo(() => {
    return icpsInCollection.filter(icp =>
      icp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      icp.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      icp.industry?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [icpsInCollection, searchQuery]);

  const availableICPs = (allICPs || []).filter(
    (icp) => !icpsInCollection.some((existing) => existing.id === icp.id)
  );

  const showEmptyState = !isLoading && icpsInCollection.length === 0;

  if (isLoading || !collection) {
    return (
      <div className="min-h-screen bg-background flex">
        <DashboardSidebar
          userTier={userTier === "free" && !trialActive ? "free" : "paid"}
          onUpgrade={handleUpgrade}
        />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 border-4 border-button-green border-t-transparent rounded-full animate-spin" />
            <p className="text-foreground/70">Loading collection...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <DashboardSidebar
        userTier={userTier === "free" && !trialActive ? "free" : "paid"}
        onUpgrade={handleUpgrade}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <DashboardHeader />

        {/* Content Area */}
        <main className="flex-1 px-6 py-8 lg:px-12">
          <div className="max-w-7xl mx-auto">
            {/* Back Button */}
            <Link 
              to="/collections"
              className="inline-flex items-center gap-2 font-['Inter'] text-foreground/70 hover:text-foreground transition-colors mb-6"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Collections
            </Link>

            {/* Collection Header */}
            <div 
              className="bg-background border border-black rounded-design p-6 lg:p-8 mb-8 shadow-md"
              style={{ 
                borderTopWidth: '6px',
                borderTopColor: collection.color 
              }}
            >
              <div className="flex items-start justify-between gap-4 mb-4">
                <div className="flex-1">
                  {!isEditingName ? (
                    <div className="flex items-center gap-3 group">
                      <h1 className="font-['Fraunces'] text-3xl lg:text-4xl">
                        {collection.name}
                      </h1>
                      <button
                        onClick={() => {
                          setIsEditingName(true);
                          setTempName(collection.name);
                        }}
                        className="opacity-0 group-hover:opacity-100 transition-opacity p-2 hover:bg-accent-grey/20 rounded-design"
                        aria-label="Edit collection name"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3">
                      <Input
                        value={tempName}
                        onChange={(e) => setTempName(e.target.value)}
                        className="font-['Fraunces'] text-3xl lg:text-4xl border-black rounded-design h-auto py-2"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleSaveName();
                          if (e.key === "Escape") handleCancelEdit();
                        }}
                      />
                      <Button
                        onClick={handleSaveName}
                        size="sm"
                        className="bg-button-green hover:bg-button-green/90 text-foreground border border-black rounded-design"
                      >
                        Save
                      </Button>
                      <Button
                        onClick={handleCancelEdit}
                        size="sm"
                        variant="outline"
                        className="border-black rounded-design"
                      >
                        Cancel
                      </Button>
                    </div>
                  )}
                  <p className="font-['Inter'] text-foreground/70 mt-2">
                    {icpsInCollection.length} {icpsInCollection.length === 1 ? 'ICP' : 'ICPs'} in this collection
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    onClick={handleAddICPs}
                    className="bg-button-green hover:bg-button-green/90 text-foreground border border-black rounded-design px-4 py-2 lg:px-6 lg:py-5 transition-all hover:scale-[1.02] hover:shadow-md"
                  >
                    <Plus className="w-4 h-4 lg:mr-2" />
                    <span className="hidden lg:inline">Add ICPs</span>
                  </Button>
                  <Button
                    onClick={handleDeleteCollection}
                    variant="outline"
                    className="border-black rounded-design px-4 py-2 lg:px-6 lg:py-5 text-red-600 hover:bg-red-50 transition-all"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Edit Tags */}
            <div className="bg-background border border-black rounded-design p-6 mb-8">
              <h3 className="font-['Fraunces'] text-xl mb-3">Edit Tags</h3>
              <p className="font-['Inter'] text-sm text-foreground/70 mb-3">
                Add up to 3 tags to organise this collection.
              </p>
              <EditTags
                tags={collection.tags || []}
                onChange={handleTagsChange}
              />
            </div>

            {/* Search Bar */}
            {!showEmptyState && (
              <div className="mb-6">
                <div className="relative max-w-md">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground/40" />
                  <Input
                    type="text"
                    placeholder="Search ICPs in this collection..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 border-black rounded-design font-['Inter']"
                  />
                </div>
              </div>
            )}

            {/* Empty State */}
            {showEmptyState && (
              <div className="text-center py-16 animate-fade-in-up">
                <div className="bg-accent-grey/20 border border-black rounded-design p-12 max-w-2xl mx-auto">
                  <div className="mb-6">
                    <div className="w-24 h-24 bg-button-green/20 rounded-full border border-black flex items-center justify-center mx-auto mb-4">
                      <FolderPlus className="w-12 h-12 text-foreground/60" />
                    </div>
                  </div>
                  <h2 className="font-['Fraunces'] text-2xl mb-3">
                    This Collection is Empty
                  </h2>
                  <p className="font-['Inter'] text-foreground/70 mb-6 max-w-md mx-auto">
                    Add ICPs to start organising your audience.
                  </p>
                  <Button
                    onClick={handleAddICPs}
                    className="bg-button-green hover:bg-button-green/90 text-foreground border border-black rounded-design px-8 py-6 transition-all hover:scale-[1.02] hover:shadow-lg"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add ICPs
                  </Button>
                </div>
              </div>
            )}

            {/* ICPs Grid */}
            {!showEmptyState && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredICPs.map((icp) => (
                    <ICPPreviewCard
                      key={icp.id}
                      icp={icp}
                      userTier={effectiveTier}
                      onUpgrade={handleUpgrade}
                      isInCollection={true}
                      onRemoveFromCollection={() => handleRemoveICP(icp.id)}
                      onChangeColor={handleOpenIcpColorModal}
                      onChangeAvatar={handleOpenIcpAvatarModal}
                      brands={brands?.map((b) => ({ id: b.id, name: b.name })) || []}
                      onMoveToBrand={handleMoveIcpToBrand}
                      isLocked={!canViewICP(effectiveTier as any, icp._index ?? 0)}
                    />
                  ))}
                </div>

                {/* Free User Limit Message */}
                {userTier === "free" && !trialActive && icpsInCollection.length > 1 && (
                  <div className="mt-12 text-center animate-fade-in-up">
                    <div className="bg-accent-grey/30 border border-black rounded-design p-8 max-w-2xl mx-auto">
                      <h3 className="font-['Fraunces'] text-xl mb-3">
                        Unlock all ICPs in this collection
                      </h3>
                      <p className="font-['Inter'] text-foreground/70 mb-6">
                        Upgrade to view and manage unlimited ICPs in your collections.
                      </p>
                      <Button
                        onClick={handleUpgrade}
                        className="bg-button-green hover:bg-button-green/90 text-foreground border border-black rounded-design px-8 py-6 transition-all hover:scale-[1.02] hover:shadow-lg"
                      >
                        Upgrade Now
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}

            {/* No Results */}
            {!showEmptyState && filteredICPs.length === 0 && (
              <div className="text-center py-16">
                <p className="font-['Inter'] text-foreground/60">
                  No ICPs found matching "{searchQuery}"
                </p>
              </div>
            )}
          </div>
        </main>
      </div>

      <CollectionPickerModal
        isOpen={isPickerOpen}
        onClose={() => setIsPickerOpen(false)}
        icps={availableICPs.map((icp) => ({ id: icp.id, name: icp.name }))}
        multiple={true}
        onConfirm={handleAssignICPs}
      />

      <ICPColorModal
        isOpen={icpColorModal.open}
        id={icpColorModal.id}
        currentColor={icpColorModal.currentColor}
        onClose={() => setIcpColorModal({ open: false, id: null, currentColor: null })}
        onSaved={async () => {
          setIcpColorModal({ open: false, id: null, currentColor: null });
          await refreshCollectionICPs();
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
          await refreshCollectionICPs();
        }}
      />

      {isAdding && (
        <div className="fixed bottom-4 right-4 bg-background border border-black rounded-design px-4 py-2 shadow-lg">
          Adding ICPs...
        </div>
      )}
      {addError && (
        <div className="fixed bottom-4 right-4 bg-red-50 border border-red-300 text-red-800 rounded-design px-4 py-2 shadow-lg">
          {addError}
        </div>
      )}
    </div>
  );
}
