export type VideoTestimonial = {
  kind: "video";
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
  /** The lead film. One entry only; the row stays the same height. */
  featured?: boolean;
};

export type QuoteTestimonial = {
  kind: "quote";
  id: string;
  /** Fictional full name until a real review replaces this entry. */
  name: string;
  /** A role descriptor, not a real business name. */
  business: string;
  quote: string;
  /** Render a star row only when a genuine rating is set. */
  rating?: number;
  isPlaceholder: boolean;
};

// Extension point: a later entry may use kind: "stat" once Jon has a real number.
// Do not render a stat card in the video grid until that figure is confirmed.
// Example shape (unused): { kind: "stat", id: "…", value: "…", label: "…" }

export type Testimonial = VideoTestimonial | QuoteTestimonial;

// TODO: replace with real testimonial
const VIDEO_TESTIMONIALS: VideoTestimonial[] = [
  {
    // TODO: replace with real testimonial
    kind: "video",
    id: "charlotte-sla-school",
    name: "Charlotte",
    business: "SLA.SCHOOL",
    quote: "Placeholder quote — one or two sentences from Charlotte about the result she got.",
    isPlaceholder: true,
    featured: true,
  },
  {
    // TODO: replace with real testimonial
    kind: "video",
    id: "martyn-british-log-cabins",
    name: "Martyn",
    business: "British Log Cabins",
    businessUrl: "https://britishlogcabins.com",
    quote: "Placeholder quote — one or two sentences from Martyn about the result he got.",
    isPlaceholder: true,
  },
  {
    // TODO: replace with real testimonial
    kind: "video",
    id: "rachel-the-green",
    name: "Rachel",
    business: "The Green",
    businessUrl: "https://greencaravanpark.co.uk",
    quote: "Placeholder quote — one or two sentences from Rachel about the result she got.",
    isPlaceholder: true,
  },
];

const QUOTE_TESTIMONIALS: QuoteTestimonial[] = [
  {
    // TODO: replace with real quote — temporary imagined review
    kind: "quote",
    id: "priya-nair",
    name: "Priya Nair",
    business: "Independent bakery owner",
    quote:
      "Writing the customer profile named the people who already buy from us. The brand story then used that same person, so the two pieces finally matched.",
    isPlaceholder: true,
  },
  {
    // TODO: replace with real quote — temporary imagined review
    kind: "quote",
    id: "owen-blake",
    name: "Owen Blake",
    business: "Landscape gardener",
    quote:
      "The health check walked the website without scoring us against a big brand. I could see what was missing and what was already clear.",
    isPlaceholder: true,
  },
  {
    // TODO: replace with real quote — temporary imagined review
    kind: "quote",
    id: "hannah-cole",
    name: "Hannah Cole",
    business: "Pottery studio owner",
    quote:
      "I kept the customer profile and the brand story together. On the trial, strategy and content started from that work instead of a blank page.",
    isPlaceholder: true,
  },
  {
    // TODO: replace with real quote — temporary imagined review
    kind: "quote",
    id: "samir-patel",
    name: "Samir Patel",
    business: "Mobile bike mechanic",
    quote:
      "The health score showed the parts of the site we had never looked at properly. It read as a plain list, not a lecture.",
    isPlaceholder: true,
  },
  {
    // TODO: replace with real quote — temporary imagined review
    kind: "quote",
    id: "freya-lind",
    name: "Freya Lind",
    business: "Florist",
    quote:
      "I described one customer in the profile and the story stopped trying to speak to everyone. That was the useful part.",
    isPlaceholder: true,
  },
  {
    // TODO: replace with real quote — temporary imagined review
    kind: "quote",
    id: "tom-adeyemi",
    name: "Tom Adeyemi",
    business: "Small accountancy practice",
    quote:
      "The free steps were the profile, the story and the health score. Strategy and content opened on the trial, and that split was easy to follow.",
    isPlaceholder: true,
  },
  {
    // TODO: replace with real quote — temporary imagined review
    kind: "quote",
    id: "elise-moreau",
    name: "Elise Moreau",
    business: "Children's bookshop owner",
    quote:
      "I finished the customer profile in one sitting. It gave me a person to write the brand story for, which I had been putting off.",
    isPlaceholder: true,
  },
  {
    // TODO: replace with real quote — temporary imagined review
    kind: "quote",
    id: "callum-reid",
    name: "Callum Reid",
    business: "Wedding photographer",
    quote:
      "Seeing the health score next to the story made the gaps obvious. The site and the words had been describing two different businesses.",
    isPlaceholder: true,
  },
];

export const TESTIMONIALS: Testimonial[] = [...QUOTE_TESTIMONIALS, ...VIDEO_TESTIMONIALS];

export function isVideoTestimonial(item: Testimonial): item is VideoTestimonial {
  return item.kind === "video";
}

export function isQuoteTestimonial(item: Testimonial): item is QuoteTestimonial {
  return item.kind === "quote";
}
