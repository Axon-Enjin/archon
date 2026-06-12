"use client";

import { useSession, signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { MessageCircle, AlertOctagon, Calendar, Clock, ChevronLeft, ChevronRight, RefreshCw, X } from "lucide-react";

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

interface FinancialSummary {
  balance_due: number;
  currency: string;
  payment_deadline: string;
  scholarship_renewal_deadline: string;
  scholarship_renewal_submitted?: boolean;
  scholarship_renewal_status?: "not_started" | "in_progress" | "submitted";
}

interface UpcomingDeadline {
  key: string;
  label: string;
  date: Date;
  tone: "critical" | "warning" | "info";
}

function toDateKey(dateInput: string | Date): string {
  const d = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function formatCountdown(ms: number): string {
  if (ms <= 0) return "Due now";
  const totalSeconds = Math.floor(ms / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (days > 0) return `${days}d ${hours}h ${minutes}m`;
  if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`;
  return `${minutes}m ${seconds}s`;
}

export default function StudentDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [holds, setHolds] = useState<HoldItem[]>([]);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [tickets, setTickets] = useState<TicketItem[]>([]);
  const [financial, setFinancial] = useState<FinancialSummary | null>(null);
  const [now, setNow] = useState<Date>(() => new Date());
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
  const [hoveredDateKey, setHoveredDateKey] = useState<string | null>(null);
  const [pinnedDateKey, setPinnedDateKey] = useState<string | null>(null);

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

      try {
        const financialRes = await fetch(`/api/v1/student/${studentOid}/financial`);
        const financialData = await financialRes.json();
        if (financialData.success) setFinancial(financialData.data);
      } catch (financialErr) {
        console.warn("Failed to load financial summary", financialErr);
      }
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
      const [holdsRes, ticketsRes, financialRes] = await Promise.all([
        fetch(`/api/v1/student/${studentOid}/holds`),
        fetch(`/api/v1/tickets?studentId=${studentOid}`),
        fetch(`/api/v1/student/${studentOid}/financial`),
      ]);
      const [holdsData, ticketsData, financialData] = await Promise.all([
        holdsRes.json(),
        ticketsRes.json(),
        financialRes.json(),
      ]);
      if (holdsData.success) setHolds(holdsData.data);
      if (ticketsData.success) setTickets(ticketsData.data);
      if (financialData.success) setFinancial(financialData.data);
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

  // Live-ticking clock so deadline countdowns update in real time (PRD-F5).
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Dismiss a pinned calendar popover on Escape or an outside click.
  useEffect(() => {
    if (!pinnedDateKey) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setPinnedDateKey(null);
    };
    const onPointerDown = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && !target.closest("[data-calendar-day]")) {
        setPinnedDateKey(null);
      }
    };
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("mousedown", onPointerDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("mousedown", onPointerDown);
    };
  }, [pinnedDateKey]);

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
  const recentlyResolvedHolds = holds.filter((h) => h.status === "Resolved");

  const upcomingDeadlines: UpcomingDeadline[] = [];
  if (financial) {
    const scholarshipSubmitted =
      financial.scholarship_renewal_submitted === true ||
      financial.scholarship_renewal_status === "submitted";
    if (financial.payment_deadline && (financial.balance_due ?? 0) > 0) {
      upcomingDeadlines.push({
        key: "payment",
        label: "Tuition payment due",
        date: new Date(financial.payment_deadline),
        tone: "critical",
      });
    }
    if (financial.scholarship_renewal_deadline && !scholarshipSubmitted) {
      upcomingDeadlines.push({
        key: "scholarship",
        label: "Scholarship renewal due",
        date: new Date(financial.scholarship_renewal_deadline),
        tone: "warning",
      });
    }
  }
  const futureDeadlines = upcomingDeadlines
    .filter((d) => !Number.isNaN(d.date.getTime()) && d.date.getTime() > now.getTime() - 24 * 60 * 60 * 1000)
    .sort((a, b) => a.date.getTime() - b.date.getTime());

  const eventsByDate = events.reduce<Record<string, CalendarEvent[]>>((acc, evt) => {
    const key = toDateKey(evt.start);
    acc[key] = acc[key] || [];
    acc[key].push(evt);
    return acc;
  }, {});

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

        {/* Deadline Countdown (PRD-F5) */}
        {futureDeadlines.length > 0 && (
          <section className="mb-10">
            <div className="flex items-center gap-2 mb-4 pl-1">
              <Clock className="w-5 h-5 text-brand-primary" />
              <h2 className="text-xl font-bold font-display text-brand-text tracking-tight">
                Countdown
              </h2>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 pl-1">
              {futureDeadlines.slice(0, 2).map((deadline) => {
                const remaining = deadline.date.getTime() - now.getTime();
                const isPast = remaining <= 0;
                const days = Math.ceil(remaining / (1000 * 60 * 60 * 24));
                const tone =
                  isPast || days <= 3
                    ? "critical"
                    : deadline.tone === "warning" || days <= 7
                      ? "warning"
                      : "info";
                const toneStyles =
                  tone === "critical"
                    ? "border-red-100 bg-red-50/40 text-brand-error"
                    : tone === "warning"
                      ? "border-amber-100 bg-amber-50/40 text-amber-600"
                      : "border-brand-primary/15 bg-brand-primary-light/20 text-brand-primary";
                return (
                  <div
                    key={deadline.key}
                    className={`relative overflow-hidden rounded-[1.25rem] border bg-white p-5 shadow-sm transition-all duration-300 ${toneStyles.split(" ").slice(0, 2).join(" ")}`}
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="text-[10px] font-mono uppercase tracking-widest text-brand-muted mb-1">
                          {deadline.label}
                        </p>
                        <p
                          className={`font-display text-2xl font-extrabold tabular-nums tracking-tight ${toneStyles.split(" ").slice(2).join(" ")} ${tone === "critical" ? "animate-pulse" : ""}`}
                        >
                          {formatCountdown(remaining)}
                        </p>
                        <p className="text-xs text-brand-muted mt-1">
                          {deadline.date.toLocaleDateString([], {
                            month: "long",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </p>
                      </div>
                      <div
                        className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${
                          tone === "critical"
                            ? "bg-red-100 text-brand-error"
                            : tone === "warning"
                              ? "bg-amber-100 text-amber-600"
                              : "bg-brand-primary/10 text-brand-primary"
                        }`}
                      >
                        <Clock className="h-6 w-6" />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

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
                        {hold.status === "Lifting" ? (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 border border-amber-200 px-2 py-0.5 text-[10px] font-bold text-amber-600 uppercase tracking-wider font-mono">
                            <RefreshCw className="h-3 w-3 animate-spin" />
                            Lifting
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-zinc-50 border border-zinc-100 px-2 py-0.5 text-[10px] text-brand-muted uppercase tracking-wider font-mono">
                            <span className="h-1.5 w-1.5 rounded-full bg-brand-error animate-pulse" />
                            {hold.status}
                          </span>
                        )}
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

        {/* Recently cleared holds — the visible "Resolved" end-state (PRD-F5) */}
        {recentlyResolvedHolds.length > 0 && (
          <section className="mb-12 -mt-6">
            <div className="flex flex-wrap gap-2 pl-1">
              {recentlyResolvedHolds.map((hold) => (
                <span
                  key={hold.id}
                  className="inline-flex items-center gap-1.5 rounded-full border border-brand-success/20 bg-green-50/60 px-3 py-1 text-[11px] font-semibold text-brand-success font-mono uppercase tracking-wider animate-fade-in"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                  {hold.type} hold cleared
                </span>
              ))}
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
                <h2 className="text-xl font-bold font-display text-brand-text tracking-tight">Outlook Calendar</h2>
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

            <div className="flex-1 rounded-[1.5rem] bg-white p-6 shadow-sm border border-[#E3DFD5] relative overflow-visible">
              <div className="absolute inset-0 overflow-hidden rounded-[1.5rem] pointer-events-none">
                <div className="absolute top-0 right-0 w-64 h-64 bg-brand-primary-light/20 rounded-full blur-[60px] -mr-32 -mt-32"></div>
              </div>
              
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
                      const dayEvents = (eventsByDate[key] || [])
                        .slice()
                        .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
                      const count = dayEvents.length;
                      const isToday = key === toDateKey(new Date());
                      const isPinned = pinnedDateKey === key;
                      const showPopover = count > 0 && (isPinned || (hoveredDateKey === key && !pinnedDateKey));

                      return (
                        <div
                          key={key}
                          data-calendar-day
                          className="relative"
                          onMouseEnter={() => setHoveredDateKey(key)}
                          onMouseLeave={() => setHoveredDateKey((prev) => (prev === key ? null : prev))}
                        >
                          <button
                            onClick={() => {
                              setSelectedDateKey(key);
                              if (count > 0) {
                                setPinnedDateKey((prev) => (prev === key ? null : key));
                              } else {
                                setPinnedDateKey(null);
                              }
                            }}
                            onFocus={() => setHoveredDateKey(key)}
                            onBlur={() => setHoveredDateKey((prev) => (prev === key ? null : prev))}
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

                          {/* Hover (peek) / click (pinned) popover with the day's events (PRD-F11 / US-08) */}
                          {showPopover && (
                            <div
                              className={`absolute bottom-full left-1/2 z-30 mb-2 w-64 -translate-x-1/2 animate-fade-in ${
                                isPinned ? "pointer-events-auto" : "pointer-events-none"
                              }`}
                            >
                              <div className="rounded-2xl bg-white shadow-xl border border-[#E3DFD5] overflow-hidden">
                                <div className="flex items-start justify-between gap-2 px-4 pt-3 pb-2 border-b border-[#E3DFD5] bg-zinc-50/60">
                                  <div>
                                    <p className="text-[10px] font-mono uppercase tracking-widest text-brand-m365">Outlook</p>
                                    <p className="text-xs font-bold text-brand-text font-display">
                                      {day.toLocaleDateString([], { weekday: "long", month: "long", day: "numeric" })}
                                    </p>
                                  </div>
                                  {isPinned && (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setPinnedDateKey(null);
                                      }}
                                      aria-label="Close"
                                      className="shrink-0 -mr-1 -mt-0.5 flex h-6 w-6 items-center justify-center rounded-full text-brand-muted hover:text-brand-text hover:bg-zinc-100 transition-colors"
                                    >
                                      <X className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                </div>
                                <div className="px-4 py-3 space-y-2.5 max-h-56 overflow-y-auto overscroll-contain">
                                  {dayEvents.map((evt) => {
                                    const startDate = new Date(evt.start);
                                    const endDate = new Date(evt.end);
                                    const formatTime = evt.isAllDay
                                      ? "All-day"
                                      : `${startDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} – ${endDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
                                    const isDeadline = evt.title.toLowerCase().includes("deadline") || evt.title.toLowerCase().includes("renewal");
                                    return (
                                      <div key={evt.id} className="flex gap-2.5 items-start text-left">
                                        <div className={`mt-1 w-2 h-2 rounded-full shrink-0 ${isDeadline ? "bg-brand-warning" : "bg-brand-primary"} ring-2 ring-white`}></div>
                                        <div className="flex-1 min-w-0">
                                          <p className="text-xs font-bold text-brand-text font-display leading-snug">{evt.title}</p>
                                          <p className="text-[11px] text-brand-muted flex items-center gap-1 font-medium mt-0.5">
                                            <Clock className="w-3 h-3 opacity-50" /> {formatTime}
                                          </p>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                              {/* caret */}
                              <div className="absolute top-full left-1/2 -mt-1 h-2.5 w-2.5 -translate-x-1/2 rotate-45 border-b border-r border-[#E3DFD5] bg-white"></div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  <p className="pt-4 text-center text-[10px] font-mono uppercase tracking-widest text-brand-muted">
                    Hover to peek · click a date to keep it open
                  </p>
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
