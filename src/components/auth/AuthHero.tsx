import { useEffect, useState } from "react";
import { getAllProfileImages } from "../../config/profileImages";

type AuthHeroProps = {
  title: string;
  subtitle: string;
  /** Optional override if you ever want different timing */
  intervalMs?: number;
};

/**
 * Shared auth header used by Signup/Login so they stay visually aligned.
 * Rotates through ICP profile artwork (no extra status sentences).
 */
export function AuthHero({ title, subtitle, intervalMs = 2000 }: AuthHeroProps) {
  const portraits = getAllProfileImages();
  const [currentPortrait, setCurrentPortrait] = useState(0);

  useEffect(() => {
    if (!portraits.length) return;
    const t = setInterval(() => {
      setCurrentPortrait((prev) => (prev + 1) % portraits.length);
    }, intervalMs);
    return () => clearInterval(t);
  }, [portraits.length, intervalMs]);

  return (
    <div className="text-center mb-8 animate-fade-in-up">
      {/* Rotating ICP portrait badge */}
      <div className="flex justify-center">
        <div className="relative w-20 h-20 mx-auto mb-4 rounded-full border-2 border-black overflow-hidden shadow-lg bg-white">
          {portraits.length > 0 ? (
            portraits.map((src, index) => {
              const isActive = index === currentPortrait;
              return (
                <img
                  key={src}
                  src={src}
                  alt="ICP portrait"
                  className="absolute inset-0 w-full h-full object-cover transition-all duration-700 ease-in-out"
                  style={{
                    opacity: isActive ? 1 : 0,
                    transform: isActive ? "scale(1)" : "scale(1.02)",
                    filter: isActive ? "blur(0px)" : "blur(2px)",
                  }}
                />
              );
            })
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-xs text-foreground/60 font-['Plus_Jakarta_Sans']">
              Loading...
            </div>
          )}
        </div>
      </div>

      <h1 className="font-['Fraunces'] text-3xl font-bold mb-2">{title}</h1>
      <p className="text-foreground/70">{subtitle}</p>
    </div>
  );
}
