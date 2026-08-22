import { useEffect, useState } from "react";
import { ExternalLink, FileDown, Loader2 } from "lucide-react";
import { supabase } from "../config/supabase";
import {
  DownloadGateModal,
  type DownloadResource,
} from "../components/downloads/DownloadGateModal";

type ResourceRow = DownloadResource & {
  created_at?: string;
};

export default function Downloads() {
  const [resources, setResources] = useState<ResourceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<DownloadResource | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(null);
      const { data, error: queryError } = await supabase
        .from("resources")
        .select("id, title, description, slug, thumbnail_url, related_video_url, created_at")
        .eq("published", true)
        .order("created_at", { ascending: false });

      if (cancelled) return;

      if (queryError) {
        console.error("[Downloads] failed to load resources", queryError);
        setError("Couldn’t load downloads right now. Please try again shortly.");
        setResources([]);
      } else {
        setResources((data as ResourceRow[]) ?? []);
      }
      setLoading(false);
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main className="bg-background py-16 sm:py-20 lg:py-24">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-10 text-left">
          <h1 className="mb-4 font-['Fraunces'] text-3xl font-bold sm:text-4xl lg:text-5xl">
            Free downloads
          </h1>
          <p className="max-w-2xl text-lg text-foreground/70">
            Worksheets, templates and guides that go with our YouTube videos. Enter your email to
            unlock each PDF.
          </p>
        </div>

        {loading ? (
          <div className="flex items-center gap-3 text-foreground/70">
            <Loader2 className="h-5 w-5 animate-spin" />
            Loading downloads…
          </div>
        ) : null}

        {error ? (
          <div className="rounded-design border border-black bg-white p-6 text-foreground/80">
            {error}
          </div>
        ) : null}

        {!loading && !error && resources.length === 0 ? (
          <div className="rounded-design border border-black bg-white p-6 text-foreground/80">
            No downloads yet — check back soon.
          </div>
        ) : null}

        <section className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {resources.map((resource) => (
            <article
              key={resource.id}
              className="flex flex-col overflow-hidden rounded-design border border-black bg-white transition-all duration-300 hover:shadow-lg"
            >
              {resource.thumbnail_url ? (
                <div className="aspect-[16/10] overflow-hidden border-b border-black bg-accent-grey/20">
                  <img
                    src={resource.thumbnail_url}
                    alt=""
                    className="h-full w-full object-cover"
                    loading="lazy"
                  />
                </div>
              ) : (
                <div className="flex aspect-[16/10] items-center justify-center border-b border-black bg-button-green/20">
                  <FileDown className="h-10 w-10 text-text-dark/70" />
                </div>
              )}

              <div className="flex flex-1 flex-col p-6">
                <h2 className="font-['Fraunces'] text-xl text-text-dark sm:text-2xl">
                  {resource.title}
                </h2>
                <p className="mt-3 flex-1 leading-relaxed text-text-dark/80">
                  {resource.description}
                </p>

                {resource.related_video_url ? (
                  <a
                    href={resource.related_video_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-4 inline-flex items-center gap-1.5 text-sm text-foreground/80 underline hover:text-foreground"
                  >
                    Watch the video
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                ) : null}

                <button
                  type="button"
                  onClick={() => setSelected(resource)}
                  className="mt-5 inline-flex w-full items-center justify-center rounded-design border border-black bg-button-green px-4 py-3 font-['Fraunces'] font-bold text-text-dark transition-all hover:bg-button-green/90 hover:shadow-md"
                >
                  Download
                </button>
              </div>
            </article>
          ))}
        </section>
      </div>

      {selected ? (
        <DownloadGateModal resource={selected} onClose={() => setSelected(null)} />
      ) : null}
    </main>
  );
}
