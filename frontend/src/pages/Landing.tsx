import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import Logo from "@/components/Logo";
import { Eye, Ear, Brain, ArrowRight, Sparkles } from "lucide-react";
import heroImage from "@/assets/hero-learning.png";
import { ThemeToggleButton } from "@/components/ThemeToggleButton";

const Landing = () => {
  const features = [
    {
      icon: Eye,
      title: "For Visually Impaired",
      description:
        "Voice-operated learning with multilingual support. Learn in your preferred language through natural conversations.",
    },
    {
      icon: Ear,
      title: "For Hearing Impaired",
      description:
        "Visual-first learning with captions, generated images, and interactive quizzes. No sound required.",
    },
    {
      icon: Brain,
      title: "For ADHD Learners",
      description:
        "Focus-enhancing features with bionic reading, background music, and bite-sized learning modules.",
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Logo />
          <div className="flex items-center gap-4">
            <ThemeToggleButton />
            <Link to="/about">
              <Button variant="ghost">About Us</Button>
            </Link>
            <Link to="/login">
              <Button variant="outline">Log In</Button>
            </Link>
            <Link to="/signup">
              <Button variant="hero">Sign Up</Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4">
        <div className="container mx-auto grid lg:grid-cols-2 gap-12 items-center">
          {/* Left Content */}
          <div className="space-y-6 animate-fade-in">
            <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium">
              <Sparkles className="w-4 h-4" />
              AI-Powered Inclusive Learning
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground leading-tight">
              Education Without
              <span className="text-primary block">Barriers</span>
            </h1>
            <p className="text-lg text-muted-foreground max-w-xl">
              DrishtiKosh is an AI learning platform designed specifically for
              blind, deaf, and ADHD students. Experience personalized education
              that adapts to your unique learning needs.
            </p>
            <div className="flex flex-wrap gap-4 pt-4">
              <Link to="/signup">
                <Button variant="hero" size="xl">
                  Start Learning Free
                  <ArrowRight className="w-5 h-5" />
                </Button>
              </Link>
              <Link to="/about">
                <Button variant="hero-outline" size="xl">
                  Learn More
                </Button>
              </Link>
            </div>
          </div>

          {/* Right Content - Hero Image */}
          <div className="relative animate-float">
            <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-transparent rounded-3xl blur-3xl" />
            <img
              src={heroImage}
              alt="Children with different abilities learning together with AI assistance"
              className="relative rounded-3xl shadow-2xl w-full"
            />
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-card">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-foreground mb-4">
              Learning Tailored For You
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Choose your learning mode and experience education designed
              specifically for your needs
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <div
                key={feature.title}
                className="bg-background p-8 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-2 border border-border"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <div className="w-14 h-14 bg-primary/10 rounded-xl flex items-center justify-center mb-6">
                  <feature.icon className="w-7 h-7 text-primary" />
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-3">
                  {feature.title}
                </h3>
                <p className="text-muted-foreground">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto text-center">
          <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-primary/10 rounded-3xl p-12 border border-primary/20">
            <h2 className="text-3xl font-bold text-foreground mb-4">
              Ready to Transform Your Learning?
            </h2>
            <p className="text-muted-foreground mb-8 max-w-xl mx-auto">
              Join thousands of learners who are already experiencing
              barrier-free education with DrishtiKosh
            </p>
            <Link to="/signup">
              <Button variant="glow" size="xl">
                Get Started Now
                <ArrowRight className="w-5 h-5" />
              </Button>
            </Link>
          </div>
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

export default Landing;
