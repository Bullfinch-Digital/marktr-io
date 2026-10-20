import type { ICPStrategyPayload, StrategyChannel } from "../../types/icpStrategyPayload";
import { isNonPostingChannel, orderedStrategyChannels } from "../../lib/strategyPostingRhythm";

type Props = {
  strategy: ICPStrategyPayload;
};

function TimePills({ times }: { times: string[] }) {
  return (
    <div className="mt-3 flex flex-wrap gap-1.5">
      {times.map((time) => (
        <span
          key={time}
          className="inline-flex rounded-full border border-brand-stroke bg-background px-2.5 py-0.5 font-['Plus_Jakarta_Sans'] text-[11px] text-foreground/75"
        >
          {time}
        </span>
      ))}
    </div>
  );
}

function FormatTags({ formats }: { formats: string[] }) {
  return (
    <div className="mt-2 flex flex-wrap gap-1.5">
      {formats.map((format) => (
        <span
          key={format}
          className="inline-flex rounded-design border border-brand-stroke/70 bg-accent-grey/30 px-2 py-0.5 font-['Plus_Jakarta_Sans'] text-[11px] text-foreground"
        >
          {format}
        </span>
      ))}
    </div>
  );
}

function ChannelExtras({ channel }: { channel: StrategyChannel }) {
  const why = channel.why_platform?.trim();
  const posts = channel.posts_per_week;
  const times = (channel.best_times ?? []).map((item) => item.trim()).filter(Boolean);
  const formats = (channel.formats ?? []).map((item) => item.trim()).filter(Boolean);
  const nonPosting = isNonPostingChannel(channel);
  const showPosts =
    !nonPosting && typeof posts === "number" && Number.isInteger(posts) && posts >= 1;

  return (
    <>
      {why ? (
        <p className="mt-2 font-['Plus_Jakarta_Sans'] text-sm text-foreground/70">{why}</p>
      ) : null}
      {nonPosting ? (
        <p className="mt-3 font-['Plus_Jakarta_Sans'] text-sm font-medium text-foreground">
          Set up once, then update as needed
        </p>
      ) : null}
      {showPosts ? (
        <p className="mt-3 font-['Plus_Jakarta_Sans'] text-sm font-medium text-foreground">
          Aim for {posts} {posts === 1 ? "post" : "posts"} a week
        </p>
      ) : null}
      {!nonPosting && times.length > 0 ? <TimePills times={times} /> : null}
      {formats.length > 0 ? <FormatTags formats={formats} /> : null}
    </>
  );
}

function LegacyChannelCards({ strategy }: Props) {
  const channelPlan = strategy.channel_plan;
  const secondary = channelPlan.secondary_channels ?? [];

  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
      <article className="app-card col-span-1 overflow-hidden p-0 md:col-span-2">
        <span className="block h-1.5 w-full bg-brand-lime" aria-hidden />
        <p className="p-5 font-['Plus_Jakarta_Sans'] text-base text-foreground md:p-6 md:text-lg">
          <span className="font-medium">Primary:</span> {channelPlan.primary_channel}
        </p>
      </article>
      {secondary.map((channel, index) => (
        <article key={`secondary-${index}`} className="app-card-nested p-3 md:p-4">
          <p className="font-['Plus_Jakarta_Sans'] text-sm text-foreground/75">
            <span className="font-medium">Secondary:</span> {channel}
          </p>
        </article>
      ))}
    </div>
  );
}

function StructuredChannelCards({ channels }: { channels: StrategyChannel[] }) {
  const ordered = orderedStrategyChannels(channels);
  const primary = ordered.filter((channel) => channel.role === "primary");
  const secondary = ordered.filter((channel) => channel.role === "secondary");

  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
      {primary.map((channel) => (
        <article
          key={`primary-${channel.name}`}
          className="app-card col-span-1 overflow-hidden p-0 md:col-span-2"
        >
          <span className="block h-1.5 w-full bg-brand-lime" aria-hidden />
          <div className="p-5 md:p-6">
            <p className="font-['Plus_Jakarta_Sans'] text-[11px] font-semibold uppercase tracking-wide text-foreground/55">
              Primary
            </p>
            <p className="mt-1 font-['Plus_Jakarta_Sans'] text-base text-foreground md:text-lg">
              <span className="font-medium">{channel.name}</span>
            </p>
            <ChannelExtras channel={channel} />
          </div>
        </article>
      ))}
      {secondary.map((channel, index) => (
        <article key={`secondary-${channel.name}-${index}`} className="app-card-nested p-3 md:p-4">
          <p className="font-['Plus_Jakarta_Sans'] text-[11px] font-semibold uppercase tracking-wide text-foreground/55">
            Secondary
          </p>
          <p className="mt-1 font-['Plus_Jakarta_Sans'] text-sm text-foreground">
            <span className="font-medium">{channel.name}</span>
          </p>
          <ChannelExtras channel={channel} />
        </article>
      ))}
    </div>
  );
}

export function StrategyChannelPlanCards({ strategy }: Props) {
  const channelPlan = strategy.channel_plan;
  if (!channelPlan) return null;

  const structured =
    Array.isArray(channelPlan.channels) && channelPlan.channels.length > 0
      ? channelPlan.channels
      : null;
  const first14 = channelPlan.first_14_days ?? [];

  return (
    <div className="space-y-4">
      {structured ? (
        <StructuredChannelCards channels={structured} />
      ) : (
        <LegacyChannelCards strategy={strategy} />
      )}
      <div id="first-14-days" className="scroll-mt-[7.5rem]">
        {first14.length > 0 ? (
        <div>
          <p className="font-['Plus_Jakarta_Sans'] text-xs font-medium text-foreground/60">
            First 14 days
          </p>
          <ol className="mt-2 space-y-2">
            {first14.map((item, index) => (
              <li
                key={`d14-${index}`}
                className="flex items-start gap-3 font-['Plus_Jakarta_Sans'] text-sm text-foreground/75"
              >
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 border-brand-stroke bg-brand-lime font-['Plus_Jakarta_Sans'] text-xs font-semibold text-brand-navy">
                  {index + 1}
                </span>
                <span className="pt-0.5">{item}</span>
              </li>
            ))}
          </ol>
        </div>
        ) : null}
      </div>
    </div>
  );
}
