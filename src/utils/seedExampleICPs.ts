import { supabase } from "../config/supabase";
import { ICP } from "../hooks/useICPs";
import { resolveBrandIdForIcpOps } from "../lib/icpBrandAttach";
import { newGenerationId, supersedeBrandCurrentIcps, withVersioningDefaults } from "../lib/icpVersioning";

/**
 * Seed the database with example ICPs for testing.
 * Supersedes any current rows on the target brand first so re-runs don't hit the name unique index.
 */
export async function seedExampleICPs(
  userId: string,
  preferredBrandId?: string | null
): Promise<ICP[]> {
  const now = new Date().toISOString();
  const brandId = await resolveBrandIdForIcpOps(userId, preferredBrandId ?? null);
  const generationId = newGenerationId();

  if (brandId) {
    try {
      await supersedeBrandCurrentIcps(brandId);
    } catch (supersedeErr) {
      console.warn("[seedExampleICPs] supersedeBrandCurrentIcps failed", supersedeErr);
      throw supersedeErr;
    }
  }

  const examples = [
    {
      user_id: userId,
      brand_id: brandId,
      name: "Sarah the Startup Founder",
      description: "Early-stage tech founder seeking product-market fit.",
      industry: "Tech / SaaS",
      company_size: "1–10",
      location: "London, UK",
      pain_points: [
        "Limited budget for research",
        "Struggles choosing the right customer segment",
        "Weak product/market clarity"
      ],
      goals: [
        "Validate product-market fit",
        "Find early adopters",
        "Build scalable acquisition channels"
      ],
      budget: "Low (Bootstrapped / Pre-seed)",
      decision_makers: ["Founder", "Co-founder"],
      tech_stack: ["Notion", "Figma", "Stripe", "HubSpot"],
      challenges: ["Noise in the startup market", "Weak brand awareness"],
      opportunities: ["Quick adoption from early-stage communities"],
      created_at: now,
      updated_at: now
    },
    {
      user_id: userId,
      brand_id: brandId,
      name: "Marcus the Marketing Manager",
      description: "Growth-focused B2B marketing lead.",
      industry: "B2B SaaS",
      company_size: "50–250",
      location: "Manchester, UK",
      pain_points: [
        "Attribution issues",
        "Low email engagement",
        "Inefficient funnel conversions"
      ],
      goals: [
        "Improve lead quality",
        "Increase ROI",
        "Create automated funnel"
      ],
      budget: "Medium (£10k–£50k monthly)",
      decision_makers: ["Marketing Manager", "VP of Growth"],
      tech_stack: ["HubSpot", "Marketo", "GA4", "Salesforce"],
      challenges: ["Fragmented customer insights"],
      opportunities: ["Strong email list", "Scaling campaigns"],
      created_at: now,
      updated_at: now
    },
    {
      user_id: userId,
      brand_id: brandId,
      name: "Emma the E-commerce Owner",
      description: "Runs a sustainable DTC online shop.",
      industry: "E-commerce / Retail",
      company_size: "1–5",
      location: "Bristol, UK",
      pain_points: [
        "High CAC",
        "Competing with bigger brands",
        "Low repeat purchase rate"
      ],
      goals: [
        "Increase retention",
        "Grow social presence",
        "Stabilise revenue"
      ],
      budget: "Low–medium (£2k–£8k monthly)",
      decision_makers: ["Owner"],
      tech_stack: ["Shopify", "Klaviyo", "Meta Ads Manager"],
      challenges: ["Small brand awareness"],
      opportunities: ["Strong niche audience"],
      created_at: now,
      updated_at: now
    }
  ].map((row) => withVersioningDefaults(row, generationId));

  const { data, error } = await supabase
    .from("icps")
    .insert(examples)
    .select();

  if (error) {
    console.error("Error seeding example ICPs:", error);
    throw error;
  }

  return data ?? [];
}
