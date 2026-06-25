import { Link } from "react-router-dom";
import type { BrandStoryFinding } from "../../lib/brandStory";

type BrandStoryFindingsSectionProps = {
  findings: BrandStoryFinding[];
  variant: "guest" | "authenticated";
};

export function BrandStoryFindingsSection({
  findings,
  variant,
}: BrandStoryFindingsSectionProps) {
  if (!findings.length) return null;

  return (
    <section className="mt-10 rounded-2xl border border-border bg-white p-6 sm:p-8">
      <h2 className="font-['Fraunces'] text-2xl font-bold text-[#0D1833]">
        Where your story can go further
      </h2>
      <p className="mt-3 font-['DM_Sans'] text-sm leading-relaxed text-muted-foreground">
        You&apos;ve got a real story here — that&apos;s the hard part, and it&apos;s already done.
        Here&apos;s the honest bit: a few things could make it work a lot harder for you.
      </p>

      <ul className="mt-6 space-y-5">
        {findings.map((finding, index) => (
          <li key={`${finding.title}-${index}`} className="border-t border-border pt-5 first:border-t-0 first:pt-0">
            <h3 className="font-['Fraunces'] text-lg font-semibold text-[#0D1833]">{finding.title}</h3>
            <p className="mt-2 font-['DM_Sans'] text-sm leading-relaxed text-foreground/80">
              {finding.recommendation}
            </p>
          </li>
        ))}
      </ul>

      {variant === "authenticated" ? (
        <div className="mt-8 rounded-2xl bg-[#0D1833]/5 px-5 py-5">
          <p className="font-['DM_Sans'] text-sm leading-relaxed text-foreground/80">
            Use Strategy to turn this story into content plans, campaigns, and posts that sound
            like you — built around who you&apos;re actually for.
          </p>
          <Link
            to="/strategy"
            className="mt-4 inline-flex items-center justify-center rounded-full bg-primary px-6 py-3 font-['DM_Sans'] text-sm font-medium text-primary-foreground hover:opacity-90"
          >
            Go to Strategy →
          </Link>
        </div>
      ) : null}
    </section>
  );
}
