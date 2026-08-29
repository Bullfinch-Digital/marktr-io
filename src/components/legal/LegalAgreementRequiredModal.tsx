import { useEffect, useState } from "react";
import "../../styles/Modal.css";
import { LegalAgreementCheckbox } from "./LegalAgreement";

type LegalAgreementRequiredModalProps = {
  open: boolean;
  onClose: () => void;
  onAgree: () => void;
};

export function LegalAgreementRequiredModal({
  open,
  onClose,
  onAgree,
}: LegalAgreementRequiredModalProps) {
  const [agreed, setAgreed] = useState(false);

  useEffect(() => {
    if (open) setAgreed(false);
  }, [open]);

  if (!open) return null;

  return (
    <div className="modal-overlay legal-agreement-modal-overlay" onClick={onClose} role="presentation">
      <div
        className="modal-content modal-content-wide"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="legal-agreement-modal-title"
      >
        <button
          type="button"
          className="modal-close"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onClose();
          }}
          aria-label="Close"
        >
          ×
        </button>

        <h2
          id="legal-agreement-modal-title"
          className="font-['Fraunces'] text-2xl font-bold pr-8"
        >
          Agreement required
        </h2>

        <p className="mt-4 font-['Inter'] text-sm text-foreground/80 leading-relaxed">
          To continue, please confirm you agree to our Terms of Use, Privacy Policy, and Cookie
          Policy.
        </p>

        <div className="mt-5">
          <LegalAgreementCheckbox
            id="legal-agreement-modal-checkbox"
            checked={agreed}
            onCheckedChange={setAgreed}
          />
        </div>

        <div className="modal-buttons modal-buttons-2">
          <button type="button" className="modal-cancel" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="modal-save"
            disabled={!agreed}
            onClick={() => {
              if (!agreed) return;
              onAgree();
            }}
          >
            I agree &amp; continue
          </button>
        </div>
      </div>
    </div>
  );
}
