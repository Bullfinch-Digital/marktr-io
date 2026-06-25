import { useEffect } from "react";
import { SelectChip } from "../SelectChip";
import { Input } from "../../ui/input";
import { WhisperButton } from "../../ui/WhisperButton";

interface AssumedAudienceScreenProps {
  value: string[];
  customAudience: string;
  businessType: "B2B" | "B2C" | "Both";
  onChange: (value: string[]) => void;
  onCustomAudienceChange: (value: string) => void;
  onBusinessTypeChange: (value: "B2B" | "B2C" | "Both") => void;
  onContinue: () => void;
  onBack: () => void;
  pulledFromStory?: boolean;
}

const audienceOptionsByType: Record<AssumedAudienceScreenProps["businessType"], string[]> = {
  B2C: [
    "Consumers",
    "Parents",
    "Students",
    "Young professionals",
    "Hobbyists / enthusiasts",
    "Creators",
    "Local customers",
    "Online shoppers",
    "Not sure",
  ],
  B2B: [
    "Founders / Owners",
    "SMB owners",
    "Marketing managers",
    "Operations managers",
    "Agencies",
    "Consultants",
    "In-house teams",
    "Procurement / buyers",
    "Not sure",
  ],
  Both: [
    "Founders",
    "Creators",
    "Freelancers",
    "SMB owners",
    "Online sellers",
    "Professionals",
    "Not sure",
  ],
};

export function AssumedAudienceScreen({ 
  value, 
  customAudience,
  businessType,
  onChange, 
  onCustomAudienceChange,
  onBusinessTypeChange,
  onContinue,
  pulledFromStory = false,
}: AssumedAudienceScreenProps) {
  const options = audienceOptionsByType[businessType];

  // Drop any selections that are no longer valid when businessType changes.
  useEffect(() => {
    const filtered = value.filter((v) => options.includes(v));
    if (filtered.length !== value.length) {
      onChange(filtered);
    }
  }, [businessType, options, onChange, value]);

  const toggleOption = (option: string) => {
    if (value.includes(option)) {
      onChange(value.filter(v => v !== option));
    } else {
      onChange([...value, option]);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (value.length > 0 || customAudience.trim())) {
      onContinue();
    }
  };

  return (
    <div className="space-y-6 animate-fade-in-up">
      <h1 className="font-['Fraunces'] font-bold text-4xl">
        Who do you think your customer is today?
      </h1>
      <p className="text-foreground/70 max-w-md">
        We’ll tailor this based on whether you sell to consumers, businesses, or both.
      </p>
      
      <div className="pt-4 space-y-6">
        <div className="space-y-2">
          <label className="text-sm text-foreground/70">
            Business type (helps tailor targeting + messaging):
          </label>
          <div className="flex flex-wrap gap-3">
            {(["B2C", "B2B", "Both"] as const).map((t) => (
              <SelectChip
                key={t}
                label={t}
                selected={businessType === t}
                onClick={() => onBusinessTypeChange(t)}
              />
            ))}
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          {options.map((option) => (
            <SelectChip
              key={option}
              label={option}
              selected={value.includes(option)}
              onClick={() => toggleOption(option)}
            />
          ))}
        </div>

        <div className="space-y-2">
          <label className="text-sm text-foreground/70">
            Or specify your own:
          </label>
          {pulledFromStory ? (
            <p className="text-xs text-muted-foreground font-['DM_Sans']">
              Pulled from your brand story — edit anything.
            </p>
          ) : null}
          <div className="flex items-start gap-2">
            <Input
              type="text"
              value={customAudience}
              onChange={(e) => onCustomAudienceChange(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="e.g., Busy café owners, Fitness coaches, Boutique e-commerce brands"
              className="border border-black rounded-design px-4 py-6 bg-white text-foreground placeholder:text-foreground/40"
            />
            <WhisperButton
              onTranscript={(text) => {
                const t = text.trim();
                if (!t) return;
                onCustomAudienceChange(
                  customAudience.trim()
                    ? `${customAudience.trim()} ${t}`
                    : t
                );
              }}
              className="pt-1"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
