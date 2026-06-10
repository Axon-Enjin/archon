"use client";

import { useSession, signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { MessageCircle, AlertOctagon, Calendar, Clock, ChevronLeft, ChevronRight, RefreshCw } from "lucide-react";

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
  const [ticketPage, setTicketPage] = useState(1);
  const TICKETS_PER_PAGE = 3;
  const [loading, setLoading] = useState(true);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const [creatingTicket, setCreatingTicket] = useState(false);
  const [calendarError, setCalendarError] = useState<string | null>(null);
  const [calendarErrorCode, setCalendarErrorCode] = useState<string | null>(null);
  const [calendarRefreshing, setCalendarRefreshing] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [selectedDateKey, setSelectedDateKey] = useState(() => toDateKey(new Date()));

  async function fetchDashboardData(
    studentOid: string,
    options?: { showLoader?: boolean; refreshCalendar?: boolean }
  ) {
    const showLoader = options?.showLoader ?? false;
    const refreshCalendar = options?.refreshCalendar ?? false;

    try {
      if (showLoader) {
        setLoading(true);
      }

      const [profileRes, holdsRes, calendarRes, ticketsRes] = await Promise.all([
        fetch(`/api/v1/student/${studentOid}/profile`),
        fetch(`/api/v1/student/${studentOid}/holds`),
        fetch(
          refreshCalendar
            ? `/api/v1/student/${studentOid}/calendar?refresh=1`
            : `/api/v1/student/${studentOid}/calendar`
        ),
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
      setHasLoadedOnce(true);
      if (showLoader) {
        setLoading(false);
      }
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
        void fetchDashboardData(session.user.entra_oid, {
          showLoader: !hasLoadedOnce,
          refreshCalendar: false,
        });
      }, 0);

      const runSilentSync = () => {
        if (typeof document !== "undefined" && document.visibilityState !== "visible") {
          return;
        }
        void fetchDashboardDataSilently(session.user.entra_oid);
      };

      const handleVisibilityChange = () => {
        if (document.visibilityState === "visible") {
          runSilentSync();
        }
      };

      const interval = setInterval(() => {
        runSilentSync();
      }, 4000);
      document.addEventListener("visibilitychange", handleVisibilityChange);

      return () => {
        clearInterval(interval);
        clearTimeout(initialFetchTimer);
        document.removeEventListener("visibilitychange", handleVisibilityChange);
      };
    }
  }, [session, status, router, hasLoadedOnce]);

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

  if ((loading && !hasLoadedOnce) || status === "loading") {
    return (
      <div className="flex h-[calc(100vh-80px)] items-center justify-center">
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
    <main className="min-h-screen bg-brand-surface pb-12">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Header */}
        <div className="relative mb-10 pb-8 border-b border-[#E3DFD5] flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'radial-gradient(#0D9488 1.5px, transparent 1.5px)', backgroundSize: '32px 32px' }}></div>
          <div className="relative z-10">
            <span className="font-mono text-[10px] text-brand-muted uppercase tracking-[0.2em] mb-2 block">Student Dossier</span>
            <h1 className="text-3xl md:text-4xl font-extrabold font-display text-brand-text tracking-tight">
              {profile?.name ? `Welcome, ${profile.name.split(' ')[0]}.` : "Welcome."}
            </h1>
            <div className="mt-4 flex flex-wrap items-center gap-3 font-sans text-xs text-brand-muted">
              <span className="px-3 py-1 bg-white border border-[#E3DFD5] rounded-[9999px] shadow-sm font-semibold">{profile?.major || "Loading Major"}</span>
              <span className="px-3 py-1 bg-white border border-[#E3DFD5] rounded-[9999px] shadow-sm font-semibold">{profile?.year || "Year"}</span>
              <span className="font-mono text-[10px] px-1">ID: {profile?.student_id || "..."}</span>
            </div>
          </div>
          <button
            onClick={handleStartNewChat}
            disabled={creatingTicket}
            className="group relative z-10 flex h-10 items-center justify-center gap-2 rounded-[9999px] bg-brand-primary px-5 text-sm font-bold text-white shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md disabled:opacity-50 disabled:hover:translate-y-0"
          >
            {creatingTicket ? "Initializing..." : <><MessageCircle className="w-4 h-4 transition-transform group-hover:scale-110" /> Initiate Consultation</>}
          </button>
        </div>

        {/* Holds Alerts */}
        {activeHolds.length > 0 ? (
          <section className="mb-12 relative">
            <div className="absolute -left-3 top-0 bottom-0 w-1 bg-brand-error rounded-full"></div>
            <div className="flex items-center gap-2 mb-4 pl-1">
              <AlertOctagon className="w-5 h-5 text-brand-error" />
              <h2 className="text-xl font-bold font-display text-brand-text tracking-tight">Action Required <span className="text-brand-error font-mono text-sm align-top">({activeHolds.length})</span></h2>
            </div>
            <div className="grid gap-4 md:grid-cols-2 pl-1">
              {activeHolds.map((hold) => (
                <div key={hold.id} className="relative overflow-hidden rounded-[1.25rem] bg-white p-6 shadow-sm border border-red-100 group transition-all duration-300 hover:shadow-md">
                  <div className="absolute top-0 right-0 p-4 opacity-[0.02] group-hover:opacity-[0.04] transition-opacity duration-500 pointer-events-none">
                    <AlertOctagon className="w-24 h-24 text-brand-error -mt-4 -mr-4" />
                  </div>
                  <div className="relative z-10 flex flex-col h-full justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <span className="rounded-full bg-red-50 border border-red-100 px-2 py-0.5 text-[10px] font-bold tracking-widest text-brand-error uppercase font-mono">
                          {hold.type}
                        </span>
                        <span className="text-[10px] text-brand-muted font-mono bg-zinc-50 border border-zinc-100 px-2 py-0.5 rounded-full uppercase tracking-wider">{hold.status}</span>
                      </div>
                      <h3 className="text-lg font-bold text-brand-text mb-2 font-display leading-tight">{hold.reason}</h3>
                      <p className="text-xs text-brand-muted leading-relaxed">
                        {hold.resolution_steps}
                      </p>
                    </div>
                    <div className="mt-6">
                      {hold.id === "hold-financial" && (
                        <button
                          onClick={handleStartNewChat}
                          className="flex w-full h-10 items-center justify-center rounded-xl bg-brand-primary-light/30 text-brand-primary text-xs font-bold hover:bg-brand-primary hover:text-white transition-colors border border-brand-primary/20"
                        >
                          Request Temporary Lift via AI
                        </button>
                      )}
                      {hold.id === "hold-academic" && (
                        <Link
                          href="/student/appeal"
                          className="flex w-full h-10 items-center justify-center rounded-xl bg-brand-primary-light/30 text-brand-primary text-xs font-bold hover:bg-brand-m365 hover:text-white transition-colors border border-brand-primary/20 hover:border-brand-m365"
                        >
                          Open SAP Appeal Wizard
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        ) : (
          <section className="mb-12 rounded-[1.25rem] border border-brand-success/20 bg-gradient-to-br from-green-50/50 to-transparent p-6 flex items-center gap-4 shadow-sm">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-brand-success/10 text-brand-success">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
            </div>
            <div>
              <p className="text-lg font-bold text-brand-success font-display tracking-tight">Clear Account Status</p>
              <p className="text-brand-muted font-sans text-xs mt-1">You have no active holds. You are cleared to enroll and register for classes.</p>
            </div>
          </section>
        )}

        {/* Dashboard Grid */}
        <div className="grid gap-8 lg:gap-8 lg:grid-cols-12">
          {/* Calendar Section */}
          <section className="lg:col-span-7 flex flex-col">
            <div className="flex flex-row items-end justify-between mb-4 gap-4">
              <div>
                <span className="font-mono text-[10px] text-brand-m365 uppercase tracking-widest mb-1.5 block">Outlook Integration</span>
                <h2 className="text-xl font-bold font-display text-brand-text tracking-tight">Academic Calendar</h2>
              </div>
              <button
                onClick={handleRefreshCalendar}
                disabled={calendarRefreshing}
                className="group flex items-center gap-1.5 text-[10px] font-bold font-mono uppercase tracking-widest text-brand-muted hover:text-brand-primary transition-colors bg-white px-3 py-1.5 rounded-full border border-[#E3DFD5] shadow-sm"
              >
                <RefreshCw className={`w-3 h-3 ${calendarRefreshing ? "animate-spin text-brand-primary" : "group-hover:text-brand-primary"}`} />
                <span>Sync</span>
              </button>
            </div>

            <div className="flex-1 rounded-[1.5rem] bg-white p-6 shadow-sm border border-[#E3DFD5] relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-brand-primary-light/20 rounded-full blur-[60px] -mr-32 -mt-32 pointer-events-none"></div>
              
              {calendarError ? (
                <div className="py-12 text-center relative z-10">
                  <div className="flex h-16 w-16 items-center justify-center rounded-[1.25rem] bg-amber-50 text-amber-500 mx-auto mb-4 rotate-3 border border-amber-100">
                    <Calendar className="w-8 h-8 -rotate-3" />
                  </div>
                  <p className="text-lg font-bold text-brand-text font-display mb-2">Calendar Unavailable</p>
                  <p className="text-sm text-brand-muted max-w-xs mx-auto leading-relaxed">{calendarError}</p>
                  {calendarErrorCode === "GRAPH_CONSENT_REQUIRED" && (
                    <button
                      onClick={handleReconnectM365}
                      className="mt-6 inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-brand-m365 px-5 text-xs font-bold text-white shadow-sm hover:bg-blue-700 transition-all"
                    >
                      Authorize M365 Connection
                    </button>
                  )}
                </div>
              ) : events.length > 0 ? (
                <div className="space-y-6 relative z-10 animate-fade-in">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold text-brand-text font-display">
                      {calendarMonth.toLocaleDateString([], { month: "long", year: "numeric" })}
                    </h3>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setCalendarMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))}
                        className="flex h-8 w-8 items-center justify-center rounded-full border border-[#E3DFD5] bg-white text-brand-text hover:border-brand-primary hover:text-brand-primary hover:bg-zinc-50 transition-all"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setCalendarMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))}
                        className="flex h-8 w-8 items-center justify-center rounded-full border border-[#E3DFD5] bg-white text-brand-text hover:border-brand-primary hover:text-brand-primary hover:bg-zinc-50 transition-all"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-7 gap-y-2 gap-x-1">
                    {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((day) => (
                      <div key={day} className="text-center font-mono text-[9px] uppercase tracking-[0.1em] text-brand-muted pb-2 border-b border-[#E3DFD5]/50">
                        {day}
                      </div>
                    ))}
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
                          className={`relative flex flex-col items-center justify-center h-10 sm:h-12 w-full rounded-xl transition-all duration-200 ${
                            isSelected
                              ? "bg-brand-primary text-white shadow-sm z-10"
                              : "hover:bg-zinc-50 text-brand-text"
                          } ${!inMonth && !isSelected ? "opacity-30" : ""}`}
                        >
                          <span className={`text-sm font-semibold ${isToday && !isSelected ? "text-brand-primary" : ""}`}>
                            {day.getDate()}
                          </span>
                          {count > 0 && (
                            <span className={`absolute bottom-1 w-1 h-1 rounded-full ${isSelected ? "bg-white" : "bg-brand-m365"}`}></span>
                          )}
                        </button>
                      );
                    })}
                  </div>

                  <div className="pt-6 border-t border-[#E3DFD5] mt-6">
                    <p className="text-[10px] font-mono uppercase tracking-[0.15em] text-brand-muted mb-4">
                      {new Date(selectedDateKey).toLocaleDateString([], { weekday: "long", month: "long", day: "numeric" })}
                    </p>
                    {selectedDateEvents.length === 0 ? (
                      <p className="text-brand-muted italic text-sm font-display">No scheduled activities for this date.</p>
                    ) : (
                      <div className="space-y-3">
                        {selectedDateEvents.map((evt) => {
                          const startDate = new Date(evt.start);
                          const formatTime = evt.isAllDay ? "All-day" : startDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
                          const isDeadline = evt.title.toLowerCase().includes("deadline") || evt.title.toLowerCase().includes("renewal");

                          return (
                            <div key={evt.id} className="group relative flex gap-4 items-start p-3 rounded-xl hover:bg-zinc-50 border border-transparent hover:border-[#E3DFD5] transition-all">
                              <div className="flex flex-col items-center mt-1">
                                <div className={`w-2.5 h-2.5 rounded-full ${isDeadline ? "bg-brand-warning" : "bg-brand-primary"} ring-2 ring-white shadow-sm z-10`}></div>
                                <div className="w-[1.5px] h-full bg-[#E3DFD5] absolute top-6 bottom-0 group-last:hidden"></div>
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex justify-between items-start mb-1 gap-3">
                                  <h4 className="text-sm font-bold text-brand-text font-display leading-tight truncate">{evt.title}</h4>
                                  <span className="shrink-0 rounded-full bg-white border border-[#E3DFD5] px-2 py-0.5 text-[9px] font-bold text-brand-muted uppercase tracking-widest shadow-sm">
                                    {evt.source}
                                  </span>
                                </div>
                                <p className="text-xs text-brand-muted flex items-center gap-1.5 font-sans font-medium">
                                  <Clock className="w-3 h-3 opacity-50" /> {formatTime}
                                </p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="py-12 text-center relative z-10">
                  <div className="flex h-16 w-16 items-center justify-center rounded-[1.25rem] bg-brand-m365/5 border border-brand-m365/10 mx-auto mb-4">
                    <Calendar className="w-8 h-8 text-brand-m365 opacity-60" />
                  </div>
                  <p className="text-lg font-bold text-brand-text font-display mb-1">Schedule Clear</p>
                  <p className="text-sm text-brand-muted">No Outlook Calendar events found in the next 14 days.</p>
                </div>
              )}
            </div>
          </section>

          {/* Active Tickets Section */}
          <section className="lg:col-span-5 flex flex-col">
            <div className="flex items-end justify-between mb-4">
              <div>
                <span className="font-mono text-[10px] text-brand-muted uppercase tracking-widest mb-1.5 block">Resolution History</span>
                <h2 className="text-xl font-bold font-display text-brand-text tracking-tight">Active Tickets</h2>
              </div>
              <span className="flex items-center justify-center h-7 px-3 rounded-full bg-brand-primary-light/40 text-brand-primary font-bold text-[10px] border border-brand-primary/20 font-mono tracking-widest uppercase">
                {tickets.length} Active
              </span>
            </div>

            <div className="flex-1 space-y-4">
              {tickets.length > 0 ? (
                <>
                  {tickets
                    .slice((ticketPage - 1) * TICKETS_PER_PAGE, ticketPage * TICKETS_PER_PAGE)
                    .map((ticket) => (
                      <div
                        key={ticket.id}
                        className="group flex flex-col rounded-[1.25rem] bg-white p-5 shadow-sm border border-[#E3DFD5] hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 relative overflow-hidden"
                      >
                        <div className="absolute top-0 right-0 w-24 h-24 bg-zinc-50 rounded-full blur-xl -mr-10 -mt-10 pointer-events-none"></div>
                        <div className="flex items-start justify-between mb-4 relative z-10">
                          <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${ticket.status === "Open" ? "bg-brand-success animate-pulse" : ticket.status === "Pending Agent" ? "bg-amber-500" : "bg-zinc-300"}`}></div>
                            <span className="text-[10px] font-mono text-brand-muted uppercase tracking-[0.1em]">{ticket.ticket_id}</span>
                          </div>
                          <span
                            className={`rounded-full px-2.5 py-0.5 text-[9px] font-bold tracking-widest uppercase border ${
                              ticket.status === "Open"
                                ? "bg-green-50 border-green-200 text-green-700"
                                : ticket.status === "Pending Agent"
                                ? "bg-amber-50 border-amber-200 text-amber-700"
                                : "bg-zinc-50 border-zinc-200 text-zinc-600"
                            }`}
                          >
                            {ticket.status}
                          </span>
                        </div>
                        <h3 className="text-base font-bold font-display text-brand-text mb-4 relative z-10 leading-tight">Support Consultation</h3>
                        
                        <div className="mt-auto flex items-center justify-between pt-4 border-t border-[#E3DFD5]/70 relative z-10">
                          <span className="text-[10px] text-brand-muted font-medium font-sans">
                            Opened {new Date(ticket.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                          </span>
                          <Link
                            href={`/student/chat?ticketId=${ticket.id}`}
                            className="flex items-center gap-1 text-xs font-bold text-brand-primary hover:text-teal-900 transition-colors uppercase tracking-widest font-mono"
                          >
                            Resume <ChevronRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
                          </Link>
                        </div>
                      </div>
                    ))}

                  {/* Pagination Controls */}
                  {tickets.length > TICKETS_PER_PAGE && (
                    <div className="flex items-center justify-between pt-4 px-2">
                      <button
                        onClick={() => setTicketPage((p) => Math.max(p - 1, 1))}
                        disabled={ticketPage === 1}
                        className="flex h-8 w-8 items-center justify-center rounded-full border border-[#E3DFD5] bg-white text-brand-text hover:border-brand-primary hover:text-brand-primary disabled:opacity-30 transition-colors shadow-sm"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      <span className="text-[10px] font-mono tracking-[0.2em] text-brand-muted uppercase">
                        {ticketPage} / {Math.ceil(tickets.length / TICKETS_PER_PAGE)}
                      </span>
                      <button
                        onClick={() => setTicketPage((p) => Math.min(p + 1, Math.ceil(tickets.length / TICKETS_PER_PAGE)))}
                        disabled={ticketPage === Math.ceil(tickets.length / TICKETS_PER_PAGE)}
                        className="flex h-8 w-8 items-center justify-center rounded-full border border-[#E3DFD5] bg-white text-brand-text hover:border-brand-primary hover:text-brand-primary disabled:opacity-30 transition-colors shadow-sm"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <div className="flex flex-col items-center justify-center h-48 rounded-[1.5rem] bg-brand-primary-light/5 border border-brand-primary/10 border-dashed">
                  <MessageCircle className="w-8 h-8 text-brand-primary/20 mb-3" />
                  <p className="text-sm text-brand-text font-display font-bold mb-1">No Active Inquiries</p>
                  <p className="text-xs text-brand-muted mb-4 font-sans">Need assistance? Start a new consultation.</p>
                  <button
                    onClick={handleStartNewChat}
                    disabled={creatingTicket}
                    className="flex h-9 items-center justify-center rounded-xl bg-white border border-[#E3DFD5] px-5 text-xs font-bold text-brand-primary hover:border-brand-primary shadow-sm hover:shadow transition-all hover:-translate-y-0.5"
                  >
                    Create Ticket
                  </button>
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
