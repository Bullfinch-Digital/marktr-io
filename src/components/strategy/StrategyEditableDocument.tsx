import { Plus } from "lucide-react";
import { Button } from "../ui/button";
import type { ICPStrategyPayload } from "../../types/icpStrategyPayload";
import type { StrategySectionId } from "../../lib/strategyEditPayload";
import { StrategyChannelPlanCards } from "./StrategyChannelPlanCards";
import { StrategyContentView } from "./StrategyContentView";
import { StrategyEditForm } from "./StrategyEditForm";

const CONTENT_SECTIONS: Exclude<StrategySectionId, "title">[] = [
  "positioning",
  "messaging",
  "campaign_ideas",
  "channel_plan",
  "offer",
  "success_metrics",
  "ad_assets",
];

const SECTION_LABELS: Record<StrategySectionId, string> = {
  title: "Title",
  positioning: "Positioning",
  messaging: "Messaging",
  campaign_ideas: "Campaign ideas",
  channel_plan: "Channel plan",
  offer: "Offer",
  success_metrics: "Success metrics",
  ad_assets: "Ad assets",
};

type Props = {
  title: string;
  strategy: ICPStrategyPayload;
  stagedSections: StrategySectionId[];
  activeSection: StrategySectionId | null;
  readOnly?: boolean;
  sections?: StrategySectionId[];
  /** Card layout for the channel plan. Other sections stay as they are. */
  channelLayout?: "default" | "cards";
  onStartEdit: (section: StrategySectionId) => void;
  onDoneSection: () => void;
  onCancelSection: () => void;
  onTitleChange: (title: string) => void;
  onStrategyChange: (strategy: ICPStrategyPayload) => void;
};

function SectionShell({
  sectionId,
  anchorId,
  prominent,
  isStaged,
  isEditing,
  readOnly,
  canEdit,
  onStartEdit,
  onDoneSection,
  onCancelSection,
  children,
}: {
  sectionId: StrategySectionId;
  anchorId?: string;
  prominent?: boolean;
  isStaged: boolean;
  isEditing: boolean;
  readOnly?: boolean;
  canEdit: boolean;
  onStartEdit: () => void;
  onDoneSection: () => void;
  onCancelSection: () => void;
  children: React.ReactNode;
}) {
  const label =
    sectionId === "channel_plan" && prominent ? "Where to post" : SECTION_LABELS[sectionId];
  const framed = !prominent || isEditing;

  return (
    <div
      id={anchorId ?? (sectionId === "campaign_ideas" ? "campaign-ideas" : undefined)}
      className={`scroll-mt-[7.5rem] ${
        framed
          ? `app-card ${isEditing ? "shadow-md" : ""} ${isStaged && !isEditing ? "bg-brand-coral/20" : ""}`
          : ""
      }`}
    >
      <div
        className={`flex flex-wrap items-center justify-between gap-2 ${
          framed ? "border-b border-brand-stroke/40 px-4 py-2" : "mb-3"
        }`}
      >
        <div className="flex items-center gap-2">
          {sectionId !== "title" ? (
            prominent ? (
              <h2 className="font-['Fraunces'] text-2xl text-foreground">{label}</h2>
            ) : (
              <p className="font-['Plus_Jakarta_Sans'] text-xs uppercase tracking-wide text-foreground/55">
                {label}
              </p>
            )
          ) : null}
          {isStaged && !isEditing ? (
            <span className="font-['Plus_Jakarta_Sans'] text-[11px] text-foreground bg-brand-coral/40 border border-brand-stroke rounded-full px-2 py-0.5">
              Unsaved
            </span>
          ) : null}
        </div>
        {!readOnly ? (
          <div className="flex items-center gap-2">
            {isEditing ? (
              <>
                <Button
                  type="button"
                  size="sm"
                  className="bg-button-green hover:bg-button-green/90 text-foreground border border-black rounded-design h-8"
                  onClick={onDoneSection}
                >
                  Done
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="border-black rounded-design h-8"
                  onClick={onCancelSection}
                >
                  Cancel
                </Button>
              </>
            ) : canEdit ? (
              <button
                type="button"
                onClick={onStartEdit}
                className="inline-flex items-center gap-1.5 font-['Plus_Jakarta_Sans'] text-xs text-foreground/60 hover:text-foreground transition-colors px-2 py-1 rounded hover:bg-accent-grey/30"
              >
                <Plus className="h-3 w-3" />
                Edit
              </button>
            ) : null}
          </div>
        ) : null}
      </div>
      <div className={framed ? "p-4" : ""}>{children}</div>
    </div>
  );
}

export function StrategyEditableDocument({
  title,
  strategy,
  stagedSections,
  activeSection,
  readOnly = false,
  sections,
  channelLayout = "default",
  onStartEdit,
  onDoneSection,
  onCancelSection,
  onTitleChange,
  onStrategyChange,
}: Props) {
  const stagedSet = new Set(stagedSections);
  const canStartEdit = !activeSection;
  const sectionIds = sections ?? (["title", ...CONTENT_SECTIONS] as StrategySectionId[]);

  return (
    <div className="space-y-4">
      {sectionIds.map((sectionId) => {
        const cards = sectionId === "channel_plan" && channelLayout === "cards";
        return (
          <SectionShell
            key={sectionId}
            sectionId={sectionId}
            prominent={cards}
            anchorId={cards ? "where-to-post" : undefined}
            isStaged={stagedSet.has(sectionId)}
            isEditing={activeSection === sectionId}
            readOnly={readOnly}
            canEdit={canStartEdit}
            onStartEdit={() => onStartEdit(sectionId)}
            onDoneSection={onDoneSection}
            onCancelSection={onCancelSection}
          >
            {activeSection === sectionId ? (
              <StrategyEditForm
                bare
                title={title}
                strategy={strategy}
                section={sectionId}
                onTitleChange={onTitleChange}
                onStrategyChange={onStrategyChange}
              />
            ) : sectionId === "title" ? (
              <h1 className="font-['Fraunces'] text-3xl text-foreground lg:text-4xl">{title}</h1>
            ) : cards ? (
              <StrategyChannelPlanCards strategy={strategy} />
            ) : (
              <StrategyContentView strategy={strategy} section={sectionId} bare />
            )}
          </SectionShell>
        );
      })}
    </div>
  );
}
