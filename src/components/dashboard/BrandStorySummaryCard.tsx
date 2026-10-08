import { Link } from "react-router-dom";
import type { BrandStoryOutput } from "../../lib/brandStory";
import { ViewEditButton } from "../ui/ViewEditButton";

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
      <section className="app-card border-dashed p-8">
        <h2 className="app-heading font-['Fraunces'] text-2xl text-foreground">Brand story</h2>
        <p className="mt-2 max-w-xl font-['Plus_Jakarta_Sans'] text-base text-muted-foreground">
          Capture your founding story, point of view, and positioning so Strategy and Content speak
          with one voice.
        </p>
        <Link to={startHref} className="app-text-link mt-4 font-['Plus_Jakarta_Sans']">
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
    <section className="app-card p-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h2 className="app-heading font-['Fraunces'] text-2xl text-foreground">Brand story</h2>
        <ViewEditButton href={editHref} />
      </div>
      <div className="mt-6 space-y-3">
        {snippets.slice(0, 3).map(({ label, body }) => (
          <div key={label} className="app-card-nested p-4">
            <p className="font-['Plus_Jakarta_Sans'] text-sm font-medium uppercase tracking-widest text-muted-foreground">
              {label}
            </p>
            <p className="app-heading mt-1 line-clamp-2 font-['Fraunces'] text-base leading-relaxed text-foreground">
              {body}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
