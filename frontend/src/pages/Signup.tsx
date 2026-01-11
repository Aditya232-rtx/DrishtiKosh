import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../lib/api";
import { auth } from "../lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import Logo from "@/components/Logo";
import { ArrowLeft, Loader2, Eye, Ear, Brain } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { ThemeToggleButton } from "@/components/ThemeToggleButton";

const Signup = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    fieldOfInterest: "",
    disability: "",
    role: "student",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.password !== formData.confirmPassword) {
      toast({
        title: "Passwords don't match",
        description: "Please make sure your passwords match.",
        variant: "destructive",
      });
      return;
    }

    if (formData.role === "student" && !formData.disability) {
      toast({
        title: "Please select your learning preference",
        description: "This helps us personalize your experience.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      // Call backend signup API
      const response = await api.post('/api/auth/signup', {
        username: formData.name.toLowerCase().replace(/\s+/g, ''),  // Create username from name
        email: formData.email,
        password: formData.password,
        full_name: formData.name,
        field_of_interest: formData.fieldOfInterest,
        learning_preference: formData.disability || null,
        role: formData.role
      });

      // Store session data
      auth.setSession(response.data.token, {
        id: response.data.id,
        name: response.data.full_name,
        type: response.data.learning_preference,
        role: response.data.role
      });

      toast({
        title: "Account created!",
        description: "Welcome to DrishtiKosh. Let's start learning!",
      });

      // Navigate based on role and disability type
      if (response.data.role === "teacher") {
        navigate("/teacher-dashboard");
      } else if (formData.disability === "blind") {
        navigate("/blind");
      } else if (formData.disability === "deaf") {
        navigate("/deaf-dashboard");
      } else {
        // ADHD and other users go to standard dashboard
        navigate("/dashboard");
      }
    } catch (error: any) {
      console.error('Signup error:', error);
      toast({
        title: "Signup failed",
        description: error.response?.data?.detail || 'Please try again.',
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const disabilityOptions = [
    { value: "blind", label: "Visually Impaired", icon: Eye },
    { value: "deaf", label: "Hearing Impaired", icon: Ear },
    { value: "adhd", label: "ADHD", icon: Brain },
  ];

  return (
    <div className="min-h-screen bg-background flex relative">
      <div className="absolute top-4 right-4 z-50">
        <ThemeToggleButton />
      </div>
      {/* Left Side - Decorative */}
      <div className="hidden lg:flex flex-1 bg-gradient-to-bl from-primary/20 via-primary/10 to-background items-center justify-center p-12">
        <div className="max-w-lg text-center">
          <div className="space-y-6">
            {disabilityOptions.map((option, index) => (
              <div
                key={option.value}
                className="bg-background/80 backdrop-blur-sm p-6 rounded-2xl shadow-lg border border-border animate-slide-in-left"
                style={{ animationDelay: `${index * 0.2} s` }}
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
                    <option.icon className="w-6 h-6 text-primary" />
                  </div>
                  <div className="text-left">
                    <h3 className="font-semibold text-foreground">
                      {option.label}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Personalized learning mode
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right Side - Form */}
      <div className="flex-1 flex flex-col justify-center px-8 lg:px-16 py-12">
        <div className="max-w-md w-full mx-auto">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-8 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to home
          </Link>

          <Logo size="lg" />

          <div className="mt-8">
            <h1 className="text-3xl font-bold text-foreground mb-2">
              Create Account
            </h1>
            <p className="text-muted-foreground">
              Join DrishtiKosh and start your accessible learning journey
            </p>
          </div>

          <div className="mt-8 p-1 bg-muted rounded-lg flex">
            {["student", "teacher"].map((role) => (
              <button
                key={role}
                type="button"
                onClick={() => setFormData({ ...formData, role })}
                className={`flex-1 py-2 text-sm font-medium rounded-md transition-all capitalize ${formData.role === role
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
                  }`}
              >
                {role}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                type="text"
                placeholder="Enter your full name"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                required
                className="h-12"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="Enter your email"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                required
                className="h-12"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Create password"
                  value={formData.password}
                  onChange={(e) =>
                    setFormData({ ...formData, password: e.target.value })
                  }
                  required
                  className="h-12"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="Confirm password"
                  value={formData.confirmPassword}
                  onChange={(e) =>
                    setFormData({ ...formData, confirmPassword: e.target.value })
                  }
                  required
                  className="h-12"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="fieldOfInterest">Field of Interest</Label>
              <Input
                id="fieldOfInterest"
                type="text"
                placeholder="e.g., Science, Mathematics, History"
                value={formData.fieldOfInterest}
                onChange={(e) =>
                  setFormData({ ...formData, fieldOfInterest: e.target.value })
                }
                className="h-12"
              />
            </div>

            {formData.role === "student" && (
              <div className="space-y-2">
                <Label>Learning Preference</Label>
                <Select
                  value={formData.disability}
                  onValueChange={(value) =>
                    setFormData({ ...formData, disability: value })
                  }
                >
                  <SelectTrigger className="h-12">
                    <SelectValue placeholder="Select your learning mode" />
                  </SelectTrigger>
                  <SelectContent>
                    {disabilityOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        <div className="flex items-center gap-2">
                          <option.icon className="w-4 h-4" />
                          {option.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <Button
              type="submit"
              variant="hero"
              size="lg"
              className="w-full"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Creating account...
                </>
              ) : (
                "Create Account"
              )}
            </Button>

            <p className="text-center text-muted-foreground">
              Already have an account?{" "}
              <Link to="/login" className="text-primary hover:underline font-medium">
                Log In
              </Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Signup;
