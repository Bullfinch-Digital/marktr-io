import { Checkbox } from "../ui/checkbox";

type Props = {
  checked: boolean;
  disabled?: boolean;
  label: string;
  onToggle: (done: boolean) => void;
  size?: "default" | "lg";
  location?: string;
};

export function PlanDayToggle({
  checked,
  disabled,
  label,
  onToggle,
  size = "default",
  location = "plan_page",
}: Props) {
  const large = size === "lg";
  return (
    <label
      className={
        large
          ? "inline-flex min-h-14 cursor-pointer items-center gap-3 rounded-[20px] border-2 border-brand-stroke bg-card px-4"
          : "inline-flex min-h-11 min-w-11 cursor-pointer items-center justify-center"
      }
    >
      <Checkbox
        checked={checked}
        disabled={disabled}
        aria-label={label}
        data-track-id="plan_day_toggle"
        data-track-location={location}
        onCheckedChange={(value) => onToggle(value === true)}
        onClick={(event) => event.stopPropagation()}
        className={large ? "size-7" : "size-5"}
      />
      {large ? (
        <span className="font-['Plus_Jakarta_Sans'] text-sm font-semibold text-foreground">
          {checked ? "Done" : "Mark done"}
        </span>
      ) : (
        <span className="sr-only">{label}</span>
      )}
    </label>
  );
}
