import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import {
  RESOURCE_POSTS,
  RESOURCE_TOPICS,
  countPostsByTopic,
  isTopicId,
  topicLabel,
  type TopicId,
} from "../content/resources";
import { track } from "../lib/analytics";

function pillClass(active: boolean) {
  return [
    "inline-flex min-h-11 shrink-0 snap-start items-center rounded-full border-2 px-4 py-2 font-['Plus_Jakarta_Sans'] text-sm font-medium whitespace-nowrap transition-colors",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-foreground",
    active
      ? "border-foreground bg-foreground text-background"
      : "border-brand-stroke bg-background text-foreground hover:bg-brand-lime hover:text-brand-navy",
  ].join(" ");
}

export default function Resources() {
  const [query, setQuery] = useState("");
  const [searchParams, setSearchParams] = useSearchParams();
  const rawTopic = searchParams.get("topic");
  const selected: TopicId | null = isTopicId(rawTopic) ? rawTopic : null;

  useEffect(() => {
    if (rawTopic !== null && !isTopicId(rawTopic)) {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          next.delete("topic");
          return next;
        },
        { replace: true },
      );
    }
  }, [rawTopic, setSearchParams]);

  const counts = useMemo(() => countPostsByTopic(RESOURCE_POSTS), []);

  const posts = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = RESOURCE_POSTS.slice()
      .sort((a, b) => (b.date || "").localeCompare(a.date || ""))
      .filter((p) => (selected ? p.topics.includes(selected) : true))
      .filter((p) => {
        if (!q) return true;
        return (
          p.title.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q)
        );
      });
    return list;
  }, [query, selected]);

  const applyTopic = (next: TopicId | null, fromUser: boolean) => {
    setSearchParams(
      (prev) => {
        const params = new URLSearchParams(prev);
        if (next) params.set("topic", next);
        else params.delete("topic");
        return params;
      },
      { replace: false },
    );
    if (fromUser) track("resources_filter", { topic: next ?? "all" });
  };

  const onPillClick = (id: TopicId | null) => {
    if (id === null) {
      if (selected !== null) applyTopic(null, true);
      return;
    }
    applyTopic(selected === id ? null : id, true);
  };

  return (
    <main className="bg-background py-16 sm:py-20 lg:py-24">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-10 text-left">
          <h1 className="mb-4 font-['Fraunces'] text-3xl sm:text-4xl lg:text-5xl font-bold">
            Resources
          </h1>
          <p className="max-w-2xl text-lg text-foreground/70">
            Marketing guides, how-to’s and playbooks — written to be practical,
            not fluffy.
          </p>
        </div>

        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search resources…"
            className="w-full sm:max-w-md rounded-design border border-black bg-white px-4 py-3 focus:outline-none"
          />
          <Link
            to="/pricing"
            className="text-sm underline text-foreground/80 hover:text-foreground"
          >
            View pricing →
          </Link>
        </div>

        <div className="resources-topic-pills-wrap mb-8">
          <div
            className="resources-topic-pills flex snap-x gap-2"
            role="toolbar"
            aria-label="Filter resources by topic"
          >
            <button
              type="button"
              aria-pressed={selected === null}
              data-track-id="resources_filter_all"
              data-track-location="resources_filter"
              className={pillClass(selected === null)}
              onClick={() => onPillClick(null)}
            >
              All {counts.all}
            </button>
            {RESOURCE_TOPICS.map((topic) => {
              const active = selected === topic.id;
              return (
                <button
                  key={topic.id}
                  type="button"
                  aria-pressed={active}
                  data-track-id={`resources_filter_${topic.id}`}
                  data-track-location="resources_filter"
                  className={pillClass(active)}
                  onClick={() => onPillClick(topic.id)}
                >
                  {topic.label} {counts[topic.id]}
                </button>
              );
            })}
          </div>
        </div>

        <p className="sr-only" aria-live="polite">
          {posts.length} {posts.length === 1 ? "article" : "articles"}
        </p>

        <section
          key={`${selected ?? "all"}:${query}`}
          className="resources-filter-results grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3"
        >
          {posts.map((post, index) => (
            <article
              key={post.slug}
              className="group relative rounded-design border border-black transition-all duration-300 hover:scale-[1.02] hover:shadow-lg"
              style={{
                backgroundColor: post.bgColor,
                animationDelay: `${index * 0.05}s`,
              }}
            >
              <div className="flex flex-wrap gap-2 px-6 pt-6 pr-14 sm:px-8 sm:pt-8">
                {post.topics.map((id) => (
                  <button
                    key={id}
                    type="button"
                    data-track-id={`resources_filter_${id}`}
                    data-track-location="resources_filter"
                    className="inline-flex min-h-7 items-center rounded-full border-2 border-[#0B0B0C] bg-[#FBFAF0] px-2.5 py-0.5 font-['Plus_Jakarta_Sans'] text-xs font-medium text-[#101A26] hover:bg-brand-lime focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#101A26]"
                    onClick={() => applyTopic(id, true)}
                  >
                    {topicLabel(id)}
                  </button>
                ))}
              </div>
              <Link
                to={`/resources/${post.slug}`}
                className="relative block cursor-pointer p-6 pt-4 sm:p-8 sm:pt-4"
              >
                <div className="absolute top-0 right-6 sm:right-8 transition-transform duration-300 group-hover:translate-x-1 group-hover:-translate-y-1">
                  <ArrowRight className="h-6 w-6 sm:h-8 sm:w-8 text-text-dark" />
                </div>

                <div className="pr-8">
                  <h2 className="mb-4 font-['Fraunces'] text-xl sm:text-2xl text-text-dark">
                    {post.title}
                  </h2>
                  <p className="text-text-dark/80 leading-relaxed">
                    {post.description}
                  </p>
                  <div className="mt-5 flex items-center gap-3 text-sm text-text-dark/90">
                    {post.readingTime ? <span>{post.readingTime}</span> : null}
                    {post.date ? (
                      <>
                        <span className="opacity-60">•</span>
                        <span className="opacity-80">
                          {new Date(post.date).toLocaleDateString("en-GB", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })}
                        </span>
                      </>
                    ) : null}
                  </div>
                </div>
              </Link>
            </article>
          ))}
        </section>

        {posts.length === 0 && query.trim() ? (
          <div className="mt-10 rounded-design border border-black bg-white p-6">
            No resources found. Try a different search.
          </div>
        ) : null}

        {posts.length === 0 && !query.trim() ? (
          <div className="mt-10 rounded-design border-2 border-brand-stroke bg-card p-6 text-center">
            <p className="font-['Plus_Jakarta_Sans'] text-foreground">
              No articles in this topic yet.
            </p>
            <button
              type="button"
              data-track-id="resources_filter_all"
              data-track-location="resources_filter"
              className={`${pillClass(false)} mt-4`}
              onClick={() => applyTopic(null, true)}
            >
              Show all
            </button>
          </div>
        ) : null}
      </div>
    </main>
  );
}
