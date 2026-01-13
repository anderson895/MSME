import { Star, Award, Trophy } from "lucide-react";

const levels = [
  {
    name: "Beginner",
    icon: Star,
    sessions: "0-4 sessions",
    description: "Start your mentorship journey. Learn the fundamentals and build your foundation.",
    color: "amber",
    bgColor: "bg-amber/10",
    textColor: "text-amber",
    borderColor: "border-amber/30",
  },
  {
    name: "Intermediate",
    icon: Award,
    sessions: "5-9 sessions",
    description: "Build on your knowledge. Dive deeper into advanced business strategies.",
    color: "primary",
    bgColor: "bg-primary/10",
    textColor: "text-primary",
    borderColor: "border-primary/30",
  },
  {
    name: "Advanced",
    icon: Trophy,
    sessions: "10+ sessions",
    description: "Master your skills. Lead and mentor others while scaling your business.",
    color: "secondary",
    bgColor: "bg-secondary/10",
    textColor: "text-secondary",
    borderColor: "border-secondary/30",
  },
];

const ProgressionSection = () => {
  return (
    <section className="py-24 relative">
      <div className="container mx-auto px-4">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="inline-block px-4 py-2 rounded-full bg-accent/10 text-accent text-sm font-medium mb-4">
            Experience Progression
          </span>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-4">
            Grow from{" "}
            <span className="text-gradient">Beginner to Advanced</span>
          </h2>
          <p className="text-lg text-muted-foreground">
            Track your progress as you attend sessions and advance through experience levels.
          </p>
        </div>

        {/* Progression Cards */}
        <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {levels.map((level, index) => (
            <div
              key={level.name}
              className={`relative p-6 rounded-2xl bg-card border-2 ${level.borderColor} transition-all duration-300 hover:shadow-lg hover:-translate-y-1`}
            >
              {/* Badge */}
              <div className={`w-16 h-16 rounded-2xl ${level.bgColor} flex items-center justify-center mb-4`}>
                <level.icon className={`w-8 h-8 ${level.textColor}`} />
              </div>

              {/* Level Name */}
              <h3 className={`text-2xl font-bold ${level.textColor} mb-1`}>
                {level.name}
              </h3>

              {/* Sessions */}
              <p className="text-sm text-muted-foreground mb-4">
                {level.sessions}
              </p>

              {/* Description */}
              <p className="text-muted-foreground">
                {level.description}
              </p>

              {/* Arrow indicator */}
              {index < levels.length - 1 && (
                <div className="hidden md:flex absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-muted items-center justify-center z-10">
                  <span className="text-muted-foreground">→</span>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Progress Bar Visualization */}
        <div className="max-w-2xl mx-auto mt-12">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-muted-foreground">Your Journey</span>
            <span className="text-sm font-medium text-primary">Track your progress</span>
          </div>
          <div className="h-3 rounded-full bg-muted overflow-hidden">
            <div className="h-full w-1/3 rounded-full bg-gradient-to-r from-amber via-primary to-secondary transition-all duration-1000" />
          </div>
          <div className="flex justify-between mt-2 text-xs text-muted-foreground">
            <span>Beginner</span>
            <span>Intermediate</span>
            <span>Advanced</span>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ProgressionSection;
