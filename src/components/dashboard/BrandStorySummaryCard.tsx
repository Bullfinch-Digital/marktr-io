import { Link } from "react-router-dom";
import type { BrandStoryOutput } from "../../lib/brandStory";

type Props = {
  story: BrandStoryOutput | null;
  editHref?: string;
  startHref?: string;
};

/** Brand story summary for the authenticated dashboard cockpit. */
export function BrandStorySummaryCard({
  story,
  editHref = "/story-report",
  startHref = "/story",
}: Props) {
  if (!story) {
    return (
      <section className="rounded-2xl border border-dashed border-border bg-white p-6">
        <h2 className="font-['Fraunces'] text-2xl font-bold text-[#0D1833]">Brand story</h2>
        <p className="mt-2 font-['DM_Sans'] text-sm text-muted-foreground max-w-xl">
          Capture your founding story, point of view, and positioning so Strategy and Content speak
          with one voice.
        </p>
        <Link
          to={startHref}
          className="mt-4 inline-block font-['DM_Sans'] text-sm font-semibold text-primary hover:underline"
        >
          Start brand story →
        </Link>
      </section>
    );
  }

  const snippets = [
    { label: "Positioning", body: story.positioningStatement },
    { label: "Purpose", body: story.brandPurpose },
    { label: "Point of view", body: story.pointOfView },
  ].filter((s) => s.body?.trim());

  return (
    <section className="rounded-2xl border border-border bg-white p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h2 className="font-['Fraunces'] text-2xl font-bold text-[#0D1833]">Brand story</h2>
        <Link
          to={editHref}
          className="font-['DM_Sans'] text-sm font-medium text-primary hover:underline"
        >
          Edit brand story →
        </Link>
      </div>
      <div className="mt-4 space-y-3">
        {snippets.slice(0, 3).map(({ label, body }) => (
          <div key={label}>
            <p className="font-['DM_Sans'] text-[10px] uppercase tracking-widest text-muted-foreground">
              {label}
            </p>
            <p className="mt-1 font-['Fraunces'] text-base leading-relaxed text-[#0D1833] line-clamp-2">
              {body}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
