import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { ThemeToggle } from "../components/shared/ThemeToggle";
import {
  Network,
  ArrowRight,
  Eye,
  EyeOff,
  Mail,
  Lock,
  User,
  // Github,
  Check,
} from "lucide-react";

export default function SignUpPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      navigate("/app");
    }, 800);
  };

  const passwordChecks = [
    { label: "At least 8 characters", met: password.length >= 8 },
    { label: "Contains a number", met: /\d/.test(password) },
    { label: "Contains uppercase", met: /[A-Z]/.test(password) },
  ];

  return (
    <div className="min-h-screen flex font-sans">
      {/* ─── Left Panel: Brand ─── */}
      <div className="hidden lg:flex lg:w-1/2 bg-secondary relative overflow-hidden flex-col justify-between p-12">
        {/* Decorative grid */}
        <div
          className="absolute inset-0 opacity-10 pointer-events-none"
          style={{
            backgroundImage: `radial-gradient(circle, currentColor 1px, transparent 1px)`,
            backgroundSize: "32px 32px",
          }}
        />

        <div className="relative z-10">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="w-10 h-10 bg-primary flex items-center justify-center border-2 border-secondary-foreground/20">
              <Network className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="font-bold text-xl text-secondary-foreground tracking-tight">
              FlowMind
            </span>
          </Link>
        </div>

        <div className="relative z-10 max-w-md">
          <h2 className="text-4xl font-black text-secondary-foreground tracking-tighter leading-tight mb-4">
            Start automating in under a minute
          </h2>
          <p className="text-secondary-foreground/60 text-lg leading-relaxed">
            Join thousands of teams using FlowMind to eliminate busywork and
            build smarter workflows.
          </p>

          {/* Testimonial */}
          <div className="mt-10 p-6 border-2 border-secondary-foreground/10 bg-secondary-foreground/5">
            <p className="text-secondary-foreground/80 text-sm leading-relaxed italic mb-4">
              "FlowMind replaced 3 internal tools for us. The natural language
              input is a game-changer — our non-technical PMs are building
              automations now."
            </p>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-primary/20 border-2 border-secondary-foreground/10 flex items-center justify-center text-primary text-xs font-bold">
                SC
              </div>
              <div>
                <div className="text-sm font-bold text-secondary-foreground">
                  Sarah Chen
                </div>
                <div className="text-xs text-secondary-foreground/50">
                  Engineering Lead @ Acme
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="relative z-10">
          <p className="text-secondary-foreground/30 text-sm">
            © 2026 FlowMind. All rights reserved.
          </p>
        </div>
      </div>

      {/* ─── Right Panel: Sign Up Form ─── */}
      <div className="flex-1 flex flex-col bg-background">
        {/* Top bar */}
        <div className="flex items-center justify-between p-6">
          <Link to="/" className="flex items-center gap-2 lg:hidden">
            <div className="w-8 h-8 bg-primary flex items-center justify-center border-2 border-border shadow-xs">
              <Network className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-bold text-lg tracking-tight">FlowMind</span>
          </Link>
          <div className="flex items-center gap-3 ml-auto">
            <ThemeToggle />
            <Link to="/login">
              <Button
                variant="outline"
                className="border-2 border-border shadow-xs"
              >
                Sign in
              </Button>
            </Link>
          </div>
        </div>

        {/* Form */}
        <div className="flex-1 flex items-center justify-center px-6 pb-12">
          <div className="w-full max-w-[400px]">
            <div className="mb-8">
              <h1 className="text-3xl font-black tracking-tighter mb-2">
                Create your account
              </h1>
              <p className="text-muted-foreground">
                Get started for free. No credit card required.
              </p>
            </div>


            {/* Form Fields */}
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="name" className="text-sm font-bold">
                  Full name
                </Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="name"
                    type="text"
                    placeholder="Arthur Hayes"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="pl-10 h-11 border-2 border-border shadow-2xs"
                    required
                  />
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="signup-email" className="text-sm font-bold">
                  Email address
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="signup-email"
                    type="email"
                    placeholder="name@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10 h-11 border-2 border-border shadow-2xs"
                    required
                  />
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="signup-password" className="text-sm font-bold">
                  Password
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="signup-password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Create a strong password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 pr-10 h-11 border-2 border-border shadow-2xs"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>

                {/* Password strength */}
                {password.length > 0 && (
                  <div className="flex flex-col gap-1.5 mt-1">
                    {passwordChecks.map((check, i) => (
                      <div
                        key={i}
                        className={`flex items-center gap-2 text-xs font-medium ${
                          check.met
                            ? "text-chart-4"
                            : "text-muted-foreground"
                        }`}
                      >
                        <div
                          className={`w-3.5 h-3.5 border flex items-center justify-center ${
                            check.met
                              ? "bg-chart-4/10 border-chart-4/30"
                              : "border-border"
                          }`}
                        >
                          {check.met && <Check className="w-2.5 h-2.5" />}
                        </div>
                        {check.label}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <Button
                type="submit"
                className="w-full h-11 border-2 border-border shadow-sm font-bold mt-2"
                disabled={isLoading}
              >
                {isLoading ? (
                  <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                ) : (
                  <>
                    Create account
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </>
                )}
              </Button>
            </form>

            <p className="text-center text-xs text-muted-foreground mt-6 leading-relaxed">
              By creating an account, you agree to our{" "}
              <a href="#" className="font-semibold text-foreground hover:underline">
                Terms of Service
              </a>{" "}
              and{" "}
              <a href="#" className="font-semibold text-foreground hover:underline">
                Privacy Policy
              </a>
            </p>

            <p className="text-center text-sm text-muted-foreground mt-4">
              Already have an account?{" "}
              <Link
                to="/login"
                className="font-bold text-primary hover:underline"
              >
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
