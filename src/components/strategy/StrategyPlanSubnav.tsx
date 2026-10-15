import { useEffect, useRef, useState } from "react";

export type StrategyPlanNavItem = {
  id: string;
  label: string;
  trackSection: string;
};

type Props = {
  items: StrategyPlanNavItem[];
};

function stickyCoverHeight(nav: HTMLElement | null): number {
  const header = document.querySelector("header");
  const headerHeight = header instanceof HTMLElement ? header.offsetHeight : 64;
  const navHeight = nav?.offsetHeight ?? 48;
  return headerHeight + navHeight;
}

function pageScrolledToBottom(): boolean {
  const doc = document.documentElement;
  const scrollable = doc.scrollHeight - window.innerHeight;
  return scrollable > 2 && window.scrollY >= scrollable - 2;
}

export function StrategyPlanSubnav({ items }: Props) {
  const idsKey = items.map((item) => item.id).join("|");
  const [activeId, setActiveId] = useState(items[0]?.id ?? "");
  const navRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const ids = idsKey ? idsKey.split("|") : [];
    const intersecting = new Set<string>();
    let observer: IntersectionObserver | null = null;

    const resolve = () => {
      if (ids.length === 0) return;
      if (pageScrolledToBottom()) {
        setActiveId(ids[ids.length - 1] ?? "");
        return;
      }
      let current = "";
      for (const id of ids) {
        if (intersecting.has(id)) current = id;
      }
      if (!current) {
        const offset = stickyCoverHeight(navRef.current);
        current = ids[0] ?? "";
        for (const id of ids) {
          const el = document.getElementById(id);
          if (!el) continue;
          if (el.getBoundingClientRect().top <= offset + 1) current = id;
        }
      }
      setActiveId(current);
    };

    const connect = () => {
      observer?.disconnect();
      intersecting.clear();
      const offset = stickyCoverHeight(navRef.current);
      const bottomInset = Math.max(0, window.innerHeight - offset - 1);
      observer = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            const id = (entry.target as HTMLElement).id;
            if (!id) continue;
            if (entry.isIntersecting) intersecting.add(id);
            else intersecting.delete(id);
          }
          resolve();
        },
        {
          root: null,
          rootMargin: `-${offset}px 0px -${bottomInset}px 0px`,
          threshold: 0,
        }
      );
      for (const id of ids) {
        const el = document.getElementById(id);
        if (el) observer.observe(el);
      }
      resolve();
    };

    connect();
    window.addEventListener("scroll", resolve, { passive: true });
    window.addEventListener("resize", connect);
    return () => {
      observer?.disconnect();
      window.removeEventListener("scroll", resolve);
      window.removeEventListener("resize", connect);
    };
  }, [idsKey]);

  if (items.length === 0) return null;

  return (
    <nav
      ref={navRef}
      className="sticky top-16 z-40 -mx-6 mt-6 border-b border-brand-stroke bg-background/95 px-6 backdrop-blur-md lg:-mx-12 lg:px-12"
    >
      <div className="mx-auto flex h-12 w-full min-[1181px]:max-w-[1100px] items-center gap-1 overflow-x-auto">
        {items.map((item) => {
          const active = item.id === activeId;
          return (
            <button
              key={item.id}
              type="button"
              data-track-id={`strategy_subnav_${item.trackSection}`}
              data-track-location="strategy_page"
              aria-current={active ? "true" : undefined}
              onClick={() => {
                setActiveId(item.id);
                document.getElementById(item.id)?.scrollIntoView({ behavior: "smooth", block: "start" });
              }}
              className={`app-focus-ring shrink-0 rounded-full px-3 py-1.5 font-['Plus_Jakarta_Sans'] text-sm transition-colors ${
                active
                  ? "border-2 border-brand-stroke bg-brand-lime text-brand-navy"
                  : "border-2 border-transparent text-foreground/70 hover:text-foreground"
              }`}
            >
              {item.label}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
