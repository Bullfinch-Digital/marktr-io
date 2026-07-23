import type { ChangeEvent, ComponentProps } from "react";
import { Textarea } from "./textarea";
import { WhisperButton } from "./WhisperButton";
import { cn } from "./utils";

export const VOICE_ANSWER_PLACEHOLDER = "Type your answer… or tap the mic to speak.";

export type VoiceTextareaProps = Omit<ComponentProps<typeof Textarea>, "children"> & {
  onTranscript?: (text: string) => void;
  /** Extra classes for the outer relative wrapper. */
  wrapperClassName?: string;
  whisperDisabled?: boolean;
};

/**
 * Answer field with voice input inside the box (bottom-right),
 * shared by brand story, ICP onboarding, brand editor, etc.
 */
export function VoiceTextarea({
  value,
  onChange,
  onTranscript,
  placeholder = VOICE_ANSWER_PLACEHOLDER,
  className,
  wrapperClassName,
  whisperDisabled,
  disabled,
  ...rest
}: VoiceTextareaProps) {
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
    } as ChangeEvent<HTMLTextAreaElement>);
  };

  return (
    <div className={cn("relative w-full", wrapperClassName)}>
      <Textarea
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        disabled={disabled}
        className={cn("pb-14 pr-14", className)}
        {...rest}
      />
      <div className="pointer-events-none absolute inset-x-2 bottom-2 z-10 flex items-end justify-end gap-2">
        <div className="pointer-events-auto max-w-full">
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
