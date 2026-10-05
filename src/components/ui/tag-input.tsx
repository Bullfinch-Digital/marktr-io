import { useState, ClipboardEvent, KeyboardEvent, ChangeEvent } from "react";
import clsx from "clsx";

type TagInputProps = {
  label?: string;
  value: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
};

function dedupeTags(existing: string[], incoming: string[]) {
  const seen = new Set(existing.map((t) => t.toLowerCase()));
  const next = [...existing];
  for (const raw of incoming) {
    const tag = raw.trim();
    if (!tag) continue;
    const key = tag.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    next.push(tag);
  }
  return next;
}

export function TagInput({
  label,
  value,
  onChange,
  placeholder,
  disabled = false,
  className,
}: TagInputProps) {
  const [input, setInput] = useState("");
  const tags = value || [];

  const commitInput = (raw: string) => {
    const parts = raw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    if (parts.length === 0) {
      setInput("");
      return;
    }
    const next = dedupeTags(tags, parts);
    if (next !== tags) {
      onChange(next);
    }
    setInput("");
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (disabled) return;
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      commitInput(input);
      return;
    }
    if (e.key === "Backspace" && input === "" && tags.length > 0) {
      e.preventDefault();
      const next = [...tags.slice(0, -1)];
      onChange(next);
      return;
    }
  };

  const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    if (disabled) return;
    const text = e.clipboardData.getData("text");
    if (text && text.includes(",")) {
      e.preventDefault();
      commitInput(text);
    }
  };

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
  };

  const handleRemove = (idx: number) => {
    if (disabled) return;
    const next = tags.filter((_, i) => i !== idx);
    onChange(next);
  };

  return (
    <div className={clsx("space-y-2", className)}>
      {label && (
        <label className="font-['Plus_Jakarta_Sans'] text-sm text-foreground/70">
          {label}
        </label>
      )}
      <div
        className={clsx(
          "border border-black rounded-design px-3 py-2 flex flex-wrap gap-2 bg-white",
          disabled && "opacity-60 cursor-not-allowed"
        )}
      >
        {tags.map((tag, idx) => (
          <span
            key={`${tag}-${idx}`}
            className="inline-flex items-center gap-2 rounded-full border border-black px-3 py-1 bg-accent-grey/20 text-sm font-['Plus_Jakarta_Sans']"
          >
            {tag}
            {!disabled && (
              <button
                type="button"
                className="text-foreground/70 hover:text-foreground"
                onClick={() => handleRemove(idx)}
                aria-label={`Remove ${tag}`}
              >
                ×
              </button>
            )}
          </span>
        ))}
        <input
          type="text"
          value={input}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          disabled={disabled}
          placeholder={tags.length === 0 ? placeholder : ""}
          className="flex-1 min-w-[120px] bg-transparent outline-none font-['Plus_Jakarta_Sans'] text-sm text-foreground placeholder:text-foreground/40"
        />
      </div>
    </div>
  );
}
