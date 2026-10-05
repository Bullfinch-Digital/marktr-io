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
  /** Rotating scan lines. A line with when: "instagram" is skipped unless a handle was entered. */
  scanLines: Array<{ text: string; when?: "instagram" }>;
  /** Display-score bands for colour. marktr keeps the original 70 / 40 split. */
  scoreBands: { high: number; mid: number };
  /**
   * When true, Social and Content with no handles render as "Not checked"
   * instead of a zero score. The stored overall excludes those zeros.
   */
  showUnassessedAsNotChecked: boolean;
  unassessedSocial?: {
    label: string;
    cardLine: string;
    overallNote: string;
  };
  /** Instagram was found, but posting dates could not be read. Bullfinch only. */
  unassessedContent?: {
    label: string;
    cardLine: string;
  };
  /** Bullfinch next-step copy and URLs. Absent on marktr so the upsell stays put. */
  nextSteps?: Record<BfRoute, NextStepCopy>;
  /** Sentence under the bottom route CTA. Bullfinch only. */
  callNote?: string;
  /** Lowest-pillar panel above the cards. Bullfinch only. */
  spotlight?: { heading: string; follow: string };
  /** Shown on a pillar card scoring under 75. Bullfinch only. */
  pillarHelp?: Partial<Record<"Website Clarity" | "Brand Story" | "Social Presence" | "Content Consistency", string>>;
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
    throttled: string;
  };
  /** Visitor and internal score-email copy. Absent on marktr. */
  scoreEmail?: ScoreEmailCopy;
  /**
   * Replaces the overall cap line when Social or Content was not checked.
   * The cap still applies to the number.
   */
  partialScoreCapNote: string;
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
    scanLines: [
      { text: "Comparing your positioning against industry benchmarks..." },
      { text: "Identifying your biggest growth opportunities..." },
      { text: "Building your personalised recommendations..." },
      { text: "Almost there — preparing your report..." },
    ],
    scoreBands: { high: 70, mid: 40 },
    partialScoreCapNote:
      "Your website and story are in great shape. The part we couldn't see is your social, and that's often where the gap is.",
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
    scanLines: [
      { text: "Reading your homepage the way a new customer would…" },
      { text: "Looking for the story behind the business…" },
      { text: "Checking whether it's clear who you're for…" },
      { text: "Seeing how your Instagram lines up with your website…", when: "instagram" },
      { text: "Looking at how often you're showing up…" },
      { text: "Spotting what's already working — there's usually more than people think…" },
      { text: "Working out the one thing worth fixing first…" },
      { text: "Writing up your report…" },
    ],
    scoreBands: { high: 75, mid: 50 },
    showUnassessedAsNotChecked: true,
    unassessedSocial: {
      label: "Not checked",
      cardLine: "Add your Instagram for a full score",
      overallNote: "Based on your website and story. Add your Instagram for a full score.",
    },
    unassessedContent: {
      label: "Not checked",
      cardLine: "We found your Instagram, but couldn't read when you last posted, so this isn't scored.",
    },
    partialScoreCapNote:
      "Your website and story are in great shape. The part we couldn't see is your social — and for businesses like yours, that's usually where the gap is.",
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
    callNote:
      "On a call we'll go through your report together and show you what we'd fix first and why — you'll come away with a clear next step whether or not we work together.",
    spotlight: {
      heading: "Where we'd start",
      follow:
        "That's the kind of thing we'd map out together — what to fix, in what order, and what it's worth to your business.",
    },
    pillarHelp: {
      "Website Clarity":
        "We rework homepages around one clear promise and the customer it's for — usually the quickest win we find.",
      "Brand Story":
        "Story is where every Bullfinch project starts — we draw it out of you and turn it into the line everything else hangs off.",
      "Social Presence":
        "We build a simple weekly content system around your story, so posting stops being guesswork.",
      "Content Consistency":
        "We can help plan and shoot content with you each month, so there's always something good ready to go out.",
    },
    sendScore: {
      heading: "Send me my score",
      emailLabel: "Email",
      firstNameLabel: "First name (optional)",
      marketingOptIn: "Also send me occasional marketing tips",
      consent:
        "We'll email your report, and Jon may get in touch about your results. You can ask us to stop at any time.",
      privacyLabel: "Privacy policy.",
      button: "Email my score",
      checking: "Checking…",
      success: "Sent. Check your inbox (and spam, just in case).",
      error: "We couldn't send that just now. Please try again.",
      throttled: "We've just sent it. Give it a few minutes and check your spam folder.",
    },
    scoreEmail: bullfinchScoreEmailCopy,
  },
};
