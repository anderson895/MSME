import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
  } from "@/components/ui/accordion";
  
  const faqs = [
    {
      question: "Who can join as an MSME?",
      answer: "Any registered business owner with a valid business permit can join. We support micro, small, and medium enterprises across all industries looking to grow through mentorship.",
    },
    {
      question: "How does the experience level system work?",
      answer: "You start as a Beginner and progress based on your session attendance. After attending 5 sessions, you advance to Intermediate. At 10+ sessions, you reach Advanced level. Admins can also promote you based on your engagement and progress.",
    },
    {
      question: "Is the platform really free?",
      answer: "Yes, all core features are completely free for verified MSMEs. This includes training sessions, mentorship, analytics, and resource access. We believe in supporting MSME growth without financial barriers.",
    },
    {
      question: "How do I get verified on the platform?",
      answer: "After signing up, you'll upload your business permit for verification. Our admin team typically reviews and approves applications within 24-48 hours.",
    },
    {
      question: "Can I become a mentor on the platform?",
      answer: "Absolutely! If you have business expertise and want to help MSMEs grow, you can apply as a mentor. We look for experienced business professionals who are passionate about mentorship.",
    },
    {
      question: "What kind of training sessions are available?",
      answer: "We offer live video sessions covering various topics: business planning, marketing strategies, financial management, digital transformation, and more. Sessions are conducted by expert mentors and are interactive.",
    },
    {
      question: "How do I track my business progress?",
      answer: "Your dashboard includes analytics for sales tracking, revenue monitoring, and category performance. You can log your business data and see visual trends over time to identify growth opportunities.",
    },
  ];
  
  const FAQSection = () => {
    return (
      <section id="faq" className="py-24 bg-muted/30 relative">
        <div className="container mx-auto px-4">
          {/* Section Header */}
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="inline-block px-4 py-2 rounded-full bg-accent/10 text-accent text-sm font-medium mb-4">
              FAQ
            </span>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-4">
              Frequently Asked{" "}
              <span className="text-gradient">Questions</span>
            </h2>
            <p className="text-lg text-muted-foreground">
              Find answers to common questions about our platform.
            </p>
          </div>
  
          {/* FAQ Accordion */}
          <div className="max-w-3xl mx-auto">
            <Accordion type="single" collapsible className="space-y-4">
              {faqs.map((faq, index) => (
                <AccordionItem
                  key={index}
                  value={`item-${index}`}
                  className="bg-card rounded-xl border border-border px-6 data-[state=open]:shadow-md transition-shadow"
                >
                  <AccordionTrigger className="text-left font-semibold text-foreground hover:no-underline py-5">
                    {faq.question}
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground pb-5">
                    {faq.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </div>
      </section>
    );
  };
  
  export default FAQSection;
  