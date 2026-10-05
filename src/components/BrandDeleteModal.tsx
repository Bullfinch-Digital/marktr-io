import "../styles/Modal.css";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  brandName: string;
  isDeleting?: boolean;
  error?: string | null;
};

export default function BrandDeleteModal({
  isOpen,
  onClose,
  onConfirm,
  brandName,
  isDeleting,
  error,
}: Props) {
  if (!isOpen) return null;

  return (
    <div
      className="modal-overlay"
      onClick={() => {
        if (isDeleting) return;
        onClose();
      }}
    >
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
      >
        <h2>Delete Brand</h2>
        <p>
          Are you sure you want to delete <strong>{brandName}</strong>?
          <br />
          ICPs won’t be deleted — they’ll just be unassigned from this brand.
        </p>
        <div className="modal-buttons">
          <button
            className="modal-cancel"
            onClick={(e) => {
              e.stopPropagation();
              if (isDeleting) return;
              onClose();
            }}
            disabled={isDeleting}
          >
            Cancel
          </button>
          <button
            className="modal-delete"
            onClick={(e) => {
              e.stopPropagation();
              if (isDeleting) return;
              onConfirm();
            }}
            disabled={isDeleting}
          >
            {isDeleting ? "Deleting..." : "Delete"}
          </button>
        </div>
        {error ? (
          <p className="mt-2 text-sm text-red-700 font-['Plus_Jakarta_Sans']">{error}</p>
        ) : null}
      </div>
    </div>
  );
}

