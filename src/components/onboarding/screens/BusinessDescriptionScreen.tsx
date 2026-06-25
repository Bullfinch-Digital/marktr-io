import { Textarea } from "../../ui/textarea";
import { WhisperButton } from "../../ui/WhisperButton";

interface BusinessDescriptionScreenProps {
  value: string;
  onChange: (value: string) => void;
  onContinue: () => void;
  onBack: () => void;
  pulledFromStory?: boolean;
}

export function BusinessDescriptionScreen({
  value,
  onChange,
  onContinue,
  pulledFromStory = false,
}: BusinessDescriptionScreenProps) {
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && value.trim()) {
      e.preventDefault();
      onContinue();
    }
  };

  return (
    <div className="space-y-6 animate-fade-in-up">
      <h1 className="font-['Fraunces'] font-bold text-4xl">
        Describe your business in one sentence.
      </h1>
      <p className="text-foreground/70 max-w-md">
        Just like you'd explain it to a friend.
      </p>

      {pulledFromStory ? (
        <p className="text-xs text-muted-foreground font-['DM_Sans']">
          Pulled from your brand story — edit anything.
        </p>
      ) : null}
      
      <div className="space-y-4 pt-4">
        <div className="text-sm text-foreground/60 max-w-md space-y-1">
          <p>Try: <span className="font-medium text-foreground/70">who you help</span> + <span className="font-medium text-foreground/70">the outcome</span> + <span className="font-medium text-foreground/70">what makes you different</span>.</p>
          <p className="italic">Example: “We help busy founders get more leads using done-for-you Meta ads and landing pages.”</p>
        </div>
        <div className="flex items-start gap-2">
          <Textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="We help [who] achieve [outcome] by [how]..."
            className="border border-black rounded-design px-4 py-4 bg-white text-foreground placeholder:text-foreground/40 min-h-[120px] resize-none"
            autoFocus
          />
          <WhisperButton
            onTranscript={(text) => {
              const trimmed = text.trim();
              if (!trimmed) return;
              onChange(value.trim() ? `${value.trim()} ${trimmed}` : trimmed);
            }}
            className="pt-1"
          />
        </div>
      </div>
    </div>
  );
}
