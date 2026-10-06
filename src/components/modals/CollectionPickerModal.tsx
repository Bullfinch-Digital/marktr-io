import { useState, useEffect } from "react";
import { Modal } from "../ui/modal";
import { Button } from "../ui/button";
import { useCollections } from "../../hooks/useCollections";
import { Folder, Plus } from "lucide-react";
import { BRAND_SWATCHES } from "../../lib/brandPalette";
import CreateCollectionModal from "./CreateCollectionModal";

interface CollectionPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectCollection?: (collectionId: string) => Promise<boolean>;
  onCreateCollection?: (data: { name: string; description?: string; color?: string }) => Promise<string | null>;
  icps?: { id: string; name: string }[];
  multiple?: boolean;
  onConfirm?: (selectedIds: string[]) => Promise<void> | void;
}

export function CollectionPickerModal({
  isOpen,
  onClose,
  onSelectCollection,
  onCreateCollection,
  icps,
  multiple = true,
  onConfirm,
}: CollectionPickerModalProps) {
  const isICPMode = !!icps && icps.length > 0 && !!onConfirm;
  const { collections, isLoading, fetchCollections } = useCollections();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedCollectionId, setSelectedCollectionId] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  useEffect(() => {
    if (isOpen && !isICPMode) {
      fetchCollections();
    }
  }, [isOpen, fetchCollections, isICPMode]);

  useEffect(() => {
    if (!isOpen) {
      setSelectedIds([]);
    }
  }, [isOpen]);

  const handleSelectCollection = async (collectionId: string) => {
    setSelectedCollectionId(collectionId);
    setIsAdding(true);
    
    const success = onSelectCollection ? await onSelectCollection(collectionId) : false;
    
    if (success) {
      onClose();
    }
    
    setIsAdding(false);
    setSelectedCollectionId(null);
  };

  const toggleSelect = (id: string) => {
    if (!multiple) {
      setSelectedIds([id]);
      return;
    }
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleConfirm = async () => {
    if (!selectedIds.length || !onConfirm) return;
    setIsAdding(true);
    await onConfirm(selectedIds);
    setIsAdding(false);
    onClose();
    setSelectedIds([]);
  };

  const handleCreateCollection = async (data: { name: string; description?: string }): Promise<string | null> => {
    if (!onCreateCollection) return null;
    
    const colors = [...BRAND_SWATCHES];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];
    
    setShowCreateModal(false);
    
    // Create collection via parent's handler
    const newCollectionId = await onCreateCollection({
      ...data,
      color: randomColor,
    } as { name: string; description?: string; color: string });
    
    if (newCollectionId) {
      // Refresh collections and select the new one
      await fetchCollections();
      await handleSelectCollection(newCollectionId);
    }
    return newCollectionId || null;
  };

  // ICP selection mode
  if (isICPMode) {
    return (
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title="Add ICPs to Collection"
        size="md"
      >
        <div className="space-y-4">
          <div className="max-h-64 overflow-y-auto space-y-2">
            {icps!.map((icp) => (
              <button
                key={icp.id}
                onClick={() => toggleSelect(icp.id)}
                className={`w-full min-h-11 p-3 border-2 rounded-[16px] text-left transition-all ${
                  selectedIds.includes(icp.id)
                    ? "bg-brand-lime/35 border-brand-navy"
                    : "border-brand-stroke hover:bg-muted/40"
                }`}
              >
                {icp.name}
              </button>
            ))}
          </div>
          <div className="flex justify-end gap-2">
            <Button
              onClick={handleConfirm}
              disabled={isAdding || selectedIds.length === 0}
              className="h-11"
            >
              {isAdding ? "Adding..." : "Add Selected"}
            </Button>
            <Button variant="outline" onClick={onClose} className="h-11">
              Cancel
            </Button>
          </div>
        </div>
      </Modal>
    );
  }

  // Collection selection mode (default)
  return (
    <>
      <Modal
        isOpen={isOpen && !showCreateModal}
        onClose={onClose}
        title="Add to Collection"
        size="md"
      >
        <div className="space-y-4">
          {isLoading ? (
            <div className="text-center py-8">
              <div className="w-8 h-8 mx-auto mb-4 border-4 border-button-green border-t-transparent rounded-full animate-spin" />
              <p className="text-foreground/70">Loading collections...</p>
            </div>
          ) : collections.length === 0 ? (
            <div className="text-center py-8">
              <Folder className="w-12 h-12 mx-auto mb-4 text-foreground/40" />
              <p className="text-foreground/70 mb-6">No collections yet. Create one to get started.</p>
              <Button
                onClick={() => setShowCreateModal(true)}
                className="h-11 px-6 font-['Fraunces'] font-bold"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create Collection
              </Button>
            </div>
          ) : (
            <>
              <div className="max-h-64 overflow-y-auto space-y-2">
                {collections.map((collection) => (
                  <button
                    key={collection.id}
                    onClick={() => onSelectCollection && handleSelectCollection(collection.id)}
                    disabled={isAdding}
                    className={`w-full min-h-11 p-4 border-2 rounded-[16px] transition-all text-left hover:bg-muted/40 ${
                      isAdding && selectedCollectionId === collection.id
                        ? "border-brand-navy bg-brand-lime/35"
                        : "border-brand-stroke"
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-4 h-4 rounded-full border border-black"
                        style={{ backgroundColor: collection.color }}
                      />
                      <div className="flex-1">
                        <h3 className="font-['Fraunces'] font-bold text-lg">
                          {collection.name}
                        </h3>
                        <p className="font-['Plus_Jakarta_Sans'] text-sm text-foreground/60">
                          {collection.icpCount || 0} ICPs
                        </p>
                      </div>
                      {isAdding && selectedCollectionId === collection.id && (
                        <div className="w-4 h-4 border-4 border-button-green border-t-transparent rounded-full animate-spin" />
                      )}
                    </div>
                  </button>
                ))}
              </div>

              <div className="pt-4 border-t border-accent-grey">
                <Button
                  onClick={() => setShowCreateModal(true)}
                  variant="outline"
                  className="w-full h-11 font-['Plus_Jakarta_Sans']"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create New Collection
                </Button>
              </div>
            </>
          )}
        </div>
      </Modal>

      {onCreateCollection && (
        <CreateCollectionModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onCreate={handleCreateCollection}
        />
      )}
    </>
  );
}
