import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "../components/ui/button";
import { ThemeToggle } from "../components/shared/ThemeToggle";
import {
  Network,
  ArrowRight,
  Sparkles,
  Zap,
  Shield,
  GitBranch,
  MessageSquare,
  Database,
  ArrowUpRight,
  Play,
  Check,
  Star,
} from "lucide-react";
import { Card } from "../components/ui/card";

export default function LandingPage() {
  const [prompt, setPrompt] = useState("");
  const navigate = useNavigate();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;
    navigate("/app");
  };

  const templates = [
    "Summarize Jira issues and post to Slack",
    "Monitor GitHub PRs for failed CI",
    "Sync Stripe invoices to Google Sheets",
  ];

  return (
    <div className="min-h-screen bg-background text-foreground font-sans relative overflow-x-hidden">
      {/* ─── Navbar ─── */}
      <nav className="sticky top-0 z-50 border-b-2 border-border bg-background/95 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-primary flex items-center justify-center border-2 border-border shadow-xs">
              <Network className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-bold text-lg tracking-tight">FlowMind</span>
          </Link>

          <div className="hidden md:flex items-center gap-1">
            {["Features", "How it Works", "Pricing"].map((item) => (
              <a
                key={item}
                href={`#${item.toLowerCase().replace(/\s/g, "-")}`}
                className="px-3.5 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                {item}
              </a>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Button
              variant="outline"
              className="border-2 shadow-xs hidden sm:inline-flex"
              onClick={() => navigate("/login")}
            >
              Log in
            </Button>
            <Button
              className="border-2 border-border shadow-sm"
              onClick={() => navigate("/signup")}
            >
              Get Started
              <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </div>
      </nav>

      {/* ─── Hero Section ─── */}
      <section className="relative pt-20 pb-24 px-6">
        {/* Decorative grid dots */}
        <div className="absolute inset-0 pointer-events-none opacity-[0.04]" style={{
          backgroundImage: `radial-gradient(circle, currentColor 1px, transparent 1px)`,
          backgroundSize: '24px 24px',
        }} />

        <div className="max-w-4xl mx-auto text-center relative z-10">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 border-2 border-border bg-card shadow-xs text-sm font-medium mb-8">
            <Sparkles className="w-4 h-4 text-primary" />
            AI-Powered Workflow Automation
            <ArrowUpRight className="w-3.5 h-3.5 text-muted-foreground" />
          </div>

          <h1 className="text-5xl md:text-7xl font-black tracking-tighter leading-[0.9] mb-6">
            Automate anything{" "}
            <span className="text-primary">with words.</span>
          </h1>

          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-12 leading-relaxed">
            Describe your workflow in plain English. FlowMind connects your tools,
            builds the pipeline, and executes it — all through{" "}
            <span className="font-semibold text-foreground">MCP-powered AI agents.</span>
          </p>

          {/* ─── Chat Input (Hero) ─── */}
          <div className="max-w-2xl mx-auto mb-8">
            <form
              onSubmit={handleSubmit}
              className="relative border-2 border-border bg-card shadow-md hover:shadow-lg transition-shadow"
            >
              <textarea
                className="w-full min-h-[100px] max-h-[200px] bg-transparent resize-none p-5 pr-20 outline-none text-base md:text-lg placeholder:text-muted-foreground/50 leading-relaxed font-sans"
                placeholder="e.g. Fetch all open Jira tickets, summarize with AI, and post to #dev-updates on Slack..."
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSubmit(e);
                  }
                }}
              />
              <div className="absolute bottom-3 right-3">
                <Button
                  type="submit"
                  size="icon"
                  className="w-11 h-11 border-2 border-border shadow-sm bg-primary text-primary-foreground hover:bg-primary/90 transition-all"
                  disabled={prompt.length === 0}
                >
                  <ArrowRight className="w-5 h-5" />
                </Button>
              </div>
            </form>
          </div>

          {/* Template chips */}
          <div className="flex flex-wrap justify-center gap-2">
            {templates.map((txt, idx) => (
              <button
                key={idx}
                onClick={() => setPrompt(txt)}
                className="px-4 py-2 border-2 border-border bg-card text-sm font-medium hover:bg-muted hover:shadow-xs transition-all text-left shadow-2xs"
              >
                {txt}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Trusted By / Social Proof ─── */}
      <section className="py-12 border-y-2 border-border bg-muted/30">
        <div className="max-w-6xl mx-auto px-6">
          <p className="text-center text-xs font-bold uppercase tracking-widest text-muted-foreground mb-8">
            Trusted by teams at
          </p>
          <div className="flex flex-wrap justify-center items-center gap-10 md:gap-16">
            {["Acme Corp", "TechFlow", "DataVault", "NeuraSoft", "BuildFast"].map((name) => (
              <span key={name} className="text-lg font-bold text-muted-foreground/50 tracking-tight">
                {name}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Features ─── */}
      <section id="features" className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-black tracking-tighter mb-4">
              Everything you need
            </h2>
            <p className="text-lg text-muted-foreground max-w-xl mx-auto">
              A complete platform for building, deploying, and monitoring AI-powered workflows.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              {
                icon: <Sparkles className="w-6 h-6" />,
                title: "Natural Language Input",
                desc: "Just describe what you want. Our LLM planner breaks it down into executable steps.",
                color: "bg-primary/10 text-primary",
              },
              {
                icon: <GitBranch className="w-6 h-6" />,
                title: "Visual DAG Builder",
                desc: "See your workflow as a directed graph. Drag-and-drop nodes, edit connections, re-order steps.",
                color: "bg-accent/20 text-accent-foreground",
              },
              {
                icon: <Shield className="w-6 h-6" />,
                title: "Human-in-the-Loop",
                desc: "Set approval gates on sensitive actions. Stay in control while the agents do the work.",
                color: "bg-destructive/10 text-destructive",
              },
              {
                icon: <Zap className="w-6 h-6" />,
                title: "MCP Server Integration",
                desc: "Connect to any MCP-compatible server. Jira, GitHub, Slack, Gmail — all supported out of the box.",
                color: "bg-chart-3/20 text-chart-5",
              },
              {
                icon: <Database className="w-6 h-6" />,
                title: "Real-time Execution Logs",
                desc: "Stream execution logs live. Inspect payloads, latencies, and errors as they happen.",
                color: "bg-chart-4/20 text-chart-4",
              },
              {
                icon: <MessageSquare className="w-6 h-6" />,
                title: "AI Agent Chat",
                desc: "Interact with agents conversationally. Adjust parameters, ask questions, refine on-the-fly.",
                color: "bg-sidebar-primary/10 text-sidebar-primary",
              },
            ].map((feat, i) => (
              <Card
                key={i}
                className="p-0 border-2 border-border shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all cursor-default"
              >
                <div className="p-6">
                  <div className={`w-12 h-12 ${feat.color} flex items-center justify-center border-2 border-border shadow-2xs mb-5`}>
                    {feat.icon}
                  </div>
                  <h3 className="text-lg font-bold mb-2">{feat.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{feat.desc}</p>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ─── How it Works ─── */}
      <section id="how-it-works" className="py-24 px-6 border-y-2 border-border bg-muted/20">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-black tracking-tighter mb-4">
              Three steps. Zero code.
            </h2>
            <p className="text-lg text-muted-foreground">
              From idea to execution in under a minute.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                step: "01",
                title: "Describe",
                desc: "Type what you want to automate in plain language. Our AI understands context, tools, and intent.",
                icon: <MessageSquare className="w-6 h-6" />,
              },
              {
                step: "02",
                title: "Review & Connect",
                desc: "See the generated DAG. Connect OAuth accounts for each service. Approve or edit the flow.",
                icon: <GitBranch className="w-6 h-6" />,
              },
              {
                step: "03",
                title: "Execute",
                desc: "Hit run. Watch real-time logs stream in. Approve gated steps. Celebrate automation.",
                icon: <Play className="w-6 h-6" />,
              },
            ].map((s, i) => (
              <div key={i} className="flex flex-col gap-4 p-6 border-2 border-border bg-card shadow-xs hover:shadow-sm transition-shadow">
                <div className="flex items-center gap-3">
                  <span className="text-3xl font-black text-primary tracking-tighter">{s.step}</span>
                  <div className="w-10 h-10 bg-primary/10 border-2 border-border flex items-center justify-center text-primary">
                    {s.icon}
                  </div>
                </div>
                <h3 className="text-xl font-bold">{s.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Metrics ─── */}
      <section className="py-20 px-6">
        <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { value: "10K+", label: "Workflows Run" },
            { value: "99.9%", label: "Uptime" },
            { value: "50ms", label: "Avg Response" },
            { value: "15+", label: "Integrations" },
          ].map((m, i) => (
            <div key={i} className="text-center p-6 border-2 border-border bg-card shadow-xs">
              <div className="text-4xl md:text-5xl font-black tracking-tighter text-primary mb-1">{m.value}</div>
              <div className="text-sm font-medium text-muted-foreground">{m.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ─── Pricing ─── */}
      <section id="pricing" className="py-24 px-6 border-y-2 border-border bg-muted/20">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-black tracking-tighter mb-4">
              Simple pricing
            </h2>
            <p className="text-lg text-muted-foreground">No hidden fees. Scale when you're ready.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              {
                name: "Free",
                price: "$0",
                desc: "For individuals exploring automation",
                features: ["5 workflows/month", "3 integrations", "Community support", "Basic logs"],
                cta: "Get Started",
                featured: false,
              },
              {
                name: "Pro",
                price: "$29",
                desc: "For teams building real pipelines",
                features: ["Unlimited workflows", "15+ integrations", "Priority support", "Advanced analytics", "Approval gates"],
                cta: "Start Free Trial",
                featured: true,
              },
              {
                name: "Enterprise",
                price: "Custom",
                desc: "For orgs with complex requirements",
                features: ["Everything in Pro", "SSO & RBAC", "Custom MCP servers", "Dedicated support", "SLA guarantee"],
                cta: "Contact Sales",
                featured: false,
              },
            ].map((plan, i) => (
              <div
                key={i}
                className={`flex flex-col p-6 border-2 border-border bg-card shadow-xs ${
                  plan.featured ? "shadow-md border-primary relative" : ""
                }`}
              >
                {plan.featured && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 bg-primary text-primary-foreground text-xs font-bold border-2 border-border shadow-xs">
                    Popular
                  </div>
                )}
                <h3 className="text-lg font-bold mb-1">{plan.name}</h3>
                <div className="flex items-baseline gap-1 mb-2">
                  <span className="text-4xl font-black tracking-tighter">{plan.price}</span>
                  {plan.price !== "Custom" && <span className="text-sm text-muted-foreground">/mo</span>}
                </div>
                <p className="text-sm text-muted-foreground mb-6">{plan.desc}</p>
                <ul className="flex flex-col gap-2.5 mb-8 flex-1">
                  {plan.features.map((f, j) => (
                    <li key={j} className="flex items-center gap-2 text-sm">
                      <Check className="w-4 h-4 text-primary shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Button
                  variant={plan.featured ? "default" : "outline"}
                  className={`w-full border-2 border-border shadow-xs ${plan.featured ? "" : ""}`}
                  onClick={() => navigate("/signup")}
                >
                  {plan.cta}
                </Button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Testimonials ─── */}
      <section className="py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-4xl font-black tracking-tighter text-center mb-16">
            Loved by developers
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { name: "Sarah Chen", role: "Engineering Lead @ Acme", quote: "FlowMind replaced 3 internal tools for us. The DAG visualizer alone is worth it." },
              { name: "Marcus Wei", role: "DevOps @ TechFlow", quote: "Setting up Jira→GitHub→Slack pipelines used to take days. Now it takes one sentence." },
              { name: "Aisha Patel", role: "Product Manager", quote: "The approval gates give us confidence to automate things we never would have before." },
            ].map((t, i) => (
              <Card key={i} className="p-0 border-2 border-border shadow-xs">
                <div className="p-6 flex flex-col gap-4">
                  <div className="flex gap-1">
                    {[...Array(5)].map((_, j) => (
                      <Star key={j} className="w-4 h-4 fill-accent text-accent" />
                    ))}
                  </div>
                  <p className="text-sm leading-relaxed text-muted-foreground italic">"{t.quote}"</p>
                  <div className="pt-2 border-t border-border">
                    <div className="font-bold text-sm">{t.name}</div>
                    <div className="text-xs text-muted-foreground">{t.role}</div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ─── CTA ─── */}
      <section className="py-24 px-6 border-t-2 border-border bg-primary/5">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-4xl md:text-5xl font-black tracking-tighter mb-4">
            Ready to automate?
          </h2>
          <p className="text-lg text-muted-foreground mb-8 max-w-lg mx-auto">
            Start building intelligent workflows in seconds. No credit card required.
          </p>
          <Button
            className="border-2 border-border shadow-md text-base px-8 h-12"
            onClick={() => navigate("/signup")}
          >
            Launch FlowMind
            <ArrowRight className="w-5 h-5 ml-2" />
          </Button>
        </div>
      </section>

      {/* ─── Footer ─── */}
      <footer className="border-t-2 border-border bg-card py-12 px-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 bg-primary flex items-center justify-center border-2 border-border">
              <Network className="w-3.5 h-3.5 text-primary-foreground" />
            </div>
            <span className="font-bold tracking-tight">FlowMind</span>
          </div>
          <div className="flex items-center gap-6 text-sm text-muted-foreground">
            <a href="#" className="hover:text-foreground transition-colors">Docs</a>
            <a href="#" className="hover:text-foreground transition-colors">GitHub</a>
            <a href="#" className="hover:text-foreground transition-colors">Twitter</a>
            <a href="#" className="hover:text-foreground transition-colors">Privacy</a>
          </div>
          <p className="text-xs text-muted-foreground">
            © 2026 FlowMind. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
