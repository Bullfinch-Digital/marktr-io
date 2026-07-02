/**
 * Homepage signal extraction for facts LLM — keep extraction caps in sync if mirrored client-side.
 */
import { parseHTML } from "npm:linkedom@0.18.9";
import { Readability } from "npm:@mozilla/readability@0.5.0";

export const MAIN_TEXT_MAX_CHARS = 5000;
export const H2_MAX_COUNT = 10;
export const REVIEW_QUOTES_MAX = 10;

/** Decode common HTML entities so quotes read naturally to the model. */
export function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&quot;/gi, '"')
    .replace(/&apos;/gi, "'")
    .replace(/&#39;/gi, "'")
    .replace(/&#x27;/gi, "'")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) =>
      String.fromCharCode(parseInt(hex, 16))
    );
}

export function cleanExtractedText(text: string): string {
  return decodeHtmlEntities(text.replace(/<[^>]+>/g, " "))
    .replace(/\s+/g, " ")
    .trim();
}

function stripTagsToText(html: string): string {
  return cleanExtractedText(html);
}

/** Mozilla Readability — content region without requiring <main>. */
export function extractReadableMainText(html: string, _url: string): string {
  try {
    const { document } = parseHTML(html);
    const reader = new Readability(document, { charThreshold: 0 });
    const article = reader.parse();
    if (!article?.textContent) return "";
    return decodeHtmlEntities(article.textContent)
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, MAIN_TEXT_MAX_CHARS);
  } catch {
    return "";
  }
}

function publicationLabelFromAlt(alt: string): string {
  const cleaned = cleanExtractedText(alt);
  if (!cleaned) return "";
  return cleaned
    .replace(/\s+brand\s+logo$/i, "")
    .replace(/\s+logo$/i, "")
    .trim();
}

function findNearbyImgAlt(html: string, position: number): string {
  const before = html.slice(Math.max(0, position - 2000), position);
  const alts = [...before.matchAll(/alt=["']([^"']{2,80})["']/gi)]
    .map((m) => publicationLabelFromAlt(m[1]))
    .filter((alt) => alt && !/^(image|photo|icon|logo)$/i.test(alt));
  return alts.length ? alts[alts.length - 1] : "";
}

function formatQuoteLine(parts: {
  publication?: string;
  author?: string;
  quote: string;
  verified?: boolean;
}): string {
  const quote = cleanExtractedText(parts.quote).replace(/^["“]+|["”]+$/g, "").trim();
  if (quote.length < 15) return "";

  const prefix = [
    parts.publication && `[${parts.publication}]`,
    parts.author && parts.author,
    parts.verified && "Verified Customer",
  ]
    .filter(Boolean)
    .join(" ");

  return prefix ? `${prefix} — "${quote}"` : `"${quote}"`;
}

/**
 * Reviews, press pull-quotes, celebrity endorsements — SSR patterns beyond blockquote-only.
 */
export function extractReviewSignals(html: string): string[] {
  const reviews: string[] = [];
  const seen = new Set<string>();

  const pushReview = (line: string) => {
    const normalized = line.replace(/\s+/g, " ").trim();
    if (normalized.length < 20 || normalized.length > 450) return;
    const key = normalized.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    reviews.push(normalized);
  };

  // Shopify featured-reviews / review-card (Mother Root + Reviews.io SSR)
  const cardBlocks = [
    ...html.matchAll(
      /<div[^>]*class="[^"]*review-card[^"]*"[\s\S]*?<\/div>\s*<\/div>\s*<\/div>/gi
    ),
  ];
  for (const block of cardBlocks.slice(0, 10)) {
    const chunk = block[0];
    const quote =
      chunk.match(/class="[^"]*review-content[^"]*"[^>]*>([\s\S]*?)<\/div>/i)?.[1] ??
      "";
    const author =
      chunk.match(/class="[^"]*author[^"]*"[^>]*>([^<]+)</i)?.[1]?.trim() ?? "";
    const verified = /verified\s+customer/i.test(chunk);
    const line = formatQuoteLine({ author, quote, verified });
    if (line) pushReview(line);
    if (reviews.length >= REVIEW_QUOTES_MAX) return reviews;
  }

  // Press quote carousels (Huel: PressQuotesCarousel + logo alt per slide)
  for (const slide of html.matchAll(
    /PressQuotesCarousel[\s\S]{0,6000}?<\/li>/gi
  )) {
    const chunk = slide[0];
    const alts = [...chunk.matchAll(/alt=["']([^"']{2,80})["']/gi)].map((m) =>
      publicationLabelFromAlt(m[1])
    );
    const publication = alts.filter(Boolean).pop() ?? "";
    const quote =
      chunk.match(/<blockquote[^>]*>([\s\S]*?)<\/blockquote>/i)?.[1] ?? "";
    const line = formatQuoteLine({ publication, quote });
    if (line) pushReview(line);
    if (reviews.length >= REVIEW_QUOTES_MAX) return reviews;
  }

  // Celebrity / influencer endorsement cards (Huel: InfluencersImageCard)
  for (const block of html.matchAll(
    /InfluencersImageCard[\s\S]{0,4000}?<\/article>/gi
  )) {
    const chunk = block[0];
    const author =
      chunk.match(
        />\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)\s*<span[^>]*verified/i
      )?.[1]?.trim() ??
      chunk.match(/>\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)\s*</)?.[1]?.trim() ??
      "";
    const quote =
      chunk.match(/PortableTextRenderer__p[^>]*>([\s\S]*?)<\/p>/i)?.[1] ??
      chunk.match(/class="[^"]*quote[^"]*"[^>]*>([\s\S]*?)<\//i)?.[1] ??
      "";
    const line = formatQuoteLine({ author, quote });
    if (line) pushReview(line);
    if (reviews.length >= REVIEW_QUOTES_MAX) return reviews;
  }

  // Generic testimonial / endorsement / carousel card classes
  const carouselClassPattern =
    /class="[^"]*(?:testimonial|endorsement|quote|recommend|carousel|slide|card-carousel)[^"]*"/gi;
  for (const classMatch of html.matchAll(carouselClassPattern)) {
    const start = classMatch.index ?? 0;
    const chunk = html.slice(start, start + 5000);
    const quote =
      chunk.match(/<blockquote[^>]*>([\s\S]*?)<\/blockquote>/i)?.[1] ??
      chunk.match(
        /class="[^"]*(?:review-content|testimonial-text|review-body|quote-text)[^"]*"[^>]*>([\s\S]*?)<\/(?:div|p|blockquote)>/i
      )?.[1] ??
      "";
    if (!quote) continue;
    const publication = findNearbyImgAlt(html, start);
    const line = formatQuoteLine({ publication, quote });
    if (line) pushReview(line);
    if (reviews.length >= REVIEW_QUOTES_MAX) return reviews;
  }

  // review-content / testimonial-text class patterns
  for (const m of html.matchAll(
    /class="[^"]*(?:review-content|testimonial-text|review-body|okeReviews)[^"]*"[^>]*>([\s\S]*?)<\/(?:div|p|blockquote)>/gi
  )) {
    const pos = m.index ?? 0;
    const publication = findNearbyImgAlt(html, pos);
    const line = formatQuoteLine({ publication, quote: m[1] });
    if (line) pushReview(line);
    if (reviews.length >= REVIEW_QUOTES_MAX) return reviews;
  }

  // Blockquotes with nearby publication logo alt
  for (const m of html.matchAll(/<blockquote[^>]*>([\s\S]*?)<\/blockquote>/gi)) {
    const pos = m.index ?? 0;
    const publication = findNearbyImgAlt(html, pos);
    const line = formatQuoteLine({ publication, quote: m[1] });
    if (line) pushReview(line);
    if (reviews.length >= REVIEW_QUOTES_MAX) return reviews;
  }

  return reviews.slice(0, REVIEW_QUOTES_MAX);
}

export function extractAllSignals(html: string, url: string): string {
  const get = (pattern: RegExp) => {
    const m = html.match(pattern);
    return m?.[1] ? cleanExtractedText(m[1]) : "";
  };
  const getAll = (pattern: RegExp) => {
    return [...html.matchAll(pattern)]
      .map((m) => m[1]?.trim())
      .filter(Boolean) as string[];
  };

  const title = get(/<title[^>]*>([^<]+)<\/title>/i);
  const metaDesc =
    get(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']{10,})/i) ||
    get(
      /<meta[^>]*content=["']([^"']{10,})["'][^>]*name=["']description["']/i
    );
  const ogTitle =
    get(/<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']+)/i) ||
    get(/<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:title["']/i);
  const ogDesc =
    get(
      /<meta[^>]*property=["']og:description["'][^>]*content=["']([^"']+)/i
    ) ||
    get(
      /<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:description["']/i
    );

  const h1s = getAll(/<h1[^>]*>([\s\S]*?)<\/h1>/gi)
    .map((h) => cleanExtractedText(h))
    .filter((t) => t.length > 2)
    .slice(0, 3);

  const h2s = getAll(/<h2[^>]*>([\s\S]*?)<\/h2>/gi)
    .map((h) => cleanExtractedText(h))
    .filter((t) => t.length > 2 && t.length < 120)
    .slice(0, H2_MAX_COUNT);

  const navLinks = getAll(/<a[^>]*href=["'][^"']*["'][^>]*>([\s\S]*?)<\/a>/gi)
    .map((t) => cleanExtractedText(t))
    .filter((t) => t.length > 1 && t.length < 40)
    .filter((t) => !/^(£|\$|[0-9])/.test(t))
    .slice(0, 20);

  const ctaPatterns =
    /\b(buy|shop|get|start|subscribe|sign up|book|order|download|try|learn|discover|explore|contact|join|apply)\b/i;
  const ctaLinks = navLinks.filter((t) => ctaPatterns.test(t)).slice(0, 5);

  const socialProofPatterns =
    /(★|☆|\d+(\.\d+)?\s*stars?|\d+\s*reviews?|award|rated|certified|trusted|verified|testimonial|customers?)/gi;
  const socialProofMatches = (html.match(socialProofPatterns) || []).slice(0, 5);

  const jsonLdMatch = html.match(
    /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/i
  );
  let schemaType = "";
  let schemaDesc = "";
  if (jsonLdMatch) {
    try {
      const schema = JSON.parse(jsonLdMatch[1]);
      schemaType = schema["@type"] ?? "";
      schemaDesc = typeof schema["description"] === "string"
        ? cleanExtractedText(schema["description"])
        : "";
    } catch {
      // ignore malformed JSON-LD
    }
  }

  const footerMatch = html.match(/<footer[^>]*>([\s\S]*?)<\/footer>/i);
  const footerText = footerMatch
    ? stripTagsToText(footerMatch[1]).slice(0, 400)
    : "";

  const mainText = extractReadableMainText(html, url);
  const reviewSignals = extractReviewSignals(html);

  const hasContact = /contact|get in touch|reach us|email us|call us/i.test(html);
  const hasEmail =
    /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/.test(html);

  const socialPlatforms = [
    "instagram",
    "facebook",
    "twitter",
    "linkedin",
    "tiktok",
    "youtube",
  ].filter((p) => new RegExp(p, "i").test(html));

  const parts = [
    `URL: ${url}`,
    title && `Page title: ${title}`,
    metaDesc && `Meta description: ${metaDesc}`,
    ogTitle && ogTitle !== title && `OG title: ${ogTitle}`,
    ogDesc && ogDesc !== metaDesc && `OG description: ${ogDesc}`,
    h1s.length && `H1 headings: ${h1s.join(" | ")}`,
    h2s.length && `H2 headings: ${h2s.join(" | ")}`,
    navLinks.length && `Navigation: ${navLinks.join(", ")}`,
    ctaLinks.length && `CTA buttons/links: ${ctaLinks.join(", ")}`,
    socialProofMatches.length &&
      `Social proof signals: ${socialProofMatches.join(", ")}`,
    reviewSignals.length &&
      `Customer reviews / testimonials:\n${reviewSignals.map((r, i) => `${i + 1}. ${r}`).join("\n")}`,
    schemaType && `Schema type: ${schemaType}`,
    schemaDesc && `Schema description: ${schemaDesc}`,
    socialPlatforms.length && `Social media: ${socialPlatforms.join(", ")}`,
    hasContact && "Has contact information: yes",
    hasEmail && "Has email address: yes",
    footerText && `Footer content: ${footerText}`,
    mainText && `Main page content: ${mainText}`,
  ]
    .filter(Boolean)
    .join("\n\n");

  return parts || "No readable content found";
}
