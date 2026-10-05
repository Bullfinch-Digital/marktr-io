import { useEffect, useRef, useState } from "react";

export function Stats() {
  const stats = [
    { value: 13210, label: "Ideal Customer Profiles Generated" },
    { value: 1322, label: "Meta Campaigns Exported" },
    { value: 4122, label: "Content Strategies Created" },
  ];

  const [counts, setCounts] = useState([200, 200, 200]);
  const [hasAnimated, setHasAnimated] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !hasAnimated) {
          setHasAnimated(true);
          
          stats.forEach((stat, index) => {
            const duration = 2000;
            const steps = 60;
            const startValue = 200;
            const increment = (stat.value - startValue) / steps;
            let currentStep = 0;

            const timer = setInterval(() => {
              currentStep++;
              if (currentStep >= steps) {
                setCounts(prev => {
                  const newCounts = [...prev];
                  newCounts[index] = stat.value;
                  return newCounts;
                });
                clearInterval(timer);
              } else {
                setCounts(prev => {
                  const newCounts = [...prev];
                  newCounts[index] = Math.floor(startValue + increment * currentStep);
                  return newCounts;
                });
              }
            }, duration / steps);
          });
        }
      },
      { threshold: 0.1 }
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => observer.disconnect();
  }, [hasAnimated]);

  const formatNumber = (num: number) => {
    return num.toLocaleString();
  };

  return (
    <section ref={sectionRef} className="bg-background py-12">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
          {stats.map((stat, index) => (
            <div
              key={index}
              className="relative flex flex-col items-center justify-center text-center opacity-0 animate-fade-in-up bg-transparent border border-foreground rounded-design p-8 min-h-[140px] max-w-[280px] mx-auto w-full"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div 
                className="mb-2 font-['Fraunces'] font-bold text-4xl sm:text-5xl transition-all duration-300"
                style={{ 
                  filter: hasAnimated && counts[index] < stat.value * 0.5 ? 'blur(3px)' : 'blur(0px)'
                }}
              >
                {formatNumber(counts[index])}
              </div>
              <div className="text-sm text-foreground/60 font-['Plus_Jakarta_Sans']">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
