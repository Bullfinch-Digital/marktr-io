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
  PRIVACY_POLICY_PATH,
  PRODUCT_NAME,
  SUPPORT_EMAIL,
  SUPPORT_MAILTO,
} from "../lib/legal";
import {
  MARKTR_MONEY_BACK_DAYS,
  MARKTR_PRO_ANNUAL_TOTAL_GBP,
  MARKTR_TRIAL_DAYS,
} from "../lib/marktrPricing";

export default function TermsOfService() {
  useEffect(() => {
    window.scrollTo(0, 0);
    document.title = `Terms of Use | ${PRODUCT_NAME}`;

    let meta = document.querySelector('meta[name="description"]') as HTMLMetaElement | null;
    if (!meta) {
      meta = document.createElement("meta");
      meta.name = "description";
      document.head.appendChild(meta);
    }
    meta.content = `Terms of Use for ${PRODUCT_NAME} — subscriptions, acceptable use, billing, and legal conditions.`;
  }, []);

  return (
    <LegalPageShell
      title="Terms of Use"
      subtitle={`${PRODUCT_NAME} — operated by ${COMPANY_NAME}`}
    >
      <LegalH2>1. Introduction</LegalH2>
      <LegalP>
        These Terms of Use (&ldquo;Terms&rdquo;) govern your access to and use of {PRODUCT_NAME}{" "}
        (the &ldquo;Service&rdquo;), operated by {COMPANY_NAME}, a company registered in the United
        Kingdom.
      </LegalP>
      <LegalP>
        By creating an account, starting a trial, or otherwise using the Service, you agree to these
        Terms. If you do not agree, you must not use the Service.
      </LegalP>
      <LegalP>
        For legal notices:{" "}
        <a className="underline" href={SUPPORT_MAILTO}>
          {SUPPORT_EMAIL}
        </a>
      </LegalP>

      <LegalH2>2. Eligibility</LegalH2>
      <LegalP>You must:</LegalP>
      <LegalUl>
        <li>Be at least 18 years old</li>
        <li>Have the legal capacity to enter into a binding agreement</li>
        <li>Provide accurate and complete account information</li>
      </LegalUl>

      <LegalH2>3. Description of the Service</LegalH2>
      <LegalP>
        {PRODUCT_NAME} is a marketing intelligence platform that helps you define ideal customers,
        shape your brand story, run digital health checks, build strategies, and generate content.
      </LegalP>
      <LegalP>
        The Service provides marketing guidance only. It does not provide legal, financial, tax, or
        business advice. We make no guarantees regarding business outcomes, revenue, advertising
        performance, or commercial success.
      </LegalP>

      <LegalH2>4. Subscriptions, billing, and payments</LegalH2>

      <LegalH3>4.1 Marktr Pro</LegalH3>
      <LegalP>
        Paid access is offered as Marktr Pro on an annual subscription basis at £
        {MARKTR_PRO_ANNUAL_TOTAL_GBP}/year (plus VAT where applicable).
      </LegalP>

      <LegalH3>4.2 Free trial</LegalH3>
      <LegalP>
        We offer a {MARKTR_TRIAL_DAYS}-day free trial on Marktr Pro. Unless you cancel before the
        trial ends, your subscription will automatically convert to a paid annual subscription and
        you will be charged £{MARKTR_PRO_ANNUAL_TOTAL_GBP}/year (plus VAT where applicable).
      </LegalP>

      <LegalH3>4.3 Billing</LegalH3>
      <LegalUl>
        <li>All payments are processed securely via Stripe.</li>
        <li>By subscribing, you authorise recurring annual charges after any free trial.</li>
        <li>Prices may be subject to VAT or other applicable taxes.</li>
      </LegalUl>

      <LegalH3>4.4 Cancellation</LegalH3>
      <LegalP>
        You may cancel your subscription at any time. Cancellation stops future billing. Access to
        paid features continues until the end of your current billing period.
      </LegalP>

      <LegalH3>4.5 Money-back guarantee</LegalH3>
      <LegalP>
        If you are dissatisfied with your first paid charge, you may request a full refund within{" "}
        {MARKTR_MONEY_BACK_DAYS} days of that payment by emailing{" "}
        <a className="underline" href={SUPPORT_MAILTO}>
          {SUPPORT_EMAIL}
        </a>
        . Refunds are granted at our discretion in good faith and apply to first-time paid
        subscriptions only.
      </LegalP>

      <LegalH2>5. User accounts</LegalH2>
      <LegalP>You are responsible for maintaining the confidentiality of your login credentials and for all activity under your account.</LegalP>
      <LegalP>We may suspend or terminate accounts if you breach these Terms, use the Service unlawfully, or engage in abusive or fraudulent behaviour.</LegalP>

      <LegalH2>6. Acceptable use</LegalH2>
      <LegalP>You agree not to use {PRODUCT_NAME} to:</LegalP>
      <LegalUl>
        <li>Generate unlawful, harmful, or defamatory content</li>
        <li>Infringe intellectual property rights</li>
        <li>Upload or distribute malicious software</li>
        <li>Attempt unauthorised access to systems or data</li>
        <li>Disrupt or harm other users or the Service</li>
      </LegalUl>

      <LegalH2>7. Intellectual property</LegalH2>
      <LegalH3>7.1 Your content</LegalH3>
      <LegalP>
        You retain ownership of the ICPs, brand materials, strategies, and other content you create
        using the Service.
      </LegalP>
      <LegalH3>7.2 Our platform</LegalH3>
      <LegalP>
        All platform software, branding, design, and system architecture remain the intellectual
        property of {COMPANY_NAME}.
      </LegalP>
      <LegalH3>7.3 Anonymised data</LegalH3>
      <LegalP>
        You grant us the right to use anonymised and aggregated data to analyse usage and improve
        the Service. We will not intentionally use personally identifiable information for external
        model training.
      </LegalP>

      <LegalH2>8. Data protection and privacy</LegalH2>
      <LegalP>
        Your use of the Service is also governed by our{" "}
        <Link className="underline" to={PRIVACY_POLICY_PATH}>
          Privacy Policy
        </Link>{" "}
        and{" "}
        <Link className="underline" to={COOKIE_POLICY_PATH}>
          Cookie Policy
        </Link>
        . We process personal data in accordance with UK GDPR and applicable UK data protection
        laws.
      </LegalP>

      <LegalH2>9. Service availability</LegalH2>
      <LegalP>
        We aim to provide reliable access but do not guarantee uninterrupted availability. We may
        modify features, perform maintenance, or discontinue aspects of the Service. We are not
        liable for downtime beyond our reasonable control.
      </LegalP>

      <LegalH2>10. Limitation of liability</LegalH2>
      <LegalP>To the maximum extent permitted by UK law:</LegalP>
      <LegalUl>
        <li>The Service is provided &ldquo;as is&rdquo; without warranties of specific outcomes.</li>
        <li>
          We do not guarantee marketing results, advertising performance, revenue, or business
          success.
        </li>
        <li>
          {COMPANY_NAME} shall not be liable for indirect, consequential, or loss-of-profit damages.
        </li>
      </LegalUl>
      <LegalP>
        Our total liability arising from your use of the Service shall not exceed the amount you
        paid in subscription fees during the preceding 12 months.
      </LegalP>
      <LegalP>
        Nothing in these Terms excludes liability for fraud, death, or personal injury caused by
        negligence where prohibited by law.
      </LegalP>

      <LegalH2>11. Termination</LegalH2>
      <LegalP>
        You may stop using the Service at any time. We may suspend or terminate access for breach of
        these Terms or non-payment. Upon termination, paid feature access ends at the close of your
        billing period.
      </LegalP>

      <LegalH2>12. Changes to these Terms</LegalH2>
      <LegalP>
        We may update these Terms from time to time. Material changes will be communicated via the
        platform or email. Continued use after changes constitutes acceptance of the revised Terms.
      </LegalP>

      <LegalH2>13. Governing law</LegalH2>
      <LegalP>
        These Terms are governed by the laws of England and Wales. Disputes are subject to the
        exclusive jurisdiction of the courts of England and Wales.
      </LegalP>

      <LegalH2>14. Contact</LegalH2>
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
