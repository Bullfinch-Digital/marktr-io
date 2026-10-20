import "../../styles/Modal.css";

type Props = {
  isOpen: boolean;
  isArchiving?: boolean;
  onClose: () => void;
  onConfirm: () => void;
};

export function PlanArchiveModal({ isOpen, isArchiving = false, onClose, onConfirm }: Props) {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose} role="presentation">
      <div
        className="modal-content"
        role="dialog"
        aria-modal="true"
        aria-labelledby="plan-archive-title"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="plan-archive-title">Archive this plan?</h2>
        <p className="font-['Plus_Jakarta_Sans'] text-sm text-foreground/80">
          It will move to Archived on your plans list. You can still open it to look back, but it
          will no longer be your active plan.
        </p>
        <div className="modal-buttons">
          <button
            type="button"
            className="modal-cancel"
            autoFocus
            disabled={isArchiving}
            onClick={onClose}
          >
            Cancel
          </button>
          <button type="button" className="modal-save" disabled={isArchiving} onClick={onConfirm}>
            {isArchiving ? "Archiving…" : "Archive plan"}
          </button>
        </div>
      </div>
    </div>
  );
}
