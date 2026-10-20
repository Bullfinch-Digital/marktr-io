import type { ReactNode } from "react";

export function ContentFieldLabel({ children }: { children: ReactNode }) {
  return (
    <p className="font-['Plus_Jakarta_Sans'] text-[11px] font-semibold uppercase tracking-[0.14em] text-brand-navy/60 dark:text-foreground/55">
      {children}
    </p>
  );
}

export function ContentFieldValue({
  children,
  primary,
  secondary,
  empty,
}: {
  children: ReactNode;
  primary?: boolean;
  secondary?: boolean;
  empty?: boolean;
}) {
  return (
    <p
      className={`whitespace-pre-wrap font-['Plus_Jakarta_Sans'] font-normal leading-[1.65] ${
        empty
          ? "text-sm text-foreground/45"
          : secondary
            ? "text-sm text-foreground/70"
            : primary
              ? "text-base text-foreground"
              : "text-[15px] text-foreground"
      }`}
    >
      {children}
    </p>
  );
}

export function ContentField({
  label,
  value,
  primary,
  secondary,
}: {
  label: string;
  value: string;
  primary?: boolean;
  secondary?: boolean;
}) {
  const empty = !value.trim();
  return (
    <div
      className={
        secondary
          ? "mt-3 border-t border-brand-stroke/25 pt-3 first:mt-0 first:border-t-0 first:pt-0"
          : "mt-3 first:mt-0"
      }
    >
      <ContentFieldLabel>{label}</ContentFieldLabel>
      <div className="mt-1.5">
        <ContentFieldValue primary={primary} secondary={secondary} empty={empty}>
          {empty ? "—" : value}
        </ContentFieldValue>
      </div>
    </div>
  );
}

export function ContentItemHeader({ label, index }: { label: string; index: number }) {
  return (
    <div className="flex items-center gap-2.5">
      <span
        aria-hidden
        className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-brand-lime px-1.5 font-['Plus_Jakarta_Sans'] text-[11px] font-semibold text-brand-navy"
      >
        {index + 1}
      </span>
      <h4 className="font-['Fraunces'] text-base font-bold leading-snug text-brand-navy dark:text-foreground">
        {label} {index + 1}
      </h4>
    </div>
  );
}

export function ContentStructuredItem({ children }: { children: ReactNode }) {
  return (
    <article className="rounded-design border border-brand-stroke/35 bg-card px-4 py-4">
      {children}
    </article>
  );
}
