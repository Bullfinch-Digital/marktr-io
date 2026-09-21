import "../../styles/Modal.css";

type Props = {
  isOpen: boolean;
  aimTitle: string;
  isDeleting?: boolean;
  onClose: () => void;
  onConfirm: () => void;
};

export default function AimPermanentDeleteModal({
  isOpen,
  aimTitle,
  isDeleting = false,
  onClose,
  onConfirm,
}: Props) {
  if (!isOpen) return null;

  const displayName = aimTitle.trim() || "this aim";

  return (
    <div className="modal-overlay" onClick={onClose} role="presentation">
      <div
        className="modal-content"
        role="dialog"
        aria-modal="true"
        aria-labelledby="aim-permanent-delete-title"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="aim-permanent-delete-title">Permanently delete this aim?</h2>
        <p className="font-['Inter'] text-sm text-foreground/80">
          This will permanently delete <strong>{displayName}</strong> and all its versions. This
          cannot be undone.
        </p>
        <div className="modal-buttons">
          <button
            type="button"
            className="modal-cancel"
            autoFocus
            disabled={isDeleting}
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            className="modal-delete"
            disabled={isDeleting}
            onClick={(e) => {
              e.stopPropagation();
              onConfirm();
            }}
          >
            {isDeleting ? "Deleting…" : "Delete permanently"}
          </button>
        </div>
      </div>
    </div>
  );
}
