import type { ICPStrategyPayload } from "../../types/icpStrategyPayload";

type Props = {
  strategy: ICPStrategyPayload;
};

export function StrategyChannelPlanCards({ strategy }: Props) {
  const channelPlan = strategy.channel_plan;
  if (!channelPlan) return null;

  const secondary = channelPlan.secondary_channels ?? [];
  const first14 = channelPlan.first_14_days ?? [];

  return (
    <div className="space-y-4">
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
      {first14.length > 0 ? (
        <div>
          <p className="font-['Plus_Jakarta_Sans'] text-xs font-medium text-foreground/60">First 14 days</p>
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
  );
}
