import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, Users, BookOpen, BarChart3 } from "lucide-react";

const HeroSection = () => {
  const navigate = useNavigate();

  return (
    <section className="relative min-h-screen flex items-center pt-20 overflow-hidden">
      {/* Background Elements */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-20 left-10 w-72 h-72 bg-primary/10 rounded-full blur-3xl animate-float" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-secondary/10 rounded-full blur-3xl animate-float" style={{ animationDelay: "1s" }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-accent/5 rounded-full blur-3xl" />
      </div>

      <div className="container mx-auto px-4">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left Content */}
          <div className="space-y-8">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium animate-fade-in">
              <span className="w-2 h-2 rounded-full bg-secondary animate-pulse" />
              Join 500+ MSMEs Growing Together
            </div>

            <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold leading-tight animate-fade-in" style={{ animationDelay: "0.1s" }}>
              Grow Your{" "}
              <span className="text-gradient">MSME Business</span>{" "}
              with Expert Mentorship
            </h1>

            <p className="text-lg md:text-xl text-muted-foreground max-w-xl animate-fade-in" style={{ animationDelay: "0.2s" }}>
              Transform your business through structured training, real-time guidance, and data-driven insights. Track your progress from Beginner to Advanced.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 animate-fade-in" style={{ animationDelay: "0.3s" }}>
              <Button variant="hero" size="lg" className="group" onClick={() => navigate("/register?role=MENTEE")}>
                Get Started as MSME
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Button>
              <Button variant="hero-outline" size="lg" onClick={() => navigate("/register?role=MENTOR")}>
                Become a Mentor
              </Button>
            </div>

            {/* Trust Indicators */}
            <div className="flex flex-wrap gap-6 pt-4 animate-fade-in" style={{ animationDelay: "0.4s" }}>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Users className="w-5 h-5 text-primary" />
                <span className="text-sm">500+ Active MSMEs</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <BookOpen className="w-5 h-5 text-secondary" />
                <span className="text-sm">1000+ Sessions</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <BarChart3 className="w-5 h-5 text-accent" />
                <span className="text-sm">85% Success Rate</span>
              </div>
            </div>
          </div>

          {/* Right Content - Hero Visual */}
          <div className="relative animate-fade-in-up" style={{ animationDelay: "0.3s" }}>
            <div className="relative">
              {/* Main Card */}
              <div className="glass rounded-2xl p-6 shadow-xl">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-cta flex items-center justify-center">
                    <BarChart3 className="w-6 h-6 text-primary-foreground" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">Business Analytics</h3>
                    <p className="text-sm text-muted-foreground">Track your growth</p>
                  </div>
                </div>
                
                {/* Fake Chart */}
                <div className="flex items-end gap-2 h-32 mb-4">
                  {[40, 65, 45, 80, 55, 90, 70, 95].map((height, i) => (
                    <div
                      key={i}
                      className="flex-1 rounded-t-md bg-gradient-to-t from-primary to-primary/50"
                      style={{ 
                        height: `${height}%`,
                        animationDelay: `${i * 0.1}s`
                      }}
                    />
                  ))}
                </div>
                
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Sales Growth</span>
                  <span className="text-secondary font-semibold">+42% this month</span>
                </div>
              </div>

              {/* Floating Cards */}
              <div className="absolute -top-4 -right-4 glass rounded-xl p-4 shadow-lg animate-float">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-secondary/20 flex items-center justify-center">
                    <span className="text-secondary text-xs font-bold">🎯</span>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Level Up!</p>
                    <p className="text-sm font-semibold text-foreground">Intermediate</p>
                  </div>
                </div>
              </div>

              <div className="absolute -bottom-4 -left-4 glass rounded-xl p-4 shadow-lg animate-float" style={{ animationDelay: "0.5s" }}>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                    <span className="text-primary text-xs font-bold">👥</span>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">New Message</p>
                    <p className="text-sm font-semibold text-foreground">From Mentor</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
