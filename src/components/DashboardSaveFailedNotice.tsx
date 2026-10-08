type DashboardSaveFailedNoticeProps = {
  onRetry: () => void;
  retrying?: boolean;
};

export function DashboardSaveFailedNotice({
  onRetry,
  retrying = false,
}: DashboardSaveFailedNoticeProps) {
  return (
    <div
      className="mb-6 flex flex-wrap items-center gap-3 rounded-xl border border-border bg-white px-4 py-3"
      role="status"
    >
      <p className="font-body text-sm text-foreground">
        We couldn&apos;t save these results to your dashboard. Try again.
      </p>
      <button
        type="button"
        onClick={onRetry}
        disabled={retrying}
        className="shrink-0 rounded-full border-2 border-brand-stroke bg-brand-lime px-4 py-1.5 min-h-9 font-body text-sm font-semibold text-brand-navy hover:bg-brand-lime-hover disabled:opacity-60"
      >
        {retrying ? "Retrying…" : "Retry"}
      </button>
    </div>
  );
}
