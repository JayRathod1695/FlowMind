import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertCircle,
  ArrowRight,
  Clock3,
  FileText,
  History,
  Loader2,
  RefreshCw,
  Sparkles,
} from "lucide-react";

import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { getChat, getChats, type ChatListItem, type ChatRecord } from "@/lib/api";

const HISTORY_LIMIT = 40;

function formatDateTime(value: string | null | undefined): string {
  if (!value) {
    return "—";
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function statusTone(status: string): string {
  switch (status) {
    case "completed":
      return "text-chart-4 bg-chart-4/10 border-chart-4/30";
    case "failed":
      return "text-destructive bg-destructive/10 border-destructive/30";
    case "pending":
      return "text-primary bg-primary/10 border-primary/30";
    default:
      return "text-muted-foreground bg-muted/60 border-border";
  }
}

function formatJson(value: Record<string, unknown> | null): string {
  return value ? JSON.stringify(value, null, 2) : "";
}

export default function ChatHistoryPage() {
  const navigate = useNavigate();
  const [chats, setChats] = useState<ChatListItem[]>([]);
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [selectedChat, setSelectedChat] = useState<ChatRecord | null>(null);
  const [isLoadingChats, setIsLoadingChats] = useState(true);
  const [isLoadingChatDetail, setIsLoadingChatDetail] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadChats = useCallback(async (showSpinner = true) => {
    if (showSpinner) {
      setIsLoadingChats(true);
    }

    setLoadError(null);

    try {
      const items = await getChats(HISTORY_LIMIT);
      setChats(items);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to load chat history.";
      setLoadError(message);
      setChats([]);
    } finally {
      setIsLoadingChats(false);
    }
  }, []);

  const handleSelectChat = async (chatId: string) => {
    setSelectedChatId(chatId);
    setIsLoadingChatDetail(true);
    setLoadError(null);

    try {
      const chat = await getChat(chatId);
      setSelectedChat(chat);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to load chat details.";
      setSelectedChat(null);
      setLoadError(message);
    } finally {
      setIsLoadingChatDetail(false);
    }
  };

  const handleRefresh = async () => {
    await loadChats(true);
    if (selectedChatId) {
      await handleSelectChat(selectedChatId);
    }
  };

  useEffect(() => {
    let isMounted = true;

    const bootstrap = async () => {
      if (!isMounted) {
        return;
      }

      await loadChats(true);
    };

    void bootstrap();

    const intervalId = window.setInterval(() => {
      void loadChats(false);
    }, 15000);

    return () => {
      isMounted = false;
      window.clearInterval(intervalId);
    };
  }, [loadChats]);

  return (
    <div className="h-full w-full overflow-hidden p-4 md:p-6">
      <div className="mx-auto flex h-full max-w-7xl flex-col gap-6">
        <div className="flex items-start justify-between gap-4 rounded-[28px] border-2 border-border bg-card px-5 py-4 shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-muted/60 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              Chat history
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight">History</h1>
              <p className="text-sm text-muted-foreground">
                Review past runs, inspect their plan metadata, and jump back into a plan if one exists.
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <Button variant="outline" className="border-2 border-border" onClick={() => void navigate("/app") }>
              Back to chat
            </Button>
            <Button className="border-2 border-border shadow-sm" onClick={() => void handleRefresh()}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh
            </Button>
          </div>
        </div>

        {loadError && (
          <div className="flex items-start gap-2 border-2 border-destructive/30 bg-destructive/5 p-3 text-xs text-destructive">
            <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            {loadError}
          </div>
        )}

        <div className="grid min-h-0 flex-1 gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
          <section className="flex min-h-0 flex-col overflow-hidden rounded-[28px] border-2 border-border bg-card shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
            <div className="flex items-center justify-between gap-3 border-b-2 border-border px-5 py-4">
              <div>
                <h2 className="text-lg font-black tracking-tight">Recent chats</h2>
                <p className="text-sm text-muted-foreground">Select a row to inspect its stored plan and result payloads.</p>
              </div>
              <Badge variant="outline" className="border-border">
                {chats.length} items
              </Badge>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.08),transparent_46%),linear-gradient(180deg,rgba(255,255,255,0.72),rgba(255,255,255,0.96))] p-4 dark:bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.12),transparent_46%),linear-gradient(180deg,rgba(2,6,23,0.2),rgba(2,6,23,0.45))]">
              {isLoadingChats ? (
                <div className="flex h-full min-h-80 items-center justify-center">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : chats.length === 0 ? (
                <div className="flex h-full min-h-80 flex-col items-center justify-center gap-3 rounded-3xl border-2 border-dashed border-border bg-background/80 p-6 text-center">
                  <FileText className="h-6 w-6 text-primary" />
                  <div className="space-y-1">
                    <p className="text-sm font-semibold">No chat records yet</p>
                    <p className="text-xs text-muted-foreground">Run a conversation or plan from the chat surface and the history will appear here.</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {chats.map((chat) => {
                    const isSelected = selectedChatId === chat.id;
                    return (
                      <button
                        key={chat.id}
                        type="button"
                        onClick={() => void handleSelectChat(chat.id)}
                        className={`w-full rounded-2xl border-2 px-4 py-3 text-left transition-all ${
                          isSelected
                            ? "border-primary bg-primary/5 shadow-sm"
                            : "border-border bg-card hover:-translate-y-0.5 hover:bg-muted/40"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 space-y-1">
                            <div className="flex items-center gap-2">
                              <History className="h-3.5 w-3.5 text-primary" />
                              <span className="truncate text-xs font-semibold">{chat.prompt}</span>
                            </div>
                            <div className="text-[11px] text-muted-foreground">
                              {chat.plan_id ? `Plan ${chat.plan_id}` : "No plan generated yet"}
                            </div>
                          </div>
                          <span className={`shrink-0 border px-2 py-1 text-[10px] font-bold uppercase tracking-[0.18em] ${statusTone(chat.status)}`}>
                            {chat.status}
                          </span>
                        </div>

                        <div className="mt-2 flex items-center gap-2 text-[11px] text-muted-foreground">
                          <Clock3 className="h-3.5 w-3.5" />
                          <span>{formatDateTime(chat.created_at)}</span>
                        </div>

                        {chat.completed_at && (
                          <div className="mt-1 text-[11px] text-muted-foreground">Completed {formatDateTime(chat.completed_at)}</div>
                        )}

                        {selectedChatId === chat.id && isLoadingChatDetail && (
                          <div className="mt-2 text-[11px] text-primary">Loading details...</div>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </section>

          <section className="flex min-h-0 flex-col overflow-hidden rounded-[28px] border-2 border-border bg-card shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
            {selectedChat ? (
              <>
                <div className="flex items-start justify-between gap-4 border-b-2 border-border px-5 py-4">
                  <div className="space-y-2">
                    <div className="inline-flex items-center gap-2 rounded-full border border-border bg-muted/60 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
                      <FileText className="h-3.5 w-3.5 text-primary" />
                      Chat details
                    </div>
                    <div>
                      <h2 className="text-xl font-black tracking-tight">{selectedChat.prompt}</h2>
                      <p className="text-sm text-muted-foreground">Inspect the plan JSON and the execution result stored for this chat.</p>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-2">
                    <span className={`border px-3 py-1.5 text-xs font-bold uppercase tracking-[0.18em] ${statusTone(selectedChat.status)}`}>
                      {selectedChat.status}
                    </span>
                    {selectedChat.plan_id && (
                      <Button
                        className="border-2 border-border shadow-sm"
                        onClick={() => void navigate(`/app/plan/${selectedChat.plan_id}`)}
                      >
                        Open plan
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.08),transparent_46%),linear-gradient(180deg,rgba(255,255,255,0.72),rgba(255,255,255,0.96))] p-5 dark:bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.12),transparent_46%),linear-gradient(180deg,rgba(2,6,23,0.2),rgba(2,6,23,0.45))]">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="rounded-3xl border-2 border-border bg-card p-4 shadow-xs">
                      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Overview</p>
                      <div className="mt-3 space-y-3 text-sm">
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-muted-foreground">Plan ID</span>
                          <span className="font-semibold">{selectedChat.plan_id ?? "—"}</span>
                        </div>
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-muted-foreground">Created</span>
                          <span className="font-semibold">{formatDateTime(selectedChat.created_at)}</span>
                        </div>
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-muted-foreground">Completed</span>
                          <span className="font-semibold">{formatDateTime(selectedChat.completed_at)}</span>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-3xl border-2 border-border bg-card p-4 shadow-xs">
                      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Stored prompt</p>
                      <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-foreground">{selectedChat.prompt}</p>
                    </div>
                  </div>

                  <div className="mt-5 space-y-4">
                    <div className="rounded-3xl border-2 border-border bg-card p-4 shadow-xs">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Plan metadata</p>
                          <p className="text-sm text-muted-foreground">JSON stored with the chat record after planning.</p>
                        </div>
                        <Badge variant="outline" className="border-border">
                          {selectedChat.plan_json ? "Captured" : "Empty"}
                        </Badge>
                      </div>

                      {selectedChat.plan_json ? (
                        <pre className="mt-3 max-h-80 overflow-auto rounded-2xl border border-border bg-muted/40 p-4 text-xs leading-6 text-foreground whitespace-pre-wrap">
                          {formatJson(selectedChat.plan_json)}
                        </pre>
                      ) : (
                        <div className="mt-3 rounded-2xl border-2 border-dashed border-border bg-background/80 p-4 text-sm text-muted-foreground">
                          No plan JSON was captured for this record.
                        </div>
                      )}
                    </div>

                    <div className="rounded-3xl border-2 border-border bg-card p-4 shadow-xs">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Result metadata</p>
                          <p className="text-sm text-muted-foreground">Execution output saved when the run completes or fails.</p>
                        </div>
                        <Badge variant="outline" className="border-border">
                          {selectedChat.result_json ? "Captured" : "Empty"}
                        </Badge>
                      </div>

                      {selectedChat.result_json ? (
                        <pre className="mt-3 max-h-80 overflow-auto rounded-2xl border border-border bg-muted/40 p-4 text-xs leading-6 text-foreground whitespace-pre-wrap">
                          {formatJson(selectedChat.result_json)}
                        </pre>
                      ) : (
                        <div className="mt-3 rounded-2xl border-2 border-dashed border-border bg-background/80 p-4 text-sm text-muted-foreground">
                          No result JSON was captured for this record.
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex h-full min-h-80 flex-col items-center justify-center gap-4 px-6 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl border-2 border-border bg-primary/10 text-primary">
                  <FileText className="h-5 w-5" />
                </div>
                <div className="space-y-2">
                  <h2 className="text-xl font-black tracking-tight">Select a chat to inspect</h2>
                  <p className="max-w-lg text-sm leading-6 text-muted-foreground">
                    The detail view will show the stored plan payload, execution result payload, and timing information for the selected chat.
                  </p>
                </div>
                <Button variant="outline" className="border-2 border-border" onClick={() => void navigate("/app") }>
                  Back to chat
                </Button>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}