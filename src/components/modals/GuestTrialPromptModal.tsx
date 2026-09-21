import { Button } from "../ui/button";

type GuestTrialPromptModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onStartTrial: () => void;
  heading?: string;
  subheading?: string;
  ctaLabel?: string;
};

export function GuestTrialPromptModal({
  isOpen,
  onClose,
  onStartTrial,
  heading = "Edit and export your ICPs",
  subheading = "Start your 14-day free trial to edit, save, and export your customer profiles.",
  ctaLabel = "Start 14-day free trial",
}: GuestTrialPromptModalProps) {
  if (!isOpen) return null;

  const handleStartTrial = () => {
    onClose();
    onStartTrial();
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
      <div className="bg-background border border-black rounded-design shadow-2xl w-full max-w-md p-6">
        <div className="flex items-start justify-between gap-4 mb-6">
          <div>
            <h2 className="font-['Fraunces'] text-2xl mb-1">{heading}</h2>
            <p className="font-['Inter'] text-sm text-foreground/70">{subheading}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 hover:bg-accent-grey/20 rounded-design transition-colors"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <Button
          type="button"
          onClick={handleStartTrial}
          className="w-full bg-button-green hover:bg-button-green/90 text-foreground border border-black rounded-design px-4 py-3 font-['DM_Sans'] text-sm font-medium"
        >
          {ctaLabel}
        </Button>

        <button
          type="button"
          onClick={onClose}
          className="mt-4 w-full text-sm text-foreground/60 hover:text-foreground transition-colors font-['Inter']"
        >
          Not now
        </button>
      </div>
    </div>
  );
}
