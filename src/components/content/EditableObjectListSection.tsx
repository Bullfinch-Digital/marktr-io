import { ChevronDown, ChevronUp, Lock, Plus, Trash2 } from "lucide-react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Textarea } from "../ui/textarea";

export type EditableObjectField<T> = {
  key: keyof T & string;
  label: string;
  multiline?: boolean;
};

type Props<T extends Record<string, unknown>> = {
  title: string;
  items: T[];
  fields: EditableObjectField<T>[];
  createEmpty: () => T;
  getKey: (item: T, index: number) => string;
  isLocked?: boolean;
  onChange: (items: T[]) => void;
  addLabel?: string;
  itemLabel?: string;
};

export function EditableObjectListSection<T extends Record<string, unknown>>({
  title,
  items,
  fields,
  createEmpty,
  getKey,
  isLocked = false,
  onChange,
  addLabel,
  itemLabel = "Item",
}: Props<T>) {
  const updateItem = (index: number, patch: Partial<T>) => {
    const next = items.map((item, i) => (i === index ? { ...item, ...patch } : item));
    onChange(next);
  };

  const addItem = () => {
    if (isLocked) return;
    onChange([...items, createEmpty()]);
  };

  const removeItem = (index: number) => {
    if (isLocked) return;
    onChange(items.filter((_, i) => i !== index));
  };

  const moveItem = (index: number, direction: -1 | 1) => {
    if (isLocked) return;
    const target = index + direction;
    if (target < 0 || target >= items.length) return;
    const next = [...items];
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

      <h3 className="font-['Fraunces'] text-lg mb-3">{title}</h3>

      <div className="space-y-4">
        {items.map((item, index) => (
          <div
            key={getKey(item, index)}
            className="rounded-design border border-black/15 bg-white p-4 space-y-3"
          >
            <div className="flex items-center justify-between gap-2">
              <p className="font-['Inter'] text-xs font-medium text-foreground/55">
                {itemLabel} {index + 1}
              </p>
              {!isLocked ? (
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    disabled={index === 0}
                    onClick={() => moveItem(index, -1)}
                    className="p-1 rounded hover:bg-accent-grey/30 disabled:opacity-30"
                    title="Move up"
                  >
                    <ChevronUp className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    disabled={index === items.length - 1}
                    onClick={() => moveItem(index, 1)}
                    className="p-1 rounded hover:bg-accent-grey/30 disabled:opacity-30"
                    title="Move down"
                  >
                    <ChevronDown className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => removeItem(index)}
                    className="p-1 rounded hover:bg-red-100"
                    title={`Remove ${itemLabel.toLowerCase()}`}
                  >
                    <Trash2 className="h-4 w-4 text-red-600" />
                  </button>
                </div>
              ) : null}
            </div>

            {fields.map((field) => {
              const value = String(item[field.key] ?? "");
              return (
                <div key={field.key} className="space-y-2">
                  <label className="font-['Inter'] text-xs text-foreground/60">{field.label}</label>
                  {field.multiline ? (
                    <Textarea
                      value={value}
                      disabled={isLocked}
                      onChange={(e) =>
                        updateItem(index, { [field.key]: e.target.value } as Partial<T>)
                      }
                      rows={2}
                      className="border-black rounded-design font-['Inter'] text-sm resize-none"
                    />
                  ) : (
                    <Input
                      value={value}
                      disabled={isLocked}
                      onChange={(e) =>
                        updateItem(index, { [field.key]: e.target.value } as Partial<T>)
                      }
                      className="border-black rounded-design font-['Inter'] text-sm"
                    />
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {!isLocked ? (
        <Button
          type="button"
          variant="outline"
          onClick={addItem}
          className="mt-4 border-black rounded-design gap-2"
        >
          <Plus className="h-4 w-4" />
          {addLabel ?? `Add ${itemLabel.toLowerCase()}`}
        </Button>
      ) : null}
    </div>
  );
}
