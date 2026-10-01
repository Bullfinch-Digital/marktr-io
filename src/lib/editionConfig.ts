import type { Edition } from "./edition";

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
  },
};
