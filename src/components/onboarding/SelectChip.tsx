interface SelectChipProps {
  label: string;
  selected: boolean;
  onClick: () => void;
}

export function SelectChip({ label, selected, onClick }: SelectChipProps) {
  return (
    <button
      onClick={onClick}
      className={`
        min-h-11 px-5 py-3 rounded-full border-2 border-brand-stroke
        transition-all duration-200
        ${selected 
          ? 'bg-brand-lime/35 text-foreground' 
          : 'bg-card text-foreground hover:bg-muted/40'
        }
      `}
    >
      {label}
    </button>
  );
}

