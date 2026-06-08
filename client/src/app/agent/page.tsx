"use client";

import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Inbox, BarChart3, LogOut, Brain, Check } from "lucide-react";
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
  };
  agent_id: string;
}

export default function AgentDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [queue, setQueue] = useState<TicketItem[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<TicketItem | null>(null);
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [handoff, setHandoff] = useState<HandoffPacket | null>(null);
  const [replyText, setReplyText] = useState("");
  const [loading, setLoading] = useState(true);
  const [ticketLoading, setTicketLoading] = useState(false);
  const [resolving, setResolving] = useState(false);

  async function fetchQueue() {
    try {
      setLoading(true);
      const res = await fetch("/api/v1/tickets?type=queue");
      const data = await res.json();
      if (data.success) {
        setQueue(data.data);
      }
    } catch (err) {
      console.error("Error loading agent queue:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin");
      return;
    }

    if (session?.user) {
      if (session.user.role !== "Agent" && session.user.role !== "Admin") {
        router.push("/auth/signin");
        return;
      }
      const initialTimer = setTimeout(() => {
        void fetchQueue();
      }, 0);
      return () => clearTimeout(initialTimer);
    }
  }, [session, status, router]);

  const handleSelectTicket = async (ticket: TicketItem) => {
    setSelectedTicket(ticket);
    setTicketLoading(true);
    setHandoff(null);
    setReplyText("");

    try {
      const msgRes = await fetch(`/api/v1/tickets/${ticket.id}/messages`);
      const msgData = await msgRes.json();
      if (msgData.success) {
        setMessages(msgData.data);
      }

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

  const handleResolveTicket = async (action: "approve" | "reject") => {
    if (!selectedTicket || !replyText.trim()) return;

    setResolving(true);
    try {
      await fetch(`/api/v1/tickets/${selectedTicket.id}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: `[Staff Reply - ${session?.user?.name || "Support Agent"}] ${replyText}`,
        }),
      });

      if (action === "approve") {
        await fetch(`/api/v1/student/${selectedTicket.student_id}/holds`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            holdId: "hold-academic",
            action: "lift",
          }),
        });
      }

      setSelectedTicket(null);
      await fetchQueue();
    } catch (err) {
      console.error("Failed to resolve ticket:", err);
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

  if (loading || status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-brand-surface">
        <div className="text-center">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-brand-primary border-t-transparent mx-auto"></div>
          <p className="mt-4 text-sm text-brand-muted font-sans">Loading Agent Console...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-brand-surface font-sans">
      {/* Sidebar */}
      <aside className="w-64 h-full border-r border-zinc-200 bg-white p-6 hidden md:flex flex-col justify-between shrink-0">
        <div className="space-y-8">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-primary text-white font-extrabold text-lg font-display">
              A
            </span>
            <span className="text-lg font-bold tracking-tight text-brand-text font-display">Archon Agent</span>
          </div>

          <nav className="space-y-1">
            <Link
              href="/agent"
              className="flex items-center gap-3 rounded-lg bg-brand-primary-light/50 px-3 py-2 text-sm font-semibold text-brand-primary"
            >
              <Inbox className="w-4 h-4" /> Active Queue
            </Link>
            <Link
              href="/admin"
              className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-brand-text hover:bg-zinc-50"
            >
              <BarChart3 className="w-4 h-4" /> Analytics
            </Link>
          </nav>
        </div>

        <div>
          <button
            onClick={() => signOut({ callbackUrl: "/" })}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-brand-error hover:bg-red-50"
          >
            <LogOut className="w-4 h-4" /> Sign Out
          </button>
        </div>
      </aside>

      {/* Main split dashboard */}
      <main className="flex-1 flex overflow-hidden h-screen">
        {/* Left pane: Queue List */}
        <section className="w-80 border-r border-zinc-200 bg-white flex flex-col shrink-0">
          <div className="p-6 border-b border-zinc-100">
            <h2 className="text-xl font-bold text-brand-text font-display">Support Queue</h2>
            <p className="text-xs text-brand-muted mt-1">{queue.length} Active Tickets Pending</p>
          </div>
          <div className="flex-1 overflow-y-auto divide-y divide-zinc-100">
            {queue.map((ticket) => (
              <button
                key={ticket.id}
                onClick={() => handleSelectTicket(ticket)}
                className={`w-full text-left p-4 hover:bg-zinc-50 transition flex flex-col gap-1.5 ${
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
                  Created {new Date(ticket.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </button>
            ))}
            {queue.length === 0 && (
              <div className="text-center py-20 text-sm text-brand-muted">
                No pending tickets in the queue. Nice!
              </div>
            )}
          </div>
        </section>

        {/* Right pane: Ticket details & AI Handoff */}
        <section className="flex-1 bg-brand-surface flex flex-col overflow-y-auto p-6 md:p-10 space-y-6">
          {selectedTicket ? (
            ticketLoading ? (
              <div className="flex-grow flex items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-primary border-t-transparent mx-auto"></div>
              </div>
            ) : (
              <>
                {/* Handoff Header */}
                <div className="flex flex-col md:flex-row md:items-center md:justify-between border-b border-zinc-200 pb-4 gap-4">
                  <div>
                    <h2 className="text-2xl font-bold font-display text-brand-text">
                      Ticket {selectedTicket.ticket_id} Details
                    </h2>
                    <p className="text-xs text-brand-muted mt-1">
                      Assigned to Support Desk Queue
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="rounded bg-brand-primary-light px-2 py-0.5 text-[10px] font-bold text-brand-primary uppercase font-display">
                      Student Desk
                    </span>
                  </div>
                </div>

                {/* AI Handoff Packet */}
                {handoff && (
                  <div className="rounded-xl border border-brand-primary/20 bg-brand-primary-light/10 p-6 space-y-4">
                    <div className="flex items-center gap-2 text-brand-primary font-bold font-display">
                      <Brain className="w-5 h-5 text-brand-primary shrink-0" />
                      <h2>AI-Generated Handoff Packet (PRD-F4)</h2>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2 text-xs">
                      <div>
                        <p className="font-semibold text-brand-text font-display">Student Profile:</p>
                        <p className="text-brand-muted mt-1">
                          {handoff.handoff_packet.student_profile.name} (GWA 2.65 · SAP Warning)
                        </p>
                      </div>
                      <div>
                        <p className="font-semibold text-brand-text font-display">Systems Queried:</p>
                        <p className="text-brand-muted mt-1">
                          {handoff.handoff_packet.systems_queried.join(", ")}
                        </p>
                      </div>
                    </div>
                    <div className="text-xs">
                      <p className="font-semibold text-brand-text font-display">AI Diagnosis:</p>
                      <p className="text-brand-muted mt-1 leading-relaxed">
                        {handoff.handoff_packet.diagnosis}
                      </p>
                    </div>
                  </div>
                )}

                {/* Message Log history */}
                <div className="rounded-xl bg-white border border-zinc-200 p-6 shadow-sm space-y-4">
                  <h3 className="font-bold text-brand-text border-b border-zinc-100 pb-2 text-sm font-display">
                    Conversation Transcript
                  </h3>
                  <div className="space-y-4 max-h-[300px] overflow-y-auto text-xs divide-y divide-zinc-50">
                    {messages.map((msg) => (
                      <div key={msg.id} className="pt-3 first:pt-0">
                        <p className="font-semibold text-brand-primary font-display">
                          {msg.role === "user" ? "Student" : "Archon Bot"}:
                        </p>
                        <MarkdownText
                          text={parseMessageContent(msg.content_scrubbed)}
                          className="text-brand-text mt-1"
                        />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Resolution Form */}
                <div className="rounded-xl bg-white border border-zinc-200 p-6 shadow-sm space-y-4">
                  <h3 className="font-bold text-brand-text text-sm font-display">Proposed Appeal Resolution</h3>
                  <textarea
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    disabled={resolving}
                    className="w-full rounded-xl border border-zinc-200 bg-brand-surface p-4 text-xs focus:border-brand-primary focus:outline-none min-h-[100px] leading-relaxed"
                  />
                  <div className="flex justify-end gap-3">
                    <button
                      onClick={() => handleResolveTicket("reject")}
                      disabled={resolving}
                      className="flex h-10 items-center justify-center rounded-lg border border-zinc-200 bg-white px-4 text-xs font-semibold text-brand-error hover:bg-red-50 disabled:opacity-50 font-display"
                    >
                      Reject Appeal
                    </button>
                    <button
                      onClick={() => handleResolveTicket("approve")}
                      disabled={resolving}
                      className="flex h-10 items-center justify-center rounded-lg bg-brand-primary px-5 text-xs font-semibold text-white shadow-sm hover:bg-teal-700 disabled:opacity-50 font-display items-center gap-1.5"
                    >
                      {resolving ? "Processing..." : <><Check className="w-4 h-4" /> Approve & Lift Academic Hold</>}
                    </button>
                  </div>
                </div>
              </>
            )
          ) : (
            <div className="flex-grow flex flex-col items-center justify-center text-center space-y-3">
              <Inbox className="w-12 h-12 text-zinc-300 mx-auto" />
              <h3 className="text-lg font-bold text-brand-text font-display">Select a ticket from the queue</h3>
              <p className="text-xs text-brand-muted max-w-sm">
                Review the student profile, inspect the AI Handoff packet, and approve or reject the appeal in one click.
              </p>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
