import { useNavigate } from "react-router-dom";
import { Card } from "../ui/card";
import { Button } from "../ui/button";
import { avatarUrlFromKey } from "../../utils/avatarLibrary";

export type GuestICPCardIcp = {
  _index: number;
  name: string;
  description: string;
  industry?: string;
  company_size?: string;
  companySize?: string;
  location?: string;
  pain_points?: string[];
  painPoints?: string[];
  goals?: string[];
  avatar_key?: string | null;
  avatar?: string | null;
  color?: string | null;
};

type GuestICPCardProps = {
  icp: GuestICPCardIcp;
  brandName: string;
};

export function GuestICPCard({ icp }: GuestICPCardProps) {
  const navigate = useNavigate();

  const avatarSrc = icp.avatar_key
    ? avatarUrlFromKey(icp.avatar_key)
    : icp.avatar ?? avatarUrlFromKey(null);

  const companySize = icp.company_size ?? icp.companySize;
  const metaLine = [icp.industry, companySize, icp.location]
    .filter(Boolean)
    .join(" · ");

  const painPoints = icp.pain_points ?? icp.painPoints ?? [];
  const goals = icp.goals ?? [];
  const bullets = (painPoints.length ? painPoints : goals).slice(0, 2);

  const handleViewProfile = () => {
    navigate(`/icp-preview/${icp._index}`);
  };

  return (
    <div className="relative animate-fade-in-up h-full">
      <Card className="h-full border border-black rounded-design overflow-hidden transition-all duration-300 hover:shadow-lg">
        <div
          className="h-24 border-b border-black relative"
          style={{ backgroundColor: icp.color || "#EDEDED" }}
        >
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2">
            <div className="w-20 h-20 bg-background rounded-full border-2 border-black flex items-center justify-center shadow-md overflow-hidden">
              <img
                src={avatarSrc}
                alt={icp.name}
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        </div>

        <div className="p-6 pt-12 bg-background text-left flex flex-col h-[calc(100%-6rem)]">
          <h3 className="font-['Fraunces'] text-lg mb-1 truncate">{icp.name}</h3>

          {metaLine && (
            <p className="font-['Inter'] text-xs text-foreground/60 mb-3 truncate">
              {metaLine}
            </p>
          )}

          {icp.description && (
            <p className="font-['Inter'] text-sm text-foreground/70 mb-3 line-clamp-2">
              {icp.description}
            </p>
          )}

          {bullets.length > 0 && (
            <ul className="mb-4 space-y-1">
              {bullets.map((item, idx) => (
                <li
                  key={`guest-icp-bullet-${idx}`}
                  className="font-['Inter'] text-xs text-foreground/70 flex gap-1.5"
                >
                  <span className="text-foreground/40 shrink-0">•</span>
                  <span className="line-clamp-2">{item}</span>
                </li>
              ))}
            </ul>
          )}

          <div className="mt-auto pt-2">
            <Button
              type="button"
              className="w-full rounded-design border border-black bg-button-green hover:bg-button-green/90 text-foreground font-['DM_Sans'] text-sm"
              onClick={handleViewProfile}
            >
              View full profile →
            </Button>
            <p className="mt-2 font-['Inter'] text-xs text-foreground/50 text-center">
              Edit, refine and unlock strategy with your free trial
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
