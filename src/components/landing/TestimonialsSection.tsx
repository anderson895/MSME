import { useState } from "react";
import { Star, ChevronLeft, ChevronRight, Quote } from "lucide-react";
import { Button } from "@/components/ui/button";

const testimonials = [
  {
    name: "Maria Santos",
    role: "Retail Business Owner",
    image: "MS",
    content: "The mentorship program helped me increase my sales by 40% in just 3 months. The analytics dashboard showed me exactly where to focus my efforts.",
    rating: 5,
  },
  {
    name: "John Dela Cruz",
    role: "Business Consultant & Mentor",
    image: "JD",
    content: "As a mentor, I love how organized the platform is. I can track my mentees' progress and see their business metrics improve over time. It's incredibly rewarding.",
    rating: 5,
  },
  {
    name: "Ana Reyes",
    role: "Food Business Owner",
    image: "AR",
    content: "From beginner to intermediate in just 2 months! The structured training sessions and supportive community made all the difference for my small bakery business.",
    rating: 5,
  },
  {
    name: "Carlos Mendoza",
    role: "Tech Startup Founder",
    image: "CM",
    content: "The real-time communication with mentors is a game-changer. Whenever I face a challenge, I get expert advice within hours. Highly recommend for any MSME!",
    rating: 5,
  },
];

const TestimonialsSection = () => {
  const [currentIndex, setCurrentIndex] = useState(0);

  const next = () => {
    setCurrentIndex((prev) => (prev + 1) % testimonials.length);
  };

  const prev = () => {
    setCurrentIndex((prev) => (prev - 1 + testimonials.length) % testimonials.length);
  };

  return (
    <section className="py-24 relative">
      <div className="container mx-auto px-4">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="inline-block px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
            Testimonials
          </span>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-4">
            Success Stories from Our{" "}
            <span className="text-gradient">MSME Community</span>
          </h2>
          <p className="text-lg text-muted-foreground">
            Hear from business owners who transformed their ventures with our platform.
          </p>
        </div>

        {/* Testimonial Carousel */}
        <div className="max-w-4xl mx-auto relative">
          <div className="overflow-hidden">
            <div
              className="flex transition-transform duration-500 ease-out"
              style={{ transform: `translateX(-${currentIndex * 100}%)` }}
            >
              {testimonials.map((testimonial, index) => (
                <div key={index} className="w-full flex-shrink-0 px-4">
                  <div className="bg-card rounded-2xl p-8 md:p-12 border border-border shadow-lg relative">
                    {/* Quote Icon */}
                    <Quote className="absolute top-6 right-6 w-12 h-12 text-primary/10" />

                    {/* Stars */}
                    <div className="flex gap-1 mb-6">
                      {[...Array(testimonial.rating)].map((_, i) => (
                        <Star key={i} className="w-5 h-5 fill-amber text-amber" />
                      ))}
                    </div>

                    {/* Content */}
                    <p className="text-lg md:text-xl text-foreground mb-8 leading-relaxed">
                      "{testimonial.content}"
                    </p>

                    {/* Author */}
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 rounded-full bg-gradient-cta flex items-center justify-center text-primary-foreground font-bold text-lg">
                        {testimonial.image}
                      </div>
                      <div>
                        <h4 className="font-semibold text-foreground">{testimonial.name}</h4>
                        <p className="text-muted-foreground text-sm">{testimonial.role}</p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Navigation */}
          <div className="flex justify-center items-center gap-4 mt-8">
            <Button variant="outline" size="icon" onClick={prev} className="rounded-full">
              <ChevronLeft className="w-5 h-5" />
            </Button>

            <div className="flex gap-2">
              {testimonials.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentIndex(index)}
                  className={`w-2 h-2 rounded-full transition-all ${
                    index === currentIndex ? "w-8 bg-primary" : "bg-muted-foreground/30"
                  }`}
                />
              ))}
            </div>

            <Button variant="outline" size="icon" onClick={next} className="rounded-full">
              <ChevronRight className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default TestimonialsSection;
