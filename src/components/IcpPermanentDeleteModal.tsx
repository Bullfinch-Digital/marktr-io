import "../styles/Modal.css";

type Props = {
  isOpen: boolean;
  personaName: string;
  isDeleting?: boolean;
  onClose: () => void;
  onConfirm: () => void;
};

export default function IcpPermanentDeleteModal({
  isOpen,
  personaName,
  isDeleting = false,
  onClose,
  onConfirm,
}: Props) {
  if (!isOpen) return null;

  const displayName = personaName.trim() || "this customer profile";

  return (
    <div className="modal-overlay" onClick={onClose} role="presentation">
      <div
        className="modal-content"
        role="dialog"
        aria-modal="true"
        aria-labelledby="icp-permanent-delete-title"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="icp-permanent-delete-title">Permanently delete this customer profile?</h2>
        <p className="font-['Inter'] text-sm text-foreground/80">
          This will permanently delete <strong>{displayName}</strong> and all its versions,
          strategy, and collection membership. This cannot be undone — the profile can&apos;t be
          recovered.
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
