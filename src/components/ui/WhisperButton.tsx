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
              "inline-flex h-9 w-9 items-center justify-center rounded-full transition-colors",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              "disabled:cursor-not-allowed disabled:opacity-50",
              recording ? "bg-primary/10 text-primary" : "text-foreground/60 hover:text-foreground",
              transcribing && "text-primary",
              displayError && "text-destructive"
            )}
          >
            {recording ? (
              <span className="flex h-5 w-5 items-end justify-center gap-[3px]">
                <span
                  className="w-[3px] rounded-full bg-primary"
                  style={{
                    height: "4px",
                    animation: "bar-bounce-1 0.8s ease-in-out infinite",
                  }}
                />
                <span
                  className="w-[3px] rounded-full bg-primary"
                  style={{
                    height: "8px",
                    animation: "bar-bounce-2 0.8s ease-in-out 0.15s infinite",
                  }}
                />
                <span
                  className="w-[3px] rounded-full bg-primary"
                  style={{
                    height: "6px",
                    animation: "bar-bounce-3 0.8s ease-in-out 0.3s infinite",
                  }}
                />
              </span>
            ) : transcribing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : displayError ? (
              <MicOff className="h-4 w-4" />
            ) : (
              <Mic className="h-4 w-4" />
            )}
          </button>
        </TooltipTrigger>
        <TooltipContent side="top" sideOffset={8}>
          {tooltipLabel}
        </TooltipContent>
      </Tooltip>

      {displayError && (
        <p className="mt-1 max-w-[220px] text-right text-xs text-destructive">{displayError}</p>
      )}
    </div>
  );
}
