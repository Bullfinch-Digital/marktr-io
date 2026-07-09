import "../../styles/Modal.css";

type Props = {
  isOpen: boolean;
  isArchiving?: boolean;
  onClose: () => void;
  onConfirm: () => void;
};

export default function AimArchiveModal({
  isOpen,
  isArchiving = false,
  onClose,
  onConfirm,
}: Props) {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose} role="presentation">
      <div
        className="modal-content"
        role="dialog"
        aria-modal="true"
        aria-labelledby="aim-archive-title"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="aim-archive-title">Archive this aim?</h2>
        <p className="font-['Inter'] text-sm text-foreground/80">
          It&apos;ll move to Archived, where you can view, restore, or permanently delete it.
        </p>
        <div className="modal-buttons">
          <button
            type="button"
            className="modal-cancel"
            autoFocus
            disabled={isArchiving}
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            className="modal-save"
            disabled={isArchiving}
            onClick={(e) => {
              e.stopPropagation();
              onConfirm();
            }}
          >
            {isArchiving ? "Archiving…" : "Archive"}
          </button>
        </div>
      </div>
    </div>
  );
}
