import {
  bullfinchScoreEmailCopy,
  type ScoreEmailCopy,
} from "../../supabase/functions/_shared/reportLeadEmail.ts";
import type { BfRoute } from "./bullfinchRouting";
import type { Edition } from "./edition";

export type NextStepLink = {
  label: string;
  href: string;
};

export type NextStepCopy = {
  heading: string;
  body: string;
  primary: NextStepLink;
  secondary: NextStepLink;
};

export function fillNextStepHref(
  template: string,
  vars: { url: string; publicToken: string; route: BfRoute },
): string {
  return template.replace(/\{(url|publicToken|route)\}/g, (_, key: keyof typeof vars) =>
    encodeURIComponent(vars[key]),
  );
}

export type CaptureTiming = "before-scan" | "after-results";

export type EditionConfig = {
  name: string;
  captureTiming: CaptureTiming;
  gateFindings: boolean;
  ga4Id: string;
  showMarktrNav: boolean;
  showBackToHome: boolean;
  showStoryLinks: boolean;
  showPaywallUpsell: boolean;
  cookieBannerTitle: string;
  cookieBannerBody: string;
  privacyUrl: string;
  headerWordmark: { href: string; label: string };
  footer: {
    copyright: string;
    privacyHref: string;
    poweredBy?: { href: string; label: string };
  };
  start: {
    eyebrow?: string;
    h1: string;
    lede: string;
    points?: string[];
    button: string;
  };
  titles: {
    healthCheck: string;
    healthCheckReport: string;
    description: string;
    reportEyebrow: string;
  };
  placeholders: {
    instagramHandle: string;
  };
  /** Display-score bands for colour. marktr keeps the original 70 / 40 split. */
  scoreBands: { high: number; mid: number };
  /**
   * When true, Social and Content with no handles render as "Not checked"
   * instead of a zero score. Display only; stored scores are unchanged.
   */
  showUnassessedAsNotChecked: boolean;
  unassessedSocial?: {
    label: string;
    cardLine: string;
    overallNote: string;
  };
  /** Bullfinch next-step copy and URLs. Absent on marktr so the upsell stays put. */
  nextSteps?: Record<BfRoute, NextStepCopy>;
  sendScore?: {
    heading: string;
    emailLabel: string;
    firstNameLabel: string;
    marketingOptIn: string;
    consent: string;
    privacyLabel: string;
    button: string;
    checking: string;
    success: string;
    error: string;
  };
  /** Visitor and internal score-email copy. Absent on marktr. */
  scoreEmail?: ScoreEmailCopy;
};

export const editionConfig: Record<Edition, EditionConfig> = {
  marktr: {
    name: "marktr",
    captureTiming: "before-scan",
    gateFindings: false,
    ga4Id: "G-0EFXQPEYY6",
    showMarktrNav: true,
    showBackToHome: true,
    showStoryLinks: true,
    showPaywallUpsell: true,
    cookieBannerTitle: "Cookies on marktr",
    cookieBannerBody:
      "We use essential cookies to run the site and, with your consent, analytics cookies to understand how marktr is used. You can change your mind anytime in your browser or read our Cookie Policy.",
    privacyUrl: "/privacy-policy",
    headerWordmark: { href: "/", label: "marktr" },
    footer: {
      copyright: "© marktr.io. Created and managed by Bullfinch Digital Ltd.",
      privacyHref: "/privacy-policy",
    },
    start: {
      h1: "Let's check your digital health.",
      lede:
        "Answer 5 quick questions and marktr will score your digital presence across the dimensions that matter most to founders.",
      button: "Start my digital health check →",
    },
    titles: {
      healthCheck: "Digital Health Check | marktr",
      healthCheckReport: "Digital Health Check | marktr",
      description:
        "Score your digital presence in about two minutes. Answer five questions and get a founder-focused health check from marktr.",
      reportEyebrow: "Your Digital Health Report",
    },
    placeholders: {
      instagramHandle: "marktr.io (or @marktr.io)",
    },
    scoreBands: { high: 70, mid: 40 },
    showUnassessedAsNotChecked: false,
  },
  bullfinch: {
    name: "Bullfinch Digital",
    captureTiming: "after-results",
    gateFindings: false,
    ga4Id: "G-0TEERX8V1N",
    showMarktrNav: false,
    showBackToHome: false,
    showStoryLinks: false,
    showPaywallUpsell: false,
    cookieBannerTitle: "Cookies on Bullfinch Digital",
    cookieBannerBody:
      "We use essential cookies to run this health check and, with your consent, analytics cookies to understand how it is used.",
    privacyUrl: "https://bullfinchdigital.com/privacy/",
    headerWordmark: {
      href: "https://bullfinchdigital.com",
      label: "Bullfinch Digital",
    },
    footer: {
      copyright: "© Bullfinch Digital Ltd",
      privacyHref: "https://bullfinchdigital.com/privacy/",
      poweredBy: { href: "https://marktr.io", label: "Scoring powered by marktr.io" },
    },
    start: {
      eyebrow: "Free marketing health check",
      h1: "Is your marketing as good as your business?",
      lede:
        "Pop in your website and we'll score your site, story, content and socials, and show you what to fix first. It takes a few minutes.",
      points: ["A score out of 100", "Your biggest gaps", "Where to start"],
      button: "Get my free score →",
    },
    titles: {
      healthCheck: "Free Marketing Health Check | Bullfinch Digital",
      healthCheckReport: "Your Marketing Health Check | Bullfinch Digital",
      description:
        "Find out in a few minutes how well your website, story, content and socials are working, and what to fix first.",
      reportEyebrow: "Your Marketing Health Check",
    },
    placeholders: {
      instagramHandle: "yourbusiness (or @yourbusiness)",
    },
    scoreBands: { high: 75, mid: 50 },
    showUnassessedAsNotChecked: true,
    unassessedSocial: {
      label: "Not checked",
      cardLine: "Add your Instagram for a full score",
      overallNote: "Based on your website and story. Add your Instagram for a full score.",
    },
    nextSteps: {
      talk: {
        heading: "Your reputation's ahead of your marketing.",
        body: "That's exactly the gap Bullfinch closes: the story, the right customer and a system that keeps your content running. We work with a small number of businesses at a time.",
        primary: {
          label: "Check availability →",
          href: "https://bullfinchdigital.com/contact/?website={url}&report={publicToken}&utm_source=healthcheck&utm_medium=results&utm_campaign=bf-healthcheck&utm_content={route}",
        },
        secondary: {
          label: "See how we work →",
          href: "https://bullfinchdigital.com/#system",
        },
      },
      polish: {
        heading: "You're in good shape.",
        body: "A strong score, with a few gains still on the table. If you'd like a second pair of eyes on the next step, we'd be glad to take a look.",
        primary: {
          label: "Get in touch →",
          href: "https://bullfinchdigital.com/contact/?website={url}&report={publicToken}&utm_source=healthcheck&utm_medium=results&utm_campaign=bf-healthcheck&utm_content={route}",
        },
        secondary: {
          label: "Free marketing resources →",
          href: "https://bullfinchdigital.com/resources/",
        },
      },
      diy: {
        heading: "You're at the building stage.",
        body: "The foundations come first, and you can build them yourself. marktr.io walks you through your story, your ideal customer and your content plan at your own pace.",
        primary: {
          label: "Start free on marktr.io →",
          href: "https://marktr.io/?utm_source=bullfinch&utm_medium=healthcheck&utm_campaign=bf-healthcheck&utm_content=diy",
        },
        secondary: {
          label: "Free resources →",
          href: "https://bullfinchdigital.com/resources/",
        },
      },
    },
    sendScore: {
      heading: "Send me my score",
      emailLabel: "Email",
      firstNameLabel: "First name (optional)",
      marketingOptIn: "Also send me occasional marketing tips",
      consent: "We'll email your report and won't share your details.",
      privacyLabel: "Privacy policy.",
      button: "Email my score",
      checking: "Checking…",
      success: "Sent. Check your inbox (and spam, just in case).",
      error: "We couldn't send that just now. Please try again.",
    },
    scoreEmail: bullfinchScoreEmailCopy,
  },
};
