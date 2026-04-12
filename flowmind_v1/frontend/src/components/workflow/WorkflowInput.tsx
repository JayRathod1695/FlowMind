import { useState } from "react";
import { Button } from "../ui/button";
import { Sparkles, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

export function WorkflowInput() {
  const [prompt, setPrompt] = useState("");
  const navigate = useNavigate();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;
    
    // In a real app we'd save prompt to Zustand workflow.store here
    // For static demo: we push directly to Connectors page to simulate the "oauth gate"
    navigate("/connectors");
  };

  const templates = [
    "Summarize all Jira issues assigned to me and post to Slack",
    "Monitor GitHub PRs and send an email for failed CI builds",
    "Fetch Stripe invoices from last week and put them in Google Sheets",
  ];

  return (
    <div className="w-full max-w-3xl mx-auto flex flex-col gap-6 animate-in fade-in zoom-in duration-500">
      <div className="flex flex-col items-center gap-2 mb-4 text-center">
        <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-playful-glow mb-4">
          <Sparkles className="w-8 h-8 text-primary-foreground" />
        </div>
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight">
          What can I automate for you?
        </h1>
        <p className="text-muted-foreground text-lg max-w-xl mx-auto">
          Describe your workflow in natural language, and I'll build the integrations and sequence automatically.
        </p>
      </div>

      <div className="relative group">
        {/* Glow effect under input */}
        <div className="absolute -inset-1 bg-gradient-to-r from-primary via-accent to-primary rounded-3xl blur opacity-25 group-hover:opacity-40 transition duration-1000 group-hover:duration-200" />
        
        <form 
          onSubmit={handleSubmit}
          className="relative flex items-center bg-card border border-border shadow-playful-lg rounded-3xl overflow-hidden focus-within:ring-2 focus-within:ring-ring focus-within:border-ring transition-all"
        >
          <textarea 
            className="flex-1 min-h-[80px] max-h-[200px] w-full bg-transparent resize-none p-5 md:p-6 outline-none text-lg md:text-xl placeholder:text-muted-foreground/60 overflow-hidden leading-relaxed"
            placeholder="Type your workflow request here..."
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e);
              }
            }}
          />
          <div className="pr-4 md:pr-6 self-end pb-4 md:pb-5">
            <Button 
              type="submit" 
              size="icon" 
              className="w-12 h-12 rounded-full shadow-md bg-foreground text-background hover:bg-foreground/90 transition-all hover:scale-105 active:scale-95"
              disabled={prompt.length === 0}
            >
              <ArrowRight className="w-5 h-5" />
            </Button>
          </div>
        </form>
      </div>

      <div className="mt-8">
        <p className="text-sm text-center text-muted-foreground/80 mb-4 font-medium uppercase tracking-widest">Or try a template</p>
        <div className="flex flex-wrap justify-center gap-3">
          {templates.map((txt, idx) => (
            <button 
              key={idx}
              onClick={() => setPrompt(txt)}
              className="px-4 py-2 rounded-full border border-border/60 bg-muted/30 text-sm font-medium hover:bg-muted hover:border-border hover:shadow-playful transition-all text-left max-w-xs truncate"
            >
              {txt}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
