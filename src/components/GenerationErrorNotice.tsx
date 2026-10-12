import { generationErrorMessage } from "../lib/generationError";

type Props = {
  failures: number;
  onRetry: () => void;
  retrying?: boolean;
  className?: string;
};

export function GenerationErrorNotice({
  failures,
  onRetry,
  retrying = false,
  className = "font-['Plus_Jakarta_Sans'] text-sm text-destructive",
}: Props) {
  if (failures < 1) return null;
  return (
    <div role="alert" className={className}>
      <p>{generationErrorMessage(failures)}</p>
      <button
        type="button"
        onClick={onRetry}
        disabled={retrying}
        className="mt-3 underline disabled:opacity-50"
      >
        Try again
      </button>
    </div>
  );
}
