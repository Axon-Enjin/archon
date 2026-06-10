"use client";

import { signIn, useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useRef, Suspense } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, ArrowRight, Calendar, AlertOctagon, FileText } from "lucide-react";
import MarkdownText from "@/components/MarkdownText";

interface Message {
  id: string;
  role: "user" | "assistant" | "system";
  content_scrubbed: string;
  ts: string;
}

interface CalendarEventPayload {
  id: string;
  title: string;
  start: string;
  end: string;
  isAllDay: boolean;
  source: string;
}

interface AssistantAction {
  type: "launch_appeal_wizard";
  label: string;
  href: string;
}

type CalendarState =
  | "ready"
  | "empty"
  | "consent_required"
  | "token_missing"
  | "disabled"
  | "unavailable";

interface TicketItem {
  id: string;
  ticket_id: string;
  status: "Open" | "Pending Agent" | "Resolved";
  satisfaction?: {
    rating: "positive" | "negative";
    score: number;
    comment?: string;
    submitted_at: string;
  };
}

function formatCalendarEventRange(event: CalendarEventPayload): string {
  const start = new Date(event.start);
  const end = new Date(event.end);

  if (event.isAllDay) {
    return start.toLocaleDateString([], {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  }

  const sameDay = start.toDateString() === end.toDateString();
  const startLabel = start.toLocaleString([], {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

  if (sameDay) {
    return `${startLabel} - ${end.toLocaleTimeString([], {
      hour: "numeric",
      minute: "2-digit",
    })}`;
  }

  return `${startLabel} - ${end.toLocaleString([], {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })}`;
}

function getCalendarStateMeta(state: Exclude<CalendarState, "ready">) {
  switch (state) {
    case "empty":
      return {
        title: "No upcoming calendar events",
        description: "Your Outlook Calendar is connected, but there are no events in the upcoming window.",
      };
    case "consent_required":
      return {
        title: "Reconnect Microsoft 365",
        description: "Your calendar needs fresh consent before Archon can load schedule data in chat.",
      };
    case "token_missing":
      return {
        title: "Session expired for calendar access",
        description: "Reconnect Microsoft 365 so Archon can read your Outlook schedule again.",
      };
    case "disabled":
      return {
        title: "Calendar integration unavailable",
        description: "M365 calendar access is temporarily disabled by configuration.",
      };
    case "unavailable":
      return {
        title: "Calendar data could not load",
        description: "Archon could not fetch your Outlook schedule right now. Please try again shortly.",
      };
  }
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
  const [csatSubmitting, setCsatSubmitting] = useState(false);

  const [streamedMessages, setStreamedMessages] = useState<Record<string, string>>({});
  const [activeStreamingId, setActiveStreamingId] = useState<string | null>(null);
  const [currentExecutingTool, setCurrentExecutingTool] = useState<string | null>(null);
  const [visibleToolCalls, setVisibleToolCalls] = useState<string[]>([]);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const parseMessageContent = (content: string): {
    text: string;
    toolCalls: string[];
    calendarEvents: CalendarEventPayload[];
    calendarState?: CalendarState;
    actions: AssistantAction[];
  } => {
    try {
      const parsed = JSON.parse(content) as {
        text?: string;
        toolCalls?: string[];
        calendarEvents?: CalendarEventPayload[];
        calendarState?: CalendarState;
        actions?: AssistantAction[];
      };
      if (parsed && typeof parsed === "object" && typeof parsed.text === "string") {
        return {
          text: parsed.text,
          toolCalls: parsed.toolCalls || [],
          calendarEvents: Array.isArray(parsed.calendarEvents) ? parsed.calendarEvents : [],
          calendarState: parsed.calendarState,
          actions: Array.isArray(parsed.actions) ? parsed.actions : [],
        };
      }
    } catch {
      // no-op
    }
    return { text: content, toolCalls: [], calendarEvents: [], actions: [] };
  };

  const consumeAssistantStream = async (res: Response, assistantTempId: string) => {
    // Insert a live placeholder bubble the server stream will fill in.
    const placeholder: Message = {
      id: assistantTempId,
      role: "assistant",
      content_scrubbed: JSON.stringify({ text: "", toolCalls: [] }),
      ts: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, placeholder]);
    setActiveStreamingId(assistantTempId);
    setStreamedMessages((prev) => ({ ...prev, [assistantTempId]: "" }));
    setVisibleToolCalls([]);
    setCurrentExecutingTool(null);
    setSending(false);

    const reader = res.body!.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let accumulated = "";

    const handleEvent = (event: string, dataStr: string) => {
      let data: { tool?: string; token?: string; data?: Message };
      try {
        data = JSON.parse(dataStr);
      } catch {
        return;
      }
      if (event === "tool" && data.tool) {
        setCurrentExecutingTool(data.tool);
        setVisibleToolCalls((prev) => [...prev, data.tool as string]);
      } else if (event === "token" && typeof data.token === "string") {
        accumulated += data.token;
        setCurrentExecutingTool(null);
        setStreamedMessages((prev) => ({ ...prev, [assistantTempId]: accumulated }));
        scrollToBottom();
      } else if (event === "done" && data.data) {
        const real = data.data;
        setMessages((prev) => prev.map((m) => (m.id === assistantTempId ? real : m)));
        setActiveStreamingId(null);
        setVisibleToolCalls([]);
        setCurrentExecutingTool(null);
      }
    };

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const frames = buffer.split("\n\n");
      buffer = frames.pop() || "";
      for (const frame of frames) {
        let event = "message";
        let dataStr = "";
        for (const line of frame.split("\n")) {
          if (line.startsWith("event:")) event = line.slice(6).trim();
          else if (line.startsWith("data:")) dataStr += line.slice(5).trim();
        }
        if (dataStr) handleEvent(event, dataStr);
      }
    }

    // Safety: never leave the UI stuck in a streaming state.
    setActiveStreamingId((cur) => (cur === assistantTempId ? null : cur));
    setVisibleToolCalls([]);
    setCurrentExecutingTool(null);
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
    const assistantTempId = `temp-assistant-${now}`;

    try {
      const res = await fetch(`/api/v1/tickets/${ticketId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "text/event-stream" },
        body: JSON.stringify({ content: messageText }),
      });

      const contentType = res.headers.get("content-type") || "";
      if (res.body && contentType.includes("text/event-stream")) {
        await consumeAssistantStream(res, assistantTempId);
      } else {
        // Fallback (non-streaming server): re-fetch and reveal the reply.
        const data = await res.json();
        if (data.success) {
          const msgRes = await fetch(`/api/v1/tickets/${ticketId}/messages`);
          const msgData = await msgRes.json();
          if (msgData.success) {
            setMessages(msgData.data as Message[]);
          }
        }
        setSending(false);
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
      case "CheckTuitionBalance":
        return "🧾 Checking your tuition and billing summary...";
      case "CheckFinancialAidStatus":
        return "💵 Checking your CHED UniFAST grant status...";
      case "GetCalendarEvents":
        return "📅 Fetching your Outlook Calendar events...";
      case "GetCourseSchedule":
        return "📚 Pulling up your class schedule...";
      case "GetTransactionHistory":
        return "🧾 Reviewing your recent account activity...";
      case "AttemptAutonomousResolution":
        return "🧠 Running autonomous resolution attempt...";
      case "requestHoldLift":
        return "⚡ Submitting request for temporary financial hold lift...";
      case "EscalateToHuman":
        return "🚨 Routing your chat to the support queue...";
      case "ZeroTouchWrapUp":
        return "✅ Finalizing resolution summary and wrap-up artifacts...";
      default:
        return `🛠️ Running tool: ${tool}...`;
    }
  };

  const handleReconnectM365 = async () => {
    await signIn("azure-ad", {
      callbackUrl: ticketId ? `/student/chat?ticketId=${ticketId}` : "/student",
      prompt: "consent",
    });
  };

  const handleSubmitCsat = async (rating: "positive" | "negative") => {
    if (!ticketId || csatSubmitting || ticketDetails?.satisfaction) return;
    setCsatSubmitting(true);
    try {
      const res = await fetch(`/api/v1/tickets/${ticketId}/satisfaction`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating }),
      });
      const data = await res.json();
      if (data.success) {
        setTicketDetails((prev) => (prev ? { ...prev, satisfaction: data.data } : prev));
      }
    } catch (err) {
      console.error("Failed to submit satisfaction:", err);
    } finally {
      setCsatSubmitting(false);
    }
  };

  useEffect(() => {
    if (status === "unauthenticated" || !ticketId) {
      router.push("/student");
      return;
    }
    if (!session?.user?.entra_oid) return;

    const studentOid = session.user.entra_oid;
    const timer = setTimeout(() => {
      void (async () => {
        try {
          setLoading(true);
          const [ticketRes, messagesRes] = await Promise.all([
            fetch(`/api/v1/tickets?studentId=${studentOid}`),
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
      })();
    }, 0);

    return () => clearTimeout(timer);
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
    <div className="flex flex-col h-screen bg-brand-surface font-sans relative overflow-hidden">
      {/* Background organic gradients */}
      <div className="absolute top-0 left-0 w-full h-64 bg-gradient-to-b from-white/60 to-transparent pointer-events-none"></div>
      <div className="absolute bottom-0 left-0 w-full h-48 bg-gradient-to-t from-white/80 to-transparent pointer-events-none"></div>

      {/* Floating Header */}
      <header className="px-6 pt-8 pb-4 flex items-center justify-between shrink-0 max-w-4xl mx-auto w-full relative z-10">
        <div className="flex items-center gap-4">
          <Link
            href="/student"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white border border-[#E3DFD5] text-brand-text hover:border-brand-primary hover:text-brand-primary shadow-sm transition-all hover:-translate-y-0.5"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-2xl font-bold font-display text-brand-text tracking-tight">Archon AI Help Desk</h1>
              <span className="text-[10px] bg-white border border-[#E3DFD5] shadow-sm font-mono font-bold tracking-widest text-brand-muted px-2 py-0.5 rounded-full uppercase">
                {ticketDetails?.ticket_id}
              </span>
            </div>
            <p className="text-xs font-mono tracking-widest text-brand-muted uppercase">
              Status:{" "}
              <span
                className={`font-bold ${
                  ticketDetails?.status === "Open"
                    ? "text-brand-success"
                    : ticketDetails?.status === "Pending Agent"
                    ? "text-brand-warning"
                    : "text-brand-muted"
                }`}
              >
                {ticketDetails?.status || "Open"}
              </span>
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-full border border-[#E3DFD5] shadow-sm">
          <span className="h-2 w-2 rounded-full bg-brand-success animate-pulse"></span>
          <span className="text-[10px] uppercase tracking-widest font-bold text-brand-primary font-mono">Agent Active</span>
        </div>
      </header>

      {/* Chat Area */}
      <main className="flex-1 overflow-y-auto px-6 py-4 space-y-4 max-w-3xl w-full mx-auto relative z-10 scrollbar-hide">
        {messages.map((msg) => {
          const isUser = msg.role === "user";
          const { text, toolCalls, calendarEvents, calendarState, actions } = parseMessageContent(msg.content_scrubbed);
          const isStreaming = msg.id === activeStreamingId;
          const displayText = isStreaming ? (streamedMessages[msg.id] || "") : text;
          const displayToolCalls = isStreaming ? visibleToolCalls : toolCalls;

          return (
            <div key={msg.id} className={`flex ${isUser ? "justify-end" : "justify-start"} gap-3 group animate-fade-in`}>
              {!isUser && (
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-primary overflow-hidden shadow-sm border border-brand-primary/20">
                  <Image src="/archon.svg" alt="Archon AI" width={40} height={40} className="w-full h-full object-cover" />
                </div>
              )}
              <div className={`space-y-1.5 max-w-[85%] ${isUser ? "items-end flex flex-col" : "items-start flex flex-col"}`}>
                {displayToolCalls.length > 0 && (
                  <div className="space-y-1.5 w-full">
                    {displayToolCalls.map((tool, idx) => {
                      const isToolExecuting = isStreaming && tool === currentExecutingTool;
                      return (
                        <div
                          key={`${tool}-${idx}`}
                          className={`rounded-full bg-white/60 backdrop-blur-md border border-[#E3DFD5] px-4 py-2 text-[11px] text-brand-primary font-mono tracking-wide flex items-center gap-3 w-fit shadow-sm ${
                            isToolExecuting ? "animate-pulse border-brand-primary/40" : ""
                          }`}
                        >
                          {isToolExecuting && (
                            <span className="h-3 w-3 rounded-full border-2 border-brand-primary border-t-transparent animate-spin shrink-0"></span>
                          )}
                          <span>{getToolCallLabel(tool)}</span>
                        </div>
                      );
                    })}
                  </div>
                )}

                {displayText || !isStreaming ? (
                  <div
                    className={`px-5 py-3.5 leading-relaxed text-[15px] shadow-sm ${
                      isUser
                        ? "bg-white text-brand-text border border-[#E3DFD5] rounded-[24px] rounded-br-sm"
                        : "bg-brand-primary-light/40 text-brand-text border border-brand-primary/10 rounded-[24px] rounded-bl-sm"
                    }`}
                  >
                    <MarkdownText text={displayText} showCursor={isStreaming} />
                  </div>
                ) : (
                  isStreaming && (
                    <div className="rounded-[24px] rounded-bl-sm bg-brand-primary-light/40 border border-brand-primary/10 px-5 py-4 flex items-center gap-1.5 shadow-sm w-fit">
                      <span className="h-2 w-2 rounded-full bg-brand-primary animate-bounce"></span>
                      <span className="h-2 w-2 rounded-full bg-brand-primary animate-bounce [animation-delay:0.2s]"></span>
                      <span className="h-2 w-2 rounded-full bg-brand-primary animate-bounce [animation-delay:0.4s]"></span>
                    </div>
                  )
                )}

                {!isUser && calendarEvents.length > 0 && (
                  <div className="rounded-[1.5rem] border border-[#E3DFD5] bg-white p-5 shadow-sm mt-2 w-full max-w-md">
                    <div className="mb-4 flex items-center justify-between gap-3">
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-brand-m365 font-mono mb-1">
                          Outlook Schedule
                        </p>
                        <p className="text-base font-bold text-brand-text font-display leading-tight">
                          {calendarEvents.length} upcoming event{calendarEvents.length > 1 ? "s" : ""}
                        </p>
                      </div>
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-m365/10 text-brand-m365">
                        <Calendar className="w-4 h-4" />
                      </div>
                    </div>

                    <div className="space-y-2">
                      {calendarEvents.map((event) => (
                        <div
                          key={event.id}
                          className="rounded-xl border border-[#E3DFD5]/50 bg-brand-surface/50 px-4 py-3 hover:bg-zinc-50 transition-colors"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-sm font-bold text-brand-text font-display">{event.title}</p>
                              <p className="mt-0.5 text-[11px] text-brand-muted font-mono tracking-wide">
                                {formatCalendarEventRange(event)}
                              </p>
                            </div>
                            {event.isAllDay && (
                              <span className="rounded-full bg-white border border-[#E3DFD5] px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest text-brand-primary shadow-sm shrink-0">
                                All day
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {!isUser && calendarState && calendarState !== "ready" && (
                  <div className="rounded-[1.5rem] border border-[#E3DFD5] bg-white p-5 shadow-sm mt-2 w-full max-w-sm">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-50 text-amber-500">
                        <AlertOctagon className="w-4 h-4" />
                      </div>
                      <p className="text-base font-bold text-brand-text font-display">
                        {getCalendarStateMeta(calendarState).title}
                      </p>
                    </div>
                    <p className="text-sm text-brand-muted pl-11">
                      {getCalendarStateMeta(calendarState).description}
                    </p>

                    {(calendarState === "consent_required" || calendarState === "token_missing") && (
                      <button
                        type="button"
                        onClick={() => void handleReconnectM365()}
                        className="mt-4 ml-11 inline-flex items-center rounded-full bg-brand-m365 px-5 py-2 text-xs font-bold text-white shadow-sm transition-all hover:bg-blue-700 hover:-translate-y-0.5"
                      >
                        Reconnect Microsoft 365
                      </button>
                    )}
                  </div>
                )}

                {!isUser && !isStreaming && actions.map((action, idx) => (
                  <Link
                    key={`${action.type}-${idx}`}
                    href={action.href}
                    className="mt-2 inline-flex items-center gap-2 rounded-full bg-brand-primary px-5 py-2.5 text-xs font-bold text-white shadow-sm transition-all hover:bg-teal-700 hover:-translate-y-0.5 w-fit"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    {action.label}
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                ))}
                
                <span className={`text-[9px] text-brand-muted/70 font-mono tracking-widest uppercase px-2 opacity-0 group-hover:opacity-100 transition-opacity ${isUser ? "text-right" : "text-left"}`}>
                  {new Date(msg.ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>
            </div>
          );
        })}

        {sending && !activeStreamingId && (
          <div className="flex justify-start gap-3 animate-fade-in">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-primary overflow-hidden shadow-sm border border-brand-primary/20">
              <Image src="/archon.svg" alt="Archon AI" width={40} height={40} className="w-full h-full object-cover" />
            </div>
            <div className="rounded-[24px] rounded-bl-sm bg-brand-primary-light/40 border border-brand-primary/10 px-5 py-4 flex items-center gap-1.5 shadow-sm w-fit h-fit mt-1">
              <span className="h-2 w-2 rounded-full bg-brand-primary animate-bounce"></span>
              <span className="h-2 w-2 rounded-full bg-brand-primary animate-bounce [animation-delay:0.2s]"></span>
              <span className="h-2 w-2 rounded-full bg-brand-primary animate-bounce [animation-delay:0.4s]"></span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} className="h-4" />
      </main>

      {/* Floating Footer Area */}
      <div className="relative z-20 shrink-0 w-full max-w-3xl mx-auto px-6 pb-6 pt-2">
        {messages.length > 0 && !sending && !activeStreamingId && ticketDetails?.status === "Open" && (
          <div className="flex flex-wrap gap-2 mb-4 justify-center">
            <button
              onClick={() => handleSendMessage("Why do I have an enrollment hold?")}
              className="rounded-full bg-white/80 backdrop-blur border border-[#E3DFD5] px-4 py-2 text-xs font-bold text-brand-primary hover:border-brand-primary transition-all shadow-sm hover:shadow hover:-translate-y-0.5"
            >
              🔍 Why do I have a hold?
            </button>
            <button
              onClick={() => handleSendMessage("Show my upcoming M365 schedule.")}
              className="rounded-full bg-white/80 backdrop-blur border border-[#E3DFD5] px-4 py-2 text-xs font-bold text-brand-primary hover:border-brand-primary transition-all shadow-sm hover:shadow hover:-translate-y-0.5"
            >
              📅 Show my schedule
            </button>
            <button
              onClick={() => handleSendMessage("Please lift my financial hold.")}
              className="rounded-full bg-white/80 backdrop-blur border border-[#E3DFD5] px-4 py-2 text-xs font-bold text-brand-primary hover:border-brand-primary transition-all shadow-sm hover:shadow hover:-translate-y-0.5"
            >
              ⚡ Request hold lift
            </button>
            <button
              onClick={() => handleSendMessage("I want to talk to a support agent.")}
              className="rounded-full bg-white/80 backdrop-blur border border-[#E3DFD5] px-4 py-2 text-xs font-bold text-brand-primary hover:border-brand-primary transition-all shadow-sm hover:shadow hover:-translate-y-0.5"
            >
              🚨 Talk to support
            </button>
          </div>
        )}

        {ticketDetails?.status === "Resolved" && (
          <div className="mb-4 rounded-2xl border border-[#E3DFD5] bg-white px-5 py-4 shadow-sm">
            {ticketDetails.satisfaction ? (
              <p className="text-center text-sm font-semibold text-brand-text">
                {ticketDetails.satisfaction.rating === "positive" ? "🎉" : "🙏"} Thanks for your feedback!
              </p>
            ) : (
              <div className="flex flex-col items-center gap-3">
                <p className="text-sm font-semibold text-brand-text">Was this resolution helpful?</p>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    disabled={csatSubmitting}
                    onClick={() => void handleSubmitCsat("positive")}
                    className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-5 py-2 text-xs font-bold text-emerald-700 transition-all hover:-translate-y-0.5 hover:border-emerald-400 disabled:opacity-50"
                  >
                    👍 Yes, it helped
                  </button>
                  <button
                    type="button"
                    disabled={csatSubmitting}
                    onClick={() => void handleSubmitCsat("negative")}
                    className="inline-flex items-center gap-2 rounded-full border border-red-200 bg-red-50 px-5 py-2 text-xs font-bold text-red-700 transition-all hover:-translate-y-0.5 hover:border-red-400 disabled:opacity-50"
                  >
                    👎 Not really
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            void handleSendMessage();
          }}
          className="flex items-center bg-white rounded-full border border-[#E3DFD5] px-2 py-2 shadow-sm focus-within:ring-2 focus-within:ring-brand-primary/30 focus-within:border-brand-primary transition-all"
        >
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            disabled={sending || ticketDetails?.status === "Resolved"}
            placeholder={
              ticketDetails?.status === "Resolved"
                ? "This ticket is closed."
                : "Ask about holds, balances, schedules, or deadlines..."
            }
            className="flex-1 bg-transparent px-6 py-3 text-sm text-brand-text placeholder:text-brand-muted focus:outline-none disabled:opacity-50 font-sans"
          />
          <button
            type="submit"
            disabled={!inputValue.trim() || sending || ticketDetails?.status === "Resolved"}
            className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-primary text-white shadow-sm hover:bg-teal-700 disabled:opacity-50 transition-colors shrink-0 font-display ml-2"
          >
            <ArrowRight className="w-5 h-5" />
          </button>
        </form>
      </div>
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
