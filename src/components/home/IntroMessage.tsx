import { useState, useEffect } from "react";
import svgPaths from "@/imports/svg-rk8otprxv2";

export function IntroMessage() {
  const [isVisible, setIsVisible] = useState(false);
  const [displayedText, setDisplayedText] = useState("");
  const [showFounder, setShowFounder] = useState(false);
  
  const testimonialText = "\"I finally understand who my customers really are. This tool saved me and my team weeks of trial and error and has drastically improved conversions.\"";

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsVisible(true);
          }
        });
      },
      { threshold: 0.3 }
    );

    const element = document.getElementById("testimonial-section");
    if (element) {
      observer.observe(element);
    }

    return () => {
      if (element) {
        observer.unobserve(element);
      }
    };
  }, []);

  useEffect(() => {
    if (!isVisible) return;

    const typingDelay = setTimeout(() => {
      let currentIndex = 0;
      const typingInterval = setInterval(() => {
        if (currentIndex <= testimonialText.length) {
          setDisplayedText(testimonialText.slice(0, currentIndex));
          currentIndex++;
        } else {
          clearInterval(typingInterval);
          setTimeout(() => setShowFounder(true), 300);
        }
      }, 30);

      return () => clearInterval(typingInterval);
    }, 1200);

    return () => clearTimeout(typingDelay);
  }, [isVisible]);

  return (
    <section className="bg-background py-12 sm:py-16">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center text-center max-w-3xl mx-auto">
          {/* Headline */}
          <h2 className="mb-4 font-['Fraunces'] text-[36px] font-bold leading-tight">
            Stop wasting hours creating content no one cares about.
          </h2>

          {/* Subline */}
          <p className="text-foreground/70 font-['Plus_Jakarta_Sans'] text-[20px]">
            When you know exactly who you're speaking to, every post, ad, and email becomes easier, and more effective.
          </p>

          {/* Testimonial */}
          <div id="testimonial-section" className="mt-20 w-full max-w-2xl mx-auto">
            <div className="relative">
              {/* Profile Circle */}
              <div 
                className={`absolute left-1/2 -translate-x-1/2 -top-16 w-32 h-32 z-10 transition-all duration-700 ${
                  isVisible ? 'opacity-100 scale-100 rotate-0' : 'opacity-0 scale-0 -rotate-180'
                }`}
                style={{ 
                  transitionDelay: '0.3s',
                  transitionTimingFunction: 'cubic-bezier(0.34, 1.56, 0.64, 1)'
                }}
              >
                <svg className="absolute inset-0 w-full h-full" viewBox="0 0 146 145" fill="none">
                  <path 
                    d={svgPaths.pef38d80} 
                    fill="#FFD336" 
                    stroke="black" 
                    strokeWidth="1"
                  />
                </svg>
                <img 
                  src="/images/avatars/female/45-54/female_45-54_001.png" 
                  alt="Charlotte" 
                  className="absolute inset-0 w-full h-full object-cover rounded-full p-2"
                />
              </div>

              {/* Testimonial Container */}
              <div className="bg-transparent border border-black rounded-design p-8 pt-20 text-center">
                <h3 className="font-['Fraunces'] font-bold mb-4 text-[24px]">Charlotte</h3>
                <p className="font-['Plus_Jakarta_Sans'] text-foreground/80 mb-4 text-[20px] min-h-[120px]">
                  {displayedText}
                </p>
                <p 
                  className={`font-['Plus_Jakarta_Sans'] text-sm text-foreground/60 text-[16px] transition-opacity duration-500 ${
                    showFounder ? 'opacity-100' : 'opacity-0'
                  }`}
                >
                  Founder, LexKin
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
