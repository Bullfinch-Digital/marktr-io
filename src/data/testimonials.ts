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
  name: string;
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
    kind: "quote",
    id: "james-whittle",
    name: "James Whittle",
    business: "monline.co.uk",
    quote:
      "marktr.io has helped me step back and look at our marketing from a different perspective. The digital health check gave me a clear picture of what was already working across our website and social media, but also highlighted areas where we could improve.",
    isPlaceholder: false,
  },
  {
    kind: "quote",
    id: "charlotte-stanford",
    name: "Charlotte Stanford",
    business: "SLA.SCHOOL",
    quote:
      "Clearly defining my Ideal Customer Profile has transformed the way I think about my marketing. From the social posts marktr.io helps me script, to the newsletter copy I write - everything is now written with my ideal customer in mind.",
    isPlaceholder: false,
  },
  {
    kind: "quote",
    id: "rachel-morris",
    name: "Rachel Morris",
    business: "The Green",
    quote:
      "With a clear marketing strategy in place we know we are saying the right things to the right customers. Defining a range of Ideal Customer Profiles, means that we can target different groups with clear offers and messaging that drives our bookings.",
    isPlaceholder: false,
  },
  {
    kind: "quote",
    id: "martyn-cordingley",
    name: "Martyn Cordingley",
    business: "British Log Cabins",
    quote:
      "We've been using Marktr.io to script our latest social posts and help us stand out in our industry. The results have been outstanding, with our most recent reel getting over 12k organic views",
    isPlaceholder: false,
  },
  {
    kind: "quote",
    id: "beth-childs",
    name: "Beth Childs",
    business: "Florist",
    quote:
      "Knowing what my website was doing well, but most importantly where I could improve things has made a massive difference to the quality of enquiries I'm now getting. Knowing who I'm speaking to has changed everything.",
    isPlaceholder: false,
  },
  {
    kind: "quote",
    id: "nathan-olivers",
    name: "Nathan Olivers",
    business: "Wildgrass Films",
    quote:
      "I built an entire month's content strategy in just a few minutes and the scripts are based on the ideal customer profiles I've generated - they're spot on, and have saved me hours of time that I can now spend on making the best content possible",
    isPlaceholder: false,
  },
  {
    kind: "quote",
    id: "heather-stanford",
    name: "Heather Stanford",
    business: "Blustery Days Glass",
    quote:
      "I didn't know where to start with marketing at all. Using marktr.io has allowed me to build an entire plan from customer language, newsletter wording and even which platforms I should be using to reach my customers. Would highly recommend!",
    isPlaceholder: false,
  },
  {
    kind: "quote",
    id: "zoe-pryce",
    name: "Zoe Pryce",
    business: "Mustard & Grey",
    quote:
      "Trying to generate content ideas to post each week used to take so much time that we'd rather spend designing new product, but with marktr.io we can build an entire strategy around product launches, newsletter sign-ups, and so much more - it's been a game changer.",
    isPlaceholder: false,
  },
];

export const TESTIMONIALS: Testimonial[] = [...QUOTE_TESTIMONIALS, ...VIDEO_TESTIMONIALS];

export function isVideoTestimonial(item: Testimonial): item is VideoTestimonial {
  return item.kind === "video";
}

export function isQuoteTestimonial(item: Testimonial): item is QuoteTestimonial {
  return item.kind === "quote";
}
