import svgPaths from "@/imports/svg-xdnrzdurle";

export function HowItWorks() {
  const steps = [
    {
      number: 1,
      color: "#BBA0E5",
      title: "Tell us about your business",
      intro: "A short, friendly, conversational onboarding flow - no forms, no jargon.",
      bullets: [],
      outro:
        "Just describe what you do, who you serve, and what makes your brand unique.",
    },
    {
      number: 2,
      color: "#FFD336",
      title: "Meet your ideal customers",
      intro: "In under a minute, the ICP Generator creates three detailed customer profiles based on your inputs.",
      bullets: [
        "What they value",
        "What frustrates them",
        "Where they spend time",
        "What triggers them to buy",
        "How they like to be spoken to",
      ],
      outro:
        "Unlock full access to all ICP Generator features for FREE during your 7 day trial.",
    },
    {
      number: 3,
      color: "#B0ED9D",
      title: "Unlock strategies that work",
      intro: "Every profile comes with:",
      bullets: [
        "Tailored content ideas",
        "Ready-to-use messaging angles",
        "Exportable Meta ad audiences",
        "A clear roadmap to reach each customer",
      ],
      outro:
        "Start your FREE 7 day trial and get the complete content + ad strategy for each.",
    },
  ];

  return (
    <section id="how-it-works" className="bg-background pt-[18px] pb-8 sm:pt-6 sm:pb-10 lg:pt-[30px] lg:pb-12">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="mb-20 text-left">
          <h2 className="mb-4 font-['Fraunces'] text-3xl sm:text-4xl lg:text-5xl opacity-0 animate-fade-in-up font-bold text-[48px]">
            How it works
          </h2>
          <p className="max-w-2xl text-lg text-foreground/70 opacity-0 animate-fade-in-up delay-100">
            Built to be effortless. Answer a few prompts and we'll handle the rest.
          </p>
        </div>

        {/* Steps Grid */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3 lg:gap-8">
          {steps.map((step, index) => (
            <div
              key={index}
              className="relative opacity-0 animate-fade-in-up"
              style={{ animationDelay: `${(index + 2) * 0.1}s` }}
            >
              {/* Number Circle */}
              <div className="absolute left-1/2 -translate-x-1/2 -top-12 w-24 h-24 z-10">
                <svg className="absolute inset-0 w-full h-full" viewBox="0 0 146 145" fill="none">
                  <path 
                    d={svgPaths.pef38d80} 
                    fill={step.color} 
                    stroke="black" 
                    strokeWidth="1"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center font-['Fraunces'] text-3xl font-bold text-[48px]">
                  {step.number}
                </div>
              </div>

              {/* Card Container */}
              <div className="bg-transparent border border-black rounded-design p-6 pt-16 text-center group hover:shadow-lg transition-all">
                <h3 className="mb-4 font-['Fraunces'] font-bold text-xl">{step.title}</h3>
                <div className="text-foreground/80 font-['Plus_Jakarta_Sans'] text-left">
                  <p className="mb-3">{step.intro}</p>
                  
                  {step.bullets.length > 0 && (
                    <ul className="mb-3 ml-5 space-y-1 list-disc">
                      {step.bullets.map((bullet, i) => (
                        <li key={i}>{bullet}</li>
                      ))}
                    </ul>
                  )}
                  
                  <p className="whitespace-pre-line">{step.outro}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
