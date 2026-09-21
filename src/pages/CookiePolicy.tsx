import { useEffect } from "react";
import { Link } from "react-router-dom";
import {
  LegalH2,
  LegalH3,
  LegalP,
  LegalPageShell,
  LegalUl,
} from "../components/legal/LegalPageShell";
import {
  COMPANY_NAME,
  PRIVACY_POLICY_PATH,
  PRODUCT_NAME,
  SUPPORT_EMAIL,
  SUPPORT_MAILTO,
} from "../lib/legal";
import { COOKIE_CONSENT_STORAGE_KEY, GA_MEASUREMENT_ID } from "../lib/cookieConsent";

export default function CookiePolicy() {
  useEffect(() => {
    window.scrollTo(0, 0);
    document.title = `Cookie Policy | ${PRODUCT_NAME}`;

    let meta = document.querySelector('meta[name="description"]') as HTMLMetaElement | null;
    if (!meta) {
      meta = document.createElement("meta");
      meta.name = "description";
      document.head.appendChild(meta);
    }
    meta.content = `How ${PRODUCT_NAME} uses cookies and similar technologies in line with UK law.`;
  }, []);

  return (
    <LegalPageShell title="Cookie Policy" subtitle={COMPANY_NAME}>
      <LegalH2>1. Introduction</LegalH2>
      <LegalP>
        This Cookie Policy explains how {COMPANY_NAME} uses cookies and similar technologies when
        you visit or use {PRODUCT_NAME} at marktr.io (the &ldquo;Service&rdquo;).
      </LegalP>
      <LegalP>
        It should be read with our{" "}
        <Link className="underline" to={PRIVACY_POLICY_PATH}>
          Privacy Policy
        </Link>
        . Under UK law (including PECR and UK GDPR), we must tell you about the cookies we use and,
        for non-essential cookies, obtain your consent before placing them.
      </LegalP>

      <LegalH2>2. What are cookies?</LegalH2>
      <LegalP>
        Cookies are small text files stored on your device when you visit a website. We also use
        similar technologies such as local storage for essential preferences (for example, your
        cookie consent choice).
      </LegalP>

      <LegalH2>3. How we use cookies</LegalH2>
      <LegalP>We group cookies into the following categories:</LegalP>

      <LegalH3>3.1 Strictly necessary</LegalH3>
      <LegalP>
        These are required for the Service to function. They include authentication session storage,
        security tokens, and remembering your cookie consent choice. We do not need your consent for
        these, but you can block them in your browser — doing so may prevent you from signing in or
        using core features.
      </LegalP>

      <LegalH3>3.2 Analytics (optional)</LegalH3>
      <LegalP>
        With your consent, we use Google Analytics ({GA_MEASUREMENT_ID}) to understand how visitors
        use marktr — for example which pages are viewed and how users move through the site. This
        helps us improve the product. Analytics cookies are only activated if you click
        &ldquo;Accept all cookies&rdquo; on our banner.
      </LegalP>

      <LegalH3>3.3 Functional / third-party security</LegalH3>
      <LegalP>
        On some forms we use Cloudflare Turnstile to reduce spam and abuse. Turnstile may set cookies
        or use similar technologies as part of that security check.
      </LegalP>

      <LegalH2>4. Cookie and storage table</LegalH2>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-sm text-left border-collapse">
          <thead>
            <tr className="border-b border-black">
              <th className="py-2 pr-4 font-semibold">Name / key</th>
              <th className="py-2 pr-4 font-semibold">Type</th>
              <th className="py-2 pr-4 font-semibold">Purpose</th>
              <th className="py-2 font-semibold">Duration</th>
            </tr>
          </thead>
          <tbody className="text-foreground/80">
            <tr className="border-b border-border">
              <td className="py-3 pr-4 align-top">sb-*-auth-token</td>
              <td className="py-3 pr-4 align-top">Strictly necessary</td>
              <td className="py-3 pr-4 align-top">Keeps you signed in (Supabase authentication)</td>
              <td className="py-3 align-top">Session / as configured</td>
            </tr>
            <tr className="border-b border-border">
              <td className="py-3 pr-4 align-top">{COOKIE_CONSENT_STORAGE_KEY}</td>
              <td className="py-3 pr-4 align-top">Strictly necessary</td>
              <td className="py-3 pr-4 align-top">Stores your cookie consent preference</td>
              <td className="py-3 align-top">Persistent (local storage)</td>
            </tr>
            <tr className="border-b border-border">
              <td className="py-3 pr-4 align-top">marktr guest / app keys</td>
              <td className="py-3 pr-4 align-top">Strictly necessary</td>
              <td className="py-3 pr-4 align-top">Saves in-progress onboarding and guest work</td>
              <td className="py-3 align-top">Persistent (local storage)</td>
            </tr>
            <tr className="border-b border-border">
              <td className="py-3 pr-4 align-top">_ga, _ga_*</td>
              <td className="py-3 pr-4 align-top">Analytics (consent required)</td>
              <td className="py-3 pr-4 align-top">Google Analytics — usage statistics</td>
              <td className="py-3 align-top">Up to 2 years</td>
            </tr>
            <tr>
              <td className="py-3 pr-4 align-top">Turnstile cookies</td>
              <td className="py-3 pr-4 align-top">Functional</td>
              <td className="py-3 pr-4 align-top">Bot and spam prevention on forms</td>
              <td className="py-3 align-top">Varies (Cloudflare)</td>
            </tr>
          </tbody>
        </table>
      </div>

      <LegalH2>5. Managing your preferences</LegalH2>
      <LegalP>When you first visit marktr, you can:</LegalP>
      <LegalUl>
        <li>
          <strong>Accept all cookies</strong> — enables analytics in addition to essential cookies
        </li>
        <li>
          <strong>Reject non-essential</strong> — only strictly necessary cookies and storage are used
        </li>
      </LegalUl>
      <LegalP>
        You can also control cookies through your browser settings. To withdraw analytics consent
        after accepting, clear site data for marktr.io in your browser or use a private browsing
        window and choose &ldquo;Reject non-essential&rdquo; when prompted.
      </LegalP>
      <LegalP>
        For more on Google Analytics, see{" "}
        <a
          className="underline"
          href="https://policies.google.com/privacy"
          target="_blank"
          rel="noopener noreferrer"
        >
          Google&apos;s privacy policy
        </a>
        .
      </LegalP>

      <LegalH2>6. Changes</LegalH2>
      <LegalP>
        We may update this Cookie Policy when we change how we use cookies. The &ldquo;Last
        updated&rdquo; date at the top of this page will reflect the latest version.
      </LegalP>

      <LegalH2>7. Contact</LegalH2>
      <LegalP>
        Questions about cookies:{" "}
        <a className="underline" href={SUPPORT_MAILTO}>
          {SUPPORT_EMAIL}
        </a>
      </LegalP>
    </LegalPageShell>
  );
}
