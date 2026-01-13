import { BookOpen, MessageSquare, BarChart3, Target, TrendingUp, Shield } from "lucide-react";

const features = [
  {
    icon: BookOpen,
    title: "Structured Training",
    description: "Access organized training sessions designed specifically for MSME growth and development.",
    color: "primary",
  },
  {
    icon: MessageSquare,
    title: "Real-Time Mentorship",
    description: "Connect with expert mentors through live sessions and instant messaging support.",
    color: "secondary",
  },
  {
    icon: BarChart3,
    title: "Progress Analytics",
    description: "Track your business metrics, sales data, and learning progress with detailed insights.",
    color: "accent",
  },
  {
    icon: Target,
    title: "Experience Progression",
    description: "Advance from Beginner to Advanced level based on your attendance and engagement.",
    color: "amber",
  },
  {
    icon: TrendingUp,
    title: "Business Metrics",
    description: "Monitor sales, revenue, and category performance to identify growth opportunities.",
    color: "emerald",
  },
  {
    icon: Shield,
    title: "Verified Platform",
    description: "Join a trusted community of verified MSME businesses and certified mentors.",
    color: "indigo",
  },
];

const colorClasses: Record<string, { bg: string; icon: string; border: string }> = {
  primary: { bg: "bg-primary/10", icon: "text-primary", border: "hover:border-primary/30" },
  secondary: { bg: "bg-secondary/10", icon: "text-secondary", border: "hover:border-secondary/30" },
  accent: { bg: "bg-accent/10", icon: "text-accent", border: "hover:border-accent/30" },
  amber: { bg: "bg-amber/10", icon: "text-amber", border: "hover:border-amber/30" },
  emerald: { bg: "bg-emerald/10", icon: "text-emerald", border: "hover:border-emerald/30" },
  indigo: { bg: "bg-indigo/10", icon: "text-indigo", border: "hover:border-indigo/30" },
};

const FeaturesSection = () => {
  return (
    <section id="features" className="py-24 relative">
      <div className="container mx-auto px-4">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="inline-block px-4 py-2 rounded-full bg-secondary/10 text-secondary text-sm font-medium mb-4">
            Platform Features
          </span>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-4">
            Everything You Need to{" "}
            <span className="text-gradient">Grow Your Business</span>
          </h2>
          <p className="text-lg text-muted-foreground">
            Our comprehensive platform provides all the tools and support MSMEs need to succeed.
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => {
            const colors = colorClasses[feature.color];
            return (
              <div
                key={feature.title}
                className={`group p-6 rounded-2xl bg-card border border-border ${colors.border} transition-all duration-300 hover:shadow-lg hover:-translate-y-1`}
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <div className={`w-14 h-14 rounded-xl ${colors.bg} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                  <feature.icon className={`w-7 h-7 ${colors.icon}`} />
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-2">
                  {feature.title}
                </h3>
                <p className="text-muted-foreground">
                  {feature.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;
