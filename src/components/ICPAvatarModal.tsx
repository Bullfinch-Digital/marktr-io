import { useEffect, useMemo, useState } from "react";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { insertIcpVersionRpc } from "../lib/icpVersioning";
import {
  avatarUrlFromKey,
  getAvatarFolderInfo,
  pickNAlternatives,
  type AvatarAgeRange,
  type AvatarGender,
} from "../utils/avatarLibrary";

type Props = {
  isOpen: boolean;
  icpId: string | null;
  currentAvatarKey?: string | null;
  gender?: string | null;
  ageRange?: string | null;
  onClose: () => void;
  onSaved?: (avatarKey: string | null, newIcpId?: string) => void | Promise<void>;
};

export default function ICPAvatarModal({
  isOpen,
  icpId,
  currentAvatarKey,
  gender,
  ageRange,
  onClose,
  onSaved,
}: Props) {
  const [selected, setSelected] = useState<string | null>(currentAvatarKey ?? null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset selection when opening for a different ICP
  useEffect(() => {
    if (!isOpen) return;
    setSelected(currentAvatarKey ?? null);
    setError(null);
  }, [isOpen, currentAvatarKey, icpId]);

  const folder = useMemo(() => getAvatarFolderInfo(gender, ageRange), [gender, ageRange]);
  const options = useMemo(() => {
    const { gender, ageRange } = folder;
    return pickNAlternatives(gender as AvatarGender, ageRange as AvatarAgeRange, 5, currentAvatarKey ?? null);
  }, [folder, currentAvatarKey]);

  if (!isOpen || !icpId) return null;

  const save = async () => {
    setIsSaving(true);
    setError(null);
    try {
      const updated = await insertIcpVersionRpc(icpId, { avatar_key: selected });
      if (!updated) {
        setError("Failed to save avatar. Please try again.");
        return;
      }
      await onSaved?.(selected, updated.id);
      onClose();
    } catch (e) {
      console.error("ICPAvatarModal: Unexpected error", e);
      setError("Failed to save avatar. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <button
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
        aria-label="Close avatar picker"
      />

      <Card className="relative w-[92%] max-w-lg border border-black rounded-design bg-background p-6 shadow-xl">
        <div className="mb-4">
          <h3 className="font-['Fraunces'] text-2xl">Choose an avatar</h3>
          <p className="font-['Inter'] text-sm text-foreground/70 mt-1">
            Showing options from <span className="font-medium">{folder.gender}</span> /{" "}
            <span className="font-medium">{folder.ageRange}</span>
          </p>
        </div>

        <div className="grid grid-cols-5 gap-3 mb-5">
          {options.map((key) => {
            const active = key === selected;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setSelected(key)}
                className={`rounded-full border-2 overflow-hidden transition-transform active:scale-[0.98] ${
                  active ? "border-black" : "border-black/30"
                }`}
                aria-label="Select avatar"
              >
                <img
                  src={avatarUrlFromKey(key)}
                  alt="Avatar option"
                  className="w-16 h-16 object-cover"
                />
              </button>
            );
          })}
        </div>

        {error && (
          <div className="mb-4 text-sm font-['Inter'] text-red-700 bg-red-50 border border-red-200 rounded-design p-3">
            {error}
          </div>
        )}

        <div className="flex items-center justify-end gap-2">
          <Button
            variant="outline"
            className="border-black rounded-design"
            onClick={onClose}
            disabled={isSaving}
          >
            Cancel
          </Button>
          <Button
            className="bg-button-green hover:bg-button-green/90 text-foreground border border-black rounded-design"
            onClick={save}
            disabled={isSaving}
          >
            {isSaving ? "Saving..." : "Save"}
          </Button>
        </div>
      </Card>
    </div>
  );
}
