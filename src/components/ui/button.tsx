import * as React from "react"
import { cn } from "./utils"
import { Link } from "react-router-dom"

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "outline" | "ghost" | "link" | "cta"
  size?: "default" | "sm" | "lg" | "icon"
  href?: string
  asLink?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", href, asLink, ...props }, ref) => {
    const buttonClasses = cn(
      "inline-flex items-center justify-center gap-2 font-['Plus_Jakarta_Sans'] font-semibold transition-all focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--brand-navy)] dark:focus-visible:outline-[color:var(--brand-lime)] focus-visible:shadow-[var(--brand-focus-glow)] disabled:pointer-events-none disabled:opacity-50",
      {
        "rounded-full border-2 border-brand-stroke bg-brand-lime text-brand-navy hover:bg-brand-lime-hover hover:-translate-y-px": variant === "default",
        "rounded-full border-2 border-brand-stroke bg-card text-foreground hover:bg-muted/50": variant === "outline",
        "rounded-full hover:bg-muted/60 hover:text-foreground": variant === "ghost",
        "underline-offset-4 hover:underline": variant === "link",
        "rounded-full border-2 border-brand-stroke bg-button-green text-brand-navy transition-transform scale-[1.50] hover:scale-[1.55] active:scale-[1.05] hover:bg-brand-lime-hover hover:shadow-[var(--brand-shadow)] whitespace-nowrap font-bold font-['Fraunces'] px-4 py-2": variant === "cta",
        // Sizes
        "h-11 px-4 py-2": size === "default" && variant !== "cta",
        "h-9 px-3": size === "sm" && variant !== "cta",
        "h-12 px-8": size === "lg" && variant !== "cta",
        "h-11 w-11": size === "icon" && variant !== "cta",
      },
      className
    )

    // If href is provided, render as Link
    if (href || asLink) {
      return (
        <Link
          to={href || "#"}
          className={buttonClasses}
          onClick={props.onClick as React.MouseEventHandler<HTMLAnchorElement> | undefined}
          aria-label={props["aria-label"]}
          title={props.title}
        >
          {props.children}
        </Link>
      )
    }

    return (
      <button
        className={buttonClasses}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button }

