import { useMemo } from "react";
import { Check } from "lucide-react";
import type { StrategyChannel } from "../../types/icpStrategyPayload";
import { buildPostingRhythm, strategyPostingChannels } from "../../lib/strategyPostingRhythm";
import { usePostLog } from "../../hooks/usePostLog";
import { Button } from "../ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";

type Props = {
  channels: StrategyChannel[];
  strategyId: string;
  userId: string;
};

function MarkPostedToggle({
  channelName,
  dayLabel,
  posted,
  busy,
  onToggle,
}: {
  channelName: string;
  dayLabel: string;
  posted: boolean;
  busy: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={posted}
      aria-label={
        posted
          ? `Undo posted ${channelName} on ${dayLabel}`
          : `Mark ${channelName} posted on ${dayLabel}`
      }
      disabled={busy}
      data-track-id={posted ? "undo_posted" : "mark_posted"}
      data-track-location="strategy_page"
      onClick={onToggle}
      className="inline-flex min-h-11 min-w-[44px] items-center gap-1 rounded-full px-2 text-left font-['Plus_Jakarta_Sans'] text-xs font-semibold text-foreground/70 transition-colors hover:bg-muted/60 hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--brand-navy)] disabled:opacity-50 dark:focus-visible:outline-[color:var(--brand-lime)]"
    >
      {posted ? (
        <>
          <Check className="h-3.5 w-3.5 shrink-0" aria-hidden />
          Posted
        </>
      ) : (
        "Mark posted"
      )}
    </button>
  );
}

function SlotList({
  slots,
  dayLabel,
  postedOn,
  isPosted,
  isBusy,
  onToggle,
}: {
  slots: ReturnType<typeof buildPostingRhythm>[number]["slots"];
  dayLabel: string;
  postedOn: string;
  isPosted: (channel: string, postedOn: string) => boolean;
  isBusy: (channel: string, postedOn: string) => boolean;
  onToggle: (channel: string, postedOn: string) => void;
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
          <MarkPostedToggle
            channelName={slot.channelName}
            dayLabel={dayLabel}
            posted={isPosted(slot.channelName, postedOn)}
            busy={isBusy(slot.channelName, postedOn)}
            onToggle={() => onToggle(slot.channelName, postedOn)}
          />
        </li>
      ))}
    </ul>
  );
}

export function StrategyPostingRhythm({ channels, strategyId, userId }: Props) {
  const days = useMemo(() => buildPostingRhythm(channels), [channels]);
  const postingChannels = useMemo(() => strategyPostingChannels(channels), [channels]);
  const { weekDates, isPosted, togglePosted, logExtraPost, pendingKeys } = usePostLog(
    userId,
    strategyId
  );

  const isBusy = (channel: string, postedOn: string) =>
    [...pendingKeys].some((key) => key.endsWith(`:${channel}:${postedOn}`));

  const handleExtra = (channel: string) => {
    void logExtraPost(channel);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="font-['Fraunces'] text-xl text-foreground">Your posting rhythm</h3>
          <p className="mt-1 font-['Plus_Jakarta_Sans'] text-sm text-foreground/70">
            Posting regularly beats perfect timing. Here&apos;s a rhythm you can keep.
          </p>
        </div>
        {postingChannels.length > 0 ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="min-h-11 shrink-0"
                data-track-id="log_extra_post"
                data-track-location="strategy_page"
              >
                Log an extra post
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-[12rem]">
              {postingChannels.map((channel) => (
                <DropdownMenuItem
                  key={channel.name}
                  className="min-h-11 cursor-pointer"
                  data-track-id="log_extra_post"
                  data-track-location="strategy_page"
                  onSelect={() => void handleExtra(channel.name)}
                >
                  {channel.name}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null}
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
            <SlotList
              slots={day.slots}
              dayLabel={day.label}
              postedOn={weekDates[day.dayIndex]}
              isPosted={isPosted}
              isBusy={isBusy}
              onToggle={(channel, postedOn) => void togglePosted(channel, postedOn)}
            />
          </article>
        ))}
      </div>

      <ul className="space-y-2 md:hidden">
        {days.map((day) => (
          <li key={day.label} className="app-card-nested p-3">
            <p className="mb-2 font-['Plus_Jakarta_Sans'] text-xs font-semibold uppercase tracking-wide text-foreground/55">
              {day.label}
            </p>
            <SlotList
              slots={day.slots}
              dayLabel={day.label}
              postedOn={weekDates[day.dayIndex]}
              isPosted={isPosted}
              isBusy={isBusy}
              onToggle={(channel, postedOn) => void togglePosted(channel, postedOn)}
            />
          </li>
        ))}
      </ul>

      <p className="font-['Plus_Jakarta_Sans'] text-xs text-foreground/50">
        Times are general best practice, not your own audience data.
      </p>
    </div>
  );
}
