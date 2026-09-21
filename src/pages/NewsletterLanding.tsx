import { useEffect, useMemo } from "react";
import { Link, useLocation } from "react-router-dom";
import { Check, FileDown, Mail, ShieldCheck } from "lucide-react";
import { NewsletterSignup } from "../components/layout/NewsletterSignup";

const VALUE_POINTS = [
  "Free worksheets and guides that go with our long-form videos",
  "Short, practical emails on customers, content and growth",
  "Early access to new tools and templates before we announce them",
] as const;

function resolveSignupSource(search: string): string {
  const params = new URLSearchParams(search);
  const ref = params.get("ref") || params.get("utm_source") || params.get("utm_medium");
  const base = "newsletter-landing";
  if (!ref) return base;
  return `${base}-${ref}`.slice(0, 64);
}

export default function NewsletterLanding() {
  const location = useLocation();
  const signupSource = useMemo(() => resolveSignupSource(location.search), [location.search]);

  useEffect(() => {
    window.scrollTo(0, 0);
    document.title = "Join the marktr newsletter | Practical marketing for founders";

    let meta = document.querySelector('meta[name="description"]') as HTMLMetaElement | null;
    if (!meta) {
      meta = document.createElement("meta");
      meta.name = "description";
      document.head.appendChild(meta);
    }
    meta.content =
      "Free resources, practical marketing tips and founder-friendly support. No spam — unsubscribe anytime.";
  }, []);

  return (
    <main className="overflow-x-hidden bg-background">
      <section className="relative border-b border-border bg-[var(--feature-teal)]/25 py-16 sm:py-20 lg:py-24">
        <div
          className="pointer-events-none absolute inset-0 opacity-40"
          style={{
            backgroundImage:
              "linear-gradient(to right, rgba(13,24,51,0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(13,24,51,0.05) 1px, transparent 1px)",
            backgroundSize: "18px 18px",
          }}
        />
        <div className="container relative mx-auto grid max-w-6xl gap-12 px-4 sm:px-6 lg:grid-cols-2 lg:items-center lg:gap-16 lg:px-8">
          <div>
            <span className="mb-5 inline-flex items-center gap-2 rounded-full border border-black/20 bg-white/70 px-4 py-1.5 font-['DM_Sans'] text-xs font-medium uppercase tracking-[0.14em] text-[#0D1833]">
              <Mail className="h-3.5 w-3.5" />
              Free · No spam
            </span>

            <h1 className="font-['Fraunces'] text-4xl font-bold leading-[1.08] text-[#0D1833] sm:text-5xl lg:text-6xl">
              Marketing help for founders who&apos;d rather build than post.
            </h1>

            <p className="mt-6 max-w-xl font-['DM_Sans'] text-lg leading-relaxed text-[#0D1833]/80">
              Join the marktr list for occasional emails packed with value — the same practical
              ideas behind our YouTube videos, without the algorithm middleman.
            </p>

            <ul className="mt-8 space-y-3">
              {VALUE_POINTS.map((point) => (
                <li key={point} className="flex gap-3 font-['DM_Sans'] text-sm text-[#0D1833]/90 sm:text-base">
                  <Check className="mt-0.5 h-5 w-5 shrink-0 text-[#0D1833]" />
                  <span>{point}</span>
                </li>
              ))}
            </ul>

            <p className="mt-8 flex items-start gap-2 font-['DM_Sans'] text-sm text-[#0D1833]/70">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
              One-click unsubscribe. We never sell your email. Expect a few emails a month, not a
              daily barrage.
            </p>
          </div>

          <div className="rounded-2xl border border-black bg-white p-6 shadow-sm sm:p-8">
            <h2 className="font-['Fraunces'] text-2xl font-bold text-[#0D1833]">
              Get on the list
            </h2>
            <p className="mt-2 font-['DM_Sans'] text-sm text-muted-foreground sm:text-base">
              Enter your email — we&apos;ll send free resources and founder-friendly marketing
              support straight to your inbox.
            </p>

            <div className="mt-6">
              <NewsletterSignup
                variant="landing"
                source={signupSource}
                emailInputId="newsletter-landing-email"
                submitLabel="Join free"
              />
            </div>

            <p className="mt-4 text-center font-['DM_Sans'] text-xs text-muted-foreground">
              By subscribing you agree to our{" "}
              <Link to="/privacy-policy" className="underline text-foreground">
                Privacy Policy
              </Link>
              .
            </p>
          </div>
        </div>
      </section>

      <section className="py-14 sm:py-16">
        <div className="container mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <div className="rounded-2xl border border-black bg-white p-8 sm:p-10">
            <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
              <div className="max-w-xl">
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-button-green/30">
                  <FileDown className="h-5 w-5 text-[#0D1833]" />
                </div>
                <h2 className="font-['Fraunces'] text-2xl font-bold text-[#0D1833]">
                  Want something right now?
                </h2>
                <p className="mt-2 font-['DM_Sans'] text-sm leading-relaxed text-muted-foreground sm:text-base">
                  Browse our free PDF downloads — worksheets and templates from the channel. Same
                  email gate, instant access.
                </p>
              </div>
              <Link
                to="/downloads"
                className="inline-flex shrink-0 items-center justify-center rounded-design border border-black bg-button-green px-6 py-3 font-['Fraunces'] font-bold text-text-dark transition-colors hover:bg-button-green/90"
              >
                Browse free downloads
              </Link>
            </div>
          </div>

          <p className="mt-10 text-center font-['DM_Sans'] text-sm text-muted-foreground">
            Built by{" "}
            <a
              href="https://bullfinchdigital.com"
              className="underline hover:text-foreground"
              rel="noopener noreferrer"
            >
              Bullfinch Digital
            </a>
            . Questions?{" "}
            <a href="mailto:hello@bullfinchdigital.com" className="underline hover:text-foreground">
              hello@bullfinchdigital.com
            </a>
          </p>
        </div>
      </section>
    </main>
  );
}
