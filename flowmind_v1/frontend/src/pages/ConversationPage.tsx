import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AlertCircle, CheckCircle2, Loader2, RefreshCw, Send, Sparkles } from "lucide-react";

import { Button } from "../components/ui/button";
import { Textarea } from "../components/ui/textarea";
import {
  getConversation,
  sendConversationMessage,
  startConversation,
  type ConversationMessage,
  type ConversationSession,
} from "@/lib/conversation";
import {
  ConversationMessageRow,
  ConversationSideRail,
  conversationSuggestions,
  conversationStatusLabel,
  conversationStatusTone,
} from "../components/conversation/ConversationChrome";

const CONVERSATION_KEY = "flowmind.activeConversationId";

export default function ConversationPage() {
  const navigate = useNavigate();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [conversation, setConversation] = useState<ConversationSession | null>(null);
  const [pendingMessage, setPendingMessage] = useState<ConversationMessage | null>(null);
  const [draft, setDraft] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [hydrating, setHydrating] = useState(true);

  useEffect(() => {
    const savedConversationId = window.localStorage.getItem(CONVERSATION_KEY);
    if (!savedConversationId) {
      setHydrating(false);
      return;
    }

    let isMounted = true;
    const loadConversation = async () => {
      try {
        const session = await getConversation(savedConversationId);
        if (!isMounted) return;
        setConversation(session);
      } catch {
        if (!isMounted) return;
        window.localStorage.removeItem(CONVERSATION_KEY);
      } finally {
        if (isMounted) setHydrating(false);
      }
    };

    void loadConversation();
    return () => {
      isMounted = false;
    };
  }, []);

  const visibleMessages = conversation
    ? [...conversation.messages, ...(pendingMessage ? [pendingMessage] : [])]
    : pendingMessage
      ? [pendingMessage]
      : [];

  const activeConversationState = conversation?.state ?? (pendingMessage ? "gathering" : undefined);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [visibleMessages.length, activeConversationState]);

  const handleReset = () => {
    window.localStorage.removeItem(CONVERSATION_KEY);
    setConversation(null);
    setPendingMessage(null);
    setDraft("");
    setLoadError(null);
  };

  const handleSubmit = async () => {
    const text = draft.trim();
    if (!text || isSending) return;

    const optimisticMessage: ConversationMessage = {
      id: `local-${Date.now()}`,
      conversation_id: conversation?.id ?? "pending",
      turn_index: (conversation?.messages.length ?? 0) + 1,
      role: "user",
      content: text,
      metadata: { isOptimistic: true },
      created_at: new Date().toISOString(),
    };

    setIsSending(true);
    setLoadError(null);
    setPendingMessage(optimisticMessage);
    setDraft("");

    try {
      const result = conversation?.id
        ? await sendConversationMessage(conversation.id, text)
        : await startConversation(text);

      setConversation(result.conversation);
      setPendingMessage(null);
      window.localStorage.setItem(CONVERSATION_KEY, result.conversation.id);

      if (result.plan_id) {
        navigate(`/app/plan/${result.plan_id}`);
      }
    } catch (error) {
      setPendingMessage(null);
      setDraft(text);
      const message = error instanceof Error ? error.message : "Failed to send message.";
      setLoadError(message);
    } finally {
      setIsSending(false);
    }
  };

  if (hydrating) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="w-full h-full overflow-hidden p-4 md:p-6">
      <div className="mx-auto grid h-full max-w-7xl gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <section className="flex min-h-0 flex-col overflow-hidden rounded-[28px] border-2 border-border bg-card shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
          <div className="flex items-center justify-between gap-4 border-b-2 border-border px-5 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl border-2 border-border bg-primary/10 text-primary">
                <Sparkles className="h-4 w-4" />
              </div>
              <div>
                <h1 className="text-xl font-black tracking-tight">Agent Conversation</h1>
                <p className="text-sm text-muted-foreground">Tell me what you want. I’ll ask follow-ups until I can plan safely.</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className={`border px-3 py-1.5 text-xs font-bold uppercase tracking-[0.18em] ${conversationStatusTone(activeConversationState)}`}>
                {conversationStatusLabel(activeConversationState)}
              </span>
              <Button variant="outline" className="border-2 border-border" onClick={handleReset}>
                <RefreshCw className="mr-2 h-4 w-4" />
                New thread
              </Button>
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto bg-muted/25 px-5 py-5 dark:bg-muted/10">
            {!visibleMessages.length ? (
              <div className="flex h-full min-h-105 flex-col justify-center gap-6 rounded-3xl p-6">
                <div className="max-w-2xl space-y-4">
                  <div className="inline-flex items-center gap-2 rounded-full border border-border bg-muted/60 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
                    <Sparkles className="h-3.5 w-3.5 text-primary" />
                    Requirement gathering first
                  </div>
                  <h2 className="text-3xl font-black tracking-tight md:text-4xl">Start with the problem, not the plan.</h2>
                  <p className="max-w-xl text-sm leading-6 text-muted-foreground">
                    I’ll stay in conversation mode until I have enough detail to plan safely. Once the requirements are clear, I’ll generate the plan and open it for review.
                  </p>
                </div>

                <div className="grid gap-2 md:grid-cols-2">
                  {conversationSuggestions.map((item) => (
                    <button
                      key={item}
                      type="button"
                      onClick={() => setDraft(item)}
                      className="rounded-2xl border-2 border-border bg-card p-4 text-left text-sm font-medium shadow-xs transition-all hover:-translate-y-0.5 hover:bg-muted/50"
                    >
                      {item}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {visibleMessages.map((message) => (
                  <ConversationMessageRow key={message.id} message={message} />
                ))}
                {isSending && (
                  <div className="flex justify-start">
                    <div className="mr-auto flex max-w-[70%] items-center gap-3 rounded-3xl border-2 border-border bg-card px-4 py-3 shadow-xs">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full border border-border bg-muted">
                        <Loader2 className="h-4 w-4 animate-spin text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold">Thinking through the next question</p>
                        <p className="text-xs text-muted-foreground">I’m checking what is still missing before I plan.</p>
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>

          <div className="border-t-2 border-border bg-background/90 p-4">
            <form
              onSubmit={(event) => {
                event.preventDefault();
                void handleSubmit();
              }}
              className="space-y-3"
            >
              <Textarea
                className="min-h-28 resize-none border-2 border-border bg-background p-4 text-sm shadow-xs outline-none placeholder:text-muted-foreground/45"
                placeholder="Describe the problem, goal, or task here..."
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    void handleSubmit();
                  }
                }}
              />

              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <CheckCircle2 className="h-3.5 w-3.5 text-chart-4" />
                  {activeConversationState === "planned"
                    ? "A plan is ready. Open it to review and execute."
                    : "I will keep asking until I have enough to plan safely."}
                </div>

                <Button type="submit" className="border-2 border-border shadow-sm" disabled={isSending || !draft.trim()}>
                  {isSending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Sending
                    </>
                  ) : (
                    <>
                      <Send className="mr-2 h-4 w-4" />
                      Send
                    </>
                  )}
                </Button>
              </div>
            </form>

            {loadError && (
              <div className="mt-3 flex items-start gap-2 border-2 border-destructive/30 bg-destructive/5 p-3 text-xs text-destructive">
                <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                {loadError}
              </div>
            )}
          </div>
        </section>

        <ConversationSideRail
          missingInfo={conversation?.missing_info ?? []}
          stateLabel={conversationStatusLabel(activeConversationState)}
          messageCount={visibleMessages.length}
          planId={conversation?.plan_id ?? null}
          onOpenPlan={() => {
            if (conversation?.plan_id) {
              navigate(`/app/plan/${conversation.plan_id}`);
            }
          }}
        />
      </div>
    </div>
  );
}