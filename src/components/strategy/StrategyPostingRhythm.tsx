import { useMemo } from "react";
import type { StrategyChannel } from "../../types/icpStrategyPayload";
import { buildPostingRhythm } from "../../lib/strategyPostingRhythm";

type Props = {
  channels: StrategyChannel[];
};

function SlotList({
  slots,
}: {
  slots: ReturnType<typeof buildPostingRhythm>[number]["slots"];
}) {
  if (slots.length === 0) {
    return <p className="font-['Plus_Jakarta_Sans'] text-xs text-foreground/45">Rest day</p>;
  }
  return (
    <ul className="space-y-1.5">
      {slots.map((slot, index) => (
        <li key={`${slot.channelName}-${index}`}>
          <p className="font-['Plus_Jakarta_Sans'] text-sm font-medium text-foreground">
            {slot.channelName}
          </p>
          {slot.time ? (
            <p className="font-['Plus_Jakarta_Sans'] text-xs text-foreground/60">{slot.time}</p>
          ) : null}
        </li>
      ))}
    </ul>
  );
}

export function StrategyPostingRhythm({ channels }: Props) {
  const days = useMemo(() => buildPostingRhythm(channels), [channels]);

  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-['Fraunces'] text-xl text-foreground">Your posting rhythm</h3>
        <p className="mt-1 font-['Plus_Jakarta_Sans'] text-sm text-foreground/70">
          Posting regularly beats perfect timing. Here&apos;s a rhythm you can keep.
        </p>
      </div>

      <div className="hidden gap-2 md:grid md:grid-cols-7">
        {days.map((day) => (
          <article
            key={day.label}
            className="app-card-nested flex min-h-[8.5rem] flex-col gap-2 p-3"
          >
            <p className="font-['Plus_Jakarta_Sans'] text-[11px] font-semibold uppercase tracking-wide text-foreground/55">
              {day.label.slice(0, 3)}
            </p>
            <SlotList slots={day.slots} />
          </article>
        ))}
      </div>

      <ul className="space-y-2 md:hidden">
        {days.map((day) => (
          <li key={day.label} className="app-card-nested p-3">
            <p className="mb-2 font-['Plus_Jakarta_Sans'] text-xs font-semibold uppercase tracking-wide text-foreground/55">
              {day.label}
            </p>
            <SlotList slots={day.slots} />
          </li>
        ))}
      </ul>

      <p className="font-['Plus_Jakarta_Sans'] text-xs text-foreground/50">
        Times are general best practice, not your own audience data.
      </p>
    </div>
  );
}
