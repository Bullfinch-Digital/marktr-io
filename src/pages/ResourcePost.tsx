import { Fragment, type ReactNode, useEffect } from "react";
import { Link, useParams } from "react-router-dom";
import { getResourceBySlug } from "../content/resources";
import { Button } from "../components/ui/button";

/** Lightweight inline formatting: **bold** and [label](/path) links. */
function renderInline(text: string): ReactNode {
  const nodes: ReactNode[] = [];
  const re = /(\*\*[^*]+\*\*|\[[^\]]+\]\([^)]+\))/g;
  let last = 0;
  let match: RegExpExecArray | null;
  let key = 0;

  while ((match = re.exec(text)) !== null) {
    if (match.index > last) {
      nodes.push(text.slice(last, match.index));
    }
    const token = match[0];
    if (token.startsWith("**")) {
      nodes.push(
        <strong key={key++}>{token.slice(2, -2)}</strong>,
      );
    } else {
      const linkMatch = token.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
      if (linkMatch) {
        const [, label, href] = linkMatch;
        if (href.startsWith("/")) {
          nodes.push(
            <Link key={key++} className="underline hover:no-underline" to={href}>
              {label}
            </Link>,
          );
        } else {
          nodes.push(
            <a
              key={key++}
              className="underline hover:no-underline"
              href={href}
              target="_blank"
              rel="noopener noreferrer"
            >
              {label}
            </a>,
          );
        }
      }
    }
    last = match.index + token.length;
  }

  if (last < text.length) {
    nodes.push(text.slice(last));
  }

  return nodes.length === 1 ? nodes[0] : <Fragment>{nodes}</Fragment>;
}

export default function ResourcePost() {
  const { slug } = useParams();
  const post = getResourceBySlug(String(slug || ""));

  useEffect(() => {
    if (!post) return;

    const siteUrl = "https://marktr.io";
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
        name: "marktr",
      },
      publisher: {
        "@type": "Organization",
        name: "marktr",
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
                      <li key={item}>{renderInline(item)}</li>
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
                        <Link
                          className="underline hover:no-underline"
                          to={item.href}
                        >
                          {item.text}
                        </Link>
                      </li>
                    ))}
                  </ul>
                );
              }
              if (block.type === "cta") {
                return (
                  <div
                    key={idx}
                    className="mt-10 flex flex-col items-center text-center"
                  >
                    <p className="mb-8 text-lg font-['Inter'] text-foreground/70 font-bold">
                      Start free and see who your real customers are...
                    </p>
                    <div className="flex flex-col gap-3 items-center">
                      <Button variant="cta" href="/health-check">
                        Check your digital health - free
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
                    className="mt-6 rounded-design border border-black bg-accent-grey/10 p-4 sm:p-5"
                  >
                    <div className="font-['Fraunces'] font-bold">
                      {block.title}
                    </div>
                    <div className="mt-1 text-foreground/80 leading-relaxed">
                      {renderInline(block.text)}
                    </div>
                    {block.href && block.linkText ? (
                      <Link
                        to={block.href}
                        className="mt-3 inline-block font-semibold underline hover:no-underline"
                      >
                        {block.linkText}
                      </Link>
                    ) : null}
                  </div>
                );
              }
              if (block.type === "youtube") {
                const title =
                  block.title ?? "YouTube video related to this article";
                return (
                  <div
                    key={idx}
                    className="mt-6 overflow-hidden rounded-design border border-black bg-black/5"
                  >
                    <div className="relative w-full" style={{ paddingTop: "56.25%" }}>
                      <iframe
                        className="absolute inset-0 h-full w-full"
                        src={`https://www.youtube-nocookie.com/embed/${block.videoId}`}
                        title={title}
                        loading="lazy"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                        referrerPolicy="strict-origin-when-cross-origin"
                        allowFullScreen
                      />
                    </div>
                  </div>
                );
              }
              if (block.type === "table") {
                return (
                  <div key={idx} className="mt-6 overflow-x-auto">
                    <table className="w-full min-w-[28rem] border-collapse text-left text-sm">
                      <thead>
                        <tr className="border-b border-black">
                          {block.headers.map((header) => (
                            <th
                              key={header}
                              className="py-2 pr-4 font-['Fraunces'] font-semibold"
                            >
                              {header}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="text-foreground/80">
                        {block.rows.map((row, rowIdx) => (
                          <tr
                            key={rowIdx}
                            className="border-b border-border align-top"
                          >
                            {row.map((cell, cellIdx) => (
                              <td key={cellIdx} className="py-3 pr-4">
                                {renderInline(cell)}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                );
              }
              return (
                <p
                  key={idx}
                  className="mt-4 text-foreground/80 leading-relaxed"
                >
                  {renderInline(block.text)}
                </p>
              );
            })}
          </article>
        </div>
      </div>
    </main>
  );
}
