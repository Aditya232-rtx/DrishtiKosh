import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import Logo from "@/components/Logo";
import { ArrowLeft, Heart, Target, Users, Sparkles } from "lucide-react";

const About = () => {
  const values = [
    {
      icon: Heart,
      title: "Inclusivity First",
      description:
        "Every feature is designed with accessibility at its core, ensuring no learner is left behind.",
    },
    {
      icon: Target,
      title: "Personalized Learning",
      description:
        "AI-powered adaptation that understands and responds to each student's unique needs and pace.",
    },
    {
      icon: Users,
      title: "Community Driven",
      description:
        "Built in collaboration with educators, parents, and students from the disability community.",
    },
    {
      icon: Sparkles,
      title: "Cutting-Edge AI",
      description:
        "Leveraging the latest in AI technology to create transformative learning experiences.",
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="bg-background border-b border-border">
        <div className="container mx-auto px-4 h-16 flex items-center">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to home
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="py-20 px-4">
        <div className="container mx-auto text-center max-w-4xl">
          <Logo size="lg" />
          <h1 className="text-4xl md:text-5xl font-bold text-foreground mt-8 mb-6">
            About DrishtiKosh
          </h1>
          <p className="text-xl text-muted-foreground leading-relaxed">
            DrishtiKosh (meaning "Treasury of Vision" in Sanskrit) is on a
            mission to democratize education for students with disabilities.
            We believe that every mind deserves the opportunity to learn,
            grow, and achieve their full potential.
          </p>
        </div>
      </section>

      {/* Mission */}
      <section className="py-16 bg-card">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl font-bold text-foreground mb-8 text-center">
              Our Mission
            </h2>
            <div className="bg-background rounded-2xl p-8 shadow-lg border border-border">
              <p className="text-lg text-muted-foreground leading-relaxed mb-6">
                We're building an AI-powered learning platform that adapts to
                the unique needs of blind, deaf, and ADHD students. By
                combining cutting-edge artificial intelligence with deep
                understanding of accessibility needs, we're creating learning
                experiences that work the way our students think.
              </p>
              <p className="text-lg text-muted-foreground leading-relaxed">
                Our platform features voice-operated interfaces for visually
                impaired learners, visual-first experiences with captions for
                deaf students, and focus-enhancing tools for ADHD learners.
                Everything is personalized, everything is accessible, and
                everything is designed to help students succeed.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="py-20 px-4">
        <div className="container mx-auto">
          <h2 className="text-3xl font-bold text-foreground mb-12 text-center">
            Our Values
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-6xl mx-auto">
            {values.map((value) => (
              <div
                key={value.title}
                className="text-center p-6 rounded-2xl bg-card border border-border hover:shadow-lg transition-shadow"
              >
                <div className="w-14 h-14 bg-primary/10 rounded-xl flex items-center justify-center mx-auto mb-4">
                  <value.icon className="w-7 h-7 text-primary" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  {value.title}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {value.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 px-4 bg-card">
        <div className="container mx-auto text-center">
          <h2 className="text-2xl font-bold text-foreground mb-4">
            Ready to Experience Accessible Learning?
          </h2>
          <p className="text-muted-foreground mb-8">
            Join us in transforming education for everyone.
          </p>
          <Link to="/signup">
            <Button variant="hero" size="xl">
              Get Started Free
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 border-t border-border">
        <div className="container mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-4">
          <Logo size="sm" />
          <p className="text-sm text-muted-foreground">
            © 2024 DrishtiKosh. Making education accessible for everyone.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default About;
