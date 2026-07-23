import { useEffect, useMemo, useState } from "react";
import { Loader2, Mic, MicOff, Square, X } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "./tooltip";
import { cn } from "./utils";
import { useWhisperInput } from "../../hooks/useWhisperInput";

export interface WhisperButtonProps {
  onTranscript: (text: string) => void;
  className?: string;
  disabled?: boolean;
  /**
   * `field` — sits inside a text input (bottom-right), stronger visual weight.
   * `standalone` — companion control next to a field (legacy layout).
   */
  variant?: "field" | "standalone";
}

function formatElapsed(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function WhisperButton({
  onTranscript,
  className,
  disabled = false,
  variant = "standalone",
}: WhisperButtonProps) {
  const {
    recording,
    transcribing,
    error,
    startRecording,
    stopAndTranscribe,
    cancelRecording,
  } = useWhisperInput();

  const [isSupported, setIsSupported] = useState<boolean | null>(null);
  const [displayError, setDisplayError] = useState<string | null>(null);
  const [elapsedSec, setElapsedSec] = useState(0);
  const [justTranscribed, setJustTranscribed] = useState(false);

  useEffect(() => {
    setIsSupported(typeof MediaRecorder !== "undefined");
  }, []);

  useEffect(() => {
    if (!error) return;
    setDisplayError(error);
    const timeout = window.setTimeout(() => {
      setDisplayError(null);
    }, 4000);
    return () => window.clearTimeout(timeout);
  }, [error]);

  useEffect(() => {
    if (!recording) {
      setElapsedSec(0);
      return;
    }
    setElapsedSec(0);
    const id = window.setInterval(() => {
      setElapsedSec((n) => n + 1);
    }, 1000);
    return () => window.clearInterval(id);
  }, [recording]);

  useEffect(() => {
    if (!justTranscribed) return;
    const timeout = window.setTimeout(() => setJustTranscribed(false), 2500);
    return () => window.clearTimeout(timeout);
  }, [justTranscribed]);

  const idleLabel = "Tap to speak your answer";
  const tooltipLabel = useMemo(() => {
    if (transcribing) return "Turning your speech into text…";
    if (recording) return "Tap to stop recording";
    return idleLabel;
  }, [recording, transcribing]);

  if (isSupported !== true) {
    return null;
  }

  const handleStop = async () => {
    if (disabled || transcribing) return;
    const transcript = await stopAndTranscribe();
    if (transcript) {
      onTranscript(transcript);
      setJustTranscribed(true);
    }
  };

  const handleStart = async () => {
    if (disabled || transcribing) return;
    setJustTranscribed(false);
    await startRecording();
  };

  const isField = variant === "field";

  if (recording) {
    return (
      <div
        className={cn(
          "flex flex-col gap-1",
          isField ? "items-stretch w-full" : "items-end",
          className
        )}
      >
        <div
          className={cn(
            "flex items-center gap-2 rounded-design border border-black bg-white px-3 py-2 shadow-sm",
            isField && "w-full"
          )}
          role="status"
          aria-live="polite"
        >
          <span className="flex h-5 w-5 shrink-0 items-end justify-center gap-[3px]" aria-hidden>
            <span
              className="w-[3px] rounded-full bg-red-500"
              style={{
                height: "4px",
                animation: "bar-bounce-1 0.8s ease-in-out infinite",
              }}
            />
            <span
              className="w-[3px] rounded-full bg-red-500"
              style={{
                height: "8px",
                animation: "bar-bounce-2 0.8s ease-in-out 0.15s infinite",
              }}
            />
            <span
              className="w-[3px] rounded-full bg-red-500"
              style={{
                height: "6px",
                animation: "bar-bounce-3 0.8s ease-in-out 0.3s infinite",
              }}
            />
          </span>

          <div className="min-w-0 flex-1">
            <p className="font-['DM_Sans'] text-sm font-medium text-foreground">
              Recording… tap stop when done
            </p>
            <p className="font-['DM_Sans'] text-xs tabular-nums text-foreground/60">
              {formatElapsed(elapsedSec)}
            </p>
          </div>

          <button
            type="button"
            onClick={() => cancelRecording()}
            aria-label="Cancel recording"
            title="Cancel"
            className={cn(
              "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
              "text-foreground/60 transition-colors hover:bg-foreground/5 hover:text-foreground",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            )}
          >
            <X className="h-4 w-4" />
          </button>

          <button
            type="button"
            onClick={() => void handleStop()}
            aria-label="Stop recording"
            className={cn(
              "inline-flex h-9 items-center gap-1.5 rounded-full bg-[#0D1833] px-3",
              "font-['DM_Sans'] text-xs font-medium text-white transition-opacity hover:opacity-90",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            )}
          >
            <Square className="h-3.5 w-3.5 fill-current" />
            Stop
          </button>
        </div>
      </div>
    );
  }

  if (transcribing) {
    return (
      <div
        className={cn(
          "flex flex-col gap-1",
          isField ? "items-stretch w-full" : "items-end",
          className
        )}
      >
        <div
          className={cn(
            "flex items-center gap-2 rounded-design border border-black/20 bg-accent-grey/30 px-3 py-2",
            isField && "w-full"
          )}
          role="status"
          aria-live="polite"
        >
          <Loader2 className="h-4 w-4 shrink-0 animate-spin text-primary" />
          <p className="font-['DM_Sans'] text-sm text-foreground/80">
            Turning your speech into text you can edit…
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col", isField ? "items-end" : "items-end", className)}>
      {justTranscribed ? (
        <p
          className="mb-1 max-w-[220px] text-right font-['DM_Sans'] text-xs text-foreground/60"
          role="status"
        >
          Added to your answer — edit if you need to.
        </p>
      ) : null}

      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            onClick={() => void handleStart()}
            disabled={disabled}
            aria-label={idleLabel}
            className={cn(
              "inline-flex items-center justify-center rounded-full transition-colors",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              "disabled:cursor-not-allowed disabled:opacity-50",
              isField
                ? "h-10 w-10 border border-black bg-white text-[#0D1833] shadow-sm hover:bg-accent-grey/40"
                : "h-10 w-10 text-foreground/70 hover:bg-foreground/5 hover:text-foreground",
              displayError && "text-destructive border-destructive/40"
            )}
          >
            {displayError ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
          </button>
        </TooltipTrigger>
        <TooltipContent side="top" sideOffset={8}>
          {tooltipLabel}
        </TooltipContent>
      </Tooltip>

      {displayError && (
        <p className="mt-1 max-w-[240px] text-right font-['DM_Sans'] text-xs text-destructive">
          {displayError}
        </p>
      )}
    </div>
  );
}
