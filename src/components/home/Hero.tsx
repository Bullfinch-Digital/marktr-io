import { Button } from "../ui/button";

export function Hero() {

  return (
    <section className="relative overflow-hidden bg-background pt-6 pb-0 sm:pt-8 sm:pb-0 lg:pt-10 lg:pb-0">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center text-center">
          {/* Badge */}
          <img src="/images/hero.png" alt="" className="mb-3 w-1/2 h-auto opacity-0 animate-fade-in-up" />

          {/* Main Heading */}
          <h1 className="mb-6 max-w-4xl font-['Fraunces'] text-4xl sm:text-5xl lg:text-6xl opacity-0 animate-fade-in-up delay-100 font-bold">
            Discover Your Ideal 
            <br />
            Customer Profile
          </h1>

          {/* Subheading */}
          <h2 className="mb-8 max-w-2xl text-lg text-foreground/70 opacity-0 animate-fade-in-up delay-200 sm:text-xl font-bold font-[Inter] font-normal">
            Stop the guesswork. In minutes, uncover who your customers really are, where they hang out and the best way to reach them.
          </h2>

          {/* Onboarding Button */}
          <div className="mb-8 flex w-full max-w-md flex-col gap-3 mx-auto justify-center items-center opacity-0 animate-fade-in-up delay-300">
            <Button variant="cta" href="/health-check">
              Check your digital health - free
            </Button>
            <p className="text-sm text-foreground/60 text-center">No credit card required</p>
          </div>
        </div>
      </div>
    </section>
  );
}
