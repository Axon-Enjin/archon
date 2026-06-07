"use client";

import { useSession, signOut, signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { LayoutDashboard, MessageCircle, FileText, LogOut, AlertOctagon, Calendar, Clock, ChevronLeft, ChevronRight, RefreshCw, Bell } from "lucide-react";

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

function toDateKey(dateInput: string | Date): string {
  const d = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
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
  const [calendarError, setCalendarError] = useState<string | null>(null);
  const [calendarErrorCode, setCalendarErrorCode] = useState<string | null>(null);
  const [calendarRefreshing, setCalendarRefreshing] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [selectedDateKey, setSelectedDateKey] = useState(() => toDateKey(new Date()));

  async function fetchDashboardData(studentOid: string) {
    try {
      setLoading(true);
      const [profileRes, holdsRes, calendarRes, ticketsRes] = await Promise.all([
        fetch(`/api/v1/student/${studentOid}/profile`),
        fetch(`/api/v1/student/${studentOid}/holds`),
        fetch(`/api/v1/student/${studentOid}/calendar?refresh=1`),
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
      if (calendarData.success) {
        setEvents(calendarData.data);
        setCalendarError(null);
        setCalendarErrorCode(null);
      } else {
        setEvents([]);
        setCalendarError(calendarData.error || "Calendar temporarily unavailable.");
        setCalendarErrorCode(calendarData.errorCode || null);
      }
      if (ticketsData.success) setTickets(ticketsData.data);
    } catch (err) {
      console.error("Error fetching student dashboard data:", err);
    } finally {
      setLoading(false);
    }
  }

  async function fetchDashboardDataSilently(studentOid: string) {
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
  }

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

      const initialFetchTimer = setTimeout(() => {
        void fetchDashboardData(session.user.entra_oid);
      }, 0);

      // Implement periodic sync polling every 4 seconds
      const interval = setInterval(() => {
        fetchDashboardDataSilently(session.user.entra_oid);
      }, 4000);

      return () => {
        clearInterval(interval);
        clearTimeout(initialFetchTimer);
      };
    }
  }, [session, status, router]);

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

  const handleRefreshCalendar = async () => {
    if (!session?.user) return;
    try {
      setCalendarRefreshing(true);
      const res = await fetch(`/api/v1/student/${session.user.entra_oid}/calendar?refresh=1`);
      const data = await res.json();
      if (data.success) {
        setEvents(data.data);
        setCalendarError(null);
        setCalendarErrorCode(null);
      } else {
        setEvents([]);
        setCalendarError(data.error || "Calendar temporarily unavailable.");
        setCalendarErrorCode(data.errorCode || null);
      }
    } catch (err) {
      console.error("Error refreshing calendar:", err);
      setCalendarError("Calendar temporarily unavailable.");
      setCalendarErrorCode("GRAPH_UPSTREAM_ERROR");
    } finally {
      setCalendarRefreshing(false);
    }
  };

  const handleReconnectM365 = async () => {
    await signIn("azure-ad", {
      callbackUrl: "/student",
      prompt: "consent",
    });
  };

  if (loading || status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-brand-surface">
        <div className="text-center">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-brand-primary border-t-transparent mx-auto"></div>
          <p className="mt-4 text-sm text-brand-muted font-sans">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  const activeHolds = holds.filter((h) => h.status !== "Resolved");
  const eventsByDate = events.reduce<Record<string, CalendarEvent[]>>((acc, evt) => {
    const key = toDateKey(evt.start);
    acc[key] = acc[key] || [];
    acc[key].push(evt);
    return acc;
  }, {});

  const selectedDateEvents = (eventsByDate[selectedDateKey] || []).sort(
    (a, b) => new Date(a.start).getTime() - new Date(b.start).getTime()
  );

  const monthStart = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), 1);
  const monthEnd = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 0);
  const gridStart = new Date(monthStart);
  gridStart.setDate(monthStart.getDate() - monthStart.getDay());
  const gridDays: Date[] = Array.from({ length: 42 }, (_, idx) => {
    const d = new Date(gridStart);
    d.setDate(gridStart.getDate() + idx);
    return d;
  });

  return (
    <div className="flex h-screen overflow-hidden bg-brand-surface font-sans">
      {/* Sidebar Navigation */}
      <aside className="w-64 h-full border-r border-zinc-200 bg-white p-6 hidden md:flex flex-col justify-between shrink-0">
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
              <LayoutDashboard className="w-4 h-4" /> Dashboard
            </Link>
            <Link
              href="/student/alerts"
              className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-brand-text hover:bg-zinc-50 transition"
            >
              <Bell className="w-4 h-4" /> Alert Center
            </Link>
            <button
              onClick={handleStartNewChat}
              disabled={creatingTicket}
              className="w-full flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-brand-text hover:bg-zinc-50 transition"
            >
              <MessageCircle className="w-4 h-4" /> AI Help Desk
            </button>
            <Link
              href="/student/appeal"
              className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-brand-text hover:bg-zinc-50"
            >
              <FileText className="w-4 h-4" /> SAP Appeal Wizard
            </Link>
          </nav>
        </div>

        <div className="space-y-4">
          <button
            onClick={() => signOut({ callbackUrl: "/" })}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-brand-error hover:bg-red-50 transition"
          >
            <LogOut className="w-4 h-4" /> Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 p-6 md:p-10 max-w-7xl mx-auto overflow-y-auto space-y-8">
        {/* Welcome Header */}
        <section className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-zinc-200 pb-6">
          <div>
            <h1 className="text-3xl font-bold font-display text-brand-text">Welcome, {profile?.name}!</h1>
            <p className="text-brand-muted text-sm mt-1">
              {profile?.major} · {profile?.year} · ID: {profile?.student_id}
            </p>
          </div>
          <button
            onClick={handleStartNewChat}
            disabled={creatingTicket}
            className="flex h-11 items-center justify-center gap-2 rounded-xl bg-brand-primary px-5 text-sm font-semibold text-white shadow-sm hover:bg-teal-700 disabled:opacity-50 transition"
          >
            {creatingTicket ? "Initializing..." : <><MessageCircle className="w-4 h-4" /> Start AI Conversation</>}
          </button>
        </section>

        {/* Holds Alerts */}
        {activeHolds.length > 0 ? (
          <section className="rounded-xl border border-brand-error/20 bg-red-50/30 p-6 space-y-4">
            <div className="flex items-center gap-2 text-brand-error font-bold font-display">
              <AlertOctagon className="w-5 h-5" />
              <h2>You have ({activeHolds.length}) active holds on your account</h2>
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
              <p className="text-xs text-brand-muted">You have no active holds. You are cleared to enroll and register for classes.</p>            </div>
          </section>
        )}

        {/* Two Column Section: Calendar & Active Tickets */}
        <div className="grid gap-8 lg:grid-cols-12">
          {/* Calendar Card (Microsoft Graph Outlook Calendar) */}
          <section className="lg:col-span-7 rounded-xl bg-white p-6 border border-zinc-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3 gap-3">
              <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded bg-brand-m365 text-white font-bold text-[10px]">
                  M
                </span>
                <h2 className="text-lg font-bold font-display text-brand-text">Outlook Calendar</h2>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-brand-muted">Sync: 15m TTL</span>
                <button
                  onClick={handleRefreshCalendar}
                  disabled={calendarRefreshing}
                  className="inline-flex items-center gap-1 rounded-md border border-zinc-200 px-2 py-1 text-[11px] font-semibold text-brand-text hover:bg-zinc-50 disabled:opacity-50"
                >
                  <RefreshCw className={`w-3 h-3 ${calendarRefreshing ? "animate-spin" : ""}`} />
                  Refresh
                </button>
              </div>
            </div>
            {calendarError ? (
              <div className="py-8 text-center space-y-2">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 text-amber-700 mx-auto">
                  <Calendar className="w-6 h-6" />
                </div>
                <p className="text-sm font-bold text-brand-text font-display">Calendar temporarily unavailable</p>
                <p className="text-xs text-brand-muted">{calendarError}</p>
                {calendarErrorCode === "GRAPH_CONSENT_REQUIRED" && (
                  <button
                    onClick={handleReconnectM365}
                    className="inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-brand-m365 px-4 text-xs font-semibold text-white shadow-sm hover:bg-blue-700 transition mt-2"
                  >
                    Connect your M365 Calendar
                  </button>
                )}
              </div>
            ) : events.length > 0 ? (
              <div className="space-y-4 animate-fade-in">
                <div className="flex items-center justify-between">
                  <button
                    onClick={() =>
                      setCalendarMonth(
                        (prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1)
                      )
                    }
                    className="inline-flex items-center gap-1 rounded-md border border-zinc-200 px-2 py-1 text-xs font-semibold text-brand-text hover:bg-zinc-50"
                  >
                    <ChevronLeft className="w-3 h-3" />
                    Prev
                  </button>
                  <p className="text-sm font-bold text-brand-text font-display">
                    {calendarMonth.toLocaleDateString([], { month: "long", year: "numeric" })}
                  </p>
                  <button
                    onClick={() =>
                      setCalendarMonth(
                        (prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1)
                      )
                    }
                    className="inline-flex items-center gap-1 rounded-md border border-zinc-200 px-2 py-1 text-xs font-semibold text-brand-text hover:bg-zinc-50"
                  >
                    Next
                    <ChevronRight className="w-3 h-3" />
                  </button>
                </div>

                <div className="grid grid-cols-7 gap-1 text-[10px] font-semibold text-brand-muted">
                  {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                    <div key={day} className="px-2 py-1 text-center">{day}</div>
                  ))}
                </div>

                <div className="grid grid-cols-7 gap-1">
                  {gridDays.map((day) => {
                    const key = toDateKey(day);
                    const inMonth = day >= monthStart && day <= monthEnd;
                    const isSelected = selectedDateKey === key;
                    const count = (eventsByDate[key] || []).length;
                    const isToday = key === toDateKey(new Date());

                    return (
                      <button
                        key={key}
                        onClick={() => setSelectedDateKey(key)}
                        className={`relative rounded-lg border px-2 py-2 text-left transition min-h-[64px] ${
                          isSelected
                            ? "border-brand-primary bg-brand-primary-light/20"
                            : "border-zinc-100 hover:border-zinc-200 hover:bg-zinc-50"
                        } ${!inMonth ? "opacity-45" : ""}`}
                      >
                        <span className={`text-[11px] font-semibold ${isToday ? "text-brand-primary" : "text-brand-text"}`}>
                          {day.getDate()}
                        </span>
                        {count > 0 && (
                          <span className="absolute bottom-1 right-1 rounded-full bg-brand-m365 px-1.5 py-0.5 text-[9px] font-bold text-white">
                            {count}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>

                <div className="rounded-lg border border-zinc-100 bg-zinc-50/60 p-3 space-y-2">
                  <p className="text-xs font-bold text-brand-text font-display">
                    {new Date(selectedDateKey).toLocaleDateString([], { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
                  </p>
                  {selectedDateEvents.length === 0 ? (
                    <p className="text-xs text-brand-muted">No events for this date.</p>
                  ) : (
                    <div className="space-y-2">
                      {selectedDateEvents.map((evt) => {
                        const startDate = new Date(evt.start);
                        const formatTime = evt.isAllDay
                          ? "All-day"
                          : startDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
                        const isDeadline =
                          evt.title.toLowerCase().includes("deadline") ||
                          evt.title.toLowerCase().includes("renewal");
                        const borderClass = isDeadline ? "border-brand-warning" : "border-brand-primary";

                        return (
                          <div
                            key={evt.id}
                            className={`py-1 pl-3 border-l-4 ${borderClass} flex items-start justify-between gap-3 transition-all duration-300`}
                          >
                            <div className="space-y-1">
                              <p className="text-sm font-semibold text-brand-text font-display">{evt.title}</p>
                              <p className="text-xs text-brand-muted flex items-center gap-1.5">
                                <Clock className="w-3 h-3 inline" /> {formatTime}
                              </p>
                            </div>
                            <span className="rounded bg-teal-50 px-2 py-0.5 text-[9px] font-bold text-brand-primary shrink-0 uppercase tracking-wider">
                              {evt.source}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="py-8 text-center space-y-2">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-m365/10 text-brand-m365 mx-auto">
                  <Calendar className="w-6 h-6" />
                </div>
                <p className="text-sm font-bold text-brand-text font-display">No upcoming events</p>
                <p className="text-xs text-brand-muted">No Outlook Calendar events found in the next 14 days.</p>
              </div>
            )}
          </section>

          {/* Active Support Tickets */}
          <section className="lg:col-span-5 rounded-xl bg-white p-6 border border-zinc-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
              <h2 className="text-lg font-bold font-display text-brand-text">Active Tickets</h2>
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
                        Opened on {new Date(ticket.created_at).toLocaleDateString()}
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
                        Open ➔
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-10 space-y-3">
                <p className="text-sm text-brand-muted">You have no active tickets at this time.</p>
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
