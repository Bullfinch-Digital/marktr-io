import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { LEGAL_LAST_UPDATED } from "../../lib/legal";

type LegalPageShellProps = {
  title: string;
  subtitle?: string;
  children: ReactNode;
};

export function LegalPageShell({ title, subtitle, children }: LegalPageShellProps) {
  return (
    <main className="bg-background py-16 sm:py-20 lg:py-24">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl">
          <Link to="/" className="text-sm underline font-['Fraunces']">
            ← Back to Home
          </Link>

          <header className="mt-6 rounded-design border border-black bg-accent-grey/20 p-6 sm:p-8">
            <h1 className="font-['Fraunces'] text-3xl sm:text-4xl lg:text-5xl font-bold text-text-dark">
              {title}
            </h1>
            {subtitle ? (
              <p className="mt-4 text-text-dark/80 leading-relaxed text-lg">{subtitle}</p>
            ) : null}
            <p className="mt-2 text-text-dark/70">Last updated: {LEGAL_LAST_UPDATED}</p>
          </header>

          <article className="mt-8 rounded-design border border-black bg-white p-6 sm:p-8 legal-prose">
            {children}
          </article>
        </div>
      </div>
    </main>
  );
}

export function LegalH2({ children }: { children: ReactNode }) {
  return <h2 className="mt-10 font-['Fraunces'] text-2xl sm:text-3xl font-bold first:mt-2">{children}</h2>;
}

export function LegalH3({ children }: { children: ReactNode }) {
  return <h3 className="mt-8 font-['Fraunces'] text-xl sm:text-2xl font-bold">{children}</h3>;
}

export function LegalP({ children }: { children: ReactNode }) {
  return <p className="mt-4 text-foreground/80 leading-relaxed">{children}</p>;
}

export function LegalUl({ children }: { children: ReactNode }) {
  return <ul className="mt-4 list-disc pl-6 space-y-2 text-foreground/80">{children}</ul>;
}
