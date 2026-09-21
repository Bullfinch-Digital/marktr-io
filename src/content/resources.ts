export type ResourcePost = {
  slug: string;
  title: string;
  description: string;
  introLine?: string;
  bgColor: string; // used to match homepage resource cards
  readingTime?: string;
  date?: string; // ISO string
  author?: {
    name: string;
    title: string;
    org: string;
    url: string;
  };
  seoTitle?: string;
  metaDescription?: string;
  faq?: Array<{ question: string; answer: string }>;
  body: Array<
    | { type: "p"; text: string }
    | { type: "h2"; text: string }
    | { type: "h3"; text: string }
    | { type: "ul"; items: string[] }
    | { type: "links"; items: Array<{ text: string; href: string }> }
    | { type: "cta" }
    | {
        type: "callout";
        title: string;
        text: string;
        href?: string;
        linkText?: string;
      }
    | { type: "youtube"; videoId: string; title?: string }
    | { type: "table"; headers: string[]; rows: string[][] }
  >;
};

/**
 * Add/edit posts here.
 * - These power /resources and /resources/:slug
 * - bgColor keeps the same colourful card vibe as the homepage ResourcesSection
 */
export const RESOURCE_POSTS: ResourcePost[] = [
  {
    slug: "what-an-icp-really-is",
    title:
      "What Is an Ideal Customer Profile (ICP)? A Practical Framework With Real Examples",
    description:
      "How to build a real Ideal Customer Profile — six questions, real examples, and the technique for writing copy your ICP will think was written just for them.",
    bgColor: "#BBA0E5",
    readingTime: "14 min read",
    date: "2026-02-13",
    author: {
      name: "Jon Stanford",
      title: "Founder",
      org: "Bullfinch Digital",
      url: "https://bullfinchdigital.com",
    },
    seoTitle:
      "What Is an Ideal Customer Profile (ICP)? Definition, Framework and Validation Guide",
    metaDescription:
      "How to build a real Ideal Customer Profile — six questions, real examples (Patagonia, Dollar Shave Club, a UK campsite), and the exact technique for writing copy your ICP will think was written just for them.",
    faq: [
      {
        question: "What is the difference between an ICP and a buyer persona?",
        answer:
          "An ICP defines the best-fit segment for your business. A buyer persona describes the individual decision-maker within that segment. Define the ICP first, then build personas inside it.",
      },
      {
        question: "How do you validate an ICP?",
        answer:
          "Look at behavioural and commercial outcomes — conversion rate by segment, sales cycle length, retention, customer lifetime value, revenue contribution. Consistent outperformance is your evidence.",
      },
      {
        question: "Can an ICP change over time?",
        answer:
          "Yes. Review it when your product, pricing, market conditions, or customer behaviour shift.",
      },
      {
        question: "Is an ICP only useful for SaaS companies?",
        answer:
          "No — this exact framework works with craft brands, campsites, log cabin builders and service businesses, not just software.",
      },
      {
        question: "How often should you update an ICP?",
        answer:
          "At least quarterly in a fast-moving market, and always after a repositioning, a pricing change, or a real shift in who's actually buying.",
      },
    ],
    body: [
      {
        type: "p",
        text:
          "There's one person who can transform your entire brand — someone who already wants what you offer, needs the transformation you provide, and will champion you to anyone who'll listen. This is how you find them.",
      },
      {
        type: "p",
        text:
          "I know what you're thinking: I already know who my customers are, there's nothing new here — they're the people buying from me right now. I promise you that's not the case. Your ideal customer isn't necessarily whoever happens to be buying from you today. I'll show you why that matters, and we'll build your Ideal Customer Profile properly, together.",
      },
      { type: "h2", text: "Watch the full breakdown" },
      {
        type: "youtube",
        videoId: "bj6J4bNxwwc",
        title:
          "STOP Marketing to Everyone — Find The ONE Person Who Will Grow Your Business",
      },
      {
        type: "p",
        text:
          "Prefer to read than watch? Everything's below, with worked examples.",
      },
      { type: "h2", text: "What is an Ideal Customer Profile?" },
      {
        type: "p",
        text:
          "An Ideal Customer Profile (ICP) is a specific, detailed picture of the one person your marketing should be built around — not a vague sense of \"people who might like this,\" but their name, their frustration, the words they actually use, and where they're already spending time online, waiting for you to show up.",
      },
      {
        type: "p",
        text:
          "Most businesses get this wrong not because they're doing anything badly, but because they've never been asked to get specific. They know their product inside out, they get enough sales to feel like it's working — but they've never sat down and built a detailed, honest picture of the one person they should really be reaching.",
      },
      {
        type: "p",
        text:
          "Here's why that matters. Think about a stadium full of people — thousands of them, all in one place. What's the single most powerful way to get one specific person's attention? It's their name. Shout someone's name in a crowded space and they'll turn around, every time. That's what marketing to a real ICP does — it calls your ideal customer out by name, speaks so directly to their situation that they feel like you built what you offer specifically for them. Marketing to everyone means speaking to no one; specificity is what filters out the people who were never going to buy, while pulling your real audience in immediately.",
      },
      {
        type: "h2",
        text: "ICP vs buyer persona vs avatar: what's the difference?",
      },
      {
        type: "p",
        text:
          "These three terms get used interchangeably, but they're not quite the same thing, and it's worth knowing which one you actually need.",
      },
      {
        type: "ul",
        items: [
          "**ICP** defines the best-fit customer segment for your business — who you should be targeting at all.",
          "**Buyer persona** defines the individual decision-maker inside that segment — how that person actually decides.",
          "**Avatar** is usually just a simplified marketing shorthand for a fictionalised version of your target buyer.",
        ],
      },
      {
        type: "p",
        text:
          "I build these in order: define the ICP first (the segment), then build personas inside it if you need that extra layer, and tailor messaging to each persona without losing focus on the segment as a whole. Skip straight to personas or avatars without doing the ICP work first, and you end up with a plausible-sounding character who isn't actually grounded in anything.",
      },
      { type: "h2", text: "How do you build an ICP? Six questions" },
      {
        type: "p",
        text:
          "You might end up with two or three ICPs eventually, because different products within your offering suit different people. But start with one.",
      },
      {
        type: "p",
        text:
          "Use your single best customer as the model — not your average customer, not an aspirational one. Your best one to date: the one who gets the most value, comes back, refers their friends, the one you'd happily point a prospect to for a testimonial. That person is your north star.",
      },
      {
        type: "ul",
        items: [
          "**Who are they?** Give them a name and a one-line description of their situation. An ICP doesn't have to be a single individual — it can be a couple, a household, a type of person — but it needs an identity you can refer back to.",
          "**What defines them?** Age, location, income, lifestyle. Be specific — vague demographics build vague marketing, every time.",
          "**What motivates them?** Not just the transaction — the values and interests underneath it.",
          "**What attracts them to what you offer?** What signals make them lean in, what earns trust before they've spent a penny?",
          "**What problem can you solve for them?** What's keeping them up at night that your product genuinely fixes? This is the pain point that should run through everything you make from here on.",
          "**Where do they hang out?** Not down the pub — which online platforms and communities do they actually trust? That's where your marketing needs to show up, not everywhere at once.",
        ],
      },
      {
        type: "p",
        text:
          "Answer those six honestly and you've got a north star for your website copy, your next social post, even how you describe your business at a networking event.",
      },
      {
        type: "h3",
        text: "Two brands who got this brilliantly right",
      },
      {
        type: "p",
        text:
          "Most people assume Patagonia's ICP is a climber or a serious outdoor athlete. It isn't. We'll call him Alex — mid-30s to mid-50s, an urban professional, financially comfortable, someone who wants his spending to reflect his values. Alex is more likely to wear a Patagonia fleece to a coffee shop than up a mountain. What he's buying isn't waterproofing — it's a statement, membership of a community that gives the environment a genuine thought before it opens its wallet. Once Patagonia understood that, everything from \"Don't Buy This Jacket\" to giving the company away made perfect sense.",
      },
      {
        type: "p",
        text:
          "Compare that to Dollar Shave Club. Their ICP is Dave — late 20s to mid-40s, practical, no-nonsense, sick of paying fifteen quid for four razor blades in a locked cabinet at the drugstore. Dave isn't after a luxury shave. He's after someone finally calling out the fact he's been ripped off for years, and offering him a better deal without the nonsense. That one frustration became the entire brand — the launch video, the packaging, all of it.",
      },
      {
        type: "p",
        text:
          "Two completely different ICPs, two completely different emotional drivers — one identity-led, one frustration-led. Both turned a deep understanding of one specific person into a brand that dominated its market.",
      },
      {
        type: "h3",
        text: "A real example from my own client work",
      },
      {
        type: "p",
        text:
          "I work with a family-run campsite in the Shropshire Hills called The Green — camping, caravanning, and yearly touring pitches where customers book a seasonal spot and can come and go as they please, always knowing it's waiting for them.",
      },
      {
        type: "p",
        text:
          "For their touring caravan pitch product, the ICP is John and Sue, the settled adventurers:",
      },
      {
        type: "ul",
        items: [
          "**Who are they?** A retired couple looking for a home away from home — not tourists passing through, a returning seasonal community.",
          "**What defines them?** 55–70, retired or semi-retired, Midlands or North West, routine-orientated, valuing community and countryside calm over novelty.",
          "**What motivates them?** Returning to the same peaceful spot every season. Belonging to a site, not just renting a pitch.",
          "**What attracts them?** A locally run, eco-friendly family business over a corporate holiday park. Reliable facilities, consistent management, a friendly tone.",
          "**What problems can you solve?** Rising pitch prices elsewhere, sites that feel too commercial, uncertainty about winter caravan storage.",
          "**Where do they hang out?** Facebook caravanning groups, motorhome clubs, YouTube caravan-lifestyle content from couples just like them.",
        ],
      },
      {
        type: "p",
        text:
          "Once you have that level of detail, every piece of content has a clear brief. Every social post has a specific person to speak to. Every offer solves a problem that person actually has. That's what an ICP does — it turns vague marketing into a conversation.",
      },
      {
        type: "callout",
        title: "Skip the blank page.",
        text:
          "marktr.io's free ICP tool builds this for you in a few minutes — you answer a handful of questions, it hands you back up to three ICPs, ready to edit until they're exactly right.",
        href: "/onboarding-build",
        linkText: "Build your ideal customer profile free →",
      },
      { type: "h2", text: "The content superpower most people miss" },
      {
        type: "p",
        text:
          "Once you know your ICP properly, something shifts in how you write. You stop describing your product and start describing the transformation — and the most powerful way to do that is to use your customer's own words, not marketing language, not industry jargon.",
      },
      {
        type: "p",
        text:
          "Get on the phone and ask a handful of customers what nearly stopped them buying, what they'd say to a friend about your product, what problem they were trying to solve when they found you. If you're not comfortable asking directly, read your reviews back instead — what drew them in, which platform they found you on, why they chose you over the alternative.",
      },
      {
        type: "p",
        text:
          "I did this recently with our own coffee club members at Apostle, and the phrases they used were nothing like the copy on our website. When someone reads your copy and thinks \"that's exactly how I'd describe it,\" that feeling of being understood is the thing that actually converts. And once you know where they hang out too, you're not guessing at platforms any more — you're just showing up where they already are, speaking in the language they already use, about the problem they're already trying to solve.",
      },
      {
        type: "p",
        text:
          "That's not just an ICP. That's a superpowered content strategy.",
      },
      { type: "h2", text: "Want the shorter version?" },
      {
        type: "p",
        text:
          "If you'd rather get the headline version in five minutes, here's the same framework, condensed:",
      },
      {
        type: "youtube",
        videoId: "qfF2XSznguY",
        title:
          "Give Me 5 Minutes. I'll Find The ONE Person Who Can Grow Your Business",
      },
      { type: "h2", text: "Common ICP mistakes" },
      {
        type: "ul",
        items: [
          "Making the ICP too broad",
          "Using aspiration instead of real customer data",
          "Confusing industry with genuine fit",
          "Ignoring timing and buying triggers",
          "Skipping validation against actual outcomes",
          "Not updating the ICP as the business evolves",
        ],
      },
      { type: "h2", text: "Signs you have the wrong ICP" },
      {
        type: "ul",
        items: [
          "High traffic but weak conversion",
          "Long sales cycles with low close rates",
          "Churn rising in new accounts",
          "Your messaging keeps changing every quarter",
          "Marketing and sales disagree on lead quality",
        ],
      },
      {
        type: "p",
        text:
          "A quick sentence test I use with clients: \"We help [specific customer type] with [specific problem] achieve [specific outcome].\" If that stays vague, your ICP needs refining.",
      },
      { type: "h2", text: "Frequently asked questions" },
      {
        type: "h3",
        text: "What is the difference between an ICP and a buyer persona?",
      },
      {
        type: "p",
        text:
          "An ICP defines the best-fit segment for your business. A buyer persona describes the individual decision-maker within that segment. Define the ICP first, then build personas inside it.",
      },
      { type: "h3", text: "How do you validate an ICP?" },
      {
        type: "p",
        text:
          "Look at behavioural and commercial outcomes — conversion rate by segment, sales cycle length, retention, customer lifetime value, revenue contribution. Consistent outperformance is your evidence. (I've written a full guide on this — see Related resources below.)",
      },
      { type: "h3", text: "Can an ICP change over time?" },
      {
        type: "p",
        text:
          "Yes. Review it when your product, pricing, market conditions, or customer behaviour shift.",
      },
      {
        type: "h3",
        text: "Is an ICP only useful for SaaS companies?",
      },
      {
        type: "p",
        text:
          "No — I use this exact framework with craft brands, campsites, log cabin builders and service businesses, not just software.",
      },
      { type: "h3", text: "How often should you update an ICP?" },
      {
        type: "p",
        text:
          "At least quarterly in a fast-moving market, and always after a repositioning, a pricing change, or a real shift in who's actually buying.",
      },
      { type: "h2", text: "The takeaway" },
      {
        type: "p",
        text:
          "An ICP isn't a demographic profile. It's a practical filter for who to prioritise, how to position, and where to focus. Get specific enough, in your customer's own words, and your marketing stops being a guess.",
      },
      {
        type: "callout",
        title: "Ready when you are.",
        text:
          "Build a real Ideal Customer Profile in minutes — free on marktr.",
        href: "/onboarding-build",
        linkText: "Start building your ICP on marktr.io →",
      },
      { type: "h2", text: "Related resources" },
      {
        type: "links",
        items: [
          {
            text: "The 5-Stage Marketing Strategy Framework for Founders",
            href: "/resources/5-stage-marketing-strategy-framework",
          },
          {
            text: "The Hollywood Storytelling Framework for Your Brand Story",
            href: "/resources/hollywood-brand-storytelling-framework",
          },
          {
            text: "How to Turn an ICP Into Better Content and Ads",
            href: "/resources/turn-an-icp-into-better-content-and-ads",
          },
          {
            text: "How to Validate an Ideal Customer Profile (ICP) Using Real Data",
            href: "/resources/how-to-validate-an-icp",
          },
          {
            text: "Why We Built the ICP Generator (And How It Helps You Win)",
            href: "/resources/why-we-built-icp-generator",
          },
          {
            text: "Build your ICP step by step",
            href: "/onboarding-build",
          },
          {
            text: "Compare plans",
            href: "/pricing",
          },
        ],
      },
    ],
  },
  {
    slug: "turn-an-icp-into-better-content-and-ads",
    title: "How to Turn an ICP Into Better Content and Ads",
    description:
      "Turn your Ideal Customer Profile (ICP) into clear content ideas, stronger messaging, and higher-performing ads using a practical framework.",
    bgColor: "#96CBB6",
    readingTime: "10 min read",
    date: "2026-01-29",
    seoTitle: "How to Turn an ICP Into Better Content and Ads | Practical Marketing Guide",
    metaDescription:
      "Turn your Ideal Customer Profile (ICP) into clear content ideas, stronger messaging, and higher-performing ads using a practical framework.",
    faq: [
      {
        question: "How do you turn an ICP into content ideas?",
        answer:
          "Start with pains, triggers, objections, and desired outcomes. Convert each into Teach, Proof, and Path content so every idea maps to a buyer need and stage.",
      },
      {
        question: "Should each ICP have separate ads?",
        answer:
          "Yes, where segments have different pains, urgency, or buying triggers. Separate ad sets improve message relevance and reduce wasted spend.",
      },
      {
        question: "Can one ICP support multiple content pillars?",
        answer:
          "Yes. One ICP should support multiple angles, but each pillar should still map to a specific decision need such as diagnosis, trust, or next steps.",
      },
      {
        question: "How often should messaging change?",
        answer:
          "Review quarterly or when major signals change, such as conversion quality, churn, pricing shifts, or new market entry.",
      },
      {
        question: "What if ads are not converting?",
        answer:
          "Check ICP-message fit first. If the audience is wrong or the pain is vague, creative tweaks will not fix performance.",
      },
    ],
    body: [
      { type: "h2", text: "Direct Answer Summary" },
      {
        type: "p",
        text:
          "An Ideal Customer Profile (ICP) becomes valuable only when it shapes real marketing decisions: what to say, where to show up, and how to position your offer.",
      },
      {
        type: "p",
        text:
          "An ICP that does not influence content, ads, and targeting is just documentation, not strategy.",
      },
      {
        type: "p",
        text:
          "When you operationalise ICP data, marketing alignment improves, customer segmentation becomes clearer, and performance improves across content, ads, and product-market fit decisions.",
      },
      { type: "h2", text: "Why most ICPs fail to influence marketing" },
      {
        type: "p",
        text: "Most ICPs fail in execution, not definition.",
      },
      {
        type: "ul",
        items: [
          "The ICP is written once and never revisited",
          "Messaging teams do not use it as copy input",
          "Distribution planning is not connected to ICP signals",
          "Sales and marketing teams interpret the ICP differently",
          "There is no validation loop to update assumptions",
        ],
      },
      { type: "h2", text: "How do you turn an ICP into a content strategy?" },
      {
        type: "p",
        text:
          "Use a three-pillar model that maps to your ICP's pains, triggers, and decision process.",
      },
      { type: "h3", text: "1. Teach - Help them understand the problem" },
      {
        type: "p",
        text:
          "Teaching content helps your audience diagnose the problem, name friction clearly, and understand the cost of inaction.",
      },
      {
        type: "ul",
        items: [
          "Educational explainers tied to specific ICP pain points",
          "Content that quantifies commercial cost and delay risk",
          "Plain-language breakdowns of recurring mistakes",
        ],
      },
      {
        type: "p",
        text: "Examples:",
      },
      {
        type: "ul",
        items: [
          "Blog: Why your lead volume is up but qualified demand is down",
          "LinkedIn: 5 signs your targeting is too broad",
          "Lead magnet: ICP messaging diagnostic checklist",
          "Video: 10-minute teardown of weak positioning",
        ],
      },
      { type: "h3", text: "2. Proof - Show outcomes and credibility" },
      {
        type: "p",
        text:
          "Proof content reduces risk by showing what changed, for whom, and why it worked.",
      },
      {
        type: "ul",
        items: [
          "Case studies with before-and-after performance data",
          "Testimonials linked to measurable outcomes",
          "Process breakdowns showing execution steps",
          "Evidence of improved retention, conversion, or LTV",
        ],
      },
      {
        type: "p",
        text: "Example hooks:",
      },
      {
        type: "ul",
        items: [
          "How we reduced churn by fixing ICP mismatch",
          "Before: broad targeting. After: ICP-led campaigns",
          "What changed when sales and marketing used one ICP",
        ],
      },
      { type: "h3", text: "3. Path - Demonstrate the next steps" },
      {
        type: "p",
        text:
          "Path content shows prospects what happens next and how decisions are made.",
      },
      {
        type: "ul",
        items: [
          "Framework content that explains your method",
          "Decision-process content for buyers and stakeholders",
          "Step-by-step expectations from first call to rollout",
          "CTA-aligned content for each stage of readiness",
        ],
      },
      {
        type: "p",
        text: "Examples:",
      },
      {
        type: "ul",
        items: [
          "How our ICP workflow moves from diagnosis to campaign brief",
          "What to do first if ads attract low-fit leads",
          "What the first 30 days of ICP-led alignment looks like",
        ],
      },
      { type: "h2", text: "How do you write ads that match your ICP?" },
      {
        type: "p",
        text:
          "Good ads are compressed ICP insights. If your ICP is accurate, your ad copy should feel uncomfortably specific.",
      },
      {
        type: "p",
        text:
          "Use triggers and pains in the opening line. Mirror ICP language and match urgency to buying context.",
      },
      {
        type: "p",
        text: "Before and after examples:",
      },
      {
        type: "ul",
        items: [
          "Weak: Improve your marketing performance. Strong: Struggling to convert traffic into qualified leads despite increasing spend?",
          "Weak: Scale your SaaS growth faster. Strong: Churn rising after onboarding? Fix ICP mismatch before your next growth push.",
          "Weak: Get better ad results today. Strong: Still paying for clicks from low-fit prospects? Rebuild targeting around your ICP.",
          "Weak: We help teams align marketing and sales. Strong: If sales keeps rejecting marketing leads, your ICP definition is probably too broad.",
          "Weak: Boost ROI with smarter strategy. Strong: Launching a new offer? Use ICP-led messaging before spending on cold traffic.",
        ],
      },
      { type: "h2", text: "How do you choose the right channels using your ICP?" },
      {
        type: "p",
        text:
          "Choose channels based on attention patterns, buying intent, and message depth requirements.",
      },
      {
        type: "ul",
        items: [
          "Map where your ICP already researches solutions",
          "Separate intent channels from interruption channels",
          "Match channel format to decision stage",
          "Allocate budget by segment quality, not only click volume",
        ],
      },
      {
        type: "p",
        text: "Practical mapping:",
      },
      {
        type: "ul",
        items: [
          "Search and high-intent communities for active demand",
          "LinkedIn and newsletters for education and category framing",
          "Webinars and video for proof and process depth",
          "Retargeting for path content and conversion prompts",
        ],
      },
      { type: "h2", text: "When to use ICP Generator for marketing alignment" },
      {
        type: "p",
        text:
          "Manual ICP work often becomes inconsistent or opinion-led. Use ICP Generator when teams need one operational framework.",
      },
      {
        type: "ul",
        items: [
          "A structured decision framework for segment selection",
          "Messaging inputs tied to pains, triggers, and objections",
          "Shared qualification criteria for sales and marketing",
          "A repeatable process for validation and updates",
        ],
      },
      {
        type: "p",
        text:
          "It helps convert ICP definitions into operational decisions across content strategy, ad targeting, and customer segmentation.",
      },
      { type: "h2", text: "Frequently Asked Questions" },
      { type: "h3", text: "How do you turn an ICP into content ideas?" },
      {
        type: "p",
        text:
          "Start with pains, triggers, objections, and desired outcomes. Convert each into Teach, Proof, and Path content so every idea maps to a buyer need and stage.",
      },
      { type: "h3", text: "Should each ICP have separate ads?" },
      {
        type: "p",
        text:
          "Yes, where segments have different pains, urgency, or buying triggers. Separate ad sets improve message relevance and reduce wasted spend.",
      },
      { type: "h3", text: "Can one ICP support multiple content pillars?" },
      {
        type: "p",
        text:
          "Yes. One ICP should support multiple angles, but each pillar should still map to a specific decision need such as diagnosis, trust, or next steps.",
      },
      { type: "h3", text: "How often should messaging change?" },
      {
        type: "p",
        text:
          "Review quarterly or when major signals change, such as conversion quality, churn, pricing shifts, or new market entry.",
      },
      { type: "h3", text: "What if ads are not converting?" },
      {
        type: "p",
        text:
          "Check ICP-message fit first. If the audience is wrong or the pain is vague, creative tweaks will not fix performance.",
      },
      { type: "h2", text: "What is the key takeaway?" },
      {
        type: "p",
        text:
          "An ICP improves marketing only when it is operational. Translate it into content pillars, ad messages, and channel choices, then validate using real performance data.",
      },
      { type: "cta" },
    ],
  },
  {
    slug: "how-to-validate-an-icp",
    title: "How to Validate an Ideal Customer Profile (ICP) Using Real Data",
    description:
      "Most ICP definitions are hypotheses. This guide shows you how to test them against real commercial performance data.",
    bgColor: "#FF9922",
    readingTime: "11 min read",
    date: "2025-10-07",
    seoTitle: "How to Validate an ICP Using Real Customer Data | Metrics & Framework",
    metaDescription:
      "Learn how to validate your Ideal Customer Profile (ICP) using conversion, retention and lifetime value data with a practical framework.",
    faq: [
      {
        question: "How long does it take to validate an ICP?",
        answer:
          "Most teams see directional signals in 4-8 weeks if segmentation and baseline tracking are already in place. Strong confidence typically needs at least one full sales and retention cycle.",
      },
      {
        question: "What if you do not have enough data?",
        answer:
          "Use directional indicators first: conversion rate, cycle speed, and early retention. Then run narrower cohort tests to build sample quality before making major strategic changes.",
      },
      {
        question: "Can startups validate an ICP early?",
        answer:
          "Yes. Early teams can validate with smaller datasets if they track segment-level conversion, onboarding outcomes, and short-term retention from day one.",
      },
      {
        question: "Should you validate before or after launching?",
        answer:
          "Both. Start with a pre-launch hypothesis, then validate quickly after launch using behavioural data. ICP validation is iterative, not a one-time exercise.",
      },
      {
        question: "How often should you revalidate?",
        answer:
          "Review quarterly in fast-moving markets, and immediately after major shifts in product, pricing, positioning, or segment focus.",
      },
    ],
    body: [
      { type: "h2", text: "Direct Answer Summary" },
      {
        type: "p",
        text:
          "An Ideal Customer Profile (ICP) is validated when a specific customer segment consistently outperforms others across commercial metrics.",
      },
      {
        type: "p",
        text:
          "Many ICP definitions are assumptions based on preference, anecdotal sales feedback, or aspirational positioning. Validation requires behavioural data from real customers.",
      },
      {
        type: "p",
        text:
          "In commercial terms, validation means repeatable outperformance in conversion rate, retention rate, lifetime value, and revenue quality over time.",
      },
      { type: "h2", text: "Why most ICPs are based on assumptions" },
      {
        type: "ul",
        items: [
          "Founder bias shapes targeting before evidence is reviewed",
          "Aspirational positioning overrides segment performance",
          "Anecdotal sales input is treated as representative",
          "Customer segmentation is shallow or inconsistent",
          "Teams confuse who they want with who performs best",
        ],
      },
      { type: "h2", text: "What does ICP validation actually mean?" },
      {
        type: "p",
        text:
          "Validation is not agreement within your team. It is statistical and behavioural evidence.",
      },
      {
        type: "p",
        text:
          "ICP validation means one segment shows measurable and repeatable performance differences versus alternatives.",
      },
      {
        type: "ul",
        items: [
          "Use comparison groups, not blended averages",
          "Confirm outperformance across multiple metrics",
          "Track consistency over repeated time windows",
          "Use findings to change targeting, messaging, and qualification",
        ],
      },
      { type: "h2", text: "The core metrics to validate an ICP" },
      { type: "h3", text: "Conversion rate by segment" },
      {
        type: "p",
        text:
          "Compare conversion from qualified opportunity to customer by segment. Reliable ICP segments convert at a meaningfully higher rate.",
      },
      {
        type: "ul",
        items: [
          "Formula: customers won / qualified opportunities",
          "Set minimum sample thresholds per segment",
        ],
      },
      { type: "h3", text: "Sales cycle length" },
      {
        type: "p",
        text:
          "Shorter median sales cycles often indicate stronger fit because urgency and decision confidence are higher.",
      },
      {
        type: "ul",
        items: [
          "Track median days from qualified opportunity to close",
          "Review stage-by-stage drop-off by segment",
        ],
      },
      { type: "h3", text: "Retention rate" },
      {
        type: "p",
        text:
          "Poor-fit segments may close initially but churn earlier. Cohort retention exposes fit quality beyond acquisition.",
      },
      {
        type: "ul",
        items: [
          "Track 90-day and 180-day retention by segment",
          "Flag segments with high early churn",
        ],
      },
      { type: "h3", text: "Customer lifetime value (LTV)" },
      {
        type: "p",
        text:
          "Strong ICP segments compound commercial value through better retention, expansion potential, and lower servicing friction.",
      },
      {
        type: "ul",
        items: [
          "Compare gross margin-adjusted LTV by segment",
          "Monitor trend direction, not one-off spikes",
        ],
      },
      { type: "h3", text: "Revenue concentration" },
      {
        type: "p",
        text:
          "Validated ICP segments usually represent a disproportionate share of high-quality recurring revenue.",
      },
      {
        type: "ul",
        items: [
          "Track revenue share by segment each quarter",
          "Assess concentration alongside retention quality",
        ],
      },
      { type: "h3", text: "Expansion and upsell rate" },
      {
        type: "p",
        text:
          "Measure how often customers expand usage, upgrade plans, or increase spend by segment.",
      },
      {
        type: "ul",
        items: [
          "Expansion revenue percentage by cohort",
          "Upgrade rate within the first 6-12 months",
        ],
      },
      {
        type: "p",
        text:
          "Strong ICP segments often expand faster because the product fits more deeply into their workflow.",
      },
      { type: "h2", text: "Step-by-step ICP validation framework" },
      { type: "h3", text: "Step 1: Segment your existing customer base" },
      {
        type: "p",
        text:
          "Group customers by meaningful factors such as use case, business model, maturity, team size, and buying trigger.",
      },
      { type: "h3", text: "Step 2: Define comparison groups" },
      {
        type: "p",
        text:
          "Create distinct cohorts so each segment can be compared on the same definitions and time windows.",
      },
      { type: "h3", text: "Step 3: Measure key performance indicators" },
      {
        type: "p",
        text:
          "Track conversion rate, cycle length, retention, LTV, revenue concentration, and expansion rate for each cohort.",
      },
      { type: "h3", text: "Step 4: Identify outperformance patterns" },
      {
        type: "p",
        text:
          "Look for segments that outperform repeatedly across multiple metrics, not one isolated KPI.",
      },
      { type: "h3", text: "Step 5: Refine ICP definition" },
      {
        type: "p",
        text:
          "Update your ICP to reflect observed fit signals, qualification criteria, and realistic commercial constraints.",
      },
      { type: "h3", text: "Step 6: Test messaging and acquisition against updated ICP" },
      {
        type: "p",
        text:
          "Run controlled messaging and channel tests to confirm the revised ICP improves performance in-market.",
      },
      { type: "h2", text: "What signals indicate you have the wrong ICP?" },
      {
        type: "ul",
        items: [
          "High traffic with persistently low conversion",
          "Strong initial sales but weak retention",
          "Long and inconsistent sales cycles in one target segment",
          "High support burden with low expansion potential",
          "Revenue spread evenly with no dominant high-performing segment",
        ],
      },
      {
        type: "p",
        text:
          "These signals often indicate weak segmentation logic or an ICP that is too broad to guide practical decisions.",
      },
      { type: "h2", text: "When to use ICP Generator for validation" },
      {
        type: "p",
        text:
          "Use ICP Generator when teams need a structured, repeatable way to validate customer segmentation and refine ICP definitions.",
      },
      {
        type: "ul",
        items: [
          "A structured segmentation workflow",
          "Consistent cross-segment metric comparison",
          "Decision criteria for refining ICP definitions",
          "Shared language across marketing, sales, and data",
          "A bridge from analysis to acquisition and messaging changes",
        ],
      },
      { type: "h2", text: "Frequently Asked Questions" },
      { type: "h3", text: "How long does it take to validate an ICP?" },
      {
        type: "p",
        text:
          "Most teams see directional signals in 4-8 weeks if segmentation and baseline tracking are already in place. Strong confidence typically needs at least one full sales and retention cycle.",
      },
      { type: "h3", text: "What if you do not have enough data?" },
      {
        type: "p",
        text:
          "Use directional indicators first: conversion rate, cycle speed, and early retention. Then run narrower cohort tests to build sample quality before making major strategic changes.",
      },
      { type: "h3", text: "Can startups validate an ICP early?" },
      {
        type: "p",
        text:
          "Yes. Early teams can validate with smaller datasets if they track segment-level conversion, onboarding outcomes, and short-term retention from day one.",
      },
      { type: "h3", text: "Should you validate before or after launching?" },
      {
        type: "p",
        text:
          "Both. Start with a pre-launch hypothesis, then validate quickly after launch using behavioural data. ICP validation is iterative, not a one-time exercise.",
      },
      { type: "h3", text: "How often should you revalidate?" },
      {
        type: "p",
        text:
          "Review quarterly in fast-moving markets, and immediately after major shifts in product, pricing, positioning, or segment focus.",
      },
      { type: "h2", text: "What is the key takeaway?" },
      {
        type: "p",
        text:
          "A strong ICP is not declared. It is validated. The segment that repeatedly wins on conversion, retention, lifetime value, expansion, and revenue quality should define your ICP.",
      },
    ],
  },
  {
    slug: "why-your-marketing-isnt-landing",
    title: "Why Your Marketing Isn't Landing (And How to Fix It)",
    description:
      "If your marketing gets clicks but no conversions, the issue is usually ICP clarity. Learn how to fix targeting misalignment and improve conversion rate.",
    introLine:
      "Most marketing problems are not creative problems. They are clarity problems.",
    bgColor: "#FF9922",
    readingTime: "9 min read",
    date: "2025-12-22",
    seoTitle: "Why Your Marketing Isn't Converting (And the Simple Fix)",
    metaDescription:
      "If your marketing gets clicks but no conversions, the issue is usually ICP clarity. Learn how to fix targeting misalignment and improve conversion rate.",
    faq: [
      {
        question: "How do I know if my ICP is wrong?",
        answer:
          "If traffic grows while conversion rate falls, sales quality declines, and retention is weak in new cohorts, your ICP is likely too broad or mis-specified.",
      },
      {
        question: "Should I change my offer or my audience?",
        answer:
          "Test audience clarity first. If segment fit is weak, offer changes may not solve conversion issues. If fit is strong but retention is weak, review offer and onboarding next.",
      },
      {
        question: "Can marketing fail even with a good product?",
        answer:
          "Yes. A strong product can still underperform when targeting, positioning, and channel choice are misaligned with the right segment.",
      },
      {
        question: "How specific is too specific?",
        answer:
          "Specific is useful when it improves lead quality and conversion without collapsing viable demand. If quality rises while volume remains workable, specificity is helping.",
      },
      {
        question: "How long should I test new messaging?",
        answer:
          "Run tests long enough to compare qualified conversion and lead quality by segment. Four to eight weeks often gives directional signal; fuller confidence needs broader cohort data.",
      },
    ],
    body: [
      { type: "h2", text: "Direct Answer Summary" },
      {
        type: "p",
        text:
          "When marketing doesn't convert, it is usually a targeting and clarity problem, not a copywriting problem.",
      },
      {
        type: "p",
        text:
          "Most traction problems come from ICP mismatch: the message reaches people who are not the best commercial fit, or it is too broad to feel relevant to any one segment.",
      },
      {
        type: "p",
        text:
          "Rewriting copy can improve wording, but it rarely fixes root causes. Conversion improves when your Ideal Customer Profile, customer segmentation, and messaging are aligned.",
      },
      { type: "h2", text: "Common symptoms your marketing isn't landing" },
      {
        type: "ul",
        items: [
          "You get clicks but no conversions",
          "People say sounds great but do not act",
          "You keep rewriting the website and nothing changes",
          "Sales says leads are low quality",
          "Messaging feels generic",
        ],
      },
      { type: "h2", text: "Why this happens (and why it's rarely a copy problem)" },
      {
        type: "p",
        text:
          "Marketing fails when the message is broader than the segment it is trying to reach.",
      },
      {
        type: "ul",
        items: [
          "Broad ICP definition makes targeting vague",
          "Positioning is too generic to feel urgent",
          "One message tries to appeal to multiple segments",
          "No timing trigger is included in the message",
          "Channels are misaligned with attention and intent",
        ],
      },
      { type: "h2", text: "The real fix - tighten your ICP" },
      {
        type: "p",
        text:
          "Specificity improves resonance. Narrow segments convert better because pains, triggers, and decision logic are clearer.",
      },
      {
        type: "p",
        text:
          "Your headline should speak to one active pain plus one trigger. Your first paragraph should mirror real frustration in the segment's language.",
      },
      {
        type: "p",
        text: "Examples:",
      },
      {
        type: "ul",
        items: [
          "Weak: We help businesses grow faster. Strong: Struggling to convert traffic into qualified leads despite increasing spend?",
          "Weak: Improve your marketing performance. Strong: Getting clicks but no sales from your paid campaigns?",
          "Weak: Better messaging for modern brands. Strong: Still rewriting your homepage while conversion rate stays flat?",
          "Weak: Scale your SaaS pipeline. Strong: Series A SaaS team with rising CAC and low SQL quality?",
          "Weak: Grow with smarter strategy. Strong: Need to improve retention before your next board review?",
        ],
      },
      { type: "h2", text: "How to rewrite your headline using ICP clarity" },
      {
        type: "p",
        text: "Use this formula:",
      },
      {
        type: "p",
        text: "[Specific segment] + [active pain] + [time pressure or trigger]",
      },
      {
        type: "p",
        text:
          "Example: Series A SaaS founders struggling with rising churn before your next funding round?",
      },
      {
        type: "ul",
        items: [
          "Name one segment only",
          "Name one current pain",
          "Add one timing signal",
          "Remove generic claims",
        ],
      },
      { type: "h2", text: "When to use ICP Generator to fix misalignment" },
      {
        type: "p",
        text:
          "Use ICP Generator when conversion stalls and teams need a shared diagnostic framework.",
      },
      {
        type: "ul",
        items: [
          "Clarify segment definition with structured inputs",
          "Use one decision framework for targeting choices",
          "Align sales and marketing on lead quality criteria",
          "Diagnose where targeting misalignment reduces conversion",
        ],
      },
      {
        type: "p",
        text:
          "It works as a clarity and alignment tool that links customer segmentation to practical execution.",
      },
      { type: "h2", text: "Frequently Asked Questions" },
      { type: "h3", text: "How do I know if my ICP is wrong?" },
      {
        type: "p",
        text:
          "If traffic rises while conversion rate falls, sales quality declines, and new-customer retention is weak, your ICP is probably too broad or poorly defined.",
      },
      { type: "h3", text: "Should I change my offer or my audience?" },
      {
        type: "p",
        text:
          "Start by testing audience clarity. If segment fit is weak, offer changes will not solve the core issue. If fit is strong but retention is weak, review the offer and onboarding.",
      },
      { type: "h3", text: "Can marketing fail even with a good product?" },
      {
        type: "p",
        text:
          "Yes. A strong product can underperform if targeting, positioning, and channel choice are misaligned with the right segment.",
      },
      { type: "h3", text: "How specific is too specific?" },
      {
        type: "p",
        text:
          "Specificity is useful when it improves lead quality and conversion without eliminating viable demand. If quality rises while volume stays workable, specificity is helping.",
      },
      { type: "h3", text: "How long should I test new messaging?" },
      {
        type: "p",
        text:
          "Run tests long enough to compare qualified conversion and lead quality by segment. Four to eight weeks usually gives directional signal; stronger confidence needs broader cohort data.",
      },
      { type: "h2", text: "What is the key takeaway?" },
      {
        type: "p",
        text: "Clarity beats cleverness. Specificity beats breadth. ICP drives resonance.",
      },
      { type: "cta" },
    ],
  },
  {
    slug: "stop-wasting-ad-spend",
    title: "Stop Wasting Ad Spend: How ICPs Improve Targeting",
    description:
      "If your ads are underperforming, the issue is usually ICP clarity. Learn how better segment definition improves targeting and reduces wasted spend.",
    introLine:
      "Most underperforming ad accounts do not have a creative problem. They have a targeting clarity problem.",
    bgColor: "#F57BBE",
    readingTime: "10 min read",
    date: "2025-09-26",
    seoTitle: "Stop Wasting Ad Spend | How ICPs Improve Ad Targeting",
    metaDescription:
      "If your ads are underperforming, the issue is usually ICP clarity. Learn how better segment definition improves targeting and reduces wasted spend.",
    faq: [
      {
        question: "Why do my ads get clicks but no sales?",
        answer:
          "Clicks without sales usually indicate message-to-segment mismatch. The audience is interested enough to click but not a strong commercial fit to convert.",
      },
      {
        question: "Should I broaden or narrow targeting?",
        answer:
          "Narrow first around validated high-fit segments. Broaden only after conversion quality is stable and segment-level performance is clear.",
      },
      {
        question: "Do lookalike audiences still work?",
        answer:
          "Yes, if seed quality is strong. Lookalikes built from validated high-fit customers usually outperform lookalikes built from mixed-quality cohorts.",
      },
      {
        question: "How do I know if my ICP is wrong?",
        answer:
          "If cost per acquisition rises, conversion quality falls, sales rejects leads, and retention weakens in paid cohorts, your ICP is likely too broad or misaligned.",
      },
      {
        question: "How long should I test new targeting?",
        answer:
          "Run tests long enough to compare qualified conversion by segment. Four to eight weeks often gives directional signal; stronger confidence needs broader cohort data.",
      },
    ],
    body: [
      { type: "h2", text: "Direct Answer Summary" },
      {
        type: "p",
        text:
          "Better targeting is not about adding more interests. It is about improving the quality of your inputs.",
      },
      {
        type: "p",
        text:
          "Ads underperform when they are shown to low-fit audiences that are unlikely to buy, retain, or expand. That usually inflates cost per acquisition and weakens conversion rate.",
      },
      {
        type: "p",
        text:
          "A clear Ideal Customer Profile (ICP) improves audience quality, strengthens optimisation signals, and reduces wasted ad spend by concentrating delivery on segments with validated commercial fit.",
      },
      { type: "h2", text: "Why ads underperform even when creative looks strong" },
      {
        type: "ul",
        items: [
          "Broad targeting that mixes high-fit and low-fit audiences",
          "Weak lookalike seed audiences built from blended customer lists",
          "Vague messaging that does not match segment pain",
          "No trigger alignment between message and buying timing",
          "Offer-to-segment mismatch despite strong creative execution",
        ],
      },
      { type: "h2", text: "Why ICP clarity fixes targeting" },
      {
        type: "p",
        text:
          "A strong ICP improves paid media performance because it improves input quality before launch.",
      },
      {
        type: "p",
        text:
          "Paid platforms optimise based on signals you provide. If the inputs are broad, the learning will be broad.",
      },
      {
        type: "ul",
        items: [
          "Segment specificity improves algorithm learning",
          "Higher conversion signals improve optimisation",
          "Clear exclusion criteria remove low-fit traffic",
          "Cleaner audience construction improves repeatability",
          "Stronger message-market fit improves conversion quality",
        ],
      },
      {
        type: "h2",
        text: "Practical targeting wins from a strong ICP",
      },
      { type: "h3", text: "Cleaner lookalike seeds" },
      {
        type: "p",
        text:
          "Use only validated high-fit customers in seed audiences. Segment-specific seeds typically outperform blended cohorts.",
      },
      {
        type: "ul",
        items: [
          "Seed from customers with strong retention and LTV",
          "Avoid mixed-quality or high-churn seed lists",
          "Build separate lookalikes by segment where possible",
        ],
      },
      { type: "h3", text: "Creative that matches real triggers and objections" },
      {
        type: "p",
        text:
          "Use opening lines tied to real pains and objections observed in the target segment.",
      },
      {
        type: "ul",
        items: [
          "Lead with pain and timing trigger in the first line",
          "Address common objections directly in copy",
          "Use segment-specific language to improve CTR and CVR",
        ],
      },
      { type: "h3", text: "Fewer wasted impressions" },
      {
        type: "p",
        text:
          "Use ICP criteria to exclude low-fit segments and reduce spend leakage.",
      },
      {
        type: "ul",
        items: [
          "Exclude incompatible industries and maturity stages",
          "Narrow geography when fit varies by market",
          "Focus budget on segments with validated LTV",
        ],
      },
      { type: "h3", text: "Better optimisation signals" },
      {
        type: "p",
        text:
          "Higher conversion quality improves algorithm learning and shortens feedback loops.",
      },
      {
        type: "ul",
        items: [
          "Better conversion rate improves optimisation quality",
          "Faster learning reduces iteration waste",
          "Cost per qualified acquisition usually declines",
        ],
      },
      { type: "h2", text: "How to translate your ICP into targeting inputs" },
      {
        type: "ul",
        items: [
          "Define segment variables clearly (industry, stage, use case, urgency)",
          "Identify a validated high-fit customer list",
          "Map pains and triggers by segment",
          "Translate pain and trigger patterns into ad hooks",
          "Build segment-specific campaigns instead of blended ad sets",
          "Exclude low-fit signals explicitly",
          "Measure performance by segment, not just blended totals",
        ],
      },
      { type: "h2", text: "When to use ICP Generator to improve ad performance" },
      {
        type: "p",
        text:
          "Use ICP Generator as a clarity framework before scaling spend, especially when paid performance stalls.",
      },
      {
        type: "ul",
        items: [
          "A clarity tool before budget expansion",
          "A structured input system for targeting decisions",
          "A way to align paid media with validated segments",
          "A way to refine targeting before creative iteration",
        ],
      },
      { type: "h2", text: "Frequently Asked Questions" },
      { type: "h3", text: "Why do my ads get clicks but no sales?" },
      {
        type: "p",
        text:
          "Clicks without sales usually indicate message-to-segment mismatch. The audience is interested enough to click but not a strong commercial fit to convert.",
      },
      { type: "h3", text: "Should I broaden or narrow targeting?" },
      {
        type: "p",
        text:
          "Narrow first around validated high-fit segments. Broaden only after conversion quality is stable and segment-level performance is clear.",
      },
      { type: "h3", text: "Do lookalike audiences still work?" },
      {
        type: "p",
        text:
          "Yes, if seed quality is strong. Lookalikes built from validated high-fit customers usually outperform lookalikes built from mixed-quality cohorts.",
      },
      { type: "h3", text: "How do I know if my ICP is wrong?" },
      {
        type: "p",
        text:
          "If cost per acquisition rises, conversion quality falls, sales rejects leads, and retention weakens in paid cohorts, your ICP is likely too broad or misaligned.",
      },
      { type: "h3", text: "How long should I test new targeting?" },
      {
        type: "p",
        text:
          "Run tests long enough to compare qualified conversion by segment. Four to eight weeks often gives directional signal; stronger confidence needs broader cohort data.",
      },
      { type: "h2", text: "What is the key takeaway?" },
      {
        type: "p",
        text:
          "Clear ICP -> cleaner targeting -> higher conversion -> lower wasted spend.",
      },
      {
        type: "p",
        text:
          "Paid performance improves when inputs improve. Fix the segment first, then scale the spend.",
      },
      { type: "cta" },
    ],
  },
  {
    slug: "why-we-built-icp-generator",
    title: "Why We Built the ICP Generator (And How It Helps You Win)",
    description:
      "The story behind the tool - and how deeper audience clarity leads to better content, smarter targeting, and faster growth.",
    introLine: "Most marketing problems start with unclear audience definition.",
    bgColor: "#FFD336",
    readingTime: "8 min read",
    date: "2025-11-05",
    seoTitle: "Why We Built ICP Generator | Clearer Targeting, Smarter Growth",
    metaDescription:
      "Why we built ICP Generator and how structured Ideal Customer Profile clarity leads to better content, smarter targeting, and faster growth.",
    faq: [
      {
        question: "Is ICP Generator only for SaaS?",
        answer:
          "No. ICP Generator is useful for SaaS, agencies, consultancies, e-commerce brands, and B2B service teams that need stronger audience clarity and segmentation.",
      },
      {
        question: "Do I need existing data to use it?",
        answer:
          "No. You can begin with a structured hypothesis, then improve it with conversion, retention, and revenue data as evidence accumulates.",
      },
      {
        question: "Can agencies use it with clients?",
        answer:
          "Yes. Agencies can use ICP Generator to standardise discovery, align messaging strategy, and improve targeting consistency across client campaigns.",
      },
      {
        question: "Is this just another persona tool?",
        answer:
          "No. Persona tools often focus on descriptive profiles. ICP Generator focuses on operational decisions tied to commercial fit, customer segmentation, and execution.",
      },
      {
        question: "How long does it take to get clarity?",
        answer:
          "Most teams can establish a usable ICP quickly, then strengthen it through validation cycles over subsequent weeks.",
      },
    ],
    body: [
      { type: "h2", text: "Direct Answer Summary" },
      {
        type: "p",
        text:
          "ICP Generator was built to remove guesswork from Ideal Customer Profile definition and turn audience clarity into structured, repeatable decisions.",
      },
      {
        type: "p",
        text:
          "Founders should not need to become marketing experts to define who they serve best. Audience clarity should be structured, not instinctive.",
      },
      {
        type: "p",
        text:
          "When ICP clarity is operational, execution improves everywhere: content becomes sharper, targeting gets cleaner, validation becomes measurable, and growth decisions become more consistent.",
      },
      { type: "h2", text: "The problem we kept seeing" },
      {
        type: "ul",
        items: [
          "Founders rewriting websites repeatedly without conversion improvement",
          "Paid ads underperforming despite frequent creative changes",
          "Sales rejecting leads as low quality",
          "Teams disagreeing on who the target audience actually is",
          "ICP documents existing but not influencing execution",
        ],
      },
      { type: "h2", text: "Why traditional persona exercises fail" },
      {
        type: "p",
        text:
          "Most persona exercises optimise for storytelling, not commercial performance.",
      },
      {
        type: "ul",
        items: [
          "They are too demographic and weak on commercial fit signals",
          "They are rarely tied to conversion rate, retention, or lifetime value",
          "They are disconnected from customer segmentation and validation",
          "They are not integrated into content, targeting, or campaign decisions",
        ],
      },
      { type: "h2", text: "What ICP Generator actually gives you" },
      { type: "h3", text: "A structured ICP you can actually use" },
      {
        type: "p",
        text:
          "You get a clear segment definition with commercial variables and decision criteria that teams can apply consistently.",
      },
      { type: "h3", text: "Segments, pains, and messaging angles" },
      {
        type: "p",
        text:
          "You can translate clarity into content and ad execution by mapping real pains, triggers, objections, and segment-specific messaging angles.",
      },
      { type: "h3", text: "Clear next steps to turn it into marketing" },
      {
        type: "p",
        text:
          "The output supports content pillars, ad inputs, segmented campaigns, and a validation loop so ICP clarity drives ongoing optimisation.",
      },
      {
        type: "p",
        text:
          "Clarity does not just improve messaging. It improves the entire growth system.",
      },
      { type: "h2", text: "How deeper audience clarity helps you win" },
      {
        type: "ul",
        items: [
          "Better resonance with the right customers",
          "Higher conversion from clearer message-market fit",
          "Lower wasted spend through tighter targeting",
          "Faster learning from cleaner segment signals",
          "Stronger product-market fit decisions",
          "Improved marketing and sales alignment",
        ],
      },
      { type: "h2", text: "When ICP Generator is most useful" },
      {
        type: "ul",
        items: [
          "Early-stage founders without deep marketing background",
          "Teams scaling paid acquisition",
          "Companies entering new segments",
          "Periods where performance stalls",
          "When marketing feels inconsistent across channels",
        ],
      },
      {
        type: "p",
        text:
          "In these scenarios, ICP Generator works as clarity infrastructure for repeatable growth decisions.",
      },
      { type: "h2", text: "Frequently Asked Questions" },
      { type: "h3", text: "Is ICP Generator only for SaaS?" },
      {
        type: "p",
        text:
          "No. ICP Generator is useful for SaaS, agencies, consultancies, e-commerce brands, and B2B service teams that need stronger audience clarity and segmentation.",
      },
      { type: "h3", text: "Do I need existing data to use it?" },
      {
        type: "p",
        text:
          "No. You can begin with a structured hypothesis, then improve it with conversion, retention, and revenue data as evidence accumulates.",
      },
      { type: "h3", text: "Can agencies use it with clients?" },
      {
        type: "p",
        text:
          "Yes. Agencies can use ICP Generator to standardise discovery, align messaging strategy, and improve targeting consistency across client campaigns.",
      },
      { type: "h3", text: "Is this just another persona tool?" },
      {
        type: "p",
        text:
          "No. Persona tools often focus on descriptive profiles. ICP Generator focuses on operational decisions tied to commercial fit, customer segmentation, and execution.",
      },
      { type: "h3", text: "How long does it take to get clarity?" },
      {
        type: "p",
        text:
          "Most teams can establish a usable ICP quickly, then strengthen it through validation cycles over subsequent weeks.",
      },
      { type: "h2", text: "What is the next step?" },
      {
        type: "p",
        text:
          "If your marketing feels inconsistent, start with clarity. Everything else becomes easier.",
      },
      {
        type: "p",
        text:
          "Clarity reduces noise, improves focus, and gives your team a shared foundation for growth decisions.",
      },
      { type: "cta" },
    ],
  },
  {
    slug: "hollywood-brand-storytelling-framework",
    title: "The Hollywood Storytelling Framework for Your Brand Story",
    description:
      "A filmmaker's three-act framework for founders who can't find the words for their own brand story — five lines, one logline, no fluff.",
    introLine:
      "A filmmaker's three-act framework for founders who can't find the words for their own brand story — five lines, one logline, no fluff.",
    bgColor: "#7EB8DA",
    readingTime: "14 min read",
    date: "2026-09-20",
    author: {
      name: "Jon Stanford",
      title: "Founder",
      org: "Bullfinch Digital",
      url: "https://bullfinchdigital.com",
    },
    seoTitle:
      "The Hollywood Storytelling Framework for Your Brand Story (Free Template)",
    metaDescription:
      "A filmmaker's three-act framework for founders who can't find the words for their own brand story — five lines, one logline, no fluff. Free to try in marktr.io.",
    faq: [
      {
        question:
          "What's the difference between a brand story and a mission statement?",
        answer:
          "A mission statement says what you do. A brand story shows why it matters, through a real turning point — the moment that shaped why you started. One's a sentence on an About page; the other is what makes someone care.",
      },
      {
        question: "Do I need to be a good writer to use this framework?",
        answer:
          "No. The five-lines exercise is deliberately simple — plain sentences, not polished copy. The structure does the work; you just need to be honest about the real turning point.",
      },
      {
        question: "How long should a brand story be?",
        answer:
          "Short enough that someone reads the whole thing. One clear logline plus a few paragraphs beats three pages nobody finishes. Save the extended version for an About page; use the short version everywhere else — website, pitch, About page.",
      },
      {
        question: "Can a brand story change as the business grows?",
        answer:
          "The core turning point usually doesn't change, but how you tell it should evolve as the business does — new proof points, new results, new chapters building on the same foundation.",
      },
      {
        question:
          "Where should I actually use my brand story once I've written it?",
        answer:
          "Everywhere a prospect first encounters you: homepage, About page, pitch deck, sales calls, even your ICP messaging — it's the thread that should run through all of it.",
      },
    ],
    body: [
      {
        type: "p",
        text:
          "If you've ever sat down to write your own brand story and stared at a blank page — made a start, then given up halfway through, or read back what you'd written and wanted to delete the whole thing — you're not bad at this. You've just never been shown the structure.",
      },
      {
        type: "p",
        text:
          "Here's the thing most founders don't know: the secret to telling your own story well isn't fancier words, and it isn't copying whoever you think does it better. It's structure. And Hollywood has been using the exact structure I'm about to walk you through for about a hundred years.",
      },
      {
        type: "p",
        text:
          "Before we get into it — one honest disclaimer. This isn't a five-minute skim-read. There's a genuine pen-and-paper moment coming, and the founders who get the most out of it are the ones who actually stop and do the work. If that's you, brilliant. Let's go.",
      },
      { type: "h2", text: "Watch the full breakdown" },
      {
        type: "youtube",
        videoId: "kpZ1qZUeAkQ",
        title: "How To Master Storytelling (Hollywood's Cheat Sheet)",
      },
      {
        type: "p",
        text:
          "Prefer to read than watch? Keep scrolling — everything in the video is below, plus the worked example.",
      },
      {
        type: "h2",
        text: "Why your favourite film and your brand story work the same way",
      },
      {
        type: "p",
        text:
          "Think about your favourite film for a second. Not just one you've enjoyed — your favourite. The one you've watched more times than you'd like to admit.",
      },
      {
        type: "p",
        text:
          "Mine's Finding Nemo. An anxious, overprotective clownfish has his son snatched by a scuba diver and swept out to sea, and has to cross a vast, dangerous, unpredictable ocean to bring him home. It's funny, it's heartbreaking, it works.",
      },
      {
        type: "p",
        text:
          "Here's what's interesting: the thing that makes your favourite film impossible to ignore, and mine, isn't luck. It's a series of steps almost every great film follows — the same three acts, every time. Jaws, Gladiator, The Lion King, Finding Nemo. Different worlds, same blueprint.",
      },
      {
        type: "p",
        text:
          "And that blueprint doesn't just work for films. It's in every brand story you've ever actually remembered.",
      },
      {
        type: "p",
        text:
          "**Act one — the setup.** We meet the world as it is. Then something disrupts it — a problem, a challenge, a call to action that can't be ignored.",
      },
      {
        type: "p",
        text:
          "**Act two — the confrontation.** The hero faces obstacles. Things get hard. They get close to what they want and get knocked back. This is where conflict lives — and conflict is what makes a story worth paying attention to.",
      },
      {
        type: "p",
        text:
          "**Act three — the resolution.** The hero doesn't just win. They transform. They come back changed by everything they went through to get there.",
      },
      {
        type: "p",
        text:
          "Take Ben & Jerry's. Act one: two friends who couldn't afford equipment for the bagel shop they'd planned, so they took a five-dollar ice cream correspondence course instead. Act two: no experience, no industry connections, a single scoop shop in a converted petrol station in Vermont, competing against every established brand in the market. Act three: one of the most recognised and loved ice cream brands in the world, built on the belief that business can be a force for good.",
      },
      {
        type: "p",
        text: "Same structure. Different medium. Same emotional pull.",
      },
      {
        type: "h2",
        text: "The ingredient most founders leave out: conflict",
      },
      {
        type: "p",
        text:
          "The single most important ingredient in any story that actually lands — film or brand — is conflict. Not manufactured drama. Real conflict. The thing that stood between you and what you were trying to build. The moment it almost didn't work.",
      },
      {
        type: "p",
        text:
          "Most founders skip straight past it. They tell the setup — \"I saw a gap in the market\" — and jump straight to the resolution — \"and now we're an award-winning business.\" The story lands flat, because without conflict there's no tension, and without tension there's no reason to keep reading.",
      },
      {
        type: "p",
        text:
          "James Dyson went through 5,127 failed prototypes before the first working Dyson vacuum. Fifteen years. Every manufacturer he approached turned him down. That's an extraordinary act two — and it's exactly why people remember the story.",
      },
      {
        type: "p",
        text:
          "Your act two is in your story too. The thing that almost stopped you. The problem nobody had a template for. Don't smooth it out — that's the best part of your story, and it's the part that makes someone actually lean in.",
      },
      {
        type: "h2",
        text: "The five lines that hold your entire brand story",
      },
      {
        type: "p",
        text:
          "Here's the tool that makes all of this usable. Five lines. That's all you need to capture your entire brand story before you write a single word of copy, film a second of content, or brief a designer.",
      },
      {
        type: "table",
        headers: ["Act", "Line", "The question to answer"],
        rows: [
          [
            "**Act One — Setup**",
            "1. Situation",
            "Where were we? What did the world look like before your business existed?",
          ],
          [
            "",
            "2. Desire",
            "What did you want to change, build, or achieve?",
          ],
          [
            "**Act Two — Confrontation**",
            "3. Conflict",
            "What got in the way? What made it hard? Don't skip this one.",
          ],
          [
            "",
            "4. Change",
            "What shifted — the turning point, the insight, the decision that moved things forward?",
          ],
          [
            "**Act Three — Resolution**",
            "5. Result",
            "Where did you end up? What's the transformation — for you, for your customers?",
          ],
        ],
      },
      {
        type: "p",
        text:
          "Here's how it plays out for Apostle Coffee, the roastery I co-founded:",
      },
      {
        type: "ul",
        items: [
          "**Situation:** We'd spent a decade working high-pressure careers in London, but wanted a different kind of life — something slower, something we'd built with our own hands.",
          "**Desire:** To create a coffee brand from scratch that we genuinely believed in — ethical, sustainable, and genuinely delicious, all at once.",
          "**Conflict:** No budget, no team, no experience in coffee. Just a vintage roaster from the 1980s, a horse trailer packed with our possessions, and a lot of naive optimism.",
          "**Change:** We stopped trying to do what everyone else in the industry was doing, and built everything around the story at the heart of the brand — the compostable packaging nobody else was using, the tree-planting scheme before third-party offsetting was fashionable, every decision informed by what we actually stood for.",
          "**Result:** An award-winning roastery, named Best UK Coffee Subscription by The Independent, serving over a thousand customers a year — proof that values-first actually works.",
        ],
      },
      {
        type: "p",
        text: "Five lines. The whole story. Everything else can be expanded from here.",
      },
      {
        type: "p",
        text:
          "Your turn. Write your own five lines right now, and don't overthink it. If the answers don't come easily, sit down with someone who knows your business — a friend, a customer, a colleague. It's easy to get so deep in the day-to-day that you stop noticing what's genuinely interesting from the outside. Other people spot it immediately.",
      },
      {
        type: "callout",
        title: "Do this in minutes, not on paper.",
        text:
          "Once you have your five lines, you have the emotional core of your brand — the foundation everything else in your marketing gets built on.",
        href: "/story",
        linkText: "Start mapping your brand story free →",
      },
      {
        type: "h2",
        text: "Supercharge it: bring your customer into the story",
      },
      {
        type: "p",
        text:
          "In filmmaking, \"breaking the fourth wall\" is when a character steps out of the story and speaks directly to the audience — think Ferris Bueller turning to camera. The camera stops being a passive observer. It becomes the person in the room.",
      },
      {
        type: "p",
        text:
          "The most effective brand stories do the same thing. They take your authentic, personal story — everything in your five lines — and weave the customer directly into it. Not replacing the story. Supercharging it.",
      },
      {
        type: "p",
        text:
          "Take the Apostle story as it stands: \"We built Apostle because we believed coffee could be ethical, sustainable and genuinely delicious.\" Honest. Personal. A decent foundation.",
      },
      {
        type: "p",
        text:
          "Now watch what happens when we break the fourth wall: \"We built Apostle because we believed you shouldn't have to choose between great-tasting coffee and a clear conscience — so we figured out how to give you both.\"",
      },
      {
        type: "p",
        text:
          "Same story. Same values. But now the customer is in it. They can see themselves in the transformation.",
      },
      {
        type: "p",
        text:
          "For every piece of your brand story, ask: what does this mean for my customer? Not instead of your story — alongside it. \"We did this, so you can do that.\" \"We figured this out, so you don't have to.\"",
      },
      {
        type: "p",
        text:
          "To do this convincingly, you need to actually know your customer — their fears, their frustrations, what they're trying to achieve. If you haven't built a clear picture of your ideal customer yet, that's genuinely worth doing before you write another word of your brand story.",
      },
      {
        type: "callout",
        title: "Know exactly who you're writing for.",
        text: "Build a clear picture of your ideal customer before you write another word of brand story.",
        href: "/onboarding-build",
        linkText: "Build your ideal customer profile free →",
      },
      {
        type: "h2",
        text: "Package it: your logline and the 5-second test",
      },
      {
        type: "p",
        text:
          "Every great film has a logline — one sentence that captures the protagonist, the conflict and the stakes. It's the elevator pitch. The thing that decides whether someone leans in or looks away, in a world that's genuinely time-poor and full of noise.",
      },
      {
        type: "ul",
        items: [
          "**Finding Nemo:** \"When his son is swept out to sea, an anxious clownfish embarks on a perilous journey across a treacherous ocean to bring him home.\"",
          "**Jaws:** \"A police chief, a marine biologist, and a fisherman set out to stop a great white shark terrorising a small beach town.\"",
          "**Apostle Coffee:** \"When two London escapees pack a vintage roaster into a horse trailer and head for the Shropshire hills, they set out to prove that great coffee and genuine ethics don't have to be a compromise.\"",
        ],
      },
      {
        type: "p",
        text:
          "Notice what all three share: a specific protagonist, a clear conflict, a goal worth caring about, and not a single wasted word.",
      },
      {
        type: "p",
        text: "Your brand needs one too. The formula:",
      },
      {
        type: "p",
        text:
          "**\"We help [specific person] achieve [specific transformation] — without [the thing they're afraid of or tired of].\"**",
      },
      {
        type: "p",
        text:
          "Write yours, then show it to someone and ask three questions: what does this business do, who is it for, and why should they care? If they can answer all three, your packaging is working. If they can't — and most people can't, if you're honest — the problem is almost always act two. Your conflict isn't sharp enough yet. Go back to your five lines and ask what almost didn't work.",
      },
      {
        type: "p",
        text:
          "And underneath all of it is one filmmaking principle worth holding onto: show, don't tell. We process images faster than words. Wherever you can, show the product in use, show the before and after, show the conflict. Let people see the transformation rather than read about it.",
      },
      { type: "h2", text: "One framework, every piece of content" },
      {
        type: "p",
        text:
          "Here's the good news: once you have your brand story — your five lines, your logline, your fourth-wall moment — you don't need a new framework for every piece of content you make. The Hollywood blueprint works at every scale. A long-form video, a sixty-second reel, an email, a single social caption. Setup, confrontation, resolution. Every time.",
      },
      {
        type: "p",
        text:
          "Here's a real Apostle Coffee Instagram post, broken into its three acts:",
      },
      {
        type: "ul",
        items: [
          "**Act one (the problem):** \"If you've ever bought a bag of coffee that didn't quite taste right, or struggled to make café-quality coffee at home — you're not alone, and it's probably not your fault.\"",
          "**Act two (the solution):** \"We roast every bag fresh on a Monday and send it straight to your door, so the coffee arriving in your kitchen is as fresh as it gets.\"",
          "**Act three (the call to action):** \"Start your subscription today, and taste the difference a fresh roast makes.\"",
        ],
      },
      {
        type: "p",
        text:
          "Three acts, one post. The customer is the hero. Your brand is the guide that removes the obstacle. The call to action is the invitation to begin.",
      },
      { type: "h2", text: "Want the shorter version?" },
      {
        type: "p",
        text:
          "If you'd rather get the headline version in five minutes, here's the same framework, condensed:",
      },
      {
        type: "youtube",
        videoId: "p_B-epqgBus",
        title:
          "Give Me 5 Minutes and I'll Make You a Master Storyteller (Hollywood's Cheat Sheet)",
      },
      { type: "h2", text: "Your story was always there" },
      {
        type: "p",
        text:
          "It can be structured exactly the same way as your favourite film. Three acts. Five lines. A fourth-wall moment that brings your customer in. A logline that pitches your whole business in a sentence. Show, don't tell, running through all of it.",
      },
      {
        type: "p",
        text:
          "That's the blueprint. It's worked for Pixar, for Dyson, for Ben & Jerry's. It'll work for you too.",
      },
      {
        type: "p",
        text:
          "If you've made it this far and actually written your five lines — nice work. You now have something most businesses never bother to build: a story worth telling.",
      },
      {
        type: "p",
        text:
          "The next step is putting it to work everywhere — your website, your content, your ICP, your whole marketing strategy built around the story you just wrote. That's exactly what marktr.io is for, and it's free to get started.",
      },
      {
        type: "callout",
        title: "Ready when you are.",
        text:
          "Put your brand story to work across your website, content, ICP, and marketing strategy.",
        href: "/story",
        linkText: "Start building your brand story on marktr.io →",
      },
      { type: "h2", text: "Frequently asked questions" },
      {
        type: "h3",
        text: "What's the difference between a brand story and a mission statement?",
      },
      {
        type: "p",
        text:
          "A mission statement says what you do. A brand story shows why it matters, through a real turning point — the moment that shaped why you started. One's a sentence on an About page; the other is what makes someone care.",
      },
      {
        type: "h3",
        text: "Do I need to be a good writer to use this framework?",
      },
      {
        type: "p",
        text:
          "No. The five-lines exercise is deliberately simple — plain sentences, not polished copy. The structure does the work; you just need to be honest about the real turning point.",
      },
      { type: "h3", text: "How long should a brand story be?" },
      {
        type: "p",
        text:
          "Short enough that someone reads the whole thing. One clear logline plus a few paragraphs beats three pages nobody finishes. Save the extended version for an About page; use the short version everywhere else — website, pitch, About page.",
      },
      {
        type: "h3",
        text: "Can a brand story change as the business grows?",
      },
      {
        type: "p",
        text:
          "The core turning point usually doesn't change, but how you tell it should evolve as the business does — new proof points, new results, new chapters building on the same foundation.",
      },
      {
        type: "h3",
        text: "Where should I actually use my brand story once I've written it?",
      },
      {
        type: "p",
        text:
          "Everywhere a prospect first encounters you: homepage, About page, pitch deck, sales calls, even your ICP messaging — it's the thread that should run through all of it.",
      },
      { type: "h2", text: "Related resources" },
      {
        type: "links",
        items: [
          {
            text: "The 5-Stage Marketing Strategy Framework for Founders",
            href: "/resources/5-stage-marketing-strategy-framework",
          },
          {
            text: "What Is an Ideal Customer Profile (ICP)?",
            href: "/resources/what-an-icp-really-is",
          },
          {
            text: "Build your brand story free",
            href: "/story",
          },
        ],
      },
    ],
  },
  {
    slug: "5-stage-marketing-strategy-framework",
    title: "The 5-Stage Marketing Strategy Framework for Founders",
    description:
      "The exact framework I use with every client: brand story, ideal customer, transformation, offer, distribution. Five stages, real examples, no fluff.",
    introLine:
      "The exact framework I use with every client: brand story, ideal customer, transformation, offer, distribution. Five stages, real examples, no fluff.",
    bgColor: "#A8D5BA",
    readingTime: "16 min read",
    date: "2026-09-21",
    author: {
      name: "Jon Stanford",
      title: "Founder",
      org: "Bullfinch Digital",
      url: "https://bullfinchdigital.com",
    },
    seoTitle:
      "The 5-Stage Marketing Strategy Framework for Founders (Free Template)",
    metaDescription:
      "The exact framework I use with every client: brand story, ideal customer, transformation, offer, distribution. Five stages, real examples, no fluff.",
    faq: [
      {
        question: "Do I need to do all five stages in order?",
        answer:
          "Yes, broadly — each stage builds on the last. Brand story and ideal customer come first because everything else (offer, content, distribution) depends on knowing those two things clearly.",
      },
      {
        question: "How long does it take to work through all five stages?",
        answer:
          "Most founders can get a first working version of all five in a few hours if they're honest and specific rather than perfect. It's a living strategy, not a one-off document — expect to revisit it.",
      },
      {
        question:
          "What's the single biggest mistake founders make with this framework?",
        answer:
          "Skipping straight to distribution (posting content, running ads) without doing Stages One and Two first. Without a clear story and a clear ICP, distribution just amplifies vague messaging faster.",
      },
      {
        question:
          "Is this framework only for founders, or does it work for existing marketing teams too?",
        answer:
          "Both. I use it with solo founders and with small in-house teams — the stages are the same, the difference is just who's doing the work.",
      },
      {
        question: "How often should I revisit my 5-stage strategy?",
        answer:
          "At minimum whenever the business shifts meaningfully — new offer, new pricing, new market — and otherwise a light review each quarter.",
      },
    ],
    body: [
      {
        type: "p",
        text:
          "If you want to drive sales, build awareness and genuinely win at marketing, there are five stages you need to follow — and a guiding principle behind every single one of them that's easy to miss.",
      },
      {
        type: "p",
        text:
          "I know what you're thinking. Another framework copied from a book or a YouTube channel. But I've been living this one for nearly a decade, through my own businesses and with the clients I work with every week — and I've made the mistakes so you don't have to.",
      },
      {
        type: "p",
        text:
          "This is sensible marketing strategy for founders and small business owners who've built something genuinely excellent, but feel like their digital marketing is dramatically underselling it. Follow it properly and you'll go from the 90% of business owners who are guessing — posting and hoping and wondering why nothing's sticking — to the 10% who actually know what they're doing and why it's working.",
      },
      { type: "h2", text: "Watch the full breakdown" },
      {
        type: "youtube",
        videoId: "ooKobJUrjdE",
        title:
          "Why Your Marketing Isn't Working (And The 5 Stages That Fix It)",
      },
      {
        type: "p",
        text:
          "Prefer to read than watch? Everything's below, with the worked examples.",
      },
      { type: "h2", text: "Stage one — your brand story" },
      {
        type: "p",
        text:
          "Every great business is built around a compelling story. I don't mean a slogan — I don't mean \"just do it\" or \"think different.\" I mean the people and the founding moments that make a business genuinely different within its niche.",
      },
      {
        type: "p",
        text:
          "It's Ben and his mate Jerry starting an ice cream shop after they couldn't afford the equipment for the bagel shop they'd planned. It's Jo Malone, who grew up on a council estate, left school with no qualifications, and started hand-mixing scented bath oils in her kitchen as a thank-you gift for her facial clients. It's a 19-year-old delivering pizzas for Pizza Hut who couldn't find gym clothes that fit his lean physique, so he launched his own brand from his garage.",
      },
      {
        type: "p",
        text:
          "Chances are you're so close to your own business that your story feels anything but compelling. That's where you're wrong. Everyone has something genuinely interesting to say about how their business got started — and in a world saturated with AI-generated content, it's the human, personal connection that cuts through the noise.",
      },
      {
        type: "p",
        text:
          "So let's find yours. Your brand story is the answer to three questions. Grab some paper and write these down:",
      },
      {
        type: "ul",
        items: [
          "Why does your business exist?",
          "What made you start it?",
          "What do you genuinely believe that your competitors don't?",
        ],
      },
      {
        type: "p",
        text:
          "When I built Apostle Coffee, the story wasn't \"we sell nice coffee.\" It was an off-grid, renewable-powered roastery deep in the Shropshire hills, built on the belief that coffee could be environmentally minded, ethically sourced and genuinely delicious, all at the same time. That belief shaped everything — the compostable packaging we championed before anyone else, the tree-planting scheme we launched before third-party offsetting became fashionable, the way we spoke across our website, social media and PR. Every marketing decision was informed by the story at the heart of the brand.",
      },
      {
        type: "p",
        text:
          "We started by towing an old horse trailer to rural Shropshire, packed with our possessions and a coffee roaster from the 1980s, with nothing more than naive curiosity and a desire to build something from scratch. That detail — that specific moment — is what makes the story real. Anyone can say they're passionate about coffee. Not many people start with a vintage roaster and a horse trailer.",
      },
      {
        type: "p",
        text:
          "Try applying those three questions to your own business today. If the answers don't come easily, ask someone who knows your business — a customer, a supplier, a colleague. It's easy to get so deep in the day-to-day that you can't see what's genuinely interesting from the outside. Other people spot it immediately.",
      },
      {
        type: "p",
        text:
          "If you can't answer these three questions clearly, your marketing will always feel like something's missing — and your customers will feel that too. Which is exactly what we're looking at next.",
      },
      {
        type: "callout",
        title: "Map your brand story properly, not just on the back of an envelope.",
        text:
          "marktr.io walks you through this exact framework in a few minutes and keeps it structured, ready to plug into every piece of content you make.",
        href: "/story",
        linkText: "Start mapping your brand story free →",
      },
      { type: "h2", text: "Stage two — your ideal customer" },
      {
        type: "p",
        text:
          "This is where most marketing falls apart — and I'll be honest, it's where I see even experienced founders getting it wrong too.",
      },
      {
        type: "p",
        text:
          "As business owners, it's so easy to get caught up in packing orders, developing new lines, or chasing the sales you're already making, that you never stop to really look at who you're selling to. A business that markets to everybody speaks to nobody.",
      },
      {
        type: "p",
        text:
          "Here's something that helped me think about this differently. Imagine a stadium full of potential customers — thousands of people, all in one place. What's the single most powerful way to get one specific person's attention? It's their name. Shout someone's name in a crowded space and they'll turn and look every time. That's what great marketing does — it calls your ideal customer out by name, speaks directly to their situation, and makes them feel like you built your product specifically for them.",
      },
      {
        type: "p",
        text:
          "What you need is a crystal-clear picture of that one person — your Ideal Customer Profile, or ICP (sometimes called a customer avatar). Not a vague sense of \"people who might need this.\" A specific, detailed picture of who they are, what they care about, what keeps them up at night, what language they use to describe their own problems, and where they spend their time online.",
      },
      {
        type: "p",
        text:
          "You might end up with two or three ICPs, because different products within your offering suit different people. But start with one.",
      },
      {
        type: "p",
        text:
          "Here's how you do it. Write down a description of your single best customer — someone you've already done business with. Not your average customer, not the customer you'd like to attract. Your best one to date. Even better, the customer who got the most value from your product, who always comes back or refers you to friends, who you could happily point a prospect to for a testimonial. This person is your north star.",
      },
      {
        type: "p",
        text: "Once you have them in mind, define six things:",
      },
      {
        type: "ul",
        items: [
          "**Who are they?** A name and a one-line description of their situation. An ICP doesn't have to be a single individual — it can be a couple, a household, or a type.",
          "**What defines them?** Age, location, income, lifestyle — be as specific as possible.",
          "**What motivates them** in relation to your product, and the broader interests and values that shape their decisions.",
          "**What attracts them to your offer** — what signals tell them you're the right choice?",
          "**What problems can you solve for them** — what's keeping them up at night that your product genuinely fixes?",
          "**Where do they hang out?** Not down the pub — the online spaces and platforms they actually use and trust, because that's where your marketing needs to show up.",
        ],
      },
      {
        type: "p",
        text:
          "Here's a real example. I work with a family-run campsite in the Shropshire Hills called The Green, offering camping, caravanning and yearly touring pitches. For their touring caravan pitch product, the ICP is John and Sue, the settled adventurers: a retired couple, 55–70, based in the Midlands or North West within a couple of hours' drive, on a stable pension with mid-range disposable income, routine-orientated, valuing community and calmness over novelty. They want to return to the same peaceful spot every season rather than start somewhere new each time. They're put off by sites that feel too commercial or entertainment-heavy, and they're probably uncertain about storing their caravan over winter — a problem The Green can solve directly with clear advice. They hang out in Facebook caravanning and motorhome groups, and watch YouTube content from couples just like them.",
      },
      {
        type: "p",
        text:
          "Knowing your ideal customer isn't about excluding anybody. It's about speaking so clearly to one person that they feel like you built your entire business specifically for them. Call that person out in a stadium of thousands, and others will always follow.",
      },
      {
        type: "p",
        text:
          "Stages one and two are deeply connected — your story and your ideal customer shape each other, and you'll find yourself moving back and forth between them. That's the work. There's no shortcut. This is what makes your marketing hold together across platforms.",
      },
      {
        type: "callout",
        title: "Skip the blank page.",
        text:
          "marktr.io's free ICP tool builds a detailed ideal customer profile in a couple of minutes — and you can edit the result until it's exactly right.",
        href: "/onboarding-build",
        linkText: "Build your ideal customer profile free →",
      },
      { type: "h2", text: "Stage three — your transformation" },
      {
        type: "p",
        text:
          "With your ICP in place, stage three is where we take it somewhere useful: the transformation your product or service actually delivers.",
      },
      {
        type: "p",
        text:
          "I don't mean listing your products and services — \"we have three colours of cooking pot in four sizes.\" I mean articulating the transformation. What pain point or frustration in your customer's life can only you address? What are you transforming their situation from — pain and discomfort — to: their desired state of satisfaction and comfort? In its most literal sense, a pain point is a headache, and your product is the aspirin.",
      },
      {
        type: "p",
        text:
          "Remember, a product is a thing. A transformation is the change that happens to someone because of that thing. A plumber doesn't just install boilers — they give a family a warm home in winter. A personal trainer doesn't sell workout sessions — they build the body and confidence their client has always dreamed of.",
      },
      {
        type: "p",
        text:
          "When you frame your offer as the transformation it provides — when you show your customer what life looks like after they've worked with you — you stop selling a product and start telling a story that can't be ignored.",
      },
      {
        type: "p",
        text:
          "Ask yourself: what does my customer's world look like before they buy from me, and how does it look after? What's better? What problem no longer exists? And use language that speaks directly to them — \"you\" and \"your,\" not \"we\" and \"our.\"",
      },
      {
        type: "p",
        text:
          "Here's an example from Apostle's own website. We know from talking to customers that the first time they buy, they're looking for reassurance the coffee will taste good without needing fancy barista gear — the pain point is the fear they can't make coffee as good as their local café. Here's the copy that addresses it:",
      },
      {
        type: "p",
        text:
          "\"Great coffee shouldn't be this hard. If you've ever bought a bag of coffee that didn't quite taste right, or struggled to make café-quality coffee at home — that's exactly why we created Apostle. We source exceptional coffees, roast them fresh every Monday, and deliver them straight to your door, so you can make better coffee at home without the guesswork.\"",
      },
      {
        type: "p",
        text:
          "Illustrate the problem, speak directly to the customer, finish with the solution. Once you break it into those steps, it's easy to repeat across your entire marketing.",
      },
      { type: "h2", text: "Stage four — your compelling offer" },
      {
        type: "p",
        text:
          "This is the stage most people jump straight into — understandably, because we see it everywhere: the supermarket, our favourite online retailers, even the guy at the fruit market shouting out offers. It feels like a clear, quick marketing win.",
      },
      {
        type: "p",
        text:
          "That's exactly why it sits at number four. A compelling offer only works when it's built on the foundations you've already laid — a clear story, a well-defined ideal customer, and a transformation they actually want. Without those three things, even a brilliant offer falls flat, because nobody knows why they should care, and they're certainly not going to bite if you're knocking 20% off willy-nilly.",
      },
      {
        type: "p",
        text:
          "If your ICP is already at the point of transformation and ready to buy, you probably don't need a compelling offer at all — you'll hit a home run regardless. But what about the customers on the fence, who fit your avatar but need a little more convincing? That's where the compelling offer comes in: converting your audience into a sale, or attracting them with something alluring. Two versions worth knowing:",
      },
      {
        type: "p",
        text:
          "**The value hook** — something small you dangle in front of a customer to make it easy to say yes. Free postage. 10% off a first purchase. A bundle. A complimentary extra. It could even be an emotional reason to buy — a limited-time offer, a money-back guarantee. The key is making it something you're genuinely happy to give away without hurting your margin or reputation.",
      },
      {
        type: "p",
        text:
          "**The lead magnet** — magnetically drawing in people who need more convincing before they commit. Often a free sample, a free tool, a useful guide (like this very article), a taster session, a brochure. Anything that lets your ideal customer experience some of the value of your main product with minimal personal risk. The goal isn't giving lots away for free — it's letting them taste the transformation that awaits, so when you ask them to buy, book or subscribe, it feels like a no-brainer.",
      },
      {
        type: "p",
        text:
          "A few real examples: Apostle's product is a coffee subscription, and the lead magnet is a free 30-second coffee quiz that points people to their best-fit club — personal curation and a little flex of expertise. For a campsite, it could be a free \"plan your visit\" guide — local walks, restaurants, things to do — that sells the experience before anyone's booked. For a log cabin builder, a free checklist: \"ten things to check before you commission a log cabin,\" which positions you as the expert before a single conversation about budget.",
      },
      {
        type: "p",
        text:
          "Most research suggests it takes around ten touch points before a customer even registers your brand exists. A well-placed lead magnet knocks several of those off in one go — and makes you a lot harder to ignore.",
      },
      { type: "h2", text: "Stage five — your distribution" },
      {
        type: "p",
        text:
          "This is exactly where most people start, which is exactly the problem. Should you be on TikTok? Do you need a podcast? More Instagram? LinkedIn? These are the bits of marketing that feel most visible — we see breakout successes on every platform, so it's tempting to jump in.",
      },
      {
        type: "p",
        text:
          "But platform choice is a distribution decision, not a strategy decision. You can't distribute something effectively if you don't know what you're saying, who you're saying it to, or what you want them to do when they hear it. Without stages one to four in place, you're shouting into a room and hoping the right person is in it.",
      },
      {
        type: "p",
        text:
          "With the foundations already built, platform choice becomes straightforward — because it's entirely about where your ideal customer hangs out (stage two, question six). It's not about you, your product, where you'd like to be, or what competitors are posting. It's where your specific customer spends their time online, asks their questions, and trusts the answers they get.",
      },
      {
        type: "p",
        text:
          "Back to John and Sue: they're in Facebook caravanning groups, watching YouTube from couples just like them. So that's where The Green's messaging and offers need to show up — not TikTok.",
      },
      {
        type: "p",
        text:
          "Pick one or two platforms and do them properly. Consistency beats omnipresence every time. A business that shows up brilliantly on Instagram and sends a genuinely useful weekly email will outperform a business posting half-heartedly across six platforms, every single time.",
      },
      { type: "h2", text: "The bonus stage — be intentional" },
      {
        type: "p",
        text:
          "Five stages, as promised — but there's one more thing that separates businesses that sustain their marketing from the ones that burn out after six weeks: being intentional about why you're doing this.",
      },
      {
        type: "p",
        text:
          "\"Grow the business\" isn't specific enough. What does growth actually look like for you — more revenue? More of the right customers? More people on a waitlist? A loyal community? Get clear on your specific version of success, because that's what lets you measure it. Measurement isn't about being obsessed with numbers — it's the only honest way to know what's working and what isn't.",
      },
      {
        type: "p",
        text:
          "Launch something. Learn from it. Fix it or cut it. Then double down on what's actually working. The founders who build genuinely strong marketing aren't the ones with the most creative campaigns — they're the ones who stayed intentional, kept it simple, and were honest with themselves about what the results were telling them.",
      },
      {
        type: "p",
        text:
          "Launch, learn, fix, repeat. That's it. That's all great marketing ever is: the five stages working together, with the intention to measure what matters and keep improving.",
      },
      { type: "h2", text: "Want the shorter version?" },
      {
        type: "p",
        text:
          "If you'd rather get the headline version in five minutes, here's the same five stages, condensed:",
      },
      {
        type: "youtube",
        videoId: "A7Zp9WBUleY",
        title:
          "Give Me 5 Minutes. I'll Grow Your Business (With 5 Marketing Steps)",
      },
      {
        type: "h2",
        text: "Your strategy is built the same way every time",
      },
      {
        type: "p",
        text:
          "Five stages: your brand story, your ideal customer, the transformation you deliver, your compelling offer, and where your messaging needs to show up. That's not a to-do list — it's the foundation of a complete marketing strategy, in the order that actually makes each stage work.",
      },
      {
        type: "p",
        text:
          "If you're a busy founder and want to get this done in minutes rather than an afternoon with a notepad, marktr.io walks you through the whole thing — brand story, ideal customer, and everything that follows — and it's free to get started.",
      },
      {
        type: "callout",
        title: "Ready when you are.",
        text:
          "Walk through brand story, ideal customer, and the rest of your marketing strategy on marktr — free to get started.",
        href: "/story",
        linkText: "Start building your marketing strategy on marktr.io →",
      },
      { type: "h2", text: "Frequently asked questions" },
      {
        type: "h3",
        text: "Do I need to do all five stages in order?",
      },
      {
        type: "p",
        text:
          "Yes, broadly — each stage builds on the last. Brand story and ideal customer come first because everything else (offer, content, distribution) depends on knowing those two things clearly.",
      },
      {
        type: "h3",
        text: "How long does it take to work through all five stages?",
      },
      {
        type: "p",
        text:
          "Most founders can get a first working version of all five in a few hours if they're honest and specific rather than perfect. It's a living strategy, not a one-off document — expect to revisit it.",
      },
      {
        type: "h3",
        text: "What's the single biggest mistake founders make with this framework?",
      },
      {
        type: "p",
        text:
          "Skipping straight to distribution (posting content, running ads) without doing Stages One and Two first. Without a clear story and a clear ICP, distribution just amplifies vague messaging faster.",
      },
      {
        type: "h3",
        text: "Is this framework only for founders, or does it work for existing marketing teams too?",
      },
      {
        type: "p",
        text:
          "Both. I use it with solo founders and with small in-house teams — the stages are the same, the difference is just who's doing the work.",
      },
      {
        type: "h3",
        text: "How often should I revisit my 5-stage strategy?",
      },
      {
        type: "p",
        text:
          "At minimum whenever the business shifts meaningfully — new offer, new pricing, new market — and otherwise a light review each quarter.",
      },
      { type: "h2", text: "Related resources" },
      {
        type: "links",
        items: [
          {
            text: "The Hollywood Storytelling Framework for Your Brand Story",
            href: "/resources/hollywood-brand-storytelling-framework",
          },
          {
            text: "What Is an Ideal Customer Profile (ICP)?",
            href: "/resources/what-an-icp-really-is",
          },
          {
            text: "How to Turn an ICP Into Better Content and Ads",
            href: "/resources/turn-an-icp-into-better-content-and-ads",
          },
          {
            text: "Start building your strategy free",
            href: "/story",
          },
        ],
      },
    ],
  },
];

export function getResourceBySlug(slug: string) {
  return RESOURCE_POSTS.find((p) => p.slug === slug) ?? null;
}
