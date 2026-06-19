import { Button } from "../ui/button";

export function ClosingCTA() {
  return (
    <section className="bg-background py-4 sm:py-6 pb-8 sm:pb-12">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center text-center">
          {/* CTA Text */}
          <p className="mb-8 text-lg font-['Inter'] text-foreground/70 font-bold">
            Start free and see who your real customers are...
          </p>

          {/* CTA Button */}
          <div className="flex flex-col gap-3 items-center">
            <Button variant="cta" href="/health-check">
              Check your health — free
            </Button>
            <p className="text-sm text-foreground/60 text-center">No credit card required</p>
          </div>
        </div>
      </div>
    </section>
  );
}
