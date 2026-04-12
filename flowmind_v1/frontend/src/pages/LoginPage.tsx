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
  // Github,
} from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    // Simulate auth
    setTimeout(() => {
      setIsLoading(false);
      navigate("/app");
    }, 800);
  };

  return (
    <div className="min-h-screen flex font-sans">
      {/* ─── Left Panel: Brand ─── */}
      <div className="hidden lg:flex lg:w-1/2 bg-primary relative overflow-hidden flex-col justify-between p-12">
        {/* Decorative grid */}
        <div
          className="absolute inset-0 opacity-10 pointer-events-none"
          style={{
            backgroundImage: `radial-gradient(circle, white 1px, transparent 1px)`,
            backgroundSize: "32px 32px",
          }}
        />

        <div className="relative z-10">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="w-10 h-10 bg-white/20 backdrop-blur-sm flex items-center justify-center border-2 border-white/30">
              <Network className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-xl text-white tracking-tight">
              FlowMind
            </span>
          </Link>
        </div>

        <div className="relative z-10 max-w-md">
          <h2 className="text-4xl font-black text-white tracking-tighter leading-tight mb-4">
            Automate your workflow with AI agents
          </h2>
          <p className="text-white/70 text-lg leading-relaxed">
            Connect your tools, describe what you need, and let FlowMind's
            MCP-powered agents handle the rest.
          </p>

          <div className="mt-10 flex flex-col gap-4">
            {[
              "Natural language workflow creation",
              "15+ integrations out of the box",
              "Real-time execution monitoring",
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-6 h-6 bg-white/20 border border-white/30 flex items-center justify-center shrink-0">
                  <div className="w-2 h-2 bg-white" />
                </div>
                <span className="text-white/90 text-sm font-medium">
                  {item}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="relative z-10">
          <p className="text-white/40 text-sm">
            © 2026 FlowMind. All rights reserved.
          </p>
        </div>
      </div>

      {/* ─── Right Panel: Login Form ─── */}
      <div className="flex-1 flex flex-col bg-background">
        {/* Top bar */}
        <div className="flex items-center justify-between p-6">
          <Link
            to="/"
            className="flex items-center gap-2 lg:hidden"
          >
            <div className="w-8 h-8 bg-primary flex items-center justify-center border-2 border-border shadow-xs">
              <Network className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-bold text-lg tracking-tight">FlowMind</span>
          </Link>
          <div className="flex items-center gap-3 ml-auto">
            <ThemeToggle />
            <Link to="/signup">
              <Button
                variant="outline"
                className="border-2 border-border shadow-xs"
              >
                Create account
              </Button>
            </Link>
          </div>
        </div>

        {/* Form */}
        <div className="flex-1 flex items-center justify-center px-6 pb-12">
          <div className="w-full max-w-[400px]">
            <div className="mb-8">
              <h1 className="text-3xl font-black tracking-tighter mb-2">
                Welcome back
              </h1>
              <p className="text-muted-foreground">
                Sign in to your account to continue
              </p>
            </div>

            {/* Form Fields */}
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="email" className="text-sm font-bold">
                  Email address
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="email"
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
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-sm font-bold">
                    Password
                  </Label>
                  <a
                    href="#"
                    className="text-xs font-semibold text-primary hover:underline"
                  >
                    Forgot password?
                  </a>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
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
                    Sign in
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </>
                )}
              </Button>
            </form>

            <p className="text-center text-sm text-muted-foreground mt-6">
              Don't have an account?{" "}
              <Link
                to="/signup"
                className="font-bold text-primary hover:underline"
              >
                Sign up for free
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
