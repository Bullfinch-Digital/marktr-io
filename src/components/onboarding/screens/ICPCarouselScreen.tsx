import { useState } from "react";
import { Button } from "../../ui/button";
import { ICPCard, ICPData } from "../ICPCard";

interface ICPCarouselScreenProps {
  onUnlockAll?: () => void;
  onEmailICP?: () => void;
}

export function ICPCarouselScreen({ onUnlockAll, onEmailICP }: ICPCarouselScreenProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  // Mock ICP data - this would come from the backend/AI generation
  const icpData: ICPData[] = [
    {
      name: "Sarah the Startup Founder",
      description: "Early-stage tech founder seeking product-market fit",
      industry: "Tech / SaaS",
      companySize: "1–10",
      location: "London, UK",
      goals: [
        "Validate product-market fit quickly",
        "Build a scalable customer acquisition strategy",
        "Understand target audience deeply"
      ],
      pain_points: [
        "Limited budget for market research",
        "Wasting time on wrong customer segments",
        "Struggling to articulate value proposition clearly"
      ],
      budget: "Low (Bootstrapped / Pre-seed)",
      decision_makers: ["Founder", "Co-founder"],
      tech_stack: ["Notion", "Figma", "Linear", "Stripe"],
      challenges: [
        "Noise in the startup market",
        "Weak brand awareness"
      ],
      opportunities: [
        "Quick adoption from early-stage communities"
      ],
      avatar: "https://images.unsplash.com/photo-1687575635557-a3f3ed535b56?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjcmVhdGl2ZSUyMHByb2Zlc3Npb25hbCUyMHdvbWFufGVufDF8fHx8MTc2MzMwMjY3NHww&ixlib=rb-4.1.0&q=80&w=1080",
      color: "#BBA0E5"
    },
    {
      name: "Marcus the Marketing Manager",
      description: "Growth-focused marketer at a scaling B2B company",
      industry: "B2B SaaS",
      companySize: "50–250",
      location: "Manchester, UK",
      goals: [
        "Increase conversion rates across campaigns",
        "Better segment and target audiences",
        "Prove marketing ROI to leadership"
      ],
      pain_points: [
        "Generic messaging not resonating",
        "High CAC with low conversion",
        "Difficulty personalizing at scale"
      ],
      budget: "Medium (£10k–£50k monthly)",
      decision_makers: ["Marketing Manager", "VP of Growth"],
      tech_stack: ["HubSpot", "Marketo", "GA4", "Salesforce"],
      challenges: [
        "Fragmented customer insights"
      ],
      opportunities: [
        "Strong email list",
        "Scaling campaigns"
      ],
      avatar: "https://images.unsplash.com/photo-1762522921456-cdfe882d36c3?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx5b3VuZyUyMHByb2Zlc3Npb25hbCUyMHBvcnRyYWl0fGVufDF8fHx8MTc2MzIxNTg2MHww&ixlib=rb-4.1.0&q=80&w=1080",
      color: "#FFD336"
    },
    {
      name: "Emma the E-commerce Owner",
      description: "Small business owner selling handmade products online",
      industry: "E-commerce / Retail",
      companySize: "1–5",
      location: "Bristol, UK",
      goals: [
        "Grow online sales consistently",
        "Build a loyal customer community",
        "Stand out in a crowded market"
      ],
      pain_points: [
        "Limited marketing expertise",
        "Competing with bigger brands on budget",
        "Understanding customer preferences"
      ],
      budget: "Low–medium (£2k–£8k monthly)",
      decision_makers: ["Owner"],
      tech_stack: ["Shopify", "Klaviyo", "Meta Ads Manager"],
      challenges: [
        "Small brand awareness"
      ],
      opportunities: [
        "Strong niche audience"
      ],
      avatar: "https://images.unsplash.com/photo-1750535135645-005e250ff210?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxmcmllbmRseSUyMGNhcnRvb24lMjBhdmF0YXJ8ZW58MXx8fHwxNzYzMzAyNjc0fDA&ixlib=rb-4.1.0&q=80&w=1080",
      color: "#FF9922"
    }
  ];

  const handlePrevious = () => {
    setCurrentIndex((prev) => (prev === 0 ? icpData.length - 1 : prev - 1));
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev === icpData.length - 1 ? 0 : prev + 1));
  };

  return (
    <div className="bg-background pt-24 pb-32 px-4">
      <div className="container mx-auto max-w-7xl">
        {/* Header */}
        <div className="text-center mb-16 animate-fade-in-up">
          <h1 className="font-['Fraunces'] mb-4 text-4xl sm:text-5xl">
            Your Ideal Customer Profiles
          </h1>
          <p className="font-['Plus_Jakarta_Sans'] text-foreground/70 max-w-2xl mx-auto text-lg">
            We've generated 3 detailed ICPs based on your responses. The first one is free — unlock all 3 to get the complete picture.
          </p>
        </div>

        {/* Carousel Container - Linear Stacked Cards */}
        <div className="relative mb-12 flex flex-col justify-center items-center" style={{ minHeight: '1600px' }}>
          
          {/* Navigation Arrows - Positioned beside profile pictures */}
          <div className="absolute top-20 left-1/2 -translate-x-1/2 flex justify-between pointer-events-none z-40" style={{ width: 'calc(100% - 40px)', maxWidth: '600px' }}>
            <button
              onClick={handlePrevious}
              className="pointer-events-auto transition-all hover:scale-110 active:scale-95"
              aria-label="Previous ICP"
            >
              <svg
                width="24"
                height="21"
                viewBox="0 0 8 7"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="rotate-90"
              >
                <path
                  d="M4 7L0.535898 0.25L7.4641 0.25L4 7Z"
                  fill="#FF9922"
                  stroke="black"
                  strokeWidth="1"
                />
              </svg>
            </button>
            
            <button
              onClick={handleNext}
              className="pointer-events-auto transition-all hover:scale-110 active:scale-95"
              aria-label="Next ICP"
            >
              <svg
                width="24"
                height="21"
                viewBox="0 0 8 7"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="-rotate-90"
              >
                <path
                  d="M4 7L0.535898 0.25L7.4641 0.25L4 7Z"
                  fill="#FF9922"
                  stroke="black"
                  strokeWidth="1"
                />
              </svg>
            </button>
          </div>

          {/* All three cards displayed in linear fashion */}
          <div className="relative flex items-start justify-center" style={{ width: '100%', maxWidth: '1200px' }}>
            {icpData.map((icp, index) => {
              // Calculate position and styling for each card
              const isActive = index === currentIndex;
              const offset = (index - currentIndex) * 120; // Horizontal offset for stacking
              const verticalOffset = index * 20; // Vertical offset reduced by 50% - each card steps down 20px instead of 40px
              const zIndex = isActive ? 30 : 20 - Math.abs(index - currentIndex);
              const scale = isActive ? 1 : 0.95;
              const opacity = isActive ? 1 : 0.7;
              
              return (
                <div
                  key={index}
                  className="absolute transition-all duration-500 ease-out"
                  style={{
                    left: `calc(50% + ${offset}px)`,
                    top: `${verticalOffset}px`,
                    transform: `translateX(-50%) scale(${scale})`,
                    zIndex: zIndex,
                    opacity: opacity,
                    width: '100%',
                    maxWidth: '500px',
                    pointerEvents: isActive ? 'auto' : 'none'
                  }}
                  onClick={() => !isActive && setCurrentIndex(index)}
                >
                  <ICPCard 
                    data={icp} 
                    isLocked={index !== 0}
                    onUnlock={onUnlockAll}
                    cardNumber={index + 1}
                    onEmailICP={onEmailICP}
                  />
                </div>
              );
            })}
          </div>
        </div>

        {/* Page-level CTA */}
        <div className="text-center animate-fade-in-up delay-200 mt-16">
          <Button
            onClick={onUnlockAll}
            className="bg-button-green hover:bg-button-green/90 text-foreground border border-black rounded-design px-8 py-6 transition-all hover:scale-[1.02] hover:shadow-lg"
          >
            Unlock the full ICP Generator
          </Button>
          <p className="font-['Plus_Jakarta_Sans'] text-sm text-foreground/60 mt-4">
            Unlock unlimited brands and collections, full customer intelligence, content strategy, exports, and collaboration tools.
          </p>
        </div>
      </div>
    </div>
  );
}
