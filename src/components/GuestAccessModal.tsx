import "../styles/Modal.css";

interface GuestAccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSignup: () => void;
  onLogin: () => void;
  title?: string;
  description?: string;
}

export function GuestAccessModal({
  isOpen,
  onClose,
  onSignup,
  onLogin,
  title = "Sign Up To Unlock ",
  description = "You’ve generated your ICPs, now turn them into a bulletproof marketing strategy.",
}: GuestAccessModalProps) {
  if (!isOpen) return null;

  return (
    <div
      className="modal-overlay"
      onClick={onClose}
      data-no-card-click="true"
    >
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        data-no-card-click="true"
      >
        <h2 className="text-2xl font-['Fraunces'] font-semibold mb-1">
          {title}
        </h2>

        <p className="text-base font-['Plus_Jakarta_Sans'] text-foreground/80 mb-3">
          Free 7 Day Trial
        </p>

        <p className="text-base font-['Plus_Jakarta_Sans'] text-foreground/70 mb-5">
          {description}
        </p>

        <ul className="text-sm font-['Plus_Jakarta_Sans'] text-foreground/80 space-y-2 mb-6 list-disc list-inside">
          <li>Edit and refine your ICPs as your strategy evolves.</li>
          <li>Organise ICPs into brands and collections.</li>
          <li>Unlock marketing insights.</li>
          <li>Discover customer pain points.</li>
          <li>Generate targeted messaging that converts.</li>
          <li>Download lookalike audience data for Meta Ads.</li>
          <li>Save everything securely in your dashboard.</li>
        </ul>

        <div className="mt-6 flex flex-col sm:flex-row gap-6 sm:items-center sm:justify-center">
          <button
            className="modal-save w-full sm:w-[180px]"
            onClick={(e) => {
              e.stopPropagation();
              onSignup();
            }}
          >
            Unlock
          </button>
          <button
            className="modal-cancel w-full sm:w-[140px] whitespace-nowrap"
            onClick={(e) => {
              e.stopPropagation();
              onLogin();
            }}
          >
            Log in
          </button>
          <button
            className="modal-cancel w-full sm:w-[140px] whitespace-nowrap"
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
          >
            Not now
          </button>
        </div>

        <p className="mt-5 text-center text-[11px] leading-snug text-foreground/60 font-['Plus_Jakarta_Sans']">
          Free to start. No spam. Your ICPs stay private.
        </p>
      </div>
    </div>
  );
}
