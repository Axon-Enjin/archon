"use client";

import { useSession } from "next-auth/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Inbox, Brain, Check, CheckCheck } from "lucide-react";
import MarkdownText from "@/components/MarkdownText";

interface TicketItem {
  id: string;
  ticket_id: string;
  student_id: string;
  status: "Open" | "Pending Agent" | "Resolved";
  created_at: string;
}

interface MessageItem {
  id: string;
  role: "user" | "assistant" | "system";
  content_scrubbed: string;
  ts: string;
}

interface HandoffPacket {
  handoff_packet: {
    student_profile: {
      name: string;
      student_id: string;
      major: string;
      year: string;
    };
    diagnosis: string;
    systems_queried: string[];
    actions_taken: string[];
    recommended_resolution: string;
    resolution_summary?: string;
    wrap_up_status?: "pending" | "completed";
  };
  agent_id?: string;
  resolved_at?: string;
}

export default function AdminQueuePage() {
  const { data: session } = useSession();
  const preselectedTicketId =
    typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("ticketId") : null;

  const [queue, setQueue] = useState<TicketItem[]>([]);
  const [queuePage, setQueuePage] = useState(1);
  const QUEUE_PER_PAGE = 5;
  const [selectedTicket, setSelectedTicket] = useState<TicketItem | null>(null);
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [handoff, setHandoff] = useState<HandoffPacket | null>(null);
  const [replyText, setReplyText] = useState("");
  const [loading, setLoading] = useState(true);
  const [ticketLoading, setTicketLoading] = useState(false);
  const [resolving, setResolving] = useState(false);
  const handledPreselectIds = useRef<Set<string>>(new Set());

  async function fetchQueue() {
    try {
      setLoading(true);
      const res = await fetch("/api/v1/tickets?type=queue");
      const data = await res.json();
      if (data.success) {
        setQueue(
          [...(data.data as TicketItem[])].sort(
            (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          )
        );
      }
    } catch (err) {
      console.error("Error loading admin queue:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (session?.user?.role === "Admin") {
      const initialTimer = setTimeout(() => {
        void fetchQueue();
      }, 0);
      return () => clearTimeout(initialTimer);
    }
  }, [session]);

  useEffect(() => {
    if (!preselectedTicketId || queue.length === 0) return;
    if (handledPreselectIds.current.has(preselectedTicketId)) return;

    const ticket = queue.find((item) => item.id === preselectedTicketId);
    if (!ticket) return;
    handledPreselectIds.current.add(preselectedTicketId);

    void (async () => {
      setSelectedTicket(ticket);
      setTicketLoading(true);
      setHandoff(null);
      setReplyText("");

      try {
        await fetchMessages(ticket.id);

        if (ticket.status === "Pending Agent") {
          const handoffRes = await fetch(`/api/v1/tickets/${ticket.id}/handoff`);
          const handoffData = await handoffRes.json();
          if (handoffData.success) {
            setHandoff(handoffData.data);
            setReplyText(handoffData.data.handoff_packet.recommended_resolution);
          }
        }
      } catch (err) {
        console.error("Error loading ticket details:", err);
      } finally {
        setTicketLoading(false);
      }
    })();
  }, [preselectedTicketId, queue]);

  const handleSelectTicket = async (ticket: TicketItem) => {
    setSelectedTicket(ticket);
    setTicketLoading(true);
    setHandoff(null);
    setReplyText("");

    try {
      await fetchMessages(ticket.id);

      if (ticket.status === "Pending Agent") {
        const handoffRes = await fetch(`/api/v1/tickets/${ticket.id}/handoff`);
        const handoffData = await handoffRes.json();
        if (handoffData.success) {
          setHandoff(handoffData.data);
          setReplyText(handoffData.data.handoff_packet.recommended_resolution);
        }
      }
    } catch (err) {
      console.error("Error loading ticket details:", err);
    } finally {
      setTicketLoading(false);
    }
  };

  const fetchMessages = useCallback(async (ticketId: string) => {
    const msgRes = await fetch(`/api/v1/tickets/${ticketId}/messages`);
    const msgData = await msgRes.json();
    if (msgData.success) setMessages(msgData.data);
  }, []);

  // Poll for new messages every 10 seconds while a ticket is open.
  useEffect(() => {
    if (!selectedTicket) return;
    const interval = setInterval(() => {
      void fetchMessages(selectedTicket.id);
    }, 10000);
    return () => clearInterval(interval);
  }, [selectedTicket, fetchMessages]);

  const handleSendMessage = async () => {
    if (!selectedTicket || !replyText.trim()) return;
    setResolving(true);
    try {
      await fetch(`/api/v1/tickets/${selectedTicket.id}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: `[Staff Reply - ${session?.user?.name || "Support Admin"}] ${replyText}`,
          resolve: false,
        }),
      });
      setReplyText("");
      await fetchMessages(selectedTicket.id);
    } catch (err) {
      console.error("Failed to send message:", err);
    } finally {
      setResolving(false);
    }
  };

  const handleCloseTicket = async (action: "approve" | "close") => {
    if (!selectedTicket) return;
    setResolving(true);
    try {
      if (replyText.trim()) {
        await fetch(`/api/v1/tickets/${selectedTicket.id}/messages`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            content: `[Staff Reply - ${session?.user?.name || "Support Admin"}] ${replyText}`,
            resolve: true,
          }),
        });
      }

      if (action === "approve") {
        await fetch(`/api/v1/student/${selectedTicket.student_id}/holds`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ holdId: "hold-academic", action: "lift" }),
        });
      }

      setSelectedTicket(null);
      await fetchQueue();
    } catch (err) {
      console.error("Failed to close ticket:", err);
    } finally {
      setResolving(false);
    }
  };

  const parseMessageContent = (content: string) => {
    try {
      const parsed = JSON.parse(content);
      if (parsed && typeof parsed === "object" && "text" in parsed) {
        return parsed.text as string;
      }
    } catch {}
    return content;
  };

  return (
    <main className="flex-1 flex overflow-hidden h-screen">
      {loading ? (
        <div className="flex flex-1 items-center justify-center bg-zinc-50">
          <div className="text-center">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-primary border-t-transparent mx-auto"></div>
            <p className="mt-3 text-xs text-brand-muted font-sans font-semibold">Loading queue tickets...</p>
          </div>
        </div>
      ) : (
        <>
          {/* Left pane: Queue List */}
          <section className="w-80 border-r border-zinc-200 bg-white flex flex-col shrink-0">
            <div className="p-6 border-b border-zinc-100">
              <h2 className="text-xl font-bold text-brand-text font-display">Support Queue</h2>
              <p className="text-xs text-brand-muted mt-1">{queue.length} Active Tickets Pending</p>
            </div>
            <div className="flex-1 overflow-y-auto divide-y divide-zinc-100 flex flex-col justify-between">
              <div>
                {queue
                  .slice((queuePage - 1) * QUEUE_PER_PAGE, queuePage * QUEUE_PER_PAGE)
                  .map((ticket) => (
                    <button
                      key={ticket.id}
                      onClick={() => handleSelectTicket(ticket)}
                      className={`w-full text-left p-4 hover:bg-zinc-50 transition flex flex-col gap-1.5 border-b border-zinc-100 ${
                        selectedTicket?.id === ticket.id ? "bg-brand-primary-light/20" : ""
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-mono text-brand-muted">{ticket.ticket_id}</span>
                        <span
                          className={`rounded-full px-2 py-0.5 text-[9px] font-bold uppercase ${
                            ticket.status === "Pending Agent"
                              ? "bg-amber-100 text-amber-700"
                              : "bg-green-100 text-green-700"
                          }`}
                        >
                          {ticket.status}
                        </span>
                      </div>
                      <p className="text-sm font-semibold text-brand-text font-display">{ticket.student_id}</p>
                      <p className="text-[10px] text-brand-muted">
                        Created {new Date(ticket.created_at).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}{' '}
                        {new Date(ticket.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </button>
                  ))}
                {queue.length === 0 && (
                  <div className="text-center py-20 text-sm text-brand-muted">
                    No pending tickets in the queue. Nice!
                  </div>
                )}
              </div>

              {/* Pagination Controls */}
              {queue.length > QUEUE_PER_PAGE && (
                <div className="p-4 border-t border-zinc-100 flex items-center justify-between shrink-0 bg-white">
                  <button
                    disabled={queuePage === 1}
                    onClick={() => setQueuePage((p) => p - 1)}
                    className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-zinc-200 hover:bg-zinc-50 disabled:opacity-40"
                  >
                    Previous
                  </button>
                  <span className="text-xs text-brand-muted font-medium">
                    Page {queuePage} of {Math.ceil(queue.length / QUEUE_PER_PAGE)}
                  </span>
                  <button
                    disabled={queuePage * QUEUE_PER_PAGE >= queue.length}
                    onClick={() => setQueuePage((p) => p + 1)}
                    className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-zinc-200 hover:bg-zinc-50 disabled:opacity-40"
                  >
                    Next
                  </button>
                </div>
              )}
            </div>
          </section>

          {/* Right pane: Ticket details & work area */}
          <section className="flex-1 bg-zinc-50 flex flex-col overflow-hidden h-full">
            {selectedTicket ? (
              <div className="flex-1 flex flex-col overflow-hidden h-full">
                {/* Detail Header */}
                <div className="p-6 border-b border-zinc-200 bg-white flex justify-between items-center shrink-0">
                  <div>
                    <h3 className="text-lg font-bold text-brand-text font-display">{selectedTicket.student_id}</h3>
                    <p className="text-xs text-brand-muted mt-0.5">Ticket ID: {selectedTicket.ticket_id}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-brand-muted">Status:</span>
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-700 uppercase">
                      {selectedTicket.status}
                    </span>
                  </div>
                </div>

                {/* Handoff Packet Banner */}
                {handoff && (
                  <div className="m-6 mb-0 p-5 rounded-xl border border-teal-100 bg-teal-50/30 flex gap-4 shrink-0">
                    <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-primary text-white shrink-0 shadow-sm">
                      <Brain className="w-5 h-5" />
                    </span>
                    <div className="space-y-2.5 text-sm">
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-brand-primary font-display uppercase tracking-wide text-xs">
                          Archon AI Handoff Diagnosis
                        </span>
                        <span className="h-1.5 w-1.5 rounded-full bg-teal-400"></span>
                        <span className="text-brand-muted text-xs font-medium">Context Preserved</span>
                        {handoff.handoff_packet.wrap_up_status && (
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                              handoff.handoff_packet.wrap_up_status === "completed"
                                ? "bg-green-100 text-green-700"
                                : "bg-amber-100 text-amber-700"
                            }`}
                          >
                            Wrap-up {handoff.handoff_packet.wrap_up_status}
                          </span>
                        )}
                      </div>
                      <p className="text-brand-text leading-relaxed font-sans">{handoff.handoff_packet.diagnosis}</p>
                      
                      <div className="flex flex-wrap gap-4 text-xs font-semibold text-brand-muted pt-1">
                        <div>
                          <span className="text-brand-text font-bold">Systems: </span>
                          {handoff.handoff_packet.systems_queried.join(", ")}
                        </div>
                        <div>
                          <span className="text-brand-text font-bold">Actions: </span>
                          {handoff.handoff_packet.actions_taken.join(", ")}
                        </div>
                        {handoff.agent_id && (
                          <div>
                            <span className="text-brand-text font-bold">Resolved By: </span>
                            {handoff.agent_id}
                          </div>
                        )}
                        {handoff.resolved_at && (
                          <div>
                            <span className="text-brand-text font-bold">Resolved At: </span>
                            {new Date(handoff.resolved_at).toLocaleString()}
                          </div>
                        )}
                      </div>
                      {handoff.handoff_packet.resolution_summary && (
                        <div className="rounded-lg bg-white/80 border border-zinc-200 p-3">
                          <p className="text-[10px] font-bold uppercase text-brand-muted mb-1">
                            Resolution Summary
                          </p>
                          <p className="text-xs text-brand-text leading-relaxed font-sans">
                            {handoff.handoff_packet.resolution_summary}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Main Workspace Body */}
                <div className="flex-1 flex overflow-hidden p-6 gap-6 min-h-0">
                  {/* Chat Transcript Panel */}
                  <div className="flex-1 flex flex-col rounded-xl border border-zinc-200 bg-white min-w-0 h-full">
                    <div className="p-4 border-b border-zinc-100 shrink-0">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-brand-muted font-sans">
                        Conversation History
                      </h4>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-zinc-50/50">
                      {ticketLoading ? (
                        <div className="flex h-full items-center justify-center">
                          <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand-primary border-t-transparent"></div>
                        </div>
                      ) : (
                        messages.map((msg) => (
                          <div
                            key={msg.id}
                            className={`flex flex-col max-w-[80%] ${
                              msg.role === "user"
                                ? "ml-auto items-end"
                                : "mr-auto items-start"
                            }`}
                          >
                            <span className="text-[10px] text-brand-muted mb-1 px-1 font-semibold">
                              {msg.role === "user" ? "Student" : "Assistant"} ·{" "}
                              {new Date(msg.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                            <div
                              className={`rounded-[20px] px-4 py-2 text-sm shadow-sm border ${
                                msg.role === "user"
                                  ? "bg-white border-zinc-100 text-brand-text rounded-br-[4px]"
                                  : "bg-brand-primary-light/40 border-teal-50 text-brand-text rounded-bl-[4px]"
                              }`}
                            >
                              <MarkdownText text={parseMessageContent(msg.content_scrubbed)} />
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Agent Resolution Action Desk */}
                  <div className="w-80 rounded-xl border border-zinc-200 bg-white p-5 flex flex-col justify-between shrink-0 h-full">
                    <div className="space-y-4">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-brand-muted font-sans">
                        Resolution Action Desk
                      </h4>
                      
                      {handoff ? (
                        <div className="space-y-3">
                          <div className="rounded-lg bg-zinc-50 p-3.5 border border-zinc-100">
                            <p className="text-[10px] font-bold text-brand-muted uppercase mb-1">AI Recommendation</p>
                            <p className="text-xs text-brand-text leading-relaxed font-sans">
                              {handoff.handoff_packet.recommended_resolution}
                            </p>
                          </div>

                          <div>
                            <label className="block text-[10px] font-bold text-brand-muted uppercase mb-1.5">
                              Resolution Action Reply
                            </label>
                            <textarea
                              value={replyText}
                              onChange={(e) => setReplyText(e.target.value)}
                              placeholder="Draft reply message to student..."
                              className="w-full rounded-xl border border-zinc-200 p-3 text-xs bg-zinc-50/50 focus:border-brand-primary focus:outline-none min-h-[100px] font-sans"
                            />
                          </div>
                        </div>
                      ) : (
                        <div className="rounded-lg bg-zinc-50 p-4 text-center border border-zinc-100">
                          <p className="text-xs text-brand-muted leading-relaxed font-sans">
                            No handoff summary needed. Provide direct staff reply below.
                          </p>
                          <textarea
                            value={replyText}
                            onChange={(e) => setReplyText(e.target.value)}
                            placeholder="Draft reply message to student..."
                            className="w-full rounded-xl border border-zinc-200 p-3 text-xs bg-white focus:border-brand-primary focus:outline-none min-h-[120px] font-sans mt-3"
                          />
                        </div>
                      )}
                    </div>

                    <div className="space-y-2 pt-4 border-t border-zinc-100 shrink-0">
                      <button
                        disabled={resolving || !replyText.trim()}
                        onClick={handleSendMessage}
                        className="w-full flex h-11 items-center justify-center gap-2 rounded-xl border border-brand-primary bg-white text-brand-primary font-semibold hover:bg-brand-primary/5 disabled:opacity-50 text-sm transition"
                      >
                        {resolving ? "Sending..." : "Send Message"}
                      </button>
                      <button
                        disabled={resolving || !replyText.trim()}
                        onClick={() => handleCloseTicket("approve")}
                        className="w-full flex h-11 items-center justify-center gap-2 rounded-xl bg-brand-primary text-white font-semibold hover:bg-teal-700 disabled:opacity-50 text-sm shadow-sm transition"
                      >
                        <Check className="w-4 h-4" />
                        {resolving ? "Resolving..." : "Approve & Lift Hold"}
                      </button>
                      <button
                        disabled={resolving}
                        onClick={() => handleCloseTicket("close")}
                        className="w-full flex h-11 items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-white text-brand-text font-semibold hover:bg-zinc-50 disabled:opacity-50 text-sm transition"
                      >
                        <CheckCheck className="w-4 h-4" />
                        Mark as Complete
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex h-full items-center justify-center text-center">
                <div>
                  <Inbox className="w-12 h-12 text-zinc-300 mx-auto mb-3" />
                  <h3 className="text-sm font-bold text-brand-text font-display">No Ticket Selected</h3>
                  <p className="text-xs text-brand-muted mt-1 font-sans">
                    Select a student&apos;s ticket from the active queue list to get started.
                  </p>
                </div>
              </div>
            )}
          </section>
        </>
      )}
    </main>
  );
}
