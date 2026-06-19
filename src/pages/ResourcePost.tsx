import { useEffect } from "react";
import { Link, useParams } from "react-router-dom";
import { getResourceBySlug } from "../content/resources";
import { Button } from "../components/ui/button";

export default function ResourcePost() {
  const { slug } = useParams();
  const post = getResourceBySlug(String(slug || ""));

  useEffect(() => {
    if (!post) return;

    const siteUrl = "https://icpgenerator.io";
    const pageUrl = `${siteUrl}/resources/${post.slug}`;
    const title = post.seoTitle ?? post.title;
    const description = post.metaDescription ?? post.description;

    document.title = title;

    let meta = document.querySelector(
      'meta[name="description"]',
    ) as HTMLMetaElement | null;
    if (!meta) {
      meta = document.createElement("meta");
      meta.name = "description";
      document.head.appendChild(meta);
    }
    meta.content = description;

    const articleJsonLd = {
      "@type": "Article",
      "@id": `${pageUrl}#article`,
      mainEntityOfPage: {
        "@type": "WebPage",
        "@id": pageUrl,
      },
      headline: title,
      description,
      datePublished: post.date ?? "2026-02-13",
      dateModified: post.date ?? "2026-02-13",
      inLanguage: "en-GB",
      author: {
        "@type": "Organization",
        name: "ICP Generator",
      },
      publisher: {
        "@type": "Organization",
        name: "ICP Generator",
      },
    };

    const graph: Array<Record<string, unknown>> = [articleJsonLd];
    if (post.faq?.length) {
      graph.push({
        "@type": "FAQPage",
        "@id": `${pageUrl}#faq`,
        mainEntity: post.faq.map((item) => ({
          "@type": "Question",
          name: item.question,
          acceptedAnswer: {
            "@type": "Answer",
            text: item.answer,
          },
        })),
      });
    }

    const oldScript = document.getElementById("resource-jsonld");
    if (oldScript) oldScript.remove();

    const script = document.createElement("script");
    script.type = "application/ld+json";
    script.id = "resource-jsonld";
    script.text = JSON.stringify({
      "@context": "https://schema.org",
      "@graph": graph,
    });
    document.head.appendChild(script);

    return () => {
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
    };
  }, [post]);

  if (!post) {
    return (
      <main className="bg-background py-16 sm:py-20 lg:py-24">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="rounded-design border border-black bg-white p-6">
            <h1 className="font-['Fraunces'] text-2xl sm:text-3xl font-bold">
              Resource not found
            </h1>
            <p className="mt-2 text-foreground/70">
              That link doesn’t exist (or the post hasn’t been added yet).
            </p>
            <Link className="mt-4 inline-block underline" to="/resources">
              Back to Resources
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="bg-background py-16 sm:py-20 lg:py-24">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl">
          <Link to="/resources" className="text-sm underline font-['Fraunces']">
            ← Back to Resources
          </Link>

          <header
            className="mt-6 rounded-design border border-black p-6 sm:p-8"
            style={{ backgroundColor: post.bgColor }}
          >
            <h1 className="font-['Fraunces'] text-3xl sm:text-4xl lg:text-5xl font-bold text-text-dark">
              {post.title}
            </h1>
            <p className="mt-4 text-text-dark/80 leading-relaxed text-lg">
              {post.introLine ?? post.description}
            </p>
            <div className="mt-5 flex flex-wrap items-center gap-3 text-sm text-text-dark/90">
              {post.readingTime ? (
                <span className="rounded-full border border-black bg-white px-3 py-1">
                  {post.readingTime}
                </span>
              ) : null}
              {post.date ? (
                <span className="rounded-full border border-black bg-white px-3 py-1">
                  {new Date(post.date).toLocaleDateString("en-GB", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  })}
                </span>
              ) : null}
            </div>
          </header>

          <article className="mt-8 rounded-design border border-black bg-white p-6 sm:p-8">
            {post.body.map((block, idx) => {
              if (block.type === "h2") {
                return (
                  <h2
                    key={idx}
                    className="mt-10 font-['Fraunces'] text-2xl sm:text-3xl font-bold"
                  >
                    {block.text}
                  </h2>
                );
              }
              if (block.type === "h3") {
                return (
                  <h3
                    key={idx}
                    className="mt-8 font-['Fraunces'] text-xl sm:text-2xl font-bold"
                  >
                    {block.text}
                  </h3>
                );
              }
              if (block.type === "ul") {
                return (
                  <ul
                    key={idx}
                    className="mt-4 list-disc pl-6 space-y-2 text-foreground/80"
                  >
                    {block.items.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                );
              }
              if (block.type === "links") {
                return (
                  <ul
                    key={idx}
                    className="mt-4 list-disc pl-6 space-y-2 text-foreground/80"
                  >
                    {block.items.map((item) => (
                      <li key={item.href}>
                        <Link className="underline hover:no-underline" to={item.href}>
                          {item.text}
                        </Link>
                      </li>
                    ))}
                  </ul>
                );
              }
              if (block.type === "cta") {
                return (
                  <div key={idx} className="mt-10 flex flex-col items-center text-center">
                    <p className="mb-8 text-lg font-['Inter'] text-foreground/70 font-bold">
                      Start free and see who your real customers are...
                    </p>
                    <div className="flex flex-col gap-3 items-center">
                      <Button variant="cta" href="/health-check">
                        Check your health — free
                      </Button>
                      <p className="text-sm text-foreground/60 text-center">
                        No credit card required
                      </p>
                    </div>
                  </div>
                );
              }
              if (block.type === "callout") {
                return (
                  <div
                    key={idx}
                    className="mt-6 rounded-design border border-black bg-accent-grey/10 p-4"
                  >
                    <div className="font-['Fraunces'] font-bold">
                      {block.title}
                    </div>
                    <div className="mt-1 text-foreground/80">{block.text}</div>
                  </div>
                );
              }
              return (
                <p key={idx} className="mt-4 text-foreground/80 leading-relaxed">
                  {block.text}
                </p>
              );
            })}
          </article>
        </div>
      </div>
    </main>
  );
}
