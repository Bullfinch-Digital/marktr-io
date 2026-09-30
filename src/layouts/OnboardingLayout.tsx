import type { ReactNode } from "react";
import { Outlet } from "react-router-dom";
import { Header } from "../components/layout/Header";
import { useEdition } from "../contexts/EditionContext";
import type { EditionConfig } from "../lib/editionConfig";

function BullfinchHeader({ config }: { config: EditionConfig }) {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/80 backdrop-blur-md">
      <div className="container mx-auto flex h-16 items-center px-4 sm:px-6 lg:px-8">
        <a
          href={config.headerWordmark.href}
          className="flex items-center"
          rel="noopener noreferrer"
        >
          <span className="sr-only">{config.headerWordmark.label}</span>
          <span
            aria-hidden
            className="block h-8 w-44 bg-foreground"
            style={{
              maskImage: "url(/bullfinch/bullfinch-wordmark.png)",
              WebkitMaskImage: "url(/bullfinch/bullfinch-wordmark.png)",
              maskRepeat: "no-repeat",
              WebkitMaskRepeat: "no-repeat",
              maskPosition: "left center",
              WebkitMaskPosition: "left center",
              maskSize: "contain",
              WebkitMaskSize: "contain",
            }}
          />
        </a>
      </div>
    </header>
  );
}

function BullfinchFooter({ config }: { config: EditionConfig }) {
  return (
    <footer className="border-t border-border bg-background py-8">
      <div className="container mx-auto flex flex-col items-center gap-2 px-4 text-center font-body text-sm text-muted-foreground sm:px-6 lg:px-8">
        <p>
          {config.footer.copyright} ·{" "}
          <a
            href={config.footer.privacyHref}
            className="underline hover:text-foreground"
            rel="noopener noreferrer"
          >
            Privacy
          </a>
        </p>
        {config.footer.poweredBy ? (
          <a
            href={config.footer.poweredBy.href}
            className="text-xs underline hover:text-foreground"
            rel="noopener noreferrer"
          >
            {config.footer.poweredBy.label}
          </a>
        ) : null}
      </div>
    </footer>
  );
}

export default function OnboardingLayout({
  header,
  footer,
}: {
  header?: ReactNode;
  footer?: ReactNode;
}) {
  const { edition, config } = useEdition();
  const resolvedHeader =
    header ?? (edition === "bullfinch" ? <BullfinchHeader config={config} /> : <Header />);
  const resolvedFooter =
    footer !== undefined
      ? footer
      : edition === "bullfinch"
        ? <BullfinchFooter config={config} />
        : null;

  return (
    <>
      {resolvedHeader}
      <Outlet />
      {resolvedFooter}
    </>
  );
}
