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
      <section className="app-card border-dashed p-6">
        <h2 className="font-['Fraunces'] text-2xl font-bold text-foreground">Brand story</h2>
        <p className="mt-2 font-['Plus_Jakarta_Sans'] text-sm text-muted-foreground max-w-xl">
          Capture your founding story, point of view, and positioning so Strategy and Content speak
          with one voice.
        </p>
        <Link
          to={startHref}
          className="app-text-link mt-4 inline-block font-['Plus_Jakarta_Sans'] text-sm"
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
    <section className="app-card p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h2 className="font-['Fraunces'] text-2xl font-bold text-foreground">Brand story</h2>
        <Link
          to={editHref}
          className="app-text-link font-['Plus_Jakarta_Sans'] text-sm"
        >
          Edit brand story →
        </Link>
      </div>
      <div className="mt-6 space-y-3">
        {snippets.slice(0, 3).map(({ label, body }) => (
          <div key={label}>
            <p className="font-['Plus_Jakarta_Sans'] text-[10px] uppercase tracking-widest text-muted-foreground">
              {label}
            </p>
            <p className="mt-1 font-['Fraunces'] text-base leading-relaxed text-foreground line-clamp-2">
              {body}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
