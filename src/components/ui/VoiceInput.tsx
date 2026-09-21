import type { ChangeEvent, ComponentProps } from "react";
import { Input } from "./input";
import { WhisperButton } from "./WhisperButton";
import { cn } from "./utils";

export const VOICE_INPUT_PLACEHOLDER_HINT = " or tap the mic to speak";

export type VoiceInputProps = Omit<ComponentProps<typeof Input>, "children"> & {
  onTranscript?: (text: string) => void;
  wrapperClassName?: string;
  whisperDisabled?: boolean;
};

/**
 * Single-line input with voice control inside the field (right side).
 */
export function VoiceInput({
  value,
  onChange,
  onTranscript,
  placeholder,
  className,
  wrapperClassName,
  whisperDisabled,
  disabled,
  ...rest
}: VoiceInputProps) {
  const resolvedPlaceholder =
    placeholder && !placeholder.toLowerCase().includes("mic")
      ? `${placeholder.replace(/\.*$/, "")}… or tap the mic to speak.`
      : placeholder ?? "Type… or tap the mic to speak.";

  const appendTranscript = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    if (onTranscript) {
      onTranscript(trimmed);
      return;
    }
    if (!onChange) return;
    const current = typeof value === "string" ? value : "";
    const next = current.trim() ? `${current.trim()} ${trimmed}` : trimmed;
    onChange({
      target: { value: next },
    } as ChangeEvent<HTMLInputElement>);
  };

  return (
    <div className={cn("relative w-full overflow-visible", wrapperClassName)}>
      <Input
        value={value}
        onChange={onChange}
        placeholder={resolvedPlaceholder}
        disabled={disabled}
        className={cn("pr-14", className)}
        {...rest}
      />
      {/* Idle mic sits inside the field; recording/transcribe bars expand full-width over it */}
      <div className="pointer-events-none absolute inset-1.5 z-10 flex items-start justify-end">
        <div className="pointer-events-auto w-auto max-w-full [&:has([role=status])]:w-full">
          <WhisperButton
            variant="field"
            disabled={disabled || whisperDisabled}
            onTranscript={appendTranscript}
          />
        </div>
      </div>
    </div>
  );
}
