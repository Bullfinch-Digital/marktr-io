import * as React from "react";
import * as CheckboxPrimitive from "@radix-ui/react-checkbox";
import { CheckIcon } from "lucide-react";
import { cn } from "./utils";

function Checkbox({
  className,
  ...props
}: React.ComponentProps<typeof CheckboxPrimitive.Root>) {
  return (
    <CheckboxPrimitive.Root
      data-slot="checkbox"
      className={cn(
        "peer size-5 shrink-0 rounded-[6px] border-2 border-brand-stroke bg-card shadow-xs transition-shadow outline-none disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:border-brand-navy data-[state=checked]:bg-brand-navy data-[state=checked]:text-brand-lime focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--brand-navy)] dark:focus-visible:outline-[color:var(--brand-lime)] focus-visible:shadow-[var(--brand-focus-glow)] aria-invalid:border-destructive",
        className,
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator
        data-slot="checkbox-indicator"
        className="flex items-center justify-center text-current transition-none"
      >
        <CheckIcon className="size-3.5" />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  );
}

export { Checkbox };

