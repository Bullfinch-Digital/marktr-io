import { useEffect, useState } from "react";

export type StrategyPlanNavItem = {
  id: string;
  label: string;
  trackSection: string;
};

const STICKY_OFFSET = 64 + 48;

type Props = {
  items: StrategyPlanNavItem[];
};

function sectionInView(ids: string[]): string {
  let current = ids[0] ?? "";
  for (const id of ids) {
    const el = document.getElementById(id);
    if (!el) continue;
    if (el.getBoundingClientRect().top - STICKY_OFFSET <= 24) current = id;
  }
  return current;
}

export function StrategyPlanSubnav({ items }: Props) {
  const idsKey = items.map((item) => item.id).join("|");
  const [activeId, setActiveId] = useState(items[0]?.id ?? "");

  useEffect(() => {
    const ids = idsKey ? idsKey.split("|") : [];
    const update = () => setActiveId(sectionInView(ids));
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [idsKey]);

  if (items.length === 0) return null;

  return (
    <nav className="sticky top-16 z-40 -mx-6 mt-6 border-b border-brand-stroke bg-background/95 px-6 backdrop-blur-md lg:-mx-12 lg:px-12">
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
