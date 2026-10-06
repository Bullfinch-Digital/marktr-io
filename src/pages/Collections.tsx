import { useState, useMemo } from "react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { CollectionCard as DashboardCollectionCard } from "../components/cards/DashboardCollectionCard";
import CreateCollectionModal from "../components/modals/CreateCollectionModal";
import { useCollections } from "../hooks/useCollections";
import useSubscription from "../hooks/useSubscription";
import { canViewICP, canCreateCollection } from "../config/accessRules";
import { Search, Plus, FolderPlus } from "lucide-react";
import CollectionColorModal from "../components/CollectionColorModal";
import CollectionDeleteModal from "../components/CollectionDeleteModal";
import CollectionRenameModal from "../components/CollectionRenameModal";
import { supabase } from "../config/supabase";
import { usePaywall } from "../contexts/PaywallContext";
import { BRAND_SWATCHES } from "../lib/brandPalette";
import DashboardShell from "../layouts/DashboardShell";

export default function Collections() {
  const [searchQuery, setSearchQuery] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [renameModal, setRenameModal] = useState({ open: false, id: null as string | null, name: "" });
  const [colorModal, setColorModal] = useState({
    open: false,
    id: null as string | null,
    currentColor: null as string | null,
  });
  const [deleteModal, setDeleteModal] = useState({
    open: false,
    id: null as string | null,
    name: "",
  });

  const { collections: rawCollections, isLoading, createCollection, fetchCollections, refetch } = useCollections();
  const { tier: userTier, effectiveTier, trialActive } = useSubscription();
  const { openPaywall } = usePaywall();

  // Transform collections to match component expectations
  const collections = useMemo(() => {
    return rawCollections.map((col, idx) => ({
      ...col,
      icpCount: col.icpCount || 0,
      lastUpdated: col.updated_at || col.created_at,
      color: col.color || "#A9B7DC",
      tags: col.tags || [],
      _index: col._index ?? idx,
      isLocked: !canViewICP(effectiveTier as any, col._index ?? idx),
    }));
  }, [rawCollections, userTier, effectiveTier]);

  const handleCreateNew = () => {
    const limitReached = !canCreateCollection(collections.length, effectiveTier as any);
    if (limitReached) {
      openPaywall();
      return;
    }
    setShowCreateModal(true);
  };

  const handleCreateCollection = async (data: { name: string; description?: string }): Promise<string | null> => {
    const limitReached = !canCreateCollection(collections.length, effectiveTier as any);
    if (limitReached) {
      setShowCreateModal(false);
      openPaywall();
      return null;
    }
    const colors = [...BRAND_SWATCHES];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];
    
    const newCollection = await createCollection({
      name: data.name,
      description: data.description,
      color: randomColor,
    });

    if (newCollection) {
      setShowCreateModal(false);
      await fetchCollections();
      return newCollection.id || null;
    }
    return null;
  };

  const handleUpgrade = () => {
    openPaywall();
  };

  const handleRename = (collection: { id: string; name: string }) => {
    setRenameModal({ open: true, id: collection.id, name: collection.name });
  };

  const handleColor = (collection: { id: string; color?: string }) => {
    setColorModal({
      open: true,
      id: collection.id,
      currentColor: collection.color || null,
    });
  };

  const handleDelete = async (id: string) => {
    const target = collections.find((c) => c.id === id);
    setDeleteModal({ open: true, id, name: target?.name || "" });
  };

  const filteredCollections = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return collections.filter((collection) =>
      collection.name.toLowerCase().includes(q) ||
      (collection.tags || []).some((t) => t.toLowerCase().includes(q))
    );
  }, [collections, searchQuery]);

  const showEmptyState = !isLoading && collections.length === 0;

  return (
    <>
      <DashboardShell contentClassName="flex-1 px-6 py-8 lg:px-12">
        <div className="max-w-7xl mx-auto">
            {/* Loading State */}
            {isLoading && (
              <div className="flex items-center justify-center min-h-[400px]">
                <div className="text-center">
                  <div className="w-16 h-16 mx-auto mb-4 border-4 border-button-green border-t-transparent rounded-full animate-spin" />
                  <p className="text-foreground/70">Loading collections...</p>
                </div>
              </div>
            )}

            {/* Page Title & Search */}
            {!isLoading && (
              <>
                <div className="mb-8">
                  <div className="flex items-start justify-between mb-6 gap-4">
                    <div className="flex-1">
                      <h1 className="app-heading-page font-['Fraunces'] text-3xl lg:text-4xl mb-2">
                        Collections
                      </h1>
                      <p className="font-['Plus_Jakarta_Sans'] text-foreground/70 max-w-2xl">
                        Organise your ICPs into groups for campaigns, products, or teams.
                      </p>
                    </div>

                    <Button
                      onClick={handleCreateNew}
                      className="hidden sm:flex bg-button-green hover:bg-button-green/90 text-foreground border border-black rounded-design px-6 py-5 transition-all hover:scale-[1.02] hover:shadow-md items-center gap-2 whitespace-nowrap"
                    >
                      <Plus className="w-4 h-4" />
                      Create Collection
                    </Button>
                  </div>

                  {/* Search Bar */}
                  {collections.length > 0 && (
                    <div className="relative max-w-md">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground/40" />
                      <Input
                        type="text"
                        placeholder="Search collections..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10 border-black rounded-design font-['Plus_Jakarta_Sans']"
                      />
                    </div>
                  )}
                </div>

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
                        No Collections Yet
                      </h2>
                      <p className="font-['Plus_Jakarta_Sans'] text-foreground/70 mb-6 max-w-md mx-auto">
                        Organise your ICPs into groups for campaigns, products, or teams.
                      </p>
                      <Button
                        onClick={handleCreateNew}
                        className="bg-button-green hover:bg-button-green/90 text-foreground border border-black rounded-design px-8 py-6 transition-all hover:scale-[1.02] hover:shadow-lg"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Create Your First Collection
                      </Button>
                    </div>
                  </div>
                )}

                {/* Collections Grid */}
                {!showEmptyState && (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {filteredCollections.map((collection) => (
                        <DashboardCollectionCard
                          key={collection.id}
                          collection={collection}
                          onRename={(id, name) => handleRename({ id, name })}
                          onChangeColor={(id, color) => handleColor({ id, color })}
                          onDelete={(id) => handleDelete(id)}
                        />
                      ))}
                    </div>

                    {/* Free User Limit Message */}
                    {userTier === "free" && !trialActive && collections.length >= 1 && (
                      <div className="mt-12 text-center animate-fade-in-up">
                        <div className="bg-accent-grey/30 border border-black rounded-design p-8 max-w-2xl mx-auto">
                          <h3 className="font-['Fraunces'] text-xl mb-3">
                            You've reached your free collection limit
                          </h3>
                          <p className="font-['Plus_Jakarta_Sans'] text-foreground/70 mb-6">
                            Unlock unlimited collections, advanced organisation, and team collaboration.
                          </p>
                          <Button
                            onClick={handleUpgrade}
                            className="bg-button-green hover:bg-button-green/90 text-foreground border border-black rounded-design px-8 py-6 transition-all hover:scale-[1.02] hover:shadow-lg"
                          >
                            Upgrade to unlock unlimited collections
                          </Button>
                        </div>
                      </div>
                    )}
                  </>
                )}

                {/* No Results */}
                {!showEmptyState && filteredCollections.length === 0 && (
                  <div className="text-center py-16">
                    <p className="font-['Plus_Jakarta_Sans'] text-foreground/60">
                      No collections found matching "{searchQuery}"
                    </p>
                  </div>
                )}
              </>
            )}
        </div>
      </DashboardShell>

      <CreateCollectionModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreate={handleCreateCollection}
      />

      <CollectionRenameModal
        isOpen={renameModal.open}
        initialName={renameModal.name}
        onClose={() => setRenameModal({ open: false, id: null, name: "" })}
        onConfirm={async (name) => {
          if (!renameModal.id) return;
          const { error } = await supabase
            .from("collections")
            .update({ name })
            .eq("id", renameModal.id);

          if (error) {
            console.error("Rename failed", error);
          } else {
            console.log("Collection renamed");
            refetch();
          }
          setRenameModal({ open: false, id: null, name: "" });
        }}
      />

      {colorModal.open && (
        <CollectionColorModal
          open={colorModal.open}
          id={colorModal.id}
          currentColor={colorModal.currentColor}
          onClose={() => setColorModal({ open: false, id: null, currentColor: null })}
          onSaved={refetch}
        />
      )}

      <CollectionDeleteModal
        isOpen={deleteModal.open}
        collectionName={deleteModal.name}
        onClose={() => setDeleteModal({ open: false, id: null, name: "" })}
        onConfirm={async () => {
          if (!deleteModal.id) return;
          const { error } = await supabase.from("collections").delete().eq("id", deleteModal.id);
          if (error) {
            console.error("Failed to delete collection", error);
          } else {
            console.log("Collection deleted");
            refetch();
          }
          setDeleteModal({ open: false, id: null, name: "" });
        }}
      />
    </>
  );
}
