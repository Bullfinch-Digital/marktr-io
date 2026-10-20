import { Checkbox } from "../ui/checkbox";

type Props = {
  checked: boolean;
  disabled?: boolean;
  label: string;
  onToggle: (done: boolean) => void;
};

export function PlanDayToggle({ checked, disabled, label, onToggle }: Props) {
  return (
    <label className="inline-flex min-h-11 min-w-11 cursor-pointer items-center justify-center">
      <Checkbox
        checked={checked}
        disabled={disabled}
        aria-label={label}
        data-track-id="plan_day_toggle"
        data-track-location="plan_page"
        onCheckedChange={(value) => onToggle(value === true)}
        onClick={(event) => event.stopPropagation()}
        className="size-5"
      />
      <span className="sr-only">{label}</span>
    </label>
  );
}
