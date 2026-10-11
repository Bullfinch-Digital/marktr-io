import { SelectChip } from "../SelectChip";

interface MarketingChannelsScreenProps {
  value: string[];
  onChange: (value: string[]) => void;
  onContinue: () => void;
  onBack: () => void;
}

const channelOptions = [
  "Instagram",
  "Facebook",
  "Meta Ads (paid social)",
  "TikTok",
  "LinkedIn",
  "Email newsletter",
  "Pinterest",
  "Website or online shop",
  "YouTube",
  "X",
  "None yet"
];

export function MarketingChannelsScreen({ value, onChange }: MarketingChannelsScreenProps) {
  const toggleOption = (option: string) => {
    if (value.includes(option)) {
      onChange(value.filter(v => v !== option));
    } else {
      onChange([...value, option]);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in-up">
      <h1 className="font-['Fraunces'] font-bold text-4xl">
        Which platforms do you use to promote your business today?
      </h1>
      <p className="text-foreground/70 max-w-md">
        Tick everything you use now. Don't worry if it's just one, or none yet.
      </p>
      
      <div className="pt-4">
        <div className="flex flex-wrap gap-3">
          {channelOptions.map((option) => (
            <SelectChip
              key={option}
              label={option}
              selected={value.includes(option)}
              onClick={() => toggleOption(option)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
