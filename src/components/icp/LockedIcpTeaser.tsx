import { Lock } from "lucide-react";
import { Button } from "../ui/button";
import { brandBandForIndex } from "../../lib/brandPalette";

const GENERIC_BAR_WIDTHS = ["w-4/5", "w-full", "w-2/3"];

function bandTint(index: number): string {
  return `color-mix(in srgb, ${brandBandForIndex(index)} 42%, var(--background))`;
}

function BlurShape({ className }: { className: string }) {
  return (
    <div className={`overflow-hidden rounded-full ${className}`} aria-hidden="true">
      <div className="h-full w-full scale-110 bg-foreground/25 blur-[3px]" />
    </div>
  );
}

type UnlockButtonProps = {
  label: string;
  trackId: "locked_icp_unlock" | "locked_painpoints_unlock";
  onUnlock: () => void;
};

function UnlockButton({ label, trackId, onUnlock }: UnlockButtonProps) {
  return (
    <Button
      type="button"
      onClick={onUnlock}
      data-track-id={trackId}
      data-track-location="icp_page"
      data-track-destination="paywall"
      data-track-text={label}
      className="h-auto min-h-11 w-full whitespace-normal px-4 py-3 text-center text-sm leading-snug"
    >
      <Lock className="h-4 w-4 shrink-0" aria-hidden="true" />
      {label}
    </Button>
  );
}

/** List placeholder for a customer profile the viewer cannot open. */
export function LockedCustomerProfileCard({
  profileNumber,
  onUnlock,
}: {
  profileNumber: number;
  onUnlock: () => void;
}) {
  const label = `Customer profile ${profileNumber}`;
  const bandIndex = Math.max(0, profileNumber - 1);

  return (
    <article className="app-card-nested flex h-full min-w-0 flex-col overflow-hidden" aria-label={label}>
      <div
        className="relative h-24 shrink-0 border-b border-brand-nested-stroke"
        style={{ backgroundColor: bandTint(bandIndex) }}
      >
        <span className="absolute right-3 top-3 z-20 inline-flex h-8 w-8 items-center justify-center rounded-full border-2 border-brand-stroke bg-background text-foreground">
          <Lock className="h-4 w-4" aria-hidden="true" />
        </span>
        <div className="absolute bottom-0 left-1/2 z-10 -translate-x-1/2 translate-y-1/2" aria-hidden="true">
          <div className="h-20 w-20 overflow-hidden rounded-full border-[3px] border-brand-stroke bg-background shadow-md">
            <div className="h-full w-full scale-125 bg-foreground/30 blur-md" />
          </div>
        </div>
      </div>

      <div className="flex flex-1 flex-col bg-background p-6 pt-12 text-left">
        <h3 className="app-heading mb-3 font-['Fraunces'] text-lg text-foreground">{label}</h3>
        <BlurShape className="mb-3 h-4 w-3/5" />
        <div className="mb-3 space-y-2" aria-hidden="true">
          <BlurShape className="h-3 w-full" />
          <BlurShape className="h-3 w-11/12" />
        </div>
        <ul className="mb-4 space-y-2" aria-hidden="true">
          <li className="flex items-center gap-2">
            <BlurShape className="h-2 w-2 shrink-0" />
            <BlurShape className="h-3 w-4/5" />
          </li>
          <li className="flex items-center gap-2">
            <BlurShape className="h-2 w-2 shrink-0" />
            <BlurShape className="h-3 w-2/3" />
          </li>
        </ul>
        <div className="mt-auto">
          <UnlockButton
            label="Start your free trial to unlock"
            trackId="locked_icp_unlock"
            onUnlock={onUnlock}
          />
        </div>
      </div>
    </article>
  );
}

/** Locked pain-point rows. `count` is how many rows to draw; no source text is accepted. */
export function LockedPainPointRows({
  count,
  onUnlock,
}: {
  count: number;
  onUnlock: () => void;
}) {
  if (count <= 0) return null;

  return (
    <div className="mt-3 space-y-3">
      <ul className="space-y-2">
        {Array.from({ length: count }).map((_, index) => (
          <li key={index} className="flex items-center gap-2">
            <Lock className="h-4 w-4 shrink-0 text-foreground/70" aria-hidden="true" />
            <div className="min-w-0 flex-1" aria-hidden="true">
              <div
                className={`h-3 rounded-full bg-foreground/15 blur-[3px] ${GENERIC_BAR_WIDTHS[index % GENERIC_BAR_WIDTHS.length]}`}
              />
            </div>
          </li>
        ))}
      </ul>
      <UnlockButton
        label="Start your free trial to see the full picture"
        trackId="locked_painpoints_unlock"
        onUnlock={onUnlock}
      />
    </div>
  );
}
