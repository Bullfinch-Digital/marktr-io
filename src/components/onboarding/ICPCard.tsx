import { Lock } from "lucide-react";
import { Button } from "../ui/button";
import { ImageWithFallback } from "../figma/ImageWithFallback";
import svgPaths from "../../imports/svg-dy16vubapd";

export interface ICPData {
  name: string;
  description: string;
  industry?: string;
  companySize?: string;
  location?: string;
  goals: string[];
  pain_points: string[];
  budget?: string;
  decision_makers?: string[];
  tech_stack?: string[];
  challenges?: string[];
  opportunities?: string[];
  avatar: string;
  color: string;
}

interface ICPCardProps {
  data: ICPData;
  isLocked?: boolean;
  onUnlock?: () => void;
  cardNumber?: number;
  onEmailICP?: () => void;
  ctaLabel?: string;
}

export function ICPCard({
  data,
  isLocked = false,
  onUnlock,
  cardNumber,
  onEmailICP,
  ctaLabel,
}: ICPCardProps) {

  return (
    <div className="relative w-full max-w-md mx-auto opacity-0 animate-fade-in-up">
      {/* Card Number Badge - Top Corner, Outside Card - Left for card 1, Right for others */}
      {cardNumber && (
        <div 
          className={`absolute -top-4 w-12 h-12 text-background rounded-full flex items-center justify-center border-2 border-black z-20 shadow-md ${
            cardNumber === 1 ? 'left-2 sm:-left-4' : 'right-2 sm:-right-4'
          }`}
          style={{ backgroundColor: data.color }}
        >
          <span className="font-['Fraunces'] text-xl text-black">{cardNumber}</span>
        </div>
      )}

      {/* Profile Circle - positioned at top center, half outside */}
      <div className="absolute left-1/2 -translate-x-1/2 -top-12 w-24 h-24 z-10">
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 146 145" fill="none">
          <path 
            d={svgPaths.pef38d80} 
            fill={data.color} 
            stroke="black" 
            strokeWidth="1"
          />
        </svg>
        <ImageWithFallback 
          src={data.avatar} 
          alt={data.name} 
          className="absolute inset-0 w-full h-full object-cover rounded-full p-1.5"
        />
      </div>

      {/* Card Container */}
      <div className="bg-background border border-black rounded-design p-6 pt-16 shadow-lg">
        {/* Header */}
        <div className="text-center mb-6 pb-6 border-b border-warm-grey">
          <h2 className="font-['Fraunces'] mb-2">{data.name}</h2>
          {data.industry && (
            <p className="font-['Plus_Jakarta_Sans'] text-sm text-foreground/60 mb-2">{data.industry}</p>
          )}
          <p className="font-['Plus_Jakarta_Sans'] text-[15px] text-foreground/70 italic">{data.description}</p>
        </div>

        {/* Free Sections */}
        <div className="space-y-6">
          {/* Show all free content for unlocked card (card 1) */}
          {!isLocked && (
            <>
              {/* Goals & Motivations */}
              <div>
                <h3 className="font-['Fraunces'] mb-3">Goals & Motivations</h3>
                <ul className="space-y-2 font-['Plus_Jakarta_Sans'] text-[15px] text-foreground/80">
                  {data.goals.map((goal, index) => (
                    <li key={index}>• {goal}</li>
                  ))}
                </ul>
              </div>

              {/* Pain Points */}
              <div>
                <h3 className="font-['Fraunces'] mb-3">Pain Points</h3>
                <ul className="space-y-2 font-['Plus_Jakarta_Sans'] text-[15px] text-foreground/80">
                  {data.pain_points.map((point, index) => (
                    <li key={index}>• {point}</li>
                  ))}
                </ul>
              </div>

              {/* Decision Makers */}
              {data.decision_makers && data.decision_makers.length > 0 && (
                <div>
                  <h3 className="font-['Fraunces'] mb-3">Decision Makers</h3>
                  <ul className="space-y-2 font-['Plus_Jakarta_Sans'] text-[15px] text-foreground/80">
                    {data.decision_makers.map((maker, index) => (
                      <li key={index}>• {maker}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Budget */}
              {data.budget && (
                <div>
                  <h3 className="font-['Fraunces'] mb-3">Budget</h3>
                  <p className="font-['Plus_Jakarta_Sans'] text-[15px] text-foreground/80">{data.budget}</p>
                </div>
              )}

              {/* Email ICP CTA - Above the divider for first card */}
              {onEmailICP && cardNumber === 1 && (
                <div className="pt-2">
                  <Button
                    onClick={onEmailICP}
                    variant="outline"
                    className="w-full bg-transparent text-foreground border border-black rounded-design py-6 transition-all hover:scale-[1.02] hover:bg-accent-grey/20"
                  >
                    {ctaLabel || "Email me this ICP"}
                  </Button>
                </div>
              )}

              {/* Divider */}
              <div className="border-t border-warm-grey pt-6"></div>
            </>
          )}

          {/* Locked Card - Show unlock button above blurred content */}
          {isLocked && (
            <>
              {/* Unlock CTA at top */}
              {onUnlock && (
                <div className="pb-6">
                  <Button
                    onClick={onUnlock}
                    className="w-full bg-button-green hover:bg-button-green/90 text-foreground border border-black rounded-design py-6 transition-all hover:scale-[1.02] hover:shadow-md flex items-center justify-center gap-2"
                  >
                    <Lock className="w-4 h-4" />
                    Unlock Full ICP
                  </Button>
                </div>
              )}

              {/* Blurred content preview */}
              <div className="blur-[4px] opacity-50 select-none pointer-events-none space-y-6">
                {/* Goals & Motivations */}
                <div>
                  <h3 className="font-['Fraunces'] mb-3">Goals & Motivations</h3>
                  <ul className="space-y-2 font-['Plus_Jakarta_Sans'] text-[15px] text-foreground/80">
                    {data.goals.map((goal, index) => (
                      <li key={index}>• {goal}</li>
                    ))}
                  </ul>
                </div>

                {/* Pain Points */}
                <div>
                  <h3 className="font-['Fraunces'] mb-3">Pain Points</h3>
                  <ul className="space-y-2 font-['Plus_Jakarta_Sans'] text-[15px] text-foreground/80">
                    {data.pain_points.map((point, index) => (
                      <li key={index}>• {point}</li>
                    ))}
                  </ul>
                </div>

                {/* Decision Makers */}
                <div>
                  <h3 className="font-['Fraunces'] mb-3">Decision Makers</h3>
                  <ul className="space-y-2 font-['Plus_Jakarta_Sans'] text-[15px] text-foreground/80">
                    <li>• Decision makers and stakeholders</li>
                  </ul>
                </div>

                {/* Divider */}
                <div className="border-t border-warm-grey pt-6"></div>

                {/* Additional locked sections placeholder */}
                <div>
                  <h3 className="font-['Fraunces'] mb-3">Behaviour & Online Habits</h3>
                  <ul className="space-y-2 font-['Plus_Jakarta_Sans'] text-[15px] text-foreground/80">
                    <li>• Active on social platforms daily</li>
                    <li>• Reads industry blogs and newsletters</li>
                  </ul>
                </div>

                <div>
                  <h3 className="font-['Fraunces'] mb-3">Brand Affinities</h3>
                  <ul className="space-y-2 font-['Plus_Jakarta_Sans'] text-[15px] text-foreground/80">
                    <li>• Popular industry tools and platforms</li>
                    <li>• Follows thought leaders</li>
                  </ul>
                </div>

                <div>
                  <h3 className="font-['Fraunces'] mb-3">Messaging That Resonates</h3>
                  <ul className="space-y-2 font-['Plus_Jakarta_Sans'] text-[15px] text-foreground/80">
                    <li>• Value-driven language</li>
                    <li>• Results-focused messaging</li>
                  </ul>
                </div>
              </div>
            </>
          )}

          {/* Unlocked sections for card 1 */}
          {!isLocked && (
            <>
              {/* Digital Tools & Platforms */}
              {data.tech_stack && data.tech_stack.length > 0 && (
                <div>
                  <h3 className="font-['Fraunces'] mb-3">Digital Tools & Platforms</h3>
                  <div className="blur-sm select-none pointer-events-none">
                    <ul className="space-y-2 font-['Plus_Jakarta_Sans'] text-[15px] text-foreground/80">
                      {data.tech_stack.map((tech, index) => (
                        <li key={index}>• {tech}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              {/* Challenges */}
              {data.challenges && data.challenges.length > 0 && (
                <div>
                  <h3 className="font-['Fraunces'] mb-3">Challenges</h3>
                  <div className="blur-sm select-none pointer-events-none">
                    <ul className="space-y-2 font-['Plus_Jakarta_Sans'] text-[15px] text-foreground/80">
                      {data.challenges.map((challenge, index) => (
                        <li key={index}>• {challenge}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              {/* Unlock Full ICP CTA */}
              {onUnlock && cardNumber === 1 && (
                <div className="pt-2">
                  <Button
                    onClick={onUnlock}
                    className="w-full bg-button-green hover:bg-button-green/90 text-foreground border border-black rounded-design py-6 transition-all hover:scale-[1.02] hover:shadow-md flex items-center justify-center gap-2"
                  >
                    <Lock className="w-4 h-4" />
                    Unlock Full ICP
                  </Button>
                </div>
              )}

              {/* Opportunities */}
              {data.opportunities && data.opportunities.length > 0 && (
                <div>
                  <h3 className="font-['Fraunces'] mb-3">Opportunities</h3>
                  <div className="blur-sm select-none pointer-events-none">
                    <ul className="space-y-2 font-['Plus_Jakarta_Sans'] text-[15px] text-foreground/80">
                      {data.opportunities.map((opportunity, index) => (
                        <li key={index}>• {opportunity}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
