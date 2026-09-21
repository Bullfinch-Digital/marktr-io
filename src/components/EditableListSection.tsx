import { useEffect, useRef, useState } from "react";
import { Check, Lock, Pencil, Plus, Trash2, Undo2, X } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";

type Props = {
  title: string;
  items: string[];
  isLocked?: boolean;
  onChange?: (items: string[]) => void;
};

function itemsEqual(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  return a.every((item, index) => item === b[index]);
}

export function EditableListSection({
  title,
  items,
  isLocked = false,
  onChange,
}: Props) {
  const [localItems, setLocalItems] = useState(items);
  const [newItem, setNewItem] = useState("");
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingText, setEditingText] = useState("");
  const [history, setHistory] = useState<string[][]>([items]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [showUndo, setShowUndo] = useState(false);
  const lastEmittedRef = useRef<string[] | null>(null);

  useEffect(() => {
    if (lastEmittedRef.current && itemsEqual(lastEmittedRef.current, items)) {
      lastEmittedRef.current = null;
      return;
    }
    setLocalItems(items);
    setHistory([items]);
    setHistoryIndex(0);
  }, [items]);

  const emitChange = (nextItems: string[]) => {
    lastEmittedRef.current = nextItems;
    onChange?.(nextItems);
  };

  const saveToHistory = (newItems: string[]) => {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(newItems);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
    setLocalItems(newItems);
    emitChange(newItems);

    setShowUndo(true);
    setTimeout(() => setShowUndo(false), 3000);
  };

  const handleUndo = () => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      const restored = history[newIndex];
      setHistoryIndex(newIndex);
      setLocalItems(restored);
      emitChange(restored);
      setShowUndo(true);
      setTimeout(() => setShowUndo(false), 3000);
    }
  };

  const addItem = () => {
    if (newItem.trim() && !isLocked) {
      const newItems = [...localItems, newItem.trim()];
      saveToHistory(newItems);
      setNewItem("");
    }
  };

  const removeItem = (index: number) => {
    if (!isLocked) {
      const newItems = localItems.filter((_, i) => i !== index);
      saveToHistory(newItems);
    }
  };

  const startEditing = (index: number, text: string) => {
    if (!isLocked) {
      setEditingIndex(index);
      setEditingText(text);
    }
  };

  const saveEdit = (index: number) => {
    if (editingText.trim()) {
      const updatedItems = [...localItems];
      updatedItems[index] = editingText.trim();
      saveToHistory(updatedItems);
    }
    setEditingIndex(null);
    setEditingText("");
  };

  const cancelEdit = () => {
    setEditingIndex(null);
    setEditingText("");
  };

  return (
    <div className={`relative ${isLocked ? "opacity-60" : ""}`}>
      {isLocked ? (
        <div className="absolute inset-0 bg-background/60 backdrop-blur-[2px] rounded-design z-10 flex items-center justify-center">
          <Lock className="w-6 h-6 text-foreground/60" />
        </div>
      ) : null}

      <h3 className="font-['Fraunces'] text-lg mb-3">{title}</h3>

      <ul className="space-y-2 mb-3">
        {localItems.map((item, index) => (
          <li key={index} className="flex items-start gap-2 group">
            {editingIndex === index ? (
              <>
                <Input
                  type="text"
                  value={editingText}
                  onChange={(e) => setEditingText(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === "Enter") saveEdit(index);
                    if (e.key === "Escape") cancelEdit();
                  }}
                  className="flex-1 border-black rounded-design font-['Inter'] text-sm"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => saveEdit(index)}
                  className="p-1 hover:bg-green-100 rounded transition-colors"
                  title="Save"
                >
                  <Check className="w-4 h-4 text-green-600" />
                </button>
                <button
                  type="button"
                  onClick={cancelEdit}
                  className="p-1 hover:bg-red-100 rounded transition-colors"
                  title="Cancel"
                >
                  <X className="w-4 h-4 text-red-600" />
                </button>
              </>
            ) : (
              <>
                <span
                  className="font-['Inter'] text-sm text-foreground/80 flex-1 cursor-pointer hover:text-foreground transition-colors py-1 px-2 -mx-2 rounded hover:bg-accent-grey/20"
                  onClick={() => !isLocked && startEditing(index, item)}
                  title={!isLocked ? "Click to edit" : ""}
                >
                  • {item}
                </span>
                {!isLocked ? (
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      type="button"
                      onClick={() => startEditing(index, item)}
                      className="p-1 hover:bg-blue-100 rounded transition-colors"
                      title="Edit"
                    >
                      <Pencil className="w-3 h-3 text-blue-600" />
                    </button>
                    <button
                      type="button"
                      onClick={() => removeItem(index)}
                      className="p-1 hover:bg-red-100 rounded transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-3 h-3 text-red-600" />
                    </button>
                  </div>
                ) : null}
              </>
            )}
          </li>
        ))}
      </ul>

      {!isLocked ? (
        <div className="flex gap-2">
          <Input
            type="text"
            value={newItem}
            onChange={(e) => setNewItem(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && addItem()}
            placeholder={`Add ${title.toLowerCase()}...`}
            className="flex-1 border-black rounded-design font-['Inter'] text-sm"
          />
          <Button
            type="button"
            onClick={addItem}
            size="sm"
            variant="outline"
            className="border-black rounded-design gap-1.5 px-3"
          >
            <Plus className="w-4 h-4" />
            Add
          </Button>
        </div>
      ) : null}

      {showUndo && historyIndex > 0 ? (
        <div className="mt-2">
          <Button
            type="button"
            onClick={handleUndo}
            size="sm"
            variant="outline"
            className="border-black rounded-design px-3"
          >
            <Undo2 className="w-4 h-4" />
            Undo
          </Button>
        </div>
      ) : null}
    </div>
  );
}
