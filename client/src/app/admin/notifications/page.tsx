"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import {
  RefreshCw,
  Send,
  X,
  Bell,
  Mail,
  MessageSquare,
  Clock,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  RotateCw,
  Ban,
  Eye,
  CalendarClock,
  UploadCloud,
  Stethoscope,
  Search,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

type NotificationChannel = "teams" | "outlook";
type NotificationStatus = "pending" | "processing" | "sent" | "failed";

interface NotificationJob {
  id: string;
  institution_id: string;
  channel: NotificationChannel;
  recipient_entra_oid: string;
  recipient_email?: string;
  status: NotificationStatus;
  attempts: number;
  payload: {
    title?: string;
    message?: string;
    action_url?: string;
    subject?: string;
    text_body?: string;
    html_body?: string;
    ticket_id?: string;
  };
  provider_message_id?: string;
  error_message?: string;
  created_at: string;
  updated_at: string;
}

type StatusFilter = "all" | NotificationStatus;
type ChannelFilter = "all" | NotificationChannel;

interface AnalyticsSummary {
  totals: {
    handoffs: number;
    wrapUpCompleted: number;
    wrapUpPending: number;
  };
  rates: {
    wrapUpCompletionRate: number;
    consentCoverageRate: number;
    notificationActionRate: number;
  };
  consent: {
    trackedStudents: number;
    snapshotsAvailable: number;
    granted: number;
    missing: number;
    tokenMissing: number;
  };
}

export default function AdminNotificationOpsPage() {
  const { data: session } = useSession();
  const [jobs, setJobs] = useState<NotificationJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [retryingIds, setRetryingIds] = useState<Record<string, boolean>>({});
  const [actioningIds, setActioningIds] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [channelFilter, setChannelFilter] = useState<ChannelFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [testModalOpen, setTestModalOpen] = useState(false);
  const [detailJob, setDetailJob] = useState<NotificationJob | null>(null);
  const [testChannel, setTestChannel] = useState<NotificationChannel>("teams");
  const [recipientEntraOid, setRecipientEntraOid] = useState("");
  const [recipientEmail, setRecipientEmail] = useState("");
  const [title, setTitle] = useState("Archon Test Notification");
  const [message, setMessage] = useState("This is a test Teams alert from Notification Ops.");
  const [subject, setSubject] = useState("Archon Test Email");
  const [textBody, setTextBody] = useState("This is a test Outlook notification from Notification Ops.");
  const [actionUrl, setActionUrl] = useState("");
  const [ticketId, setTicketId] = useState("");
  const [sendingTest, setSendingTest] = useState(false);
  const [runningReminders, setRunningReminders] = useState(false);
  const [syncingOutbox, setSyncingOutbox] = useState(false);
  const [runningDiagnostics, setRunningDiagnostics] = useState(false);
  const [diagnosticsOutput, setDiagnosticsOutput] = useState<string | null>(null);
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);

  const fetchSummary = async () => {
    try {
      const res = await fetch("/api/v1/admin/analytics/summary?limit=2000");
      const data = await res.json();
      if (data.success) {
        setSummary(data.data);
      }
    } catch (err) {
      console.warn("Failed to load admin analytics summary", err);
    }
  };

  const fetchJobs = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const res = await fetch("/api/v1/notify/jobs?limit=200");
      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || "Failed to load notification jobs.");
      }

      setJobs(data.data || []);
      setError(null);
      await fetchSummary();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load notification jobs.";
      setError(message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRetry = async (job: NotificationJob) => {
    try {
      setRetryingIds((prev) => ({ ...prev, [job.id]: true }));
      const res = await fetch(`/api/v1/notify/jobs/${job.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "pending",
          attempts: (job.attempts || 0) + 1,
        }),
      });
      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || "Retry failed.");
      }

      setJobs((prev) =>
        prev.map((existing) => (existing.id === job.id ? data.data : existing))
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : "Retry failed.";
      setError(message);
    } finally {
      setRetryingIds((prev) => ({ ...prev, [job.id]: false }));
    }
  };

  const handleSendTest = async () => {
    try {
      setSendingTest(true);
      setError(null);
      setSuccessMessage(null);

      const cleanRecipientOid = recipientEntraOid.trim();
      const cleanTicketId = ticketId.trim();

      const endpoint = testChannel === "teams" ? "/api/v1/notify/teams" : "/api/v1/notify/email";
      const payload =
        testChannel === "teams"
          ? {
              recipientEntraOid: cleanRecipientOid || undefined,
              title: title.trim() || "Archon Test Notification",
              message: message.trim() || "You have an update from Archon.",
              actionUrl: actionUrl.trim() || undefined,
              ticketId: cleanTicketId || undefined,
            }
          : {
              recipientEntraOid: cleanRecipientOid || undefined,
              recipientEmail: recipientEmail.trim() || undefined,
              subject: subject.trim() || "Archon Test Email",
              textBody: textBody.trim() || "You have an update from Archon.",
              ticketId: cleanTicketId || undefined,
            };

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || "Failed to queue test notification.");
      }

      setSuccessMessage(
        `Queued ${testChannel === "teams" ? "Teams" : "Outlook"} test notification successfully.`
      );
      setTestModalOpen(false);
      await fetchJobs(true);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to queue test notification.";
      setError(msg);
    } finally {
      setSendingTest(false);
    }
  };

  const handleCancel = async (job: NotificationJob) => {
    try {
      setActioningIds((prev) => ({ ...prev, [job.id]: true }));
      const res = await fetch(`/api/v1/notify/jobs/${job.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "failed",
          errorMessage: "Cancelled by administrator.",
        }),
      });
      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || "Cancel failed.");
      }
      setJobs((prev) => prev.map((existing) => (existing.id === job.id ? data.data : existing)));
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Cancel failed.";
      setError(msg);
    } finally {
      setActioningIds((prev) => ({ ...prev, [job.id]: false }));
    }
  };

  const handleMarkSent = async (job: NotificationJob) => {
    try {
      setActioningIds((prev) => ({ ...prev, [job.id]: true }));
      const res = await fetch(`/api/v1/notify/jobs/${job.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "sent" }),
      });
      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || "Failed to mark as sent.");
      }
      setJobs((prev) => prev.map((existing) => (existing.id === job.id ? data.data : existing)));
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to mark as sent.";
      setError(msg);
    } finally {
      setActioningIds((prev) => ({ ...prev, [job.id]: false }));
    }
  };

  const handleRunReminders = async () => {
    try {
      setRunningReminders(true);
      setError(null);
      setSuccessMessage(null);

      const res = await fetch("/api/v1/notify/reminders", {
        method: "POST",
      });
      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || "Failed to generate reminder jobs.");
      }

      setSuccessMessage(
        `Reminder generation complete: ${data.data.queuedTotal} queued (${data.data.queuedTeams} Teams, ${data.data.queuedOutlook} Outlook) across ${data.data.studentsScanned} student(s).`
      );
      await fetchJobs(true);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to generate reminder jobs.";
      setError(msg);
    } finally {
      setRunningReminders(false);
    }
  };

  const handleSyncPowerAutomateOutbox = async () => {
    try {
      setSyncingOutbox(true);
      setError(null);
      setSuccessMessage(null);

      const res = await fetch("/api/v1/notify/power-automate/sync?status=pending&limit=100", {
        method: "POST",
      });
      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || "Failed to sync pending jobs to Power Automate outbox.");
      }

      setSuccessMessage(
        `Outbox sync complete: ${data.data.sentToOutbox} handed off, ${data.data.failed} failed, ${data.data.scanned} scanned.`
      );
      await fetchJobs(true);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to sync pending jobs to Power Automate outbox.";
      setError(msg);
    } finally {
      setSyncingOutbox(false);
    }
  };

  const handleRunPowerAutomateDiagnostics = async () => {
    try {
      setRunningDiagnostics(true);
      setError(null);
      setSuccessMessage(null);
      setDiagnosticsOutput(null);

      const res = await fetch("/api/v1/notify/power-automate/diagnostics");
      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || "Failed to run Power Automate diagnostics.");
      }

      setSuccessMessage("Power Automate diagnostics completed.");
      setDiagnosticsOutput(JSON.stringify(data.data, null, 2));
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to run Power Automate diagnostics.";
      setError(msg);
    } finally {
      setRunningDiagnostics(false);
    }
  };

  useEffect(() => {
    if (session?.user?.role !== "Admin") return;

    const load = async (isRefresh = false) => {
      try {
        if (isRefresh) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }

        const res = await fetch("/api/v1/notify/jobs?limit=200");
        const data = await res.json();
        if (!data.success) {
          throw new Error(data.error || "Failed to load notification jobs.");
        }

        setJobs(data.data || []);
        setError(null);
        await fetchSummary();
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to load notification jobs.";
        setError(message);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    };

    const initialTimer = setTimeout(() => {
      void load();
    }, 0);

    const interval = setInterval(() => {
      void load(true);
    }, 10000);

    return () => {
      clearInterval(interval);
      clearTimeout(initialTimer);
    };
  }, [session]);

  const filteredJobs = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return jobs.filter((job) => {
      const statusMatch = statusFilter === "all" ? true : job.status === statusFilter;
      const channelMatch = channelFilter === "all" ? true : job.channel === channelFilter;
      const searchMatch =
        q.length === 0
          ? true
          : [
              job.recipient_email,
              job.recipient_entra_oid,
              job.payload.subject,
              job.payload.title,
              job.payload.message,
              job.payload.ticket_id,
              job.error_message,
            ]
              .filter(Boolean)
              .some((field) => String(field).toLowerCase().includes(q));
      return statusMatch && channelMatch && searchMatch;
    });
  }, [jobs, statusFilter, channelFilter, searchQuery]);

  const counts = useMemo(() => {
    const summary = { pending: 0, processing: 0, sent: 0, failed: 0 };
    for (const job of jobs) {
      summary[job.status] += 1;
    }
    return summary;
  }, [jobs]);

  const totalPages = Math.max(1, Math.ceil(filteredJobs.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pagedJobs = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredJobs.slice(start, start + pageSize);
  }, [filteredJobs, currentPage, pageSize]);

  const closeTestModal = useCallback(() => {
    if (!sendingTest) setTestModalOpen(false);
  }, [sendingTest]);

  return (
    <main className="flex-1 p-6 md:p-10 max-w-7xl mx-auto overflow-y-auto space-y-6">
      <section className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-primary/10 text-brand-primary">
            <Bell className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold font-display text-brand-text">Notification Ops</h1>
            <p className="text-brand-muted text-sm mt-0.5">
              {`${session?.user?.name || "Admin"} · ${session?.user?.institution_id || "N/A"}`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => void fetchJobs(true)}
            disabled={refreshing || loading}
            className="inline-flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm font-semibold text-brand-text shadow-sm hover:bg-zinc-50 disabled:opacity-50 transition"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing || loading ? "animate-spin" : ""}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
          <button
            onClick={() => setTestModalOpen(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-brand-primary px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:opacity-90 transition font-display"
          >
            <Send className="h-4 w-4" />
            Send Test
          </button>
        </div>
      </section>

      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="text-center">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-primary border-t-transparent mx-auto"></div>
            <p className="mt-3 text-xs text-brand-muted font-sans font-semibold">Loading notification jobs...</p>
          </div>
        </div>
      ) : (
        <>
          {error && (
            <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}
          {successMessage && (
            <div className="flex items-start gap-2 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
              <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { label: "Pending", value: counts.pending, icon: Clock, accent: "text-amber-600", ring: "bg-amber-50 text-amber-600" },
              { label: "Processing", value: counts.processing, icon: Loader2, accent: "text-blue-600", ring: "bg-blue-50 text-blue-600" },
              { label: "Sent", value: counts.sent, icon: CheckCircle2, accent: "text-green-600", ring: "bg-green-50 text-green-600" },
              { label: "Failed", value: counts.failed, icon: AlertTriangle, accent: "text-red-600", ring: "bg-red-50 text-red-600" },
            ].map((card) => {
              const Icon = card.icon;
              return (
                <div key={card.label} className="rounded-2xl bg-white border border-zinc-200 p-5 shadow-sm flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-brand-muted uppercase tracking-wide">{card.label}</p>
                    <p className={`text-3xl font-bold font-display mt-1 ${card.accent}`}>{card.value}</p>
                  </div>
                  <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${card.ring}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                </div>
              );
            })}
          </section>

          {summary && (
            <section className="grid gap-4 md:grid-cols-3">
              <div className="rounded-2xl bg-white border border-zinc-200 p-5 shadow-sm">
                <p className="text-xs text-brand-muted uppercase tracking-wide">Wrap-up Completion</p>
                <p className="text-2xl font-bold text-brand-text font-display mt-1">
                  {summary.rates.wrapUpCompletionRate.toFixed(1)}%
                </p>
                <p className="text-[11px] text-brand-muted mt-1">
                  {summary.totals.wrapUpCompleted} completed · {summary.totals.wrapUpPending} pending
                </p>
              </div>
              <div className="rounded-2xl bg-white border border-zinc-200 p-5 shadow-sm">
                <p className="text-xs text-brand-muted uppercase tracking-wide">M365 Consent Coverage</p>
                <p className="text-2xl font-bold text-brand-text font-display mt-1">
                  {summary.rates.consentCoverageRate.toFixed(1)}%
                </p>
                <p className="text-[11px] text-brand-muted mt-1">
                  {summary.consent.granted}/{summary.consent.snapshotsAvailable} granted snapshots
                </p>
              </div>
              <div className="rounded-2xl bg-white border border-zinc-200 p-5 shadow-sm">
                <p className="text-xs text-brand-muted uppercase tracking-wide">Delivery Success Proxy</p>
                <p className="text-2xl font-bold text-brand-text font-display mt-1">
                  {summary.rates.notificationActionRate.toFixed(1)}%
                </p>
                <p className="text-[11px] text-brand-muted mt-1">
                  tracked students: {summary.consent.trackedStudents}
                </p>
              </div>
            </section>
          )}

          <section className="rounded-2xl bg-white border border-zinc-200 shadow-sm overflow-hidden">
            <div className="flex flex-col gap-1 border-b border-zinc-100 p-5">
              <h2 className="text-base font-bold text-brand-text font-display">Operations</h2>
              <p className="text-sm text-brand-muted">Generate reminders, sync the outbox, and probe Power Automate connectivity.</p>
            </div>
            <div className="grid gap-3 p-5 sm:grid-cols-3">
              <button
                onClick={() => void handleRunReminders()}
                disabled={runningReminders}
                className="flex items-center gap-3 rounded-xl border border-zinc-200 bg-zinc-50/60 p-4 text-left hover:border-brand-primary hover:bg-brand-primary/5 disabled:opacity-50 transition"
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-primary/10 text-brand-primary shrink-0">
                  <CalendarClock className="h-4 w-4" />
                </span>
                <span>
                  <span className="block text-sm font-semibold text-brand-text">
                    {runningReminders ? "Generating..." : "Run Reminders"}
                  </span>
                  <span className="block text-[11px] text-brand-muted">Queue daily holds &amp; deadline jobs</span>
                </span>
              </button>
              <button
                onClick={() => void handleSyncPowerAutomateOutbox()}
                disabled={syncingOutbox}
                className="flex items-center gap-3 rounded-xl border border-zinc-200 bg-zinc-50/60 p-4 text-left hover:border-brand-primary hover:bg-brand-primary/5 disabled:opacity-50 transition"
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-primary/10 text-brand-primary shrink-0">
                  <UploadCloud className="h-4 w-4" />
                </span>
                <span>
                  <span className="block text-sm font-semibold text-brand-text">
                    {syncingOutbox ? "Syncing..." : "Sync PA Outbox"}
                  </span>
                  <span className="block text-[11px] text-brand-muted">Hand off pending jobs</span>
                </span>
              </button>
              <button
                onClick={() => void handleRunPowerAutomateDiagnostics()}
                disabled={runningDiagnostics}
                className="flex items-center gap-3 rounded-xl border border-zinc-200 bg-zinc-50/60 p-4 text-left hover:border-brand-primary hover:bg-brand-primary/5 disabled:opacity-50 transition"
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-primary/10 text-brand-primary shrink-0">
                  <Stethoscope className="h-4 w-4" />
                </span>
                <span>
                  <span className="block text-sm font-semibold text-brand-text">
                    {runningDiagnostics ? "Running..." : "PA Diagnostics"}
                  </span>
                  <span className="block text-[11px] text-brand-muted">Probe Graph token &amp; lists</span>
                </span>
              </button>
            </div>
            {diagnosticsOutput && (
              <pre className="mx-5 mb-5 rounded-xl bg-zinc-950 text-zinc-100 text-xs p-4 overflow-x-auto">
                {diagnosticsOutput}
              </pre>
            )}
          </section>

          <section className="rounded-2xl bg-white border border-zinc-200 shadow-sm overflow-hidden">
            <div className="flex flex-col gap-3 border-b border-zinc-100 p-5 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="text-base font-bold text-brand-text font-display">Notification Jobs</h2>
                <p className="text-sm text-brand-muted">
                  {filteredJobs.length} job{filteredJobs.length === 1 ? "" : "s"}
                  {filteredJobs.length !== jobs.length ? ` of ${jobs.length}` : ""}
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                  <input
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setPage(1);
                    }}
                    placeholder="Search recipient, subject, ticket..."
                    className="w-full sm:w-64 rounded-xl border border-zinc-200 bg-white pl-9 pr-3 py-2 text-sm focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
                  />
                </div>
                <select
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value as StatusFilter);
                    setPage(1);
                  }}
                  className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
                >
                  <option value="all">All statuses</option>
                  <option value="pending">Pending</option>
                  <option value="processing">Processing</option>
                  <option value="sent">Sent</option>
                  <option value="failed">Failed</option>
                </select>
                <select
                  value={channelFilter}
                  onChange={(e) => {
                    setChannelFilter(e.target.value as ChannelFilter);
                    setPage(1);
                  }}
                  className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
                >
                  <option value="all">All channels</option>
                  <option value="teams">Teams</option>
                  <option value="outlook">Outlook</option>
                </select>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-zinc-200">
                <thead className="bg-zinc-50/80">
                  <tr>
                    <th className="px-5 py-3 text-left text-[11px] font-semibold text-zinc-500 uppercase tracking-wide">Channel</th>
                    <th className="px-5 py-3 text-left text-[11px] font-semibold text-zinc-500 uppercase tracking-wide">Recipient</th>
                    <th className="px-5 py-3 text-left text-[11px] font-semibold text-zinc-500 uppercase tracking-wide">Message</th>
                    <th className="px-5 py-3 text-left text-[11px] font-semibold text-zinc-500 uppercase tracking-wide">Status</th>
                    <th className="px-5 py-3 text-left text-[11px] font-semibold text-zinc-500 uppercase tracking-wide">Attempts</th>
                    <th className="px-5 py-3 text-left text-[11px] font-semibold text-zinc-500 uppercase tracking-wide">Updated</th>
                    <th className="px-5 py-3 text-right text-[11px] font-semibold text-zinc-500 uppercase tracking-wide">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {pagedJobs.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-5 py-12 text-center text-sm text-brand-muted">
                        No jobs found for the selected filters.
                      </td>
                    </tr>
                  )}
                  {pagedJobs.map((job) => {
                    const busy = Boolean(retryingIds[job.id]) || Boolean(actioningIds[job.id]);
                    const isOpen = job.status === "pending" || job.status === "processing";
                    return (
                      <tr key={job.id} className="hover:bg-zinc-50/70 transition-colors">
                        <td className="px-5 py-4 text-sm">
                          <span className="inline-flex items-center gap-1.5 font-medium text-brand-text">
                            {job.channel === "teams" ? (
                              <MessageSquare className="h-4 w-4 text-[#4B53BC]" />
                            ) : (
                              <Mail className="h-4 w-4 text-brand-m365" />
                            )}
                            <span className="capitalize">{job.channel}</span>
                          </span>
                        </td>
                        <td className="px-5 py-4 text-sm text-brand-text">
                          <p className="font-medium">{job.recipient_email || "N/A"}</p>
                          <p className="text-xs text-brand-muted font-mono truncate max-w-45">{job.recipient_entra_oid}</p>
                        </td>
                        <td className="px-5 py-4 text-sm text-brand-text">
                          <p className="font-medium truncate max-w-65">{job.payload.subject || job.payload.title || "Notification"}</p>
                          {job.payload.ticket_id && (
                            <p className="text-xs text-brand-muted">Ticket: {job.payload.ticket_id}</p>
                          )}
                          {job.error_message && (
                            <p className="text-xs text-red-600 mt-1 truncate max-w-65">Error: {job.error_message}</p>
                          )}
                        </td>
                        <td className="px-5 py-4 text-sm">
                          <span
                            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${
                              job.status === "sent"
                                ? "bg-green-100 text-green-700"
                                : job.status === "failed"
                                  ? "bg-red-100 text-red-700"
                                  : job.status === "processing"
                                    ? "bg-blue-100 text-blue-700"
                                    : "bg-amber-100 text-amber-700"
                            }`}
                          >
                            {job.status}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-sm text-brand-text">{job.attempts}</td>
                        <td className="px-5 py-4 text-sm text-brand-muted whitespace-nowrap">
                          {new Date(job.updated_at || job.created_at).toLocaleString()}
                        </td>
                        <td className="px-5 py-4 text-sm">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => setDetailJob(job)}
                              title="View details"
                              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-200 text-brand-muted hover:bg-zinc-100 hover:text-brand-text transition"
                            >
                              <Eye className="h-4 w-4" />
                            </button>
                            {job.status === "failed" && (
                              <button
                                onClick={() => void handleRetry(job)}
                                disabled={busy}
                                title="Retry"
                                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-200 text-brand-primary hover:bg-brand-primary/10 disabled:opacity-50 transition"
                              >
                                <RotateCw className={`h-4 w-4 ${retryingIds[job.id] ? "animate-spin" : ""}`} />
                              </button>
                            )}
                            {job.status !== "sent" && (
                              <button
                                onClick={() => void handleMarkSent(job)}
                                disabled={busy}
                                title="Mark as sent"
                                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-200 text-green-600 hover:bg-green-50 disabled:opacity-50 transition"
                              >
                                <CheckCircle2 className="h-4 w-4" />
                              </button>
                            )}
                            {isOpen && (
                              <button
                                onClick={() => void handleCancel(job)}
                                disabled={busy}
                                title="Cancel"
                                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-200 text-red-600 hover:bg-red-50 disabled:opacity-50 transition"
                              >
                                <Ban className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {filteredJobs.length > 0 && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-zinc-100 px-5 py-4">
                <div className="flex items-center gap-2 text-sm text-brand-muted">
                  <span>Rows per page</span>
                  <select
                    value={pageSize}
                    onChange={(e) => {
                      setPageSize(Number(e.target.value));
                      setPage(1);
                    }}
                    className="rounded-lg border border-zinc-200 bg-white px-2 py-1 text-sm focus:border-brand-primary focus:outline-none"
                  >
                    {[10, 25, 50].map((size) => (
                      <option key={size} value={size}>
                        {size}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <span className="text-brand-muted">
                    Page {currentPage} of {totalPages}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage <= 1}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-200 text-brand-text hover:bg-zinc-100 disabled:opacity-40 disabled:hover:bg-transparent transition"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      disabled={currentPage >= totalPages}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-200 text-brand-text hover:bg-zinc-100 disabled:opacity-40 disabled:hover:bg-transparent transition"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </section>
        </>
      )}

      {testModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-900/50 backdrop-blur-sm p-4"
          onClick={closeTestModal}
        >
          <div
            className="w-full max-w-lg rounded-2xl bg-white shadow-2xl border border-zinc-200 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-zinc-100 px-6 py-4">
              <div className="flex items-center gap-2">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-primary/10 text-brand-primary">
                  <Send className="h-4 w-4" />
                </span>
                <div>
                  <h2 className="text-base font-bold text-brand-text font-display">Send Test Notification</h2>
                  <p className="text-xs text-brand-muted">Queue a test job to validate your Power Automate flow.</p>
                </div>
              </div>
              <button
                onClick={closeTestModal}
                disabled={sendingTest}
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-brand-muted hover:bg-zinc-100 hover:text-brand-text disabled:opacity-50 transition"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4 p-6">
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setTestChannel("teams")}
                  className={`flex items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-semibold transition ${
                    testChannel === "teams"
                      ? "border-brand-primary bg-brand-primary/5 text-brand-primary"
                      : "border-zinc-200 text-brand-muted hover:bg-zinc-50"
                  }`}
                >
                  <MessageSquare className="h-4 w-4" /> Teams
                </button>
                <button
                  onClick={() => setTestChannel("outlook")}
                  className={`flex items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-semibold transition ${
                    testChannel === "outlook"
                      ? "border-brand-primary bg-brand-primary/5 text-brand-primary"
                      : "border-zinc-200 text-brand-muted hover:bg-zinc-50"
                  }`}
                >
                  <Mail className="h-4 w-4" /> Outlook
                </button>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="flex flex-col gap-1 text-xs font-medium text-brand-muted">
                  Recipient Entra OID (optional)
                  <input
                    value={recipientEntraOid}
                    onChange={(e) => setRecipientEntraOid(e.target.value)}
                    placeholder="00000000-0000-..."
                    className="rounded-xl border border-zinc-200 px-3 py-2 text-sm text-brand-text focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
                  />
                </label>
                <label className="flex flex-col gap-1 text-xs font-medium text-brand-muted">
                  Ticket ID (optional)
                  <input
                    value={ticketId}
                    onChange={(e) => setTicketId(e.target.value)}
                    placeholder="TICKET-123"
                    className="rounded-xl border border-zinc-200 px-3 py-2 text-sm text-brand-text focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
                  />
                </label>
              </div>

              {testChannel === "teams" ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="flex flex-col gap-1 text-xs font-medium text-brand-muted">
                    Title
                    <input
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="Title"
                      className="rounded-xl border border-zinc-200 px-3 py-2 text-sm text-brand-text focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
                    />
                  </label>
                  <label className="flex flex-col gap-1 text-xs font-medium text-brand-muted">
                    Action URL (optional)
                    <input
                      value={actionUrl}
                      onChange={(e) => setActionUrl(e.target.value)}
                      placeholder="https://..."
                      className="rounded-xl border border-zinc-200 px-3 py-2 text-sm text-brand-text focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
                    />
                  </label>
                  <label className="flex flex-col gap-1 text-xs font-medium text-brand-muted sm:col-span-2">
                    Message
                    <textarea
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="Message"
                      className="min-h-24 rounded-xl border border-zinc-200 px-3 py-2 text-sm text-brand-text font-sans focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
                    />
                  </label>
                </div>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="flex flex-col gap-1 text-xs font-medium text-brand-muted">
                    Recipient Email (optional)
                    <input
                      value={recipientEmail}
                      onChange={(e) => setRecipientEmail(e.target.value)}
                      placeholder="student@university.edu"
                      className="rounded-xl border border-zinc-200 px-3 py-2 text-sm text-brand-text focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
                    />
                  </label>
                  <label className="flex flex-col gap-1 text-xs font-medium text-brand-muted">
                    Subject
                    <input
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      placeholder="Subject"
                      className="rounded-xl border border-zinc-200 px-3 py-2 text-sm text-brand-text focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
                    />
                  </label>
                  <label className="flex flex-col gap-1 text-xs font-medium text-brand-muted sm:col-span-2">
                    Email Body
                    <textarea
                      value={textBody}
                      onChange={(e) => setTextBody(e.target.value)}
                      placeholder="Email Body"
                      className="min-h-24 rounded-xl border border-zinc-200 px-3 py-2 text-sm text-brand-text font-sans focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
                    />
                  </label>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-zinc-100 px-6 py-4">
              <button
                onClick={closeTestModal}
                disabled={sendingTest}
                className="rounded-xl border border-zinc-200 px-4 py-2 text-sm font-semibold text-brand-text hover:bg-zinc-50 disabled:opacity-50 transition"
              >
                Cancel
              </button>
              <button
                onClick={() => void handleSendTest()}
                disabled={sendingTest}
                className="inline-flex items-center gap-2 rounded-xl bg-brand-primary px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50 transition font-display"
              >
                {sendingTest ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Queueing...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" /> Queue Notification
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {detailJob && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-900/50 backdrop-blur-sm p-4"
          onClick={() => setDetailJob(null)}
        >
          <div
            className="w-full max-w-lg rounded-2xl bg-white shadow-2xl border border-zinc-200 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-zinc-100 px-6 py-4">
              <div className="flex items-center gap-2">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-primary/10 text-brand-primary">
                  {detailJob.channel === "teams" ? <MessageSquare className="h-4 w-4" /> : <Mail className="h-4 w-4" />}
                </span>
                <div>
                  <h2 className="text-base font-bold text-brand-text font-display">Job Details</h2>
                  <p className="text-xs text-brand-muted font-mono">{detailJob.id}</p>
                </div>
              </div>
              <button
                onClick={() => setDetailJob(null)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-brand-muted hover:bg-zinc-100 hover:text-brand-text transition"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-3 p-6 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-brand-muted">Channel</p>
                  <p className="font-medium text-brand-text capitalize">{detailJob.channel}</p>
                </div>
                <div>
                  <p className="text-xs text-brand-muted">Status</p>
                  <p className="font-medium text-brand-text capitalize">{detailJob.status}</p>
                </div>
                <div>
                  <p className="text-xs text-brand-muted">Attempts</p>
                  <p className="font-medium text-brand-text">{detailJob.attempts}</p>
                </div>
                <div>
                  <p className="text-xs text-brand-muted">Provider Msg ID</p>
                  <p className="font-medium text-brand-text font-mono truncate">{detailJob.provider_message_id || "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-brand-muted">Created</p>
                  <p className="font-medium text-brand-text">{new Date(detailJob.created_at).toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-xs text-brand-muted">Updated</p>
                  <p className="font-medium text-brand-text">{new Date(detailJob.updated_at || detailJob.created_at).toLocaleString()}</p>
                </div>
              </div>
              <div className="rounded-xl border border-zinc-100 bg-zinc-50/60 p-3">
                <p className="text-xs text-brand-muted">Recipient</p>
                <p className="font-medium text-brand-text">{detailJob.recipient_email || "N/A"}</p>
                <p className="text-xs text-brand-muted font-mono break-all">{detailJob.recipient_entra_oid}</p>
              </div>
              <div className="rounded-xl border border-zinc-100 bg-zinc-50/60 p-3">
                <p className="text-xs text-brand-muted">Payload</p>
                <pre className="mt-1 whitespace-pre-wrap wrap-break-word text-xs text-brand-text font-mono">
                  {JSON.stringify(detailJob.payload, null, 2)}
                </pre>
              </div>
              {detailJob.error_message && (
                <div className="rounded-xl border border-red-200 bg-red-50 p-3">
                  <p className="text-xs font-semibold text-red-700">Error</p>
                  <p className="text-sm text-red-700">{detailJob.error_message}</p>
                </div>
              )}
            </div>
            <div className="flex items-center justify-end gap-2 border-t border-zinc-100 px-6 py-4">
              {detailJob.status === "failed" && (
                <button
                  onClick={() => {
                    void handleRetry(detailJob);
                    setDetailJob(null);
                  }}
                  className="inline-flex items-center gap-2 rounded-xl border border-zinc-200 px-4 py-2 text-sm font-semibold text-brand-primary hover:bg-brand-primary/10 transition"
                >
                  <RotateCw className="h-4 w-4" /> Retry
                </button>
              )}
              <button
                onClick={() => setDetailJob(null)}
                className="rounded-xl bg-brand-primary px-4 py-2 text-sm font-semibold text-white hover:opacity-90 transition font-display"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
