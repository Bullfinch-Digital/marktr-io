import { Lock } from "lucide-react";
import { Button } from "../ui/button";
import { cn } from "../ui/utils";

interface BlurredLockCardProps {
  children: React.ReactNode;
  onUpgrade?: () => void;
  className?: string;
}

export function BlurredLockCard({ children, onUpgrade, className }: BlurredLockCardProps) {
  return (
    <div className={cn("relative rounded-design border border-black bg-background overflow-hidden", className)}>
      {/* Blurred Content */}
      <div className="blur-[4px] opacity-50 pointer-events-none">
        {children}
      </div>
      
      {/* Lock Overlay */}
      <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/60 backdrop-blur-sm z-10">
        <Lock className="w-8 h-8 text-foreground/60 mb-4" />
        <p className="font-['Plus_Jakarta_Sans'] text-sm text-foreground/70 mb-4">
          Upgrade to unlock this feature
        </p>
        {onUpgrade && (
          <Button
            onClick={onUpgrade}
            className="bg-button-green text-text-dark hover:bg-button-green/90 border border-black rounded-design font-['Fraunces'] font-bold"
          >
            Upgrade Now
          </Button>
        )}
      </div>
    </div>
  );
}

