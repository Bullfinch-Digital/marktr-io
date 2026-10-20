import { track } from "../../lib/analytics";

type Props = {
  title: string;
  benefit: string;
  cta: string;
  onAction: () => void;
  actionId?: string;
  trackId?: string;
};

export function DashboardNextActionCard({
  title,
  benefit,
  cta,
  onAction,
  actionId,
  trackId,
}: Props) {
  return (
    <section className="dashboard-lime-card p-5 sm:p-8" aria-label="What to do next">
      <p className="font-['Plus_Jakarta_Sans'] text-sm font-semibold uppercase tracking-[0.12em]">
        What to do next
      </p>
      <h2 className="mt-2 font-['Fraunces'] text-2xl leading-tight sm:text-[2rem]">{title}</h2>
      <p className="mt-2 max-w-2xl font-['Plus_Jakarta_Sans'] text-base leading-relaxed">{benefit}</p>
      <button
        type="button"
        onClick={() => {
          track("dashboard_next_action", actionId ? { action: actionId } : {});
          onAction();
        }}
        data-track-id={trackId}
        data-track-location={trackId ? "dashboard" : undefined}
        className="mt-5 inline-flex min-h-11 w-full items-center justify-center rounded-full border-2 border-brand-navy bg-brand-navy px-5 font-['Plus_Jakarta_Sans'] text-base font-semibold text-brand-lime hover:opacity-90 sm:w-auto"
      >
        {cta}
      </button>
    </section>
  );
}
