import { Button, type ButtonProps } from "./button";
import { cn } from "./utils";

/** Shared primary control for opening an existing item to view or edit it. */
export function ViewEditButton({
  className,
  children = "View/Edit",
  size = "sm",
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <Button
      type={props.href ? undefined : type}
      size={size}
      className={cn("border-brand-navy whitespace-nowrap max-[480px]:min-h-11", className)}
      {...props}
    >
      {children}
    </Button>
  );
}
