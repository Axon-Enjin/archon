"use client";

import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useRef, Suspense } from "react";
import Link from "next/link";
import { Search, Zap, AlertTriangle, ArrowLeft, ArrowRight, Banknote, Wrench } from "lucide-react";

interface Message {
  id: string;
  role: "user" | "assistant" | "system";
  content_scrubbed: string;
  ts: string;
}

interface TicketItem {
  id: string;
  ticket_id: string;
  status: "Open" | "Pending Agent" | "Resolved";
}

function StudentChatContent() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const ticketId = searchParams.get("ticketId");

  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [ticketDetails, setTicketDetails] = useState<TicketItem | null>(null);

  const [streamedMessages, setStreamedMessages] = useState<Record<string, string>>({});
  const [activeStreamingId, setActiveStreamingId] = useState<string | null>(null);
  const [currentExecutingTool, setCurrentExecutingTool] = useState<string | null>(null);
  const [visibleToolCalls, setVisibleToolCalls] = useState<string[]>([]);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const parseMessageContent = (content: string): { text: string; toolCalls: string[] } => {
    try {
      const parsed = JSON.parse(content) as { text?: string; toolCalls?: string[] };
      if (parsed && typeof parsed === "object" && typeof parsed.text === "string") {
        return {
          text: parsed.text,
          toolCalls: parsed.toolCalls || [],
        };
      }
    } catch {
      // no-op
    }
    return { text: content, toolCalls: [] };
  };

  const fetchTicketAndMessages = async () => {
    if (!ticketId || !session?.user?.entra_oid) return;

    try {
      setLoading(true);
      const [ticketRes, messagesRes] = await Promise.all([
        fetch(`/api/v1/tickets?studentId=${session.user.entra_oid}`),
        fetch(`/api/v1/tickets/${ticketId}/messages`),
      ]);

      const [ticketData, messagesData] = await Promise.all([
        ticketRes.json(),
        messagesRes.json(),
      ]);

      if (ticketData.success) {
        const found = (ticketData.data as TicketItem[]).find((t) => t.id === ticketId);
        setTicketDetails(found || null);
      }
      if (messagesData.success) {
        setMessages(messagesData.data as Message[]);
      }
    } catch (err) {
      console.error("Error loading chat messages:", err);
    } finally {
      setLoading(false);
    }
  };

  const animateStreaming = async (msg: Message) => {
    const { text, toolCalls } = parseMessageContent(msg.content_scrubbed);
    setActiveStreamingId(msg.id);
    setSending(false);

    if (toolCalls.length > 0) {
      for (const tool of toolCalls) {
        setCurrentExecutingTool(tool);
        setVisibleToolCalls((prev) => [...prev, tool]);
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
      setCurrentExecutingTool(null);
    }

    const words = text.split(" ");
    for (let i = 0; i < words.length; i++) {
      const currentText = words.slice(0, i + 1).join(" ");
      setStreamedMessages((prev) => ({
        ...prev,
        [msg.id]: currentText,
      }));
      scrollToBottom();
      await new Promise((resolve) => setTimeout(resolve, 50 + Math.random() * 30));
    }

    setActiveStreamingId(null);
    setVisibleToolCalls([]);
  };

  const handleSendMessage = async (textToSend?: string) => {
    const messageText = textToSend || inputValue;
    if (!messageText.trim() || sending || activeStreamingId || !ticketId) return;

    setSending(true);
    if (!textToSend) setInputValue("");

    const now = Date.now();
    const tempUserMsg: Message = {
      id: `temp-${now}`,
      role: "user",
      content_scrubbed: messageText,
      ts: new Date(now).toISOString(),
    };
    setMessages((prev) => [...prev, tempUserMsg]);

    try {
      const res = await fetch(`/api/v1/tickets/${ticketId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: messageText }),
      });
      const data = await res.json();
      if (data.success) {
        const msgRes = await fetch(`/api/v1/tickets/${ticketId}/messages`);
        const msgData = await msgRes.json();
        if (msgData.success) {
          const newMessages = msgData.data as Message[];
          const existingIds = new Set(messages.map((m) => m.id));
          const newAssistantMsg = newMessages.find((m) => m.role === "assistant" && !existingIds.has(m.id));

          if (newAssistantMsg) {
            setMessages(newMessages);
            await animateStreaming(newAssistantMsg);
          } else {
            setMessages(newMessages);
          }
        }
      }
    } catch (err) {
      console.error("Failed to send message:", err);
      setSending(false);
    } finally {
      if (session?.user?.entra_oid) {
        const ticketRes = await fetch(`/api/v1/tickets?studentId=${session.user.entra_oid}`);
        const ticketData = await ticketRes.json();
        if (ticketData.success) {
          const found = (ticketData.data as TicketItem[]).find((t) => t.id === ticketId);
          setTicketDetails(found || null);
        }
      }
    }
  };

  const getToolCallLabel = (tool: string) => {
    switch (tool) {
      case "CheckStudentHolds":
        return "🔍 Checking your registrar hold records...";
      case "CheckFinancialAidStatus":
        return "💵 Checking your CHED UniFAST grant status...";
      case "requestHoldLift":
        return "⚡ Submitting request for temporary financial hold lift...";
      case "EscalateToHuman":
        return "🚨 Routing your chat to the support queue...";
      default:
        return `🛠️ Running tool: ${tool}...`;
    }
  };

  useEffect(() => {
    if (status === "unauthenticated" || !ticketId) {
      router.push("/student");
      return;
    }
    if (session?.user) {
      const timer = setTimeout(() => {
        void fetchTicketAndMessages();
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [session, status, ticketId, router]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, streamedMessages]);

  if (loading || status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-brand-surface">
        <div className="text-center">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-brand-primary border-t-transparent mx-auto"></div>
          <p className="mt-4 text-sm text-brand-muted">Connecting you to Archon Desk...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-brand-surface font-sans">
      <header className="bg-white border-b border-zinc-200 px-6 py-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <Link
            href="/student"
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-200 text-brand-text hover:bg-zinc-50 font-bold"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold font-display text-brand-text">Archon AI Help Desk</h1>
              <span className="text-[10px] bg-zinc-100 font-mono font-semibold text-brand-muted px-2 py-0.5 rounded">
                {ticketDetails?.ticket_id}
              </span>
            </div>
            <p className="text-xs text-brand-muted">
              Status:{" "}
              <span
                className={`font-semibold ${
                  ticketDetails?.status === "Open"
                    ? "text-green-600"
                    : ticketDetails?.status === "Pending Agent"
                    ? "text-amber-600"
                    : "text-zinc-500"
                }`}
              >
                {ticketDetails?.status || "Open"}
              </span>
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse"></span>
          <span className="text-xs font-semibold text-brand-primary font-display">AI Agent Active</span>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-6 space-y-6 max-w-3xl w-full mx-auto">
        {messages.map((msg) => {
          const isUser = msg.role === "user";
          const { text, toolCalls } = parseMessageContent(msg.content_scrubbed);
          const isStreaming = msg.id === activeStreamingId;
          const displayText = isStreaming ? (streamedMessages[msg.id] || "") : text;
          const displayToolCalls = isStreaming ? visibleToolCalls : toolCalls;

          return (
            <div key={msg.id} className={`flex ${isUser ? "justify-end" : "justify-start"} gap-3`}>
              {!isUser && (
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-primary text-white font-extrabold text-sm shadow-sm font-display">
                  A
                </div>
              )}
              <div className="space-y-2 max-w-[80%]">
                {displayToolCalls.length > 0 && (
                  <div className="space-y-1">
                    {displayToolCalls.map((tool, idx) => {
                      const isToolExecuting = isStreaming && tool === currentExecutingTool;
                      return (
                        <div
                          key={`${tool}-${idx}`}
                          className={`rounded-lg bg-brand-primary-light/40 border border-brand-primary-light px-3 py-1.5 text-xs text-brand-primary font-medium flex items-center justify-between gap-2 ${
                            isToolExecuting ? "animate-pulse ring-1 ring-brand-primary/30" : ""
                          }`}
                        >
                          <span>{getToolCallLabel(tool)}</span>
                          {isToolExecuting && (
                            <span className="h-3 w-3 rounded-full border-2 border-brand-primary border-t-transparent animate-spin shrink-0"></span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {displayText || !isStreaming ? (
                  <div
                    className={`p-4 leading-relaxed text-sm shadow-sm ${
                      isUser
                        ? "bg-white text-brand-text border border-zinc-100 rounded-[20px] rounded-br-[4px]"
                        : "bg-brand-primary-light text-brand-text rounded-[20px] rounded-bl-[4px]"
                    }`}
                  >
                    <p className="whitespace-pre-line">
                      {displayText}
                      {isStreaming && (
                        <span className="inline-block w-1.5 h-4 ml-1 bg-brand-primary animate-pulse align-middle"></span>
                      )}
                    </p>
                  </div>
                ) : (
                  isStreaming && (
                    <div className="rounded-[20px] rounded-bl-[4px] bg-brand-primary-light p-4 max-w-[80%] flex items-center gap-1.5 shadow-sm">
                      <span className="h-2 w-2 rounded-full bg-brand-primary animate-bounce"></span>
                      <span className="h-2 w-2 rounded-full bg-brand-primary animate-bounce [animation-delay:0.2s]"></span>
                      <span className="h-2 w-2 rounded-full bg-brand-primary animate-bounce [animation-delay:0.4s]"></span>
                    </div>
                  )
                )}
                <span className="text-[10px] text-brand-muted block text-right px-1">
                  {new Date(msg.ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>
            </div>
          );
        })}

        {sending && (
          <div className="flex justify-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-primary text-white font-extrabold text-sm shadow-sm">
              A
            </div>
            <div className="rounded-[20px] rounded-bl-[4px] bg-brand-primary-light p-4 max-w-[80%] flex items-center gap-1.5 shadow-sm">
              <span className="h-2 w-2 rounded-full bg-brand-primary animate-bounce"></span>
              <span className="h-2 w-2 rounded-full bg-brand-primary animate-bounce [animation-delay:0.2s]"></span>
              <span className="h-2 w-2 rounded-full bg-brand-primary animate-bounce [animation-delay:0.4s]"></span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </main>

      {messages.length > 0 && !sending && !activeStreamingId && ticketDetails?.status === "Open" && (
        <section className="shrink-0 bg-zinc-50 border-t border-zinc-100 py-3 px-6 overflow-x-auto">
          <div className="max-w-3xl mx-auto flex gap-2 whitespace-nowrap">
            <button
              onClick={() => handleSendMessage("Why do I have an enrollment hold?")}
              className="rounded-full bg-white border border-zinc-200 px-4 py-1.5 text-xs font-semibold text-brand-primary hover:border-brand-primary transition"
            >
              🔍 Why do I have a hold?
            </button>
            <button
              onClick={() => handleSendMessage("Please lift my financial hold.")}
              className="rounded-full bg-white border border-zinc-200 px-4 py-1.5 text-xs font-semibold text-brand-primary hover:border-brand-primary transition"
            >
              ⚡ Request hold lift
            </button>
            <button
              onClick={() => handleSendMessage("I want to talk to a support agent.")}
              className="rounded-full bg-white border border-zinc-200 px-4 py-1.5 text-xs font-semibold text-brand-primary hover:border-brand-primary transition"
            >
              🚨 Talk to support
            </button>
          </div>
        </section>
      )}

      <footer className="bg-white border-t border-zinc-200 p-4 shrink-0">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void handleSendMessage();
          }}
          className="max-w-3xl mx-auto flex items-center bg-brand-surface rounded-full border border-zinc-200 px-4 py-1 shadow-sm focus-within:ring-2 focus-within:ring-brand-primary/20"
        >
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            disabled={sending || ticketDetails?.status === "Resolved"}
            placeholder={
              ticketDetails?.status === "Resolved"
                ? "This ticket is closed."
                : "Ask about holds, balances, or deadlines..."
            }
            className="flex-1 bg-transparent px-2 py-3 text-sm focus:outline-none disabled:opacity-50 font-sans"
          />
          <button
            type="submit"
            disabled={!inputValue.trim() || sending || ticketDetails?.status === "Resolved"}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-primary text-white shadow hover:bg-teal-700 disabled:opacity-50 transition shrink-0 font-display"
          >
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>
      </footer>
    </div>
  );
}

export default function StudentChat() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-brand-surface">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-brand-primary border-t-transparent mx-auto"></div>
          <p className="mt-4 text-sm text-brand-muted">Reloading AI Chat Desk...</p>
        </div>
      }
    >
      <StudentChatContent />
    </Suspense>
  );
}
