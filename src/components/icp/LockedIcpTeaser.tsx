import { Lock } from "lucide-react";
import { Button } from "../ui/button";

const GENERIC_BAR_WIDTHS = ["w-4/5", "w-full", "w-2/3"];

function GenericBars({ count }: { count: number }) {
  return (
    <div className="space-y-2" aria-hidden="true">
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          className={`h-3 rounded-full bg-foreground/15 blur-[3px] ${GENERIC_BAR_WIDTHS[index % GENERIC_BAR_WIDTHS.length]}`}
        />
      ))}
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

  return (
    <article className="app-card-nested flex h-full min-w-0 flex-col gap-4 p-4 sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <h3 className="app-heading min-w-0 font-['Fraunces'] text-lg text-foreground">{label}</h3>
        <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 border-brand-stroke bg-background text-foreground">
          <Lock className="h-4 w-4" aria-hidden="true" />
        </span>
      </div>
      <GenericBars count={3} />
      <div className="mt-auto">
        <UnlockButton
          label="Start your free trial to unlock"
          trackId="locked_icp_unlock"
          onUnlock={onUnlock}
        />
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
