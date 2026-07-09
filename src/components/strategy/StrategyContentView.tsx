import type { ICPStrategyPayload } from "../../hooks/useICPStrategy";
import type { StrategySectionId } from "../../lib/strategyEditPayload";

type Props = {
  strategy: ICPStrategyPayload;
  compact?: boolean;
  bare?: boolean;
  section?: Exclude<StrategySectionId, "title">;
};

function SectionLabel({ bare, children }: { bare: boolean; children: React.ReactNode }) {
  if (bare) return null;
  return (
    <p className="font-['Inter'] text-xs uppercase tracking-wide text-foreground/55">{children}</p>
  );
}

function wrapSection(content: React.ReactNode, bare: boolean) {
  if (!content) return null;
  if (bare) return <>{content}</>;
  return (
    <section className="rounded-design border border-black/10 bg-white p-4">{content}</section>
  );
}

export function StrategyContentView({ strategy, compact = false, bare = false, section }: Props) {
  const positioning = strategy?.positioning;
  const messaging = strategy?.messaging;
  const offer = strategy?.offer;
  const channelPlan = strategy?.channel_plan;
  const campaigns = strategy?.campaign_ideas || [];
  const success = strategy?.success_metrics;
  const adAssets = strategy?.ad_assets;

  const campaignLimit = compact ? 2 : undefined;

  const positioningSection = positioning
    ? wrapSection(
        <>
          <SectionLabel bare={bare}>Positioning</SectionLabel>
          <p className={`font-['Fraunces'] text-lg text-foreground ${bare ? "" : "mt-2"}`}>
            {positioning.one_liner}
          </p>
          {positioning.why_us ? (
            <p className="font-['Inter'] text-sm text-foreground/75 mt-2 whitespace-pre-wrap">
              {positioning.why_us}
            </p>
          ) : null}
          {(positioning.differentiators?.length ?? 0) > 0 ? (
            <ul className="mt-3 list-disc list-inside space-y-1 font-['Inter'] text-sm text-foreground/70">
              {positioning.differentiators.map((item, i) => (
                <li key={`diff-${i}`}>{item}</li>
              ))}
            </ul>
          ) : null}
        </>,
        bare
      )
    : null;

  const messagingSection = messaging
    ? wrapSection(
        <>
          <SectionLabel bare={bare}>Messaging</SectionLabel>
          {(messaging.value_props?.length ?? 0) > 0 ? (
            <div className={bare ? "" : "mt-2"}>
              <p className="font-['Inter'] text-xs font-medium text-foreground/60">Value props</p>
              <ul className="mt-1 list-disc list-inside space-y-1 font-['Inter'] text-sm text-foreground/80">
                {messaging.value_props.map((item, i) => (
                  <li key={`vp-${i}`}>{item}</li>
                ))}
              </ul>
            </div>
          ) : null}
          {(messaging.pain_to_promise?.length ?? 0) > 0 ? (
            <div className="mt-3">
              <p className="font-['Inter'] text-xs font-medium text-foreground/60">Pain to promise</p>
              <ul className="mt-1 list-disc list-inside space-y-1 font-['Inter'] text-sm text-foreground/80">
                {messaging.pain_to_promise.map((item, i) => (
                  <li key={`ptp-${i}`}>{item}</li>
                ))}
              </ul>
            </div>
          ) : null}
          {(messaging.objections_and_rebuttals?.length ?? 0) > 0 ? (
            <div className="mt-3">
              <p className="font-['Inter'] text-xs font-medium text-foreground/60">
                Objections & rebuttals
              </p>
              <ul className="mt-1 list-disc list-inside space-y-1 font-['Inter'] text-sm text-foreground/80">
                {messaging.objections_and_rebuttals.map((item, i) => (
                  <li key={`obj-${i}`}>{item}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </>,
        bare
      )
    : null;

  const campaignIdeasSection = wrapSection(
    <>
      <SectionLabel bare={bare}>Campaign ideas</SectionLabel>
      {campaigns.length > 0 ? (
        <div className={`grid gap-3 sm:grid-cols-2 ${bare ? "mt-2" : "mt-3"}`}>
          {(campaignLimit ? campaigns.slice(0, campaignLimit) : campaigns).map((c, i) => (
            <div
              key={`camp-${i}`}
              className="rounded-design border border-black/10 bg-accent-grey/10 p-3"
            >
              <p className="font-['Inter'] text-sm font-medium text-foreground">{c.name}</p>
              <p className="font-['Inter'] text-xs text-foreground/70 mt-1">{c.hook}</p>
              <p className="font-['Inter'] text-xs text-foreground/60 mt-2">
                <span className="font-medium">Angle:</span> {c.angle}
              </p>
              <p className="font-['Inter'] text-xs text-foreground/60 mt-1">
                <span className="font-medium">CTA:</span> {c.cta}
              </p>
            </div>
          ))}
        </div>
      ) : (
        <p className="font-['Inter'] text-sm text-foreground/60 mt-2">No campaign ideas yet.</p>
      )}
    </>,
    bare
  );

  const channelPlanSection = channelPlan
    ? wrapSection(
        <>
          <SectionLabel bare={bare}>Channel plan</SectionLabel>
          <p className={`font-['Inter'] text-sm text-foreground ${bare ? "mt-2" : "mt-2"}`}>
            <span className="font-medium">Primary:</span> {channelPlan.primary_channel}
          </p>
          {(channelPlan.secondary_channels?.length ?? 0) > 0 ? (
            <p className="font-['Inter'] text-sm text-foreground/75 mt-1">
              <span className="font-medium">Secondary:</span>{" "}
              {channelPlan.secondary_channels.join(", ")}
            </p>
          ) : null}
          {(channelPlan.first_14_days?.length ?? 0) > 0 ? (
            <div className="mt-3">
              <p className="font-['Inter'] text-xs font-medium text-foreground/60">First 14 days</p>
              <ol className="mt-1 list-decimal list-inside space-y-1 font-['Inter'] text-sm text-foreground/75">
                {channelPlan.first_14_days.map((item, i) => (
                  <li key={`d14-${i}`}>{item}</li>
                ))}
              </ol>
            </div>
          ) : null}
        </>,
        bare
      )
    : null;

  const offerSection = offer
    ? wrapSection(
        <>
          <SectionLabel bare={bare}>Offer</SectionLabel>
          <p className={`font-['Inter'] text-sm text-foreground ${bare ? "mt-2" : "mt-2"}`}>
            {offer.recommended_offer}
          </p>
          {offer.lead_magnet_idea ? (
            <p className="font-['Inter'] text-sm text-foreground/75 mt-2">
              <span className="font-medium">Lead magnet:</span> {offer.lead_magnet_idea}
            </p>
          ) : null}
          {(offer.landing_page_sections?.length ?? 0) > 0 ? (
            <ul className="mt-2 list-disc list-inside space-y-1 font-['Inter'] text-sm text-foreground/70">
              {offer.landing_page_sections.map((item, i) => (
                <li key={`lp-${i}`}>{item}</li>
              ))}
            </ul>
          ) : null}
        </>,
        bare
      )
    : null;

  const successMetricsSection = success
    ? wrapSection(
        <>
          <SectionLabel bare={bare}>Success metrics</SectionLabel>
          {(success.kpis?.length ?? 0) > 0 ? (
            <p className={`font-['Inter'] text-sm text-foreground/80 ${bare ? "mt-2" : "mt-2"}`}>
              <span className="font-medium">KPIs:</span> {success.kpis.join(" · ")}
            </p>
          ) : null}
          {(success.targets?.length ?? 0) > 0 ? (
            <p className="font-['Inter'] text-sm text-foreground/75 mt-2">
              <span className="font-medium">Targets:</span> {success.targets.join(" · ")}
            </p>
          ) : null}
        </>,
        bare
      )
    : null;

  const adAssetsSection = !compact
    ? wrapSection(
        <>
          <SectionLabel bare={bare}>Ad assets</SectionLabel>
          {adAssets && (adAssets.headlines?.length ?? 0) > 0 ? (
            <div className={bare ? "mt-2" : "mt-2"}>
              <p className="font-['Inter'] text-xs font-medium text-foreground/60">Headlines</p>
              <ul className="mt-1 list-disc list-inside space-y-1 font-['Inter'] text-sm text-foreground/75">
                {adAssets.headlines.map((item, i) => (
                  <li key={`hl-${i}`}>{item}</li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="font-['Inter'] text-sm text-foreground/60 mt-2">
              No ad assets in this strategy.
            </p>
          )}
        </>,
        bare
      )
    : null;

  if (section === "positioning") return positioningSection;
  if (section === "messaging") return messagingSection;
  if (section === "campaign_ideas") return campaignIdeasSection;
  if (section === "channel_plan") return channelPlanSection;
  if (section === "offer") return offerSection;
  if (section === "success_metrics") return successMetricsSection;
  if (section === "ad_assets") return adAssetsSection;

  return (
    <div className="space-y-4">
      {positioningSection}
      {messagingSection}
      {campaignIdeasSection}
      {channelPlanSection}
      {offerSection}
      {successMetricsSection}
      {adAssetsSection}
    </div>
  );
}
