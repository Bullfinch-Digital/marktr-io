export type CaseStudy = {
  id: string;
  client: string;
  /** Big headline figure. Use the verified number exactly. */
  headline: string;
  label: string;
  /** Qualifies the headline, e.g. the comparison window. */
  period?: string;
  description?: string;
  /** One to three short facts. Do not add figures that are not listed here. */
  supporting: string[];
  footnote?: string;
  /** Service-type chips. The card renders at most two. */
  pills?: string[];
  imageSrc?: string;
  imageAlt?: string;
  logoSrc?: string;
};

export const CASE_STUDIES: CaseStudy[] = [
  {
    id: "apostle-coffee",
    client: "Apostle Coffee",
    headline: "+287%",
    label: "social media visitors to the website, year on year",
    period: "January 2026 to October 2026, vs the same period last year",
    supporting: [
      "3,957 visitors vs 1,022 last year",
      "+282% sessions (3,994)",
      "Instagram: 3,679 visitors vs 849",
    ],
    footnote: "Platform visitor counts can overlap, so they shouldn't be added together.",
    pills: ["Social strategy"],
    imageSrc: "/images/graphics/apostle-coffee-cups.png",
    imageAlt: "Apostle Coffee cups",
  },
  {
    id: "british-log-cabins",
    client: "British Log Cabins",
    headline: "8,000+",
    label: "newsletter sign-ups",
    description:
      "Social content and a lead-qualifying questionnaire turned strong organic reach into trust and leads.",
    supporting: [
      "Qualifying lead-generation questionnaire on the website",
      "Top reel: 12,223 views (the best of 25 reels reviewed)",
    ],
    pills: ["Newsletter", "Social strategy"],
  },
  {
    id: "the-green",
    client: "The Green",
    headline: "5,000+",
    label: "newsletter sign-ups from a fresh Instagram account",
    supporting: [
      "Repeat bookings and seasonal pitch enquiries",
      "Three core customer groups defined, each with its own communications",
      "706 likes across its first 25 posts (Instagram account launched June 2026)",
    ],
    pills: ["Newsletter", "Customer profiles"],
  },
  {
    id: "the-cedar-mill",
    client: "The Cedar Mill",
    headline: "6k+",
    label: "organic views on recent posts",
    supporting: [
      "Customer profiles defined",
      "Brand story built",
      "Social strategy and content scripts",
    ],
    pills: ["Social strategy", "Brand story"],
  },
];
