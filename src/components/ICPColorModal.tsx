import { useState } from "react";
import { insertIcpVersionRpc } from "../lib/icpVersioning";
import { BRAND_SWATCHES } from "../lib/brandPalette";

const COLORS = [...BRAND_SWATCHES];

type Props = {
  isOpen: boolean;
  id: string | null;
  currentColor: string | null;
  onClose: () => void;
  onSaved?: (color?: string, newIcpId?: string) => void;
};

export default function ICPColorModal({ isOpen, id, currentColor, onClose, onSaved }: Props) {
  const [selectedColor, setSelectedColor] = useState(currentColor ?? COLORS[0]);
  const [saving, setSaving] = useState(false);

  if (!isOpen || !id) return null;

  const save = async () => {
    setSaving(true);
    if (import.meta.env.DEV) {
      console.log("🎨 ICPColorModal: persisting icps.color", {
        icpId: id,
        selectedColor,
      });
    }
    const updated = await insertIcpVersionRpc(id, { color: selectedColor });
    if (!updated) {
      console.error("❌ ICPColorModal: failed to persist icps.color");
      setSaving(false);
      return;
    }

    onSaved?.(selectedColor as any, updated.id);
    setSaving(false);
    onClose();
  };

  return (
    <div
      className="modal-overlay"
      onClick={(e) => {
        e.stopPropagation();
        onClose();
      }}
    >
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="font-semibold text-lg mb-4">Choose ICP Colour</h2>

        <div className="grid grid-cols-6 gap-3">
          {COLORS.map((c) => (
            <div
              key={c}
              onClick={(e) => {
                e.stopPropagation();
                setSelectedColor(c);
              }}
              className={`h-10 w-10 rounded-full border-2 cursor-pointer ${
                selectedColor === c ? "border-black scale-110" : "border-transparent"
              }`}
              style={{ backgroundColor: c }}
            />
          ))}
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <button
            className="border-2 border-brand-stroke rounded-full px-4 py-2 min-h-11 bg-background hover:bg-muted/40 font-['Plus_Jakarta_Sans'] text-sm"
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
          >
            Cancel
          </button>
          <button
            className="border-2 border-brand-stroke rounded-full px-4 py-2 min-h-11 bg-brand-lime text-brand-navy hover:bg-brand-lime-hover font-['Plus_Jakarta_Sans'] text-sm font-semibold"
            onClick={(e) => {
              e.stopPropagation();
              save();
            }}
            disabled={saving}
          >
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
