import { useEffect, useState, useRef } from "react";

const stats = [
  { value: 500, suffix: "+", label: "MSMEs Growing" },
  { value: 50, suffix: "+", label: "Expert Mentors" },
  { value: 1000, suffix: "+", label: "Sessions Completed" },
  { value: 85, suffix: "%", label: "Success Rate" },
  { value: 4.8, suffix: "/5", label: "Average Rating", decimals: 1 },
  { value: 200, suffix: "+", label: "Resources Available" },
];

const AnimatedNumber = ({ value, suffix, decimals = 0 }: { value: number; suffix: string; decimals?: number }) => {
  const [count, setCount] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        }
      },
      { threshold: 0.3 }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!isVisible) return;

    const duration = 2000;
    const steps = 60;
    const increment = value / steps;
    let current = 0;
    const timer = setInterval(() => {
      current += increment;
      if (current >= value) {
        setCount(value);
        clearInterval(timer);
      } else {
        setCount(current);
      }
    }, duration / steps);

    return () => clearInterval(timer);
  }, [isVisible, value]);

  return (
    <div ref={ref} className="text-4xl md:text-5xl font-extrabold text-foreground">
      {decimals > 0 ? count.toFixed(decimals) : Math.floor(count)}
      <span className="text-primary">{suffix}</span>
    </div>
  );
};

const StatsSection = () => {
  return (
    <section className="py-24 bg-muted/30 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/5 rounded-full blur-3xl" />
      </div>

      <div className="container mx-auto px-4">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="inline-block px-4 py-2 rounded-full bg-secondary/10 text-secondary text-sm font-medium mb-4">
            Our Impact
          </span>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-4">
            Join a{" "}
            <span className="text-gradient">Growing Community</span>
          </h2>
          <p className="text-lg text-muted-foreground">
            See the impact we're making in the MSME ecosystem.
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
          {stats.map((stat) => (
            <div key={stat.label} className="text-center p-6">
              <AnimatedNumber value={stat.value} suffix={stat.suffix} decimals={stat.decimals} />
              <p className="text-muted-foreground mt-2 font-medium">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default StatsSection;
