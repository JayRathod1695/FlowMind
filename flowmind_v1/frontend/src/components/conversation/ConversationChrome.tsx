import { ArrowRight, Bot } from "lucide-react";

import { Button } from "../ui/button";
import type { ConversationMessage } from "@/lib/conversation";

export const conversationSuggestions = [
  "I have a problem and need help figuring out what to do.",
  "I need a plan to automate a workflow across my tools.",
  "I want to send updates to Slack when something happens in GitHub.",
  "I need to fix a broken integration and I am not sure where to start.",
];

export function conversationStatusTone(state: string | undefined): string {
  switch (state) {
    case "planned":
      return "text-chart-4 bg-chart-4/10 border-chart-4/30";
    case "planning":
    case "gathering":
      return "text-primary bg-primary/10 border-primary/30";
    case "failed":
      return "text-destructive bg-destructive/10 border-destructive/30";
    default:
      return "text-muted-foreground bg-muted/60 border-border";
  }
}

export function conversationStatusLabel(state: string | undefined): string {
  switch (state) {
    case "planned":
      return "Plan ready";
    case "planning":
      return "Building plan";
    case "failed":
      return "Needs attention";
    case "gathering":
      return "Gathering details";
    default:
      return "Ready to chat";
  }
}

export function ConversationMessageRow({ message }: { message: ConversationMessage }) {
  const isUser = message.role === "user";
  const isPending = Boolean((message.metadata as { isOptimistic?: boolean }).isOptimistic);
  const bubbleClassName = isUser
    ? `ml-auto bg-primary text-primary-foreground border-primary/30 ${isPending ? "border-dashed opacity-85" : ""}`
    : "mr-auto bg-card text-foreground border-border";

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div className={`max-w-[85%] rounded-3xl border-2 px-4 py-3 shadow-xs ${bubbleClassName}`}>
        <div className="mb-2 flex items-center gap-2">
          <div className={`flex h-7 w-7 items-center justify-center rounded-full border ${isUser ? "border-white/20 bg-white/10" : "border-border bg-muted"}`}>
            {isUser ? <span className="text-[10px] font-black">You</span> : <Bot className="h-3.5 w-3.5 text-primary" />}
          </div>
          <span className={`text-[10px] font-bold uppercase tracking-[0.2em] ${isUser ? "text-primary-foreground/80" : "text-muted-foreground"}`}>
            {isUser ? "You" : "FlowMind"}
          </span>
          {isUser && isPending && (
            <span className="rounded-full border border-white/20 bg-white/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.2em] text-primary-foreground/80">
              Sending
            </span>
          )}
        </div>
        <p className="whitespace-pre-wrap text-sm leading-relaxed">{message.content}</p>
      </div>
    </div>
  );
}

export function ConversationSideRail({
  missingInfo,
  stateLabel,
  messageCount,
  planId,
  onOpenPlan,
}: {
  missingInfo: string[];
  stateLabel: string;
  messageCount: number;
  planId: string | null;
  onOpenPlan: () => void;
}) {
  return (
    <aside className="flex min-h-0 flex-col gap-4 overflow-hidden">
      <div className="rounded-3xl border-2 border-border bg-card p-5 shadow-2xs">
        <div className="mb-4 flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-2xl border border-border bg-primary/10 text-primary">
            <Bot className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold uppercase tracking-[0.2em] text-muted-foreground">What I still need</h2>
            <p className="text-xs text-muted-foreground">The AI will ask for these if they are missing.</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {missingInfo.length > 0 ? (
            missingInfo.map((item) => (
              <span key={item} className="rounded-full border border-border bg-muted/50 px-3 py-1 text-xs font-medium">
                {item}
              </span>
            ))
          ) : (
            <span className="rounded-full border border-border bg-muted/50 px-3 py-1 text-xs font-medium">
              Goal
            </span>
          )}
        </div>
      </div>

      <div className="rounded-3xl border-2 border-border bg-card p-5 shadow-2xs">
        <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">Conversation state</h3>
        <div className="mt-4 space-y-3 text-sm">
          <div className="flex items-center justify-between gap-4">
            <span className="text-muted-foreground">State</span>
            <span className="font-semibold">{stateLabel}</span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-muted-foreground">Messages</span>
            <span className="font-semibold">{messageCount}</span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-muted-foreground">Plan</span>
            <span className="font-semibold">{planId ? planId : "Not yet"}</span>
          </div>
        </div>

        {planId && (
          <Button className="mt-4 w-full border-2 border-border shadow-sm" onClick={onOpenPlan}>
            Open plan
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        )}
      </div>

      <div className="rounded-3xl border-2 border-border bg-card p-5 shadow-2xs">
        <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">How to phrase it</h3>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          Tell me the goal, the system you want to work with, any constraints, and what success looks like. If you only know the problem, say that first and I’ll narrow it down.
        </p>
      </div>
    </aside>
  );
}