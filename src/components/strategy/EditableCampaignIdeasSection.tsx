import { ChevronDown, ChevronUp, Lock, Plus, Trash2 } from "lucide-react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Textarea } from "../ui/textarea";
import type { CampaignIdea } from "../../lib/strategyEditPayload";
import { EMPTY_CAMPAIGN_IDEA } from "../../lib/strategyEditPayload";

type Props = {
  ideas: CampaignIdea[];
  isLocked?: boolean;
  onChange: (ideas: CampaignIdea[]) => void;
};

export function EditableCampaignIdeasSection({ ideas, isLocked = false, onChange }: Props) {
  const updateIdea = (index: number, patch: Partial<CampaignIdea>) => {
    const next = ideas.map((idea, i) => (i === index ? { ...idea, ...patch } : idea));
    onChange(next);
  };

  const addIdea = () => {
    if (isLocked) return;
    onChange([...ideas, { ...EMPTY_CAMPAIGN_IDEA }]);
  };

  const removeIdea = (index: number) => {
    if (isLocked) return;
    onChange(ideas.filter((_, i) => i !== index));
  };

  const moveIdea = (index: number, direction: -1 | 1) => {
    if (isLocked) return;
    const target = index + direction;
    if (target < 0 || target >= ideas.length) return;
    const next = [...ideas];
    const [item] = next.splice(index, 1);
    next.splice(target, 0, item);
    onChange(next);
  };

  return (
    <div className={`relative ${isLocked ? "opacity-60" : ""}`}>
      {isLocked ? (
        <div className="absolute inset-0 bg-background/60 backdrop-blur-[2px] rounded-design z-10 flex items-center justify-center">
          <Lock className="w-6 h-6 text-foreground/60" />
        </div>
      ) : null}

      <h3 className="font-['Fraunces'] text-lg mb-3">Campaign ideas</h3>

      <div className="space-y-4">
        {ideas.map((idea, index) => (
          <div
            key={`campaign-edit-${index}`}
            className="rounded-design border border-black/15 bg-white p-4 space-y-3"
          >
            <div className="flex items-center justify-between gap-2">
              <p className="font-['Inter'] text-xs font-medium text-foreground/55">
                Idea {index + 1}
              </p>
              {!isLocked ? (
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    disabled={index === 0}
                    onClick={() => moveIdea(index, -1)}
                    className="p-1 rounded hover:bg-accent-grey/30 disabled:opacity-30"
                    title="Move up"
                  >
                    <ChevronUp className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    disabled={index === ideas.length - 1}
                    onClick={() => moveIdea(index, 1)}
                    className="p-1 rounded hover:bg-accent-grey/30 disabled:opacity-30"
                    title="Move down"
                  >
                    <ChevronDown className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => removeIdea(index)}
                    className="p-1 rounded hover:bg-red-100"
                    title="Remove idea"
                  >
                    <Trash2 className="h-4 w-4 text-red-600" />
                  </button>
                </div>
              ) : null}
            </div>

            <div className="space-y-2">
              <label className="font-['Inter'] text-xs text-foreground/60">Name</label>
              <Input
                value={idea.name}
                disabled={isLocked}
                onChange={(e) => updateIdea(index, { name: e.target.value })}
                className="border-black rounded-design font-['Inter'] text-sm"
              />
            </div>
            <div className="space-y-2">
              <label className="font-['Inter'] text-xs text-foreground/60">Hook</label>
              <Textarea
                value={idea.hook}
                disabled={isLocked}
                onChange={(e) => updateIdea(index, { hook: e.target.value })}
                rows={2}
                className="border-black rounded-design font-['Inter'] text-sm resize-none"
              />
            </div>
            <div className="space-y-2">
              <label className="font-['Inter'] text-xs text-foreground/60">Angle</label>
              <Textarea
                value={idea.angle}
                disabled={isLocked}
                onChange={(e) => updateIdea(index, { angle: e.target.value })}
                rows={2}
                className="border-black rounded-design font-['Inter'] text-sm resize-none"
              />
            </div>
            <div className="space-y-2">
              <label className="font-['Inter'] text-xs text-foreground/60">CTA</label>
              <Input
                value={idea.cta}
                disabled={isLocked}
                onChange={(e) => updateIdea(index, { cta: e.target.value })}
                className="border-black rounded-design font-['Inter'] text-sm"
              />
            </div>
          </div>
        ))}
      </div>

      {!isLocked ? (
        <Button
          type="button"
          variant="outline"
          onClick={addIdea}
          className="mt-4 border-black rounded-design gap-2"
        >
          <Plus className="h-4 w-4" />
          Add campaign idea
        </Button>
      ) : null}
    </div>
  );
}
