import { useEffect, useMemo, useState } from "react";
import { Loader2, Mic, MicOff } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "./tooltip";
import { cn } from "./utils";
import { useWhisperInput } from "../../hooks/useWhisperInput";

export interface WhisperButtonProps {
  onTranscript: (text: string) => void;
  className?: string;
  disabled?: boolean;
}

export function WhisperButton({
  onTranscript,
  className,
  disabled = false,
}: WhisperButtonProps) {
  const { recording, transcribing, error, startRecording, stopAndTranscribe } =
    useWhisperInput();

  const [isSupported, setIsSupported] = useState<boolean | null>(null);
  const [displayError, setDisplayError] = useState<string | null>(null);

  useEffect(() => {
    setIsSupported(typeof MediaRecorder !== "undefined");
  }, []);

  useEffect(() => {
    if (!error) return;
    setDisplayError(error);
    const timeout = window.setTimeout(() => {
      setDisplayError(null);
    }, 3000);
    return () => window.clearTimeout(timeout);
  }, [error]);

  const tooltipLabel = useMemo(() => {
    if (transcribing) return "Transcribing...";
    if (recording) return "Click to stop";
    return "Speak your answer";
  }, [recording, transcribing]);

  if (isSupported !== true) {
    return null;
  }

  const handleClick = async () => {
    if (disabled || transcribing) return;

    if (recording) {
      const transcript = await stopAndTranscribe();
      if (transcript) onTranscript(transcript);
      return;
    }

    await startRecording();
  };

  const Icon = transcribing ? Loader2 : displayError ? MicOff : Mic;

  return (
    <div className={cn("flex flex-col items-end", className)}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            onClick={handleClick}
            disabled={disabled || transcribing}
            aria-label={tooltipLabel}
            className={cn(
              "inline-flex h-9 w-9 items-center justify-center rounded-full",
              "text-foreground/60 transition-colors",
              "hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              "disabled:cursor-not-allowed disabled:opacity-50",
              recording && "text-[#E8650A] animate-pulse",
              transcribing && "text-[#E8650A]",
              displayError && "text-destructive"
            )}
          >
            <Icon className={cn("h-4 w-4", transcribing && "animate-spin")} />
          </button>
        </TooltipTrigger>
        <TooltipContent side="top" sideOffset={8}>
          {tooltipLabel}
        </TooltipContent>
      </Tooltip>

      {displayError && (
        <p className="mt-1 max-w-[220px] text-right text-xs text-destructive">
          {displayError}
        </p>
      )}
    </div>
  );
}
