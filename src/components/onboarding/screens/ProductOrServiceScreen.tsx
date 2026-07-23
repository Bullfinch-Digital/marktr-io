import { VoiceInput } from "../../ui/VoiceInput";

interface ProductOrServiceScreenProps {
  value: string;
  onChange: (value: string) => void;
  onContinue: () => void;
  onBack: () => void;
}

export function ProductOrServiceScreen({ value, onChange, onContinue }: ProductOrServiceScreenProps) {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && value.trim()) {
      onContinue();
    }
  };

  return (
    <div className="space-y-6 animate-fade-in-up">
      <h1 className="font-['Fraunces'] font-bold text-4xl">
        What’s the main product or service you want to sell right now?
      </h1>
      <p className="text-foreground/70 max-w-md">
        Pick one offer for now — you can generate more ICPs later.
      </p>

      <div className="space-y-4 pt-4">
        <VoiceInput
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="e.g., Dog grooming, Marketing consultancy, Organic coffee subscription"
          className="border border-black rounded-design px-4 py-6 bg-white text-foreground placeholder:text-foreground/40"
          autoFocus
        />
      </div>
    </div>
  );
}
