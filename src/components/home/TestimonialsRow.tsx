import svgPaths from "@/imports/svg-dy16vubapd";

interface Testimonial {
  name: string;
  role: string;
  company: string;
  quote: string;
  image: string;
  color: string;
}

export function TestimonialsRow() {
  const testimonials: Testimonial[] = [
    {
      name: "Charlotte Pegram",
      role: "Founder",
      company: "LexKin",
      quote: "ICP Generator is a wonderfully easy tool to use, with a clear and intuitive interface. The pricing is extremely competitive and the customer service second to none!",
      image: "/images/avatars/female/18-24/female_18-24_008.png",
      color: "#FFD336",
    },
    {
      name: "Adrian Taylor",
      role: "Project Manager",
      company: "Bullfinch Digital",
      quote: "We chose ICP Generator based on their highly competitive pricing and incredible interface. Not only that, their team gave 110% in helping craft the solution for our project.",
      image: "/images/avatars/male/18-24/male_18-24_002.png",
      color: "#FF9922",
    },
    {
      name: "Belinda Singh",
      role: "Head of Content",
      company: "CutCo",
      quote: "We've been working with ICP Generator for some time now. It's become the foundation of client onboarding and the creation of targeted marketing strategies.",
      image: "/images/avatars/female/35-44/female_35-44_004.png",
      color: "#96CBB6",
    },
    {
      name: "Mart Cordingley",
      role: "Director",
      company: "British Log Cabins",
      quote: "We knew we built exceptional log homes, but we struggled to articulate exactly who they were right for. ICP Generator helped us identify the buyers who truly value craftsmanship and long-term investment — not just price shoppers. It’s changed the quality of enquiries we receive.",
      image: "/images/avatars/male/45-54/male_45-54_002.png",
      color: "#D89F6E",
    },
    {
      name: "Zoe Price",
      role: "Founder",
      company: "Mustard & Gray",
      quote: "Before using ICP Generator, our messaging felt broad and safe — but it wasn’t landing. The tool forced us to get specific about who we were actually for and what they were trying to achieve in the next 90 days. That clarity transformed our copy, our offers, and even our sales conversations.",
      image: "/images/avatars/female/45-54/female_45-54_002.png",
      color: "#F57BBE",
    },
    {
      name: "Emily Jones",
      role: "Managing Director",
      company: "The Green",
      quote: "As a growing business, we were relying too much on instinct when making marketing decisions. ICP Generator gave us a structured framework to understand our ideal guests — their frustrations, motivations and buying triggers. It’s now central to how we plan campaigns and develop new offers.",
      image: "/images/avatars/female/25-34/female_25-34_014.png",
      color: "#BBA0E5",
    },
  ];

  return (
    <section className="bg-background py-12 sm:py-16">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="mb-12 text-left">
          <h2 className="mb-4 font-['Fraunces'] text-3xl sm:text-4xl lg:text-5xl opacity-0 animate-fade-in-up font-bold">
            What our clients say
          </h2>
          <p className="max-w-2xl text-lg text-foreground/70 opacity-0 animate-fade-in-up delay-100 font-bold">
            From founders and start-ups to marketing teams and agencies.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-16 lg:gap-x-8 mt-16">
          {testimonials.map((testimonial, index) => (
            <div key={index} className="relative opacity-0 animate-fade-in-up" style={{ animationDelay: `${index * 0.15}s` }}>
              {/* Profile Circle */}
              <div className="absolute left-1/2 -translate-x-1/2 -top-12 w-24 h-24 z-10">
                <svg className="absolute inset-0 w-full h-full" viewBox="0 0 146 145" fill="none">
                  <path 
                    d={svgPaths.pef38d80} 
                    fill={testimonial.color} 
                    stroke="black" 
                    strokeWidth="1"
                  />
                </svg>
                <img 
                  src={testimonial.image} 
                  alt={testimonial.name} 
                  className="absolute inset-0 w-full h-full object-cover rounded-full p-1.5"
                />
              </div>

              {/* Testimonial Container */}
              <div className="bg-transparent border border-black rounded-design p-6 pt-16 text-center h-full flex flex-col">
                <h3 className="font-['Fraunces'] mb-2 text-[18px]">{testimonial.name}</h3>
                <p className="font-['Plus_Jakarta_Sans'] text-foreground/80 mb-4 text-[15px] flex-grow">
                  "{testimonial.quote}"
                </p>
                <p className="font-['Plus_Jakarta_Sans'] text-sm text-foreground/60 text-[14px]">
                  {testimonial.role}, {testimonial.company}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
