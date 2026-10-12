import {
  Facebook,
  Globe,
  Instagram,
  Linkedin,
  Mail,
  Megaphone,
  Music2,
  Pin,
  Plus,
  Youtube,
  type LucideIcon,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import type { StrategyWithLinks } from "../../hooks/useBrandStrategies";

function collectChannels(strategy: StrategyWithLinks): string[] {
  const plan = strategy.strategy?.channel_plan;
  const fromPlan = [plan?.primary_channel, ...(plan?.secondary_channels ?? [])];
  const fromRow = strategy.channel ?? [];
  const seen = new Set<string>();
  const labels: string[] = [];

  for (const raw of [...fromPlan, ...fromRow]) {
    const label = typeof raw === "string" ? raw.trim() : "";
    if (!label) continue;
    const key = label.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    labels.push(label);
  }

  return labels;
}

function channelIcon(label: string): LucideIcon {
  const key = label.toLowerCase();
  if (key.includes("instagram") || key === "ig") return Instagram;
  if (key.includes("facebook") || key.includes("meta")) return Facebook;
  if (key.includes("linkedin")) return Linkedin;
  if (key.includes("tiktok")) return Music2;
  if (key.includes("youtube")) return Youtube;
  if (key.includes("email") || key.includes("mail")) return Mail;
  if (key.includes("pinterest")) return Pin;
  if (key.includes("twitter") || key === "x" || key.startsWith("x ")) return Megaphone;
  if (key.includes("website") || key.includes("landing") || key.includes("shop")) return Globe;
  return Megaphone;
}

function contentCountLabel(count: number): string {
  return count === 1 ? "1 piece of content" : `${count} pieces of content`;
}

type CardProps = {
  strategy: StrategyWithLinks;
};

export function StrategyRosterCard({ strategy }: CardProps) {
  const navigate = useNavigate();
  const goal = strategy.strategy?.positioning?.one_liner?.trim() || "Open to view the full strategy.";
  const channels = collectChannels(strategy);
  const visibleChannels = channels.slice(0, 4);
  const extraChannels = Math.max(0, channels.length - visibleChannels.length);
  const contentCount = Array.isArray(strategy.strategy?.suggested_content)
    ? strategy.strategy.suggested_content.length
    : 0;

  return (
    <button
      type="button"
      onClick={() => navigate(`/strategy/${strategy.id}`)}
      data-track-id="campaign_card_open"
      data-track-location="campaigns_list"
      aria-label={`Open campaign: ${strategy.title}`}
      className="app-card app-card-hover app-focus-ring flex h-full w-full flex-col overflow-hidden p-0 text-left transition-transform duration-200 hover:-translate-y-0.5"
    >
      <span className="block h-1.5 w-full bg-brand-lime" aria-hidden />
      <span className="flex flex-1 flex-col gap-3 p-5">
        <span className="app-heading line-clamp-2 font-['Fraunces'] text-lg text-foreground" title={strategy.title}>
          {strategy.title}
        </span>
        <span className="line-clamp-2 font-['Plus_Jakarta_Sans'] text-sm text-muted-foreground">{goal}</span>
        {visibleChannels.length > 0 ? (
          <span className="flex flex-wrap items-center gap-1.5">
            {visibleChannels.map((channel) => {
              const Icon = channelIcon(channel);
              return (
                <span
                  key={channel}
                  className="inline-flex max-w-full items-center gap-1 rounded-full border-2 border-brand-stroke bg-background px-2 py-0.5 font-['Plus_Jakarta_Sans'] text-xs text-foreground"
                  title={channel}
                >
                  <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden />
                  <span className="truncate">{channel}</span>
                </span>
              );
            })}
            {extraChannels > 0 ? (
              <span className="inline-flex items-center rounded-full border-2 border-brand-stroke bg-brand-lime/40 px-2 py-0.5 font-['Plus_Jakarta_Sans'] text-xs text-brand-navy">
                +{extraChannels}
              </span>
            ) : null}
          </span>
        ) : null}
        <span className="mt-auto font-['Plus_Jakarta_Sans'] text-xs text-muted-foreground">
          {contentCountLabel(contentCount)}
        </span>
      </span>
    </button>
  );
}

type NewCardProps = {
  onClick: () => void;
  disabled?: boolean;
};

export function StrategyNewCampaignCard({ onClick, disabled = false }: NewCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      data-track-id="campaign_new"
      data-track-location="campaigns_list"
      aria-label="New campaign"
      className="app-card app-card-hover app-focus-ring flex h-full min-h-[11.5rem] w-full flex-col items-center justify-center gap-3 border-dashed p-5 text-center transition-transform duration-200 hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0 disabled:hover:shadow-none"
    >
      <span className="flex h-11 w-11 items-center justify-center rounded-full border-2 border-brand-stroke bg-brand-lime text-brand-navy">
        <Plus className="h-5 w-5" aria-hidden />
      </span>
      <span className="app-heading font-['Fraunces'] text-lg text-foreground">New campaign</span>
      <span className="font-['Plus_Jakarta_Sans'] text-sm text-muted-foreground">
        Create a strategy from your aims and personas
      </span>
    </button>
  );
}
