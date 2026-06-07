"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { signOut, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";

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

export default function AdminNotificationOpsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [jobs, setJobs] = useState<NotificationJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [retryingIds, setRetryingIds] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [channelFilter, setChannelFilter] = useState<ChannelFilter>("all");
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
      await fetchJobs(true);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to queue test notification.";
      setError(msg);
    } finally {
      setSendingTest(false);
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

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin");
      return;
    }

    if (session?.user && session.user.role !== "Admin") {
      router.push("/auth/signin");
      return;
    }

    if (status === "authenticated" && session?.user?.role === "Admin") {
      const initialTimer = setTimeout(() => {
        void fetchJobs();
      }, 0);

      const interval = setInterval(() => {
        void fetchJobs(true);
      }, 10000);
      return () => {
        clearInterval(interval);
        clearTimeout(initialTimer);
      };
    }
  }, [session, status, router]);

  const filteredJobs = useMemo(() => {
    return jobs.filter((job) => {
      const statusMatch = statusFilter === "all" ? true : job.status === statusFilter;
      const channelMatch = channelFilter === "all" ? true : job.channel === channelFilter;
      return statusMatch && channelMatch;
    });
  }, [jobs, statusFilter, channelFilter]);

  const counts = useMemo(() => {
    const summary = { pending: 0, processing: 0, sent: 0, failed: 0 };
    for (const job of jobs) {
      summary[job.status] += 1;
    }
    return summary;
  }, [jobs]);

  if (status === "loading" || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-brand-surface">
        <div className="text-center">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-brand-primary border-t-transparent mx-auto"></div>
          <p className="mt-4 text-sm text-brand-muted">Loading Notification Ops...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-brand-surface font-sans">
      <aside className="w-64 h-full border-r border-zinc-200 bg-white p-6 hidden md:flex flex-col justify-between shrink-0">
        <div className="space-y-8">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-primary text-white font-extrabold text-lg font-display">
              A
            </span>
            <span className="text-lg font-bold tracking-tight text-brand-text font-display">Archon Admin</span>
          </div>

          <nav className="space-y-1">
            <Link
              href="/agent"
              className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-brand-text hover:bg-zinc-50 font-display"
            >
              📥 Active Queue
            </Link>
            <Link
              href="/admin"
              className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-brand-text hover:bg-zinc-50 font-display"
            >
              📊 Analytics
            </Link>
            <Link
              href="/admin/notifications"
              className="flex items-center gap-3 rounded-lg bg-brand-primary-light/50 px-3 py-2 text-sm font-semibold text-brand-primary font-display"
            >
              🔔 Notification Ops
            </Link>
          </nav>
        </div>

        <div>
          <button
            onClick={() => signOut({ callbackUrl: "/" })}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-brand-error hover:bg-red-50"
          >
            🚪 Sign Out
          </button>
        </div>
      </aside>

      <main className="flex-1 p-6 md:p-10 max-w-7xl mx-auto overflow-y-auto space-y-6">
        <section className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-zinc-200 pb-6 gap-4">
          <div>
            <h1 className="text-3xl font-bold font-display text-brand-text">Notification Ops</h1>
            <p className="text-brand-muted text-sm mt-1">
              {`Administrator: ${session?.user?.name || "Admin"} · Tenant: ${session?.user?.institution_id || "N/A"}`}
            </p>
          </div>
          <button
            onClick={() => void fetchJobs(true)}
            disabled={refreshing}
            className="inline-flex items-center gap-2 rounded-lg border border-zinc-300 px-4 py-2 text-sm font-semibold text-brand-text hover:bg-zinc-50 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </section>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}
        {successMessage && (
          <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
            {successMessage}
          </div>
        )}

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl bg-white border border-zinc-200 p-4">
            <p className="text-xs text-brand-muted">Pending</p>
            <p className="text-2xl font-bold text-amber-600">{counts.pending}</p>
          </div>
          <div className="rounded-xl bg-white border border-zinc-200 p-4">
            <p className="text-xs text-brand-muted">Processing</p>
            <p className="text-2xl font-bold text-blue-600">{counts.processing}</p>
          </div>
          <div className="rounded-xl bg-white border border-zinc-200 p-4">
            <p className="text-xs text-brand-muted">Sent</p>
            <p className="text-2xl font-bold text-green-600">{counts.sent}</p>
          </div>
          <div className="rounded-xl bg-white border border-zinc-200 p-4">
            <p className="text-xs text-brand-muted">Failed</p>
            <p className="text-2xl font-bold text-red-600">{counts.failed}</p>
          </div>
        </section>

        <section className="rounded-xl bg-white border border-zinc-200 p-4 md:p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-brand-text font-display">Scheduled Reminder Generator</h2>
            <p className="text-sm text-brand-muted">
              Creates daily pending Teams/Outlook reminder jobs from active holds and upcoming deadlines.
            </p>
          </div>
          <button
            onClick={() => void handleRunReminders()}
            disabled={runningReminders}
            className="rounded-lg bg-brand-primary text-white px-4 py-2 text-sm font-semibold hover:opacity-90 disabled:opacity-50"
          >
            {runningReminders ? "Generating..." : "Run Reminder Generation"}
          </button>
        </section>

        <section className="rounded-xl bg-white border border-zinc-200 p-4 flex flex-col sm:flex-row gap-3">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
            className="rounded-lg border border-zinc-300 px-3 py-2 text-sm"
          >
            <option value="all">All statuses</option>
            <option value="pending">Pending</option>
            <option value="processing">Processing</option>
            <option value="sent">Sent</option>
            <option value="failed">Failed</option>
          </select>

          <select
            value={channelFilter}
            onChange={(e) => setChannelFilter(e.target.value as ChannelFilter)}
            className="rounded-lg border border-zinc-300 px-3 py-2 text-sm"
          >
            <option value="all">All channels</option>
            <option value="teams">Teams</option>
            <option value="outlook">Outlook</option>
          </select>
        </section>

        <section className="rounded-xl bg-white border border-zinc-200 p-4 md:p-6 space-y-4">
          <div>
            <h2 className="text-lg font-bold text-brand-text font-display">Send Test Notification</h2>
            <p className="text-sm text-brand-muted">Queue a test job to validate your Power Automate flow.</p>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <select
              value={testChannel}
              onChange={(e) => setTestChannel(e.target.value as NotificationChannel)}
              className="rounded-lg border border-zinc-300 px-3 py-2 text-sm"
            >
              <option value="teams">Teams</option>
              <option value="outlook">Outlook Email</option>
            </select>
            <input
              value={recipientEntraOid}
              onChange={(e) => setRecipientEntraOid(e.target.value)}
              placeholder="Recipient Entra OID (optional)"
              className="rounded-lg border border-zinc-300 px-3 py-2 text-sm"
            />
            <input
              value={ticketId}
              onChange={(e) => setTicketId(e.target.value)}
              placeholder="Ticket ID (optional)"
              className="rounded-lg border border-zinc-300 px-3 py-2 text-sm"
            />
          </div>

          {testChannel === "teams" ? (
            <div className="grid gap-3 md:grid-cols-2">
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Title"
                className="rounded-lg border border-zinc-300 px-3 py-2 text-sm"
              />
              <input
                value={actionUrl}
                onChange={(e) => setActionUrl(e.target.value)}
                placeholder="Action URL (optional)"
                className="rounded-lg border border-zinc-300 px-3 py-2 text-sm"
              />
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Message"
                className="rounded-lg border border-zinc-300 px-3 py-2 text-sm md:col-span-2 min-h-24"
              />
            </div>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              <input
                value={recipientEmail}
                onChange={(e) => setRecipientEmail(e.target.value)}
                placeholder="Recipient Email (optional)"
                className="rounded-lg border border-zinc-300 px-3 py-2 text-sm"
              />
              <input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Subject"
                className="rounded-lg border border-zinc-300 px-3 py-2 text-sm"
              />
              <textarea
                value={textBody}
                onChange={(e) => setTextBody(e.target.value)}
                placeholder="Email Body"
                className="rounded-lg border border-zinc-300 px-3 py-2 text-sm md:col-span-2 min-h-24"
              />
            </div>
          )}

          <div>
            <button
              onClick={() => void handleSendTest()}
              disabled={sendingTest}
              className="rounded-lg bg-brand-primary text-white px-4 py-2 text-sm font-semibold hover:opacity-90 disabled:opacity-50"
            >
              {sendingTest ? "Queueing..." : "Queue Test Notification"}
            </button>
          </div>
        </section>

        <section className="rounded-xl bg-white border border-zinc-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-zinc-200">
              <thead className="bg-zinc-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-600 uppercase">Channel</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-600 uppercase">Recipient</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-600 uppercase">Message</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-600 uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-600 uppercase">Attempts</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-600 uppercase">Updated</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-600 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {filteredJobs.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-sm text-brand-muted">
                      No jobs found for the selected filters.
                    </td>
                  </tr>
                )}
                {filteredJobs.map((job) => (
                  <tr key={job.id} className="hover:bg-zinc-50">
                    <td className="px-4 py-3 text-sm font-medium text-brand-text uppercase">{job.channel}</td>
                    <td className="px-4 py-3 text-sm text-brand-text">
                      <p>{job.recipient_email || "N/A"}</p>
                      <p className="text-xs text-brand-muted">{job.recipient_entra_oid}</p>
                    </td>
                    <td className="px-4 py-3 text-sm text-brand-text">
                      <p className="font-medium">{job.payload.subject || job.payload.title || "Notification"}</p>
                      {job.payload.ticket_id && (
                        <p className="text-xs text-brand-muted">Ticket: {job.payload.ticket_id}</p>
                      )}
                      {job.error_message && (
                        <p className="text-xs text-red-600 mt-1">Error: {job.error_message}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
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
                    <td className="px-4 py-3 text-sm text-brand-text">{job.attempts}</td>
                    <td className="px-4 py-3 text-sm text-brand-text">
                      {new Date(job.updated_at || job.created_at).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {job.status === "failed" ? (
                        <button
                          onClick={() => void handleRetry(job)}
                          disabled={Boolean(retryingIds[job.id])}
                          className="rounded-lg border border-zinc-300 px-3 py-1.5 text-xs font-semibold text-brand-text hover:bg-zinc-100 disabled:opacity-50"
                        >
                          {retryingIds[job.id] ? "Retrying..." : "Retry"}
                        </button>
                      ) : (
                        <span className="text-xs text-brand-muted">-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
}
