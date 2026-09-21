import { createClient } from "@supabase/supabase-js";

const FALLBACK = "https://marktr.io/";

export default async function handler(req, res) {
  const raw = req.query?.slug;
  const slug = typeof raw === "string" ? raw : Array.isArray(raw) ? raw[0] : "";

  try {
    const supabaseUrl = process.env.SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey || !slug) {
      return res.redirect(302, FALLBACK);
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);
    const { data, error } = await supabase
      .from("yt_redirects")
      .select("destination")
      .eq("path", slug)
      .limit(1)
      .maybeSingle();

    if (error || !data?.destination) {
      return res.redirect(302, FALLBACK);
    }

    return res.redirect(302, data.destination);
  } catch {
    return res.redirect(302, FALLBACK);
  }
}
