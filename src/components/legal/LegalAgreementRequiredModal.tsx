import { useEffect, useState } from "react";
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
    <div className="auth-modal-backdrop legal-agreement-modal-overlay fixed inset-0 z-[70] flex items-center justify-center p-4" onClick={onClose} role="presentation">
      <div
        className="auth-modal-panel relative w-full max-w-md p-6 sm:p-8"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="legal-agreement-modal-title"
      >
        <button
          type="button"
          className="auth-modal-close absolute right-4 top-4 p-2"
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
          className="pr-8 font-['Fraunces'] text-2xl font-bold text-[#101A26]"
        >
          Agreement required
        </h2>

        <p className="mt-4 font-['Plus_Jakarta_Sans'] text-sm leading-relaxed text-[#101A26]/80">
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

        <div className="mt-7 flex justify-between gap-4">
          <button
            type="button"
            className="auth-modal-google min-h-11 px-5 py-3 font-['Plus_Jakarta_Sans'] text-sm"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            type="button"
            className="auth-modal-primary min-h-11 px-5 py-3 font-['Plus_Jakarta_Sans'] text-sm disabled:opacity-50"
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
