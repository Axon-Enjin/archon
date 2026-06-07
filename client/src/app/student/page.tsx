"use client";

import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";

interface StudentProfile {
  student_id: string;
  name: string;
  major: string;
  year: string;
  sap_status: string;
  gwa: string;
  scholarship: string;
}

interface HoldItem {
  id: string;
  type: string;
  reason: string;
  status: "Active" | "Lifting" | "Resolved";
  resolution_steps: string;
}

interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  isAllDay: boolean;
  source: string;
}

interface TicketItem {
  id: string;
  ticket_id: string;
  status: "Open" | "Pending Agent" | "Resolved";
  created_at: string;
}

export default function StudentDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [holds, setHolds] = useState<HoldItem[]>([]);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [tickets, setTickets] = useState<TicketItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [creatingTicket, setCreatingTicket] = useState(false);

  // M365 Consent Simulation States
  const [m365Connected, setM365Connected] = useState(false);
  const [connecting, setConnecting] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin");
      return;
    }

    if (session?.user) {
      if (session.user.role !== "Student") {
        router.push("/auth/signin");
        return;
      }
      
      // Load M365 consent state from localStorage
      const savedConsent = localStorage.getItem(`m365_consent:${session.user.entra_oid}`);
      setM365Connected(savedConsent === "true");

      fetchDashboardData(session.user.entra_oid);

      // Implement periodic sync polling every 4 seconds
      const interval = setInterval(() => {
        fetchDashboardDataSilently(session.user.entra_oid);
      }, 4000);

      return () => clearInterval(interval);
    }
  }, [session, status]);

  const fetchDashboardData = async (studentOid: string) => {
    try {
      setLoading(true);
      const [profileRes, holdsRes, calendarRes, ticketsRes] = await Promise.all([
        fetch(`/api/v1/student/${studentOid}/profile`),
        fetch(`/api/v1/student/${studentOid}/holds`),
        fetch(`/api/v1/student/${studentOid}/calendar`),
        fetch(`/api/v1/tickets?studentId=${studentOid}`),
      ]);

      const [profileData, holdsData, calendarData, ticketsData] = await Promise.all([
        profileRes.json(),
        holdsRes.json(),
        calendarRes.json(),
        ticketsRes.json(),
      ]);

      if (profileData.success) setProfile(profileData.data);
      if (holdsData.success) setHolds(holdsData.data);
      if (calendarData.success) setEvents(calendarData.data);
      if (ticketsData.success) setTickets(ticketsData.data);
    } catch (err) {
      console.error("Error fetching student dashboard data:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchDashboardDataSilently = async (studentOid: string) => {
    try {
      const [holdsRes, ticketsRes] = await Promise.all([
        fetch(`/api/v1/student/${studentOid}/holds`),
        fetch(`/api/v1/tickets?studentId=${studentOid}`),
      ]);
      const [holdsData, ticketsData] = await Promise.all([
        holdsRes.json(),
        ticketsRes.json(),
      ]);
      if (holdsData.success) setHolds(holdsData.data);
      if (ticketsData.success) setTickets(ticketsData.data);
    } catch (err) {
      console.warn("Silent sync failed", err);
    }
  };

  const handleStartNewChat = async () => {
    if (!session?.user) return;
    try {
      setCreatingTicket(true);
      const res = await fetch("/api/v1/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId: session.user.entra_oid }),
      });
      const data = await res.json();
      if (data.success) {
        router.push(`/student/chat?ticketId=${data.data.id}`);
      }
    } catch (err) {
      console.error("Error creating ticket:", err);
    } finally {
      setCreatingTicket(false);
    }
  };

  const handleConnectM365 = () => {
    if (!session?.user) return;
    setConnecting(true);
    setTimeout(() => {
      setConnecting(false);
      setM365Connected(true);
      localStorage.setItem(`m365_consent:${session.user.entra_oid}`, "true");
    }, 1200); // 1.2 second mock Entra authorization code grant loop
  };

  const handleDisconnectM365 = () => {
    if (!session?.user) return;
    setM365Connected(false);
    localStorage.removeItem(`m365_consent:${session.user.entra_oid}`);
  };

  if (loading || status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-brand-surface">
        <div className="text-center">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-brand-primary border-t-transparent mx-auto"></div>
          <p className="mt-4 text-sm text-brand-muted font-sans">Kargang muli ang iyong dashboard...</p>
        </div>
      </div>
    );
  }

  const activeHolds = holds.filter((h) => h.status !== "Resolved");

  return (
    <div className="flex min-h-screen bg-brand-surface font-sans">
      {/* Sidebar Navigation */}
      <aside className="w-64 border-r border-zinc-200 bg-white p-6 hidden md:flex flex-col justify-between">
        <div className="space-y-8">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-primary text-white font-extrabold text-lg font-display">
              A
            </span>
            <span className="text-lg font-bold tracking-tight text-brand-text font-display">Archon</span>
          </div>

          <nav className="space-y-1">
            <Link
              href="/student"
              className="flex items-center gap-3 rounded-lg bg-brand-primary-light/50 px-3 py-2 text-sm font-semibold text-brand-primary animate-fade-in"
            >
              📊 Dashboard
            </Link>
            <button
              onClick={handleStartNewChat}
              disabled={creatingTicket}
              className="w-full flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-brand-text hover:bg-zinc-50 transition"
            >
              💬 AI Help Desk
            </button>
            <Link
              href="/student/appeal"
              className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-brand-text hover:bg-zinc-50"
            >
              📝 SAP Appeal Wizard
            </Link>
          </nav>
        </div>

        <div className="space-y-4">
          {m365Connected && (
            <button
              onClick={handleDisconnectM365}
              className="w-full text-center text-[10px] font-semibold text-brand-muted hover:underline"
            >
              Disconnect M365 (Demo Reset)
            </button>
          )}
          <button
            onClick={() => signOut({ callbackUrl: "/" })}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-brand-error hover:bg-red-50 transition"
          >
            🚪 Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 p-6 md:p-10 max-w-7xl mx-auto overflow-y-auto space-y-8">
        {/* Welcome Header */}
        <section className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-zinc-200 pb-6">
          <div>
            <h1 className="text-3xl font-bold font-display text-brand-text">Maligayang pagdating, {profile?.name}!</h1>
            <p className="text-brand-muted text-sm mt-1">
              {profile?.major} · {profile?.year} · ID: {profile?.student_id}
            </p>
          </div>
          <button
            onClick={handleStartNewChat}
            disabled={creatingTicket}
            className="flex h-11 items-center justify-center rounded-xl bg-brand-primary px-5 text-sm font-semibold text-white shadow-sm hover:bg-teal-700 disabled:opacity-50 transition"
          >
            {creatingTicket ? "Initializing..." : "💬 Start AI Conversation"}
          </button>
        </section>

        {/* Holds Alerts */}
        {activeHolds.length > 0 ? (
          <section className="rounded-xl border border-brand-error/20 bg-red-50/30 p-6 space-y-4">
            <div className="flex items-center gap-2 text-brand-error font-bold font-display">
              <span>🛑</span>
              <h2>Mayroon kang ({activeHolds.length}) na aktibong hold sa iyong account</h2>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {activeHolds.map((hold) => (
                <div key={hold.id} className="rounded-xl bg-white p-4 shadow-sm border border-zinc-100 flex flex-col justify-between transition-all duration-300">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-semibold text-brand-error">
                        {hold.type}
                      </span>
                      <span className="text-xs text-brand-muted font-mono">{hold.status}</span>
                    </div>
                    <h3 className="text-base font-semibold text-brand-text mt-2 font-display">{hold.reason}</h3>
                    <p className="text-xs text-brand-muted mt-1 leading-relaxed">
                      {hold.resolution_steps}
                    </p>
                  </div>
                  {hold.id === "hold-financial" && (
                    <button
                      onClick={handleStartNewChat}
                      className="mt-4 flex w-full h-9 items-center justify-center rounded-lg bg-brand-primary-light text-brand-primary text-xs font-semibold hover:bg-brand-primary-light/80 transition"
                    >
                      Request Temporary Lift via AI
                    </button>
                  )}
                  {hold.id === "hold-academic" && (
                    <Link
                      href="/student/appeal"
                      className="mt-4 flex w-full h-9 items-center justify-center rounded-lg bg-amber-50 border border-brand-warning/30 text-amber-800 text-xs font-semibold hover:bg-amber-100/50 transition"
                    >
                      Open SAP Appeal Wizard
                    </Link>
                  )}
                </div>
              ))}
            </div>
          </section>
        ) : (
          <section className="rounded-xl border border-brand-success/20 bg-green-50/20 p-4 flex items-center gap-3">
            <span className="text-brand-success text-xl">✓</span>
            <div>
              <p className="text-sm font-semibold text-green-800">Clear Account Status</p>
              <p className="text-xs text-brand-muted">Wala kang aktibong holds. Ikaw ay kwalipikadong mag-enroll at kumuha ng klase.</p>
            </div>
          </section>
        )}

        {/* Two Column Section: Calendar & Active Tickets */}
        <div className="grid gap-8 lg:grid-cols-12">
          {/* Calendar Card (Graph API simulation / Consent Gate) */}
          <section className="lg:col-span-7 rounded-xl bg-white p-6 border border-zinc-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded bg-brand-m365 text-white font-bold text-[10px]">
                  M
                </span>
                <h2 className="text-lg font-bold font-display text-brand-text">Your Week</h2>
              </div>
              <span className="text-xs text-brand-muted">Sync: 15m TTL</span>
            </div>

            {connecting ? (
              <div className="py-12 text-center">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand-m365 border-t-transparent mx-auto"></div>
                <p className="mt-2 text-xs text-brand-muted font-mono">Authenticating with Entra ID...</p>
              </div>
            ) : m365Connected ? (
              <div className="space-y-4 animate-fade-in">
                {events.map((evt) => {
                  const startDate = new Date(evt.start);
                  const formatTime = startDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                  const formatDate = startDate.toLocaleDateString([], { month: 'short', day: 'numeric' });
                  
                  const isDeadline = evt.title.toLowerCase().includes("deadline") || evt.title.toLowerCase().includes("renewal");
                  const borderClass = isDeadline ? "border-brand-warning" : "border-brand-primary";

                  return (
                    <div key={evt.id} className={`py-1 pl-4 border-l-4 ${borderClass} flex items-start justify-between gap-4 transition-all duration-300`}>
                      <div className="space-y-1">
                        <p className="text-sm font-semibold text-brand-text font-display">{evt.title}</p>
                        <p className="text-xs text-brand-muted">
                          📅 {formatDate} · ⏰ {formatTime}
                        </p>
                      </div>
                      <span className="rounded bg-teal-50 px-2 py-0.5 text-[9px] font-bold text-brand-primary shrink-0 uppercase tracking-wider">
                        {evt.source}
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="py-8 text-center space-y-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-m365/10 text-brand-m365 mx-auto text-xl">
                  📅
                </div>
                <div className="space-y-1 max-w-sm mx-auto">
                  <p className="text-sm font-bold text-brand-text font-display">Connect your Microsoft 365 Calendar</p>
                  <p className="text-xs text-brand-muted">
                    Sync your academic classes, exam schedules, and scholarship deadlines alongside your support desk alerts.
                  </p>
                </div>
                <button
                  onClick={handleConnectM365}
                  className="inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-brand-m365 px-4 text-xs font-semibold text-white shadow-sm hover:bg-blue-700 transition"
                >
                  Connect Microsoft 365
                </button>
              </div>
            )}
          </section>

          {/* Active Support Tickets */}
          <section className="lg:col-span-5 rounded-xl bg-white p-6 border border-zinc-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
              <h2 className="text-lg font-bold font-display text-brand-text">Aktibong Tickets</h2>
              <span className="text-xs font-semibold bg-brand-primary-light text-brand-primary rounded-full px-2.5 py-0.5">
                {tickets.length} Total
              </span>
            </div>

            {tickets.length > 0 ? (
              <div className="space-y-3">
                {tickets.map((ticket) => (
                  <div
                    key={ticket.id}
                    className="rounded-xl border border-zinc-100 p-4 hover:border-zinc-200 transition flex items-center justify-between"
                  >
                    <div className="space-y-1">
                      <p className="text-xs text-brand-muted font-mono">{ticket.ticket_id}</p>
                      <p className="text-sm font-bold font-display text-brand-text">Support Chat Session</p>
                      <p className="text-[10px] text-brand-muted">
                        Binuksan noong {new Date(ticket.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                          ticket.status === "Open"
                            ? "bg-green-100 text-green-700"
                            : ticket.status === "Pending Agent"
                            ? "bg-amber-100 text-amber-700"
                            : "bg-zinc-100 text-zinc-600"
                        }`}
                      >
                        {ticket.status}
                      </span>
                      <Link
                        href={`/student/chat?ticketId=${ticket.id}`}
                        className="text-xs font-semibold text-brand-primary hover:underline font-display"
                      >
                        Buksan ➔
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-10 space-y-3">
                <p className="text-sm text-brand-muted">Wala kang aktibong ticket sa ngayon.</p>
                <button
                  onClick={handleStartNewChat}
                  disabled={creatingTicket}
                  className="inline-flex h-9 items-center justify-center rounded-lg bg-brand-primary px-4 text-xs font-semibold text-white hover:bg-teal-700 transition"
                >
                  Create Ticket
                </button>
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
