import { Plus } from "lucide-react";
import { Button } from "../ui/button";
import type { ICPStrategyPayload } from "../../types/icpStrategyPayload";
import type { StrategySectionId } from "../../lib/strategyEditPayload";
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
  onStartEdit: (section: StrategySectionId) => void;
  onDoneSection: () => void;
  onCancelSection: () => void;
  onTitleChange: (title: string) => void;
  onStrategyChange: (strategy: ICPStrategyPayload) => void;
};

function SectionShell({
  sectionId,
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
  isStaged: boolean;
  isEditing: boolean;
  readOnly?: boolean;
  canEdit: boolean;
  onStartEdit: () => void;
  onDoneSection: () => void;
  onCancelSection: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      className={`rounded-design border bg-white ${
        isEditing
          ? "border-black/30 shadow-md"
          : isStaged
            ? "border-amber-300/80 bg-amber-50/30"
            : "border-black/10"
      }`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-black/5 px-4 py-2">
        <div className="flex items-center gap-2">
          {sectionId !== "title" ? (
            <p className="font-['Inter'] text-xs uppercase tracking-wide text-foreground/55">
              {SECTION_LABELS[sectionId]}
            </p>
          ) : null}
          {isStaged && !isEditing ? (
            <span className="font-['Inter'] text-[11px] text-amber-800 bg-amber-100 border border-amber-200 rounded-full px-2 py-0.5">
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
                className="inline-flex items-center gap-1.5 font-['Inter'] text-xs text-foreground/60 hover:text-foreground transition-colors px-2 py-1 rounded hover:bg-accent-grey/30"
              >
                <Plus className="h-3 w-3" />
                Edit
              </button>
            ) : null}
          </div>
        ) : null}
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

export function StrategyEditableDocument({
  title,
  strategy,
  stagedSections,
  activeSection,
  readOnly = false,
  onStartEdit,
  onDoneSection,
  onCancelSection,
  onTitleChange,
  onStrategyChange,
}: Props) {
  const stagedSet = new Set(stagedSections);
  const canStartEdit = !activeSection;

  return (
    <div className="space-y-4">
      <SectionShell
        sectionId="title"
        isStaged={stagedSet.has("title")}
        isEditing={activeSection === "title"}
        readOnly={readOnly}
        canEdit={canStartEdit}
        onStartEdit={() => onStartEdit("title")}
        onDoneSection={onDoneSection}
        onCancelSection={onCancelSection}
      >
          {activeSection === "title" ? (
            <StrategyEditForm
              bare
              title={title}
              strategy={strategy}
              section="title"
              onTitleChange={onTitleChange}
              onStrategyChange={onStrategyChange}
            />
        ) : (
          <h1 className="font-['Fraunces'] text-3xl lg:text-4xl text-[#0D1833]">{title}</h1>
        )}
      </SectionShell>

      {CONTENT_SECTIONS.map((sectionId) => (
        <SectionShell
          key={sectionId}
          sectionId={sectionId}
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
          ) : (
            <StrategyContentView strategy={strategy} section={sectionId} bare />
          )}
        </SectionShell>
      ))}
    </div>
  );
}
