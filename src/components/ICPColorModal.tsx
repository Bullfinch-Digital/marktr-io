import { useState } from "react";
import { insertIcpVersionRpc } from "../lib/icpVersioning";

const COLORS = ["#FF9922", "#FF6B6B", "#6BCB77", "#4D96FF", "#9D4EDD", "#FFD93D"];

type Props = {
  isOpen: boolean;
  id: string | null;
  currentColor: string | null;
  onClose: () => void;
  onSaved?: (color?: string, newIcpId?: string) => void;
};

export default function ICPColorModal({ isOpen, id, currentColor, onClose, onSaved }: Props) {
  const [selectedColor, setSelectedColor] = useState(currentColor ?? "#FF9922");
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
            className="border border-black rounded-design px-4 py-2 bg-background hover:bg-foreground/5 font-['Inter'] text-sm"
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
          >
            Cancel
          </button>
          <button
            className="border border-black rounded-design px-4 py-2 bg-button-green hover:bg-button-green/90 font-['Inter'] text-sm"
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
