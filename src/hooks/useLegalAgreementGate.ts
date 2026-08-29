import { useCallback, useRef, useState } from "react";

/** Blocks an action until the user confirms legal agreement in the modal. */
export function useLegalAgreementGate() {
  const [open, setOpen] = useState(false);
  const pendingRef = useRef<(() => void) | null>(null);

  const gate = useCallback((legalAgreed: boolean, action: () => void) => {
    if (legalAgreed) {
      action();
      return;
    }
    pendingRef.current = action;
    setOpen(true);
  }, []);

  const closeModal = useCallback(() => {
    pendingRef.current = null;
    setOpen(false);
  }, []);

  const confirmAgreement = useCallback((setLegalAgreed?: (value: boolean) => void) => {
    setLegalAgreed?.(true);
    setOpen(false);
    const run = pendingRef.current;
    pendingRef.current = null;
    run?.();
  }, []);

  return { open, gate, closeModal, confirmAgreement };
}
