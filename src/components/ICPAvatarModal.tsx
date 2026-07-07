import { useEffect, useMemo, useState } from "react";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { supabase } from "../config/supabase";
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
  onSaved?: (payload: {
    avatarKey: string | null;
    gender: AvatarGender;
    ageRange: AvatarAgeRange;
  }) => void | Promise<void>;
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
  const initialFolder = useMemo(() => getAvatarFolderInfo(gender, ageRange), [gender, ageRange]);
  const [selected, setSelected] = useState<string | null>(currentAvatarKey ?? null);
  const [selectedGender, setSelectedGender] = useState<AvatarGender>(initialFolder.gender);
  const [selectedAgeRange, setSelectedAgeRange] = useState<AvatarAgeRange>(initialFolder.ageRange);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset selection when opening for a different ICP
  useEffect(() => {
    if (!isOpen) return;
    setSelected(currentAvatarKey ?? null);
    const nextFolder = getAvatarFolderInfo(gender, ageRange);
    setSelectedGender(nextFolder.gender);
    setSelectedAgeRange(nextFolder.ageRange);
    setError(null);
  }, [isOpen, currentAvatarKey, icpId, gender, ageRange]);

  const options = useMemo(() => {
    return pickNAlternatives(selectedGender, selectedAgeRange, 5, currentAvatarKey ?? null);
  }, [selectedGender, selectedAgeRange, currentAvatarKey]);

  useEffect(() => {
    if (!options.length) {
      setSelected(null);
      return;
    }
    if (!selected || !options.includes(selected)) {
      setSelected(options[0]);
    }
  }, [options, selected]);

  if (!isOpen || !icpId) return null;

  const save = async () => {
    setIsSaving(true);
    setError(null);
    try {
      const updateWithMeta = {
        avatar_key: selected,
        avatar_gender: selectedGender,
        avatar_age_range: selectedAgeRange,
      };

      let { error } = await supabase.from("icps").update(updateWithMeta).eq("id", icpId);
      if (error) {
        const missingMetaColumn =
          /avatar_(gender|age_range)|column/i.test(error.message || "") ||
          /avatar_(gender|age_range)/i.test(error.details || "");
        if (missingMetaColumn) {
          const fallback = await supabase.from("icps").update({ avatar_key: selected }).eq("id", icpId);
          error = fallback.error;
        }
      }

      if (error) {
        console.error("ICPAvatarModal: Failed to update avatar fields", error);
        setError("Failed to save avatar. Please try again.");
        return;
      }
      await onSaved?.({
        avatarKey: selected,
        gender: selectedGender,
        ageRange: selectedAgeRange,
      });
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
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
          <div>
            <p className="font-['Inter'] text-xs text-foreground/60 mb-1">Sex</p>
            <select
              value={selectedGender}
              onChange={(e) => setSelectedGender(e.target.value as AvatarGender)}
              className="w-full border border-black rounded-design px-3 py-2 bg-white font-['Inter'] text-sm"
            >
              <option value="female">Female</option>
              <option value="male">Male</option>
              <option value="non_binary">Non-binary</option>
            </select>
          </div>
          <div>
            <p className="font-['Inter'] text-xs text-foreground/60 mb-1">Age range</p>
            <select
              value={selectedAgeRange}
              onChange={(e) => setSelectedAgeRange(e.target.value as AvatarAgeRange)}
              className="w-full border border-black rounded-design px-3 py-2 bg-white font-['Inter'] text-sm"
            >
              <option value="18-24">18-24</option>
              <option value="25-34">25-34</option>
              <option value="35-44">35-44</option>
              <option value="45-54">45-54</option>
              <option value="55-64">55-64</option>
              <option value="65+">65+</option>
            </select>
          </div>
        </div>

        <p className="font-['Inter'] text-sm text-foreground/70 mt-1 mb-3">
          Showing options from <span className="font-medium">{selectedGender}</span> /{" "}
          <span className="font-medium">{selectedAgeRange}</span>
        </p>

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
