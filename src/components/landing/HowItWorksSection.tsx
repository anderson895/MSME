import { FileText, CheckCircle2, Rocket, ArrowRight } from "lucide-react";

const steps = [
  {
    number: "01",
    icon: FileText,
    title: "Sign Up & Submit Documents",
    description: "Create your account and upload your business permit for verification. It only takes a few minutes.",
  },
  {
    number: "02",
    icon: CheckCircle2,
    title: "Get Verified & Approved",
    description: "Our admin team reviews and verifies your business to ensure a trusted community of MSMEs.",
  },
  {
    number: "03",
    icon: Rocket,
    title: "Start Learning & Growing",
    description: "Access training sessions, connect with mentors, track your progress, and grow your business.",
  },
];

const HowItWorksSection = () => {
  return (
    <section id="how-it-works" className="py-24 bg-muted/30 relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-0 left-1/4 w-64 h-64 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-64 h-64 bg-secondary/5 rounded-full blur-3xl" />
      </div>

      <div className="container mx-auto px-4">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="inline-block px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
            Getting Started
          </span>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-4">
            Start Your Journey in{" "}
            <span className="text-gradient">3 Simple Steps</span>
          </h2>
          <p className="text-lg text-muted-foreground">
            Join our platform and start growing your business with expert mentorship.
          </p>
        </div>

        {/* Steps */}
        <div className="grid md:grid-cols-3 gap-8 relative">
          {/* Connector Line (Desktop) */}
          <div className="hidden md:block absolute top-24 left-1/6 right-1/6 h-0.5 bg-gradient-to-r from-primary via-secondary to-accent" />

          {steps.map((step, index) => (
            <div key={step.number} className="relative">
              <div className="flex flex-col items-center text-center">
                {/* Step Number & Icon */}
                <div className="relative mb-6">
                  <div className="w-20 h-20 rounded-2xl bg-gradient-cta flex items-center justify-center shadow-lg">
                    <step.icon className="w-9 h-9 text-primary-foreground" />
                  </div>
                  <div className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-card border-2 border-primary flex items-center justify-center text-sm font-bold text-primary">
                    {step.number}
                  </div>
                </div>

                {/* Content */}
                <h3 className="text-xl font-semibold text-foreground mb-3">
                  {step.title}
                </h3>
                <p className="text-muted-foreground max-w-xs">
                  {step.description}
                </p>
              </div>

              {/* Arrow (Mobile) */}
              {index < steps.length - 1 && (
                <div className="md:hidden flex justify-center my-6">
                  <ArrowRight className="w-6 h-6 text-primary rotate-90" />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HowItWorksSection;
