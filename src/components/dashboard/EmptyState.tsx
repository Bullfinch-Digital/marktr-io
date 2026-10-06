import { Button } from "../ui/button";
import { Plus, Sparkles } from "lucide-react";

interface EmptyStateProps {
  type: "new-user" | "free-limit";
  onCreateNew?: () => void;
  onUpgrade?: () => void;
}

export function EmptyState({ type, onCreateNew, onUpgrade }: EmptyStateProps) {
  if (type === "new-user") {
    return (
      <div className="flex items-center justify-center min-h-[500px] animate-fade-in-up">
        <div className="text-center max-w-lg px-6">
          {/* Illustration Circle */}
          <div className="w-32 h-32 mx-auto mb-8 bg-gradient-to-br from-brand-lavender to-brand-lime rounded-full border-2 border-black flex items-center justify-center shadow-lg">
            <Sparkles className="w-16 h-16 text-background" />
          </div>

          <h2 className="font-['Fraunces'] text-3xl mb-4">
            Create your first ICP
          </h2>
          
          <p className="font-['Plus_Jakarta_Sans'] text-foreground/70 text-lg mb-8">
            Start with AI-powered guidance to build detailed customer personas that drive your marketing strategy.
          </p>

          <Button
            onClick={onCreateNew}
            className="h-12 px-8 flex items-center gap-2 mx-auto"
          >
            <Plus className="w-5 h-5" />
            Generate New ICP
          </Button>

          {/* Helper Text */}
          <p className="font-['Plus_Jakarta_Sans'] text-sm text-foreground/50 mt-6">
            Takes about 2 minutes • Powered by AI
          </p>
        </div>
      </div>
    );
  }

  // Free Limit Reached
  return (
    <div className="flex items-center justify-center min-h-[500px] animate-fade-in-up">
      <div className="text-center max-w-lg px-6">
        {/* Blurred Placeholder Cards */}
        <div className="grid grid-cols-3 gap-4 mb-8 opacity-40 blur-sm select-none pointer-events-none">
          {[1, 2, 3].map((i) => (
            <div 
              key={i}
              className="bg-accent-grey/50 border-2 border-brand-stroke rounded-[24px] h-48"
            />
          ))}
        </div>

        <h2 className="font-['Fraunces'] text-3xl mb-4">
          You've reached your free ICP limit
        </h2>
        
        <p className="font-['Plus_Jakarta_Sans'] text-foreground/70 text-lg mb-8">
          Unlock unlimited ICPs, advanced exports, and premium features to supercharge your customer research.
        </p>

        <Button
          onClick={onUpgrade}
          className="h-12 px-8 mx-auto"
        >
          Upgrade to unlock unlimited ICPs
        </Button>

        {/* Feature List */}
        <ul className="font-['Plus_Jakarta_Sans'] text-sm text-foreground/70 mt-8 space-y-2 text-left max-w-sm mx-auto">
          <li className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 bg-button-green rounded-full" />
            Unlimited ICP generation
          </li>
          <li className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 bg-button-green rounded-full" />
            Full data exports (PDF, JSON)
          </li>
          <li className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 bg-button-green rounded-full" />
            Advanced collections & tagging
          </li>
          <li className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 bg-button-green rounded-full" />
            Priority support
          </li>
        </ul>
      </div>
    </div>
  );
}

