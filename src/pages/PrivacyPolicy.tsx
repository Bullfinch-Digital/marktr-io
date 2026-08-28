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
  COOKIE_POLICY_PATH,
  PRODUCT_NAME,
  SUPPORT_EMAIL,
  SUPPORT_MAILTO,
  TERMS_PATH,
} from "../lib/legal";
import {
  MARKTR_PRO_ANNUAL_TOTAL_GBP,
  MARKTR_TRIAL_DAYS,
} from "../lib/marktrPricing";

export default function PrivacyPolicy() {
  useEffect(() => {
    window.scrollTo(0, 0);
    document.title = `Privacy Policy | ${PRODUCT_NAME}`;

    let meta = document.querySelector('meta[name="description"]') as HTMLMetaElement | null;
    if (!meta) {
      meta = document.createElement("meta");
      meta.name = "description";
      document.head.appendChild(meta);
    }
    meta.content = `How ${COMPANY_NAME} collects, uses, and protects your personal data when you use ${PRODUCT_NAME}.`;
  }, []);

  return (
    <LegalPageShell title="Privacy Policy" subtitle={COMPANY_NAME}>
      <LegalH2>1. Introduction</LegalH2>
      <LegalP>
        {COMPANY_NAME} (&ldquo;we&rdquo;, &ldquo;us&rdquo;, &ldquo;our&rdquo;) operates the{" "}
        {PRODUCT_NAME} application and website at marktr.io (the &ldquo;Service&rdquo;).
      </LegalP>
      <LegalP>
        We are committed to protecting your personal data and handling it responsibly in
        accordance with UK data protection law, including the UK GDPR and the Data Protection Act
        2018.
      </LegalP>
      <LegalP>
        This Privacy Policy explains what information we collect, how we use it, how it is stored,
        and your rights. It should be read alongside our{" "}
        <Link className="underline" to={TERMS_PATH}>
          Terms of Use
        </Link>{" "}
        and{" "}
        <Link className="underline" to={COOKIE_POLICY_PATH}>
          Cookie Policy
        </Link>
        .
      </LegalP>

      <LegalH2>2. Who we are</LegalH2>
      <LegalP>
        {COMPANY_NAME} is a company registered in the United Kingdom. For the purposes of UK data
        protection law, {COMPANY_NAME} is the data controller of your personal data.
      </LegalP>
      <LegalP>
        Contact:{" "}
        <a className="underline" href={SUPPORT_MAILTO}>
          {SUPPORT_EMAIL}
        </a>
      </LegalP>

      <LegalH2>3. What data we collect</LegalH2>

      <LegalH3>3.1 Account information</LegalH3>
      <LegalUl>
        <li>Name</li>
        <li>Email address</li>
        <li>Password (stored securely by our authentication provider; we do not store plain-text passwords)</li>
        <li>Contact number (if you provide one, e.g. beta signup)</li>
      </LegalUl>

      <LegalH3>3.2 Payment information</LegalH3>
      <LegalP>
        Payments are processed by Stripe. We do not store your full card details. Stripe may
        process billing name, billing address, card details, and transaction history under its own
        privacy policy.
      </LegalP>

      <LegalH3>3.3 Content you create</LegalH3>
      <LegalP>We store information you input into the platform, including:</LegalP>
      <LegalUl>
        <li>Ideal customer profiles (ICPs), brand stories, and marketing strategies</li>
        <li>Health-check inputs and reports</li>
        <li>Content briefs and generated marketing materials</li>
        <li>Edits, exports, and other user-generated content</li>
      </LegalUl>

      <LegalH3>3.4 Usage and technical data</LegalH3>
      <LegalUl>
        <li>Pages visited and features used</li>
        <li>Device, browser, and operating system information</li>
        <li>IP address (which may be truncated or anonymised where possible)</li>
        <li>Session and error logs needed to operate and secure the Service</li>
      </LegalUl>

      <LegalH3>3.5 Lead and marketing signups</LegalH3>
      <LegalP>
        If you request a resource download, join our newsletter, or complete an onboarding lead
        form, we collect your email address and related metadata (e.g. source, timestamp) to fulfil
        your request and, where permitted, send relevant communications.
      </LegalP>

      <LegalH3>3.6 Cookies</LegalH3>
      <LegalP>
        We use cookies and similar technologies as described in our{" "}
        <Link className="underline" to={COOKIE_POLICY_PATH}>
          Cookie Policy
        </Link>
        . Non-essential analytics cookies are only used with your consent.
      </LegalP>

      <LegalH2>4. How we use your data</LegalH2>
      <LegalUl>
        <li>Provide, maintain, and improve the Service</li>
        <li>Generate AI-assisted outputs based on your inputs</li>
        <li>Manage free, trial, and paid accounts</li>
        <li>Process payments and prevent fraud</li>
        <li>Send service-related emails (account, security, billing)</li>
        <li>Send marketing communications where you have opted in</li>
        <li>Analyse usage to improve the product (with consent where required)</li>
        <li>Comply with legal obligations</li>
      </LegalUl>

      <LegalH2>5. AI processing</LegalH2>
      <LegalP>
        {PRODUCT_NAME} uses third-party AI providers (including OpenAI) to generate outputs from
        information you submit. Your content may be transmitted to those providers for processing.
        They act as data processors under appropriate agreements. We do not sell your personal
        data.
      </LegalP>

      <LegalH2>6. Marketing communications</LegalH2>
      <LegalP>
        We only send marketing emails where we have a lawful basis to do so — for example, where you
        have opted in via a newsletter signup or marketing preference. You can unsubscribe at any
        time using the link in any marketing email.
      </LegalP>
      <LegalP>
        Account-related and transactional messages (e.g. password resets, billing, trial reminders)
        are not marketing and may be sent as necessary to provide the Service.
      </LegalP>

      <LegalH2>7. Free access, trials, and paid plans</LegalH2>
      <LegalP>
        You may use parts of {PRODUCT_NAME} for free. Marktr Pro is offered on an annual
        subscription with a {MARKTR_TRIAL_DAYS}-day free trial, then £{MARKTR_PRO_ANNUAL_TOTAL_GBP}
        /year unless cancelled. See our{" "}
        <Link className="underline" to={TERMS_PATH}>
          Terms of Use
        </Link>{" "}
        for full billing details.
      </LegalP>

      <LegalH2>8. Lawful basis for processing</LegalH2>
      <LegalP>Under UK GDPR, we rely on:</LegalP>
      <LegalUl>
        <li>Contract — to provide the Service you sign up for</li>
        <li>Legitimate interests — to improve, secure, and protect the platform</li>
        <li>Consent — for non-essential cookies and optional marketing</li>
        <li>Legal obligation — for accounting, tax, and regulatory compliance</li>
      </LegalUl>

      <LegalH2>9. Data storage, processors, and security</LegalH2>
      <LegalP>We use reputable providers including:</LegalP>
      <LegalUl>
        <li>Supabase (database and authentication)</li>
        <li>Vercel (application hosting)</li>
        <li>Stripe (payments)</li>
        <li>OpenAI (AI processing)</li>
        <li>Cloudflare Turnstile (spam prevention on forms)</li>
        <li>Google Analytics (usage analytics, with consent)</li>
      </LegalUl>
      <LegalP>
        Some providers may process data outside the UK. Where this occurs, we rely on appropriate
        safeguards such as UK adequacy regulations or Standard Contractual Clauses.
      </LegalP>
      <LegalP>
        We implement reasonable technical and organisational measures to protect your data from
        loss, misuse, or unauthorised access.
      </LegalP>

      <LegalH2>10. Data retention</LegalH2>
      <LegalP>We retain personal data:</LegalP>
      <LegalUl>
        <li>While your account remains active</li>
        <li>As required for legal, tax, or regulatory obligations</li>
        <li>For a reasonable period after account closure unless you request earlier deletion</li>
      </LegalUl>
      <LegalP>You may request deletion of your account and associated data at any time.</LegalP>

      <LegalH2>11. Your rights</LegalH2>
      <LegalP>Under UK data protection law, you have the right to:</LegalP>
      <LegalUl>
        <li>Access your personal data</li>
        <li>Correct inaccurate data</li>
        <li>Request erasure</li>
        <li>Restrict or object to processing</li>
        <li>Request data portability</li>
        <li>Withdraw consent (where processing is based on consent)</li>
      </LegalUl>
      <LegalP>
        To exercise your rights, contact{" "}
        <a className="underline" href={SUPPORT_MAILTO}>
          {SUPPORT_EMAIL}
        </a>
        . You may also complain to the Information Commissioner&apos;s Office (ICO).
      </LegalP>

      <LegalH2>12. Data sharing</LegalH2>
      <LegalP>We do not sell your personal data. We may share data with:</LegalP>
      <LegalUl>
        <li>Service providers listed above, under contract</li>
        <li>Professional advisers where necessary</li>
        <li>Law enforcement or regulators where required by law</li>
      </LegalUl>

      <LegalH2>13. Children</LegalH2>
      <LegalP>
        The Service is not intended for anyone under 18. We do not knowingly collect data from
        children.
      </LegalP>

      <LegalH2>14. Changes to this policy</LegalH2>
      <LegalP>
        We may update this Privacy Policy from time to time. Material changes will be communicated
        via the platform or email where appropriate. The &ldquo;Last updated&rdquo; date shows the
        most recent revision.
      </LegalP>

      <LegalH2>15. Contact</LegalH2>
      <LegalP>
        {COMPANY_NAME}
        <br />
        Email:{" "}
        <a className="underline" href={SUPPORT_MAILTO}>
          {SUPPORT_EMAIL}
        </a>
      </LegalP>
    </LegalPageShell>
  );
}
