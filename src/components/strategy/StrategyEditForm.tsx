import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Textarea } from "../ui/textarea";
import { Plus } from "lucide-react";
import { EditableListSection } from "../EditableListSection";
import type { ICPStrategyPayload } from "../../types/icpStrategyPayload";
import { createEmptyAdAssets, type StrategySectionId } from "../../lib/strategyEditPayload";
import { EditableCampaignIdeasSection } from "./EditableCampaignIdeasSection";

type Props = {
  title: string;
  strategy: ICPStrategyPayload;
  section?: StrategySectionId;
  bare?: boolean;
  isLocked?: boolean;
  onTitleChange: (title: string) => void;
  onStrategyChange: (strategy: ICPStrategyPayload) => void;
};

function SectionCard({ children, bare }: { children: React.ReactNode; bare?: boolean }) {
  if (bare) return <>{children}</>;
  return (
    <div className="bg-background border border-black rounded-design p-6 shadow-md space-y-4">
      {children}
    </div>
  );
}

export function StrategyEditForm({
  title,
  strategy,
  section,
  bare = false,
  isLocked = false,
  onTitleChange,
  onStrategyChange,
}: Props) {
  const patch = (updates: Partial<ICPStrategyPayload>) => {
    onStrategyChange({ ...strategy, ...updates });
  };

  const patchPositioning = (updates: Partial<ICPStrategyPayload["positioning"]>) => {
    patch({ positioning: { ...strategy.positioning, ...updates } });
  };

  const patchMessaging = (updates: Partial<ICPStrategyPayload["messaging"]>) => {
    patch({ messaging: { ...strategy.messaging, ...updates } });
  };

  const patchChannelPlan = (updates: Partial<ICPStrategyPayload["channel_plan"]>) => {
    patch({ channel_plan: { ...strategy.channel_plan, ...updates } });
  };

  const patchOffer = (updates: Partial<ICPStrategyPayload["offer"]>) => {
    patch({ offer: { ...strategy.offer, ...updates } });
  };

  const patchSuccessMetrics = (updates: Partial<ICPStrategyPayload["success_metrics"]>) => {
    patch({ success_metrics: { ...strategy.success_metrics, ...updates } });
  };

  const patchAdAssets = (updates: Partial<NonNullable<ICPStrategyPayload["ad_assets"]>>) => {
    const current = strategy.ad_assets ?? createEmptyAdAssets();
    patch({ ad_assets: { ...current, ...updates } });
  };

  const titleSection = (
    <SectionCard bare={bare}>
      <div className="space-y-2">
        <label className="font-['Inter'] text-sm text-foreground/70">Strategy title</label>
        <Input
          value={title}
          disabled={isLocked}
          onChange={(e) => onTitleChange(e.target.value)}
          className="border-black rounded-design"
        />
      </div>
    </SectionCard>
  );

  const positioningSection = (
    <SectionCard bare={bare}>
      <h3 className="font-['Fraunces'] text-lg">Positioning</h3>
      <div className="space-y-2">
        <label className="font-['Inter'] text-sm text-foreground/70">One-liner</label>
        <Textarea
          value={strategy.positioning?.one_liner ?? ""}
          disabled={isLocked}
          onChange={(e) => patchPositioning({ one_liner: e.target.value })}
          rows={2}
          className="border-black rounded-design resize-none"
        />
      </div>
      <div className="space-y-2">
        <label className="font-['Inter'] text-sm text-foreground/70">Why us</label>
        <Textarea
          value={strategy.positioning?.why_us ?? ""}
          disabled={isLocked}
          onChange={(e) => patchPositioning({ why_us: e.target.value })}
          rows={4}
          className="border-black rounded-design resize-none"
        />
      </div>
      <EditableListSection
        title="Differentiators"
        items={strategy.positioning?.differentiators ?? []}
        isLocked={isLocked}
        onChange={(items) => patchPositioning({ differentiators: items })}
      />
    </SectionCard>
  );

  const messagingSection = (
    <SectionCard bare={bare}>
      <h3 className="font-['Fraunces'] text-lg mb-1">Messaging</h3>
      <EditableListSection
        title="Value props"
        items={strategy.messaging?.value_props ?? []}
        isLocked={isLocked}
        onChange={(items) => patchMessaging({ value_props: items })}
      />
      <EditableListSection
        title="Pain to promise"
        items={strategy.messaging?.pain_to_promise ?? []}
        isLocked={isLocked}
        onChange={(items) => patchMessaging({ pain_to_promise: items })}
      />
      <EditableListSection
        title="Objections & rebuttals"
        items={strategy.messaging?.objections_and_rebuttals ?? []}
        isLocked={isLocked}
        onChange={(items) => patchMessaging({ objections_and_rebuttals: items })}
      />
    </SectionCard>
  );

  const campaignIdeasSection = (
    <SectionCard bare={bare}>
      <EditableCampaignIdeasSection
        ideas={strategy.campaign_ideas ?? []}
        isLocked={isLocked}
        onChange={(ideas) => patch({ campaign_ideas: ideas })}
      />
    </SectionCard>
  );

  const channelPlanSection = (
    <SectionCard bare={bare}>
      <h3 className="font-['Fraunces'] text-lg">Channel plan</h3>
      <div className="space-y-2">
        <label className="font-['Inter'] text-sm text-foreground/70">Primary channel</label>
        <Input
          value={strategy.channel_plan?.primary_channel ?? ""}
          disabled={isLocked}
          onChange={(e) => patchChannelPlan({ primary_channel: e.target.value })}
          className="border-black rounded-design"
        />
      </div>
      <EditableListSection
        title="Secondary channels"
        items={strategy.channel_plan?.secondary_channels ?? []}
        isLocked={isLocked}
        onChange={(items) => patchChannelPlan({ secondary_channels: items })}
      />
      <EditableListSection
        title="First 14 days"
        items={strategy.channel_plan?.first_14_days ?? []}
        isLocked={isLocked}
        onChange={(items) => patchChannelPlan({ first_14_days: items })}
      />
    </SectionCard>
  );

  const offerSection = (
    <SectionCard bare={bare}>
      <h3 className="font-['Fraunces'] text-lg">Offer</h3>
      <div className="space-y-2">
        <label className="font-['Inter'] text-sm text-foreground/70">Recommended offer</label>
        <Textarea
          value={strategy.offer?.recommended_offer ?? ""}
          disabled={isLocked}
          onChange={(e) => patchOffer({ recommended_offer: e.target.value })}
          rows={3}
          className="border-black rounded-design resize-none"
        />
      </div>
      <div className="space-y-2">
        <label className="font-['Inter'] text-sm text-foreground/70">Lead magnet idea (optional)</label>
        <Input
          value={strategy.offer?.lead_magnet_idea ?? ""}
          disabled={isLocked}
          onChange={(e) =>
            patchOffer({ lead_magnet_idea: e.target.value.trim() ? e.target.value : null })
          }
          className="border-black rounded-design"
        />
      </div>
      <EditableListSection
        title="Landing page sections"
        items={strategy.offer?.landing_page_sections ?? []}
        isLocked={isLocked}
        onChange={(items) => patchOffer({ landing_page_sections: items })}
      />
    </SectionCard>
  );

  const successMetricsSection = (
    <SectionCard bare={bare}>
      <h3 className="font-['Fraunces'] text-lg mb-1">Success metrics</h3>
      <EditableListSection
        title="KPIs"
        items={strategy.success_metrics?.kpis ?? []}
        isLocked={isLocked}
        onChange={(items) => patchSuccessMetrics({ kpis: items })}
      />
      <EditableListSection
        title="Targets"
        items={strategy.success_metrics?.targets ?? []}
        isLocked={isLocked}
        onChange={(items) => patchSuccessMetrics({ targets: items })}
      />
    </SectionCard>
  );

  const adAssetsSection = (
    <SectionCard bare={bare}>
      <h3 className="font-['Fraunces'] text-lg mb-1">Ad assets</h3>
      {!strategy.ad_assets ? (
        <div>
          <p className="font-['Inter'] text-sm text-foreground/60 mb-3">
            No ad assets in this strategy yet.
          </p>
          {!isLocked ? (
            <Button
              type="button"
              variant="outline"
              className="border-black rounded-design gap-1.5"
              onClick={() => patch({ ad_assets: createEmptyAdAssets() })}
            >
              <Plus className="h-4 w-4" />
              Add ad assets
            </Button>
          ) : null}
        </div>
      ) : (
        <>
          <EditableListSection
            title="Headlines"
            items={strategy.ad_assets.headlines ?? []}
            isLocked={isLocked}
            onChange={(items) => patchAdAssets({ headlines: items })}
          />
          <EditableListSection
            title="Primary texts"
            items={strategy.ad_assets.primary_texts ?? []}
            isLocked={isLocked}
            onChange={(items) => patchAdAssets({ primary_texts: items })}
          />
          <EditableListSection
            title="Creative briefs"
            items={strategy.ad_assets.creative_briefs ?? []}
            isLocked={isLocked}
            onChange={(items) => patchAdAssets({ creative_briefs: items })}
          />
        </>
      )}
    </SectionCard>
  );

  if (section === "title") return titleSection;
  if (section === "positioning") return positioningSection;
  if (section === "messaging") return messagingSection;
  if (section === "campaign_ideas") return campaignIdeasSection;
  if (section === "channel_plan") return channelPlanSection;
  if (section === "offer") return offerSection;
  if (section === "success_metrics") return successMetricsSection;
  if (section === "ad_assets") return adAssetsSection;

  return (
    <div className="space-y-4">
      {titleSection}
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
