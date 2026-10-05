import { useState } from "react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";

export function NewsletterSignup() {
  const [email, setEmail] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Handle newsletter signup
    console.log("Newsletter signup:", email);
    setEmail("");
  };

  return (
    <section className="bg-accent-grey/20 py-16">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="font-['Fraunces'] text-3xl md:text-4xl font-bold mb-4">
            Stay Updated
          </h2>
          <p className="font-['Plus_Jakarta_Sans'] text-lg text-foreground/70 mb-8">
            Get the latest tips and insights on building better ICPs.
          </p>
          <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
            <Input
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="flex-1 border-black rounded-design font-['Plus_Jakarta_Sans']"
              required
            />
            <Button
              type="submit"
              className="bg-button-green text-text-dark hover:bg-button-green/90 border border-black rounded-design font-['Fraunces'] font-bold whitespace-nowrap"
            >
              Subscribe
            </Button>
          </form>
        </div>
      </div>
    </section>
  );
}

