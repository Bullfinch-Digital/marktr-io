export type Testimonial = {
  id: string;
  /** First name. Shown on the poster and first in the cite line. */
  name: string;
  business: string;
  businessUrl?: string;
  location?: string;
  /** Short result line. Omit until there is a real, confirmed outcome. */
  outcome?: string;
  quote: string;
  isPlaceholder: boolean;
  /** A real still. When set, it replaces the template poster. */
  posterSrc?: string;
  videoSrc?: string;
  videoCaptionsSrc?: string;
};

// TODO: replace with real testimonial
export const TESTIMONIALS: Testimonial[] = [
  {
    id: "charlotte-sla-school",
    name: "Charlotte",
    business: "SLA.SCHOOL",
    quote: "Placeholder quote — one or two sentences from Charlotte about the result she got.",
    isPlaceholder: true,
  },
  {
    id: "martyn-british-log-cabins",
    name: "Martyn",
    business: "British Log Cabins",
    businessUrl: "https://britishlogcabins.com",
    quote: "Placeholder quote — one or two sentences from Martyn about the result he got.",
    isPlaceholder: true,
  },
  {
    id: "rachel-the-green",
    name: "Rachel",
    business: "The Green",
    businessUrl: "https://greencaravanpark.co.uk",
    quote: "Placeholder quote — one or two sentences from Rachel about the result she got.",
    isPlaceholder: true,
  },
];
