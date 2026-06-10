"use client";

import { useSession } from "next-auth/react";
import { useEffect, useMemo, useState } from "react";
import { Activity, Bell, CheckCircle2, Clock3, ShieldCheck, Ticket, Brain, ThumbsUp } from "lucide-react";

interface AnalyticsSummary {
  generatedAt: string;
  totals: {
    tickets: number;
    resolvedTickets: number;
    pendingAgent: number;
    handoffs: number;
    wrapUpCompleted: number;
    wrapUpPending: number;
  };
  rates: {
    deflectionRate: number;
    resolutionRate: number;
    wrapUpCompletionRate: number;
    notificationActionRate: number;
    consentCoverageRate: number;
    csatResponseRate: number;
    csatPositiveRate: number;
  };
  operations: {
    avgHandleMs: number;
    avgHandleMinutes: number;
    autoResolved: number;
    resolvedWithHandoff: number;
    sentJobs: number;
    failedJobs: number;
    avgAiConfidence: number;
  };
  satisfaction: {
    responses: number;
    positive: number;
    negative: number;
    avgScore: number;
  };
  consent: {
    trackedStudents: number;
    snapshotsAvailable: number;
    granted: number;
    missing: number;
    tokenMissing: number;
  };
}

interface MetricCard {
  id: string;
  label: string;
  value: string;
  helper: string;
  icon: React.ReactNode;
}

export default function AdminAnalyticsDashboard() {
  const { data: session } = useSession();
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      void (async () => {
        try {
          setLoading(true);
          const response = await fetch("/api/v1/admin/analytics/summary?limit=2000");
          const payload = await response.json();
          if (!payload.success) throw new Error(payload.error || "Failed to load analytics summary.");
          setSummary(payload.data);
          setError(null);
        } catch (err) {
          setError(err instanceof Error ? err.message : "Failed to load analytics summary.");
        } finally {
          setLoading(false);
        }
      })();
    }, 0);

    return () => clearTimeout(timer);
  }, []);

  const metrics = useMemo<MetricCard[]>(() => {
    if (!summary) return [];
    return [
      {
        id: "tickets",
        label: "Total Tickets",
        value: String(summary.totals.tickets),
        helper: `${summary.totals.resolvedTickets} resolved · ${summary.totals.pendingAgent} pending agent`,
        icon: <Ticket className="w-5 h-5 text-brand-primary" />,
      },
      {
        id: "deflection",
        label: "AI Deflection Rate",
        value: `${summary.rates.deflectionRate.toFixed(1)}%`,
        helper: `${summary.operations.autoResolved} autonomous resolutions`,
        icon: <Activity className="w-5 h-5 text-emerald-600" />,
      },
      {
        id: "handle",
        label: "Avg Human Handle Time",
        value: `${summary.operations.avgHandleMinutes.toFixed(2)} min`,
        helper: `${summary.operations.resolvedWithHandoff} resolved via handoff`,
        icon: <Clock3 className="w-5 h-5 text-amber-600" />,
      },
      {
        id: "wrapup",
        label: "Wrap-up Completion",
        value: `${summary.rates.wrapUpCompletionRate.toFixed(1)}%`,
        helper: `${summary.totals.wrapUpCompleted} completed · ${summary.totals.wrapUpPending} pending`,
        icon: <CheckCircle2 className="w-5 h-5 text-indigo-600" />,
      },
      {
        id: "notification",
        label: "Notification Delivery",
        value: `${summary.rates.notificationActionRate.toFixed(1)}%`,
        helper: `${summary.operations.sentJobs} sent · ${summary.operations.failedJobs} failed`,
        icon: <Bell className="w-5 h-5 text-sky-600" />,
      },
      {
        id: "consent",
        label: "M365 Consent Coverage",
        value: `${summary.rates.consentCoverageRate.toFixed(1)}%`,
        helper: `${summary.consent.granted}/${summary.consent.snapshotsAvailable} granted snapshots`,
        icon: <ShieldCheck className="w-5 h-5 text-green-600" />,
      },
      {
        id: "csat",
        label: "Student Satisfaction (CSAT)",
        value: summary.satisfaction.responses > 0 ? `${summary.rates.csatPositiveRate.toFixed(1)}%` : "—",
        helper:
          summary.satisfaction.responses > 0
            ? `${summary.satisfaction.positive}/${summary.satisfaction.responses} positive · ${summary.rates.csatResponseRate.toFixed(1)}% response rate`
            : "No ratings submitted yet",
        icon: <ThumbsUp className="w-5 h-5 text-rose-600" />,
      },
      {
        id: "confidence",
        label: "Avg AI Confidence",
        value: summary.operations.avgAiConfidence > 0 ? `${(summary.operations.avgAiConfidence * 100).toFixed(0)}%` : "—",
        helper: "Across escalated handoff packets",
        icon: <Brain className="w-5 h-5 text-violet-600" />,
      },
    ];
  }, [summary]);

  return (
    <main className="flex-1 p-6 md:p-10 max-w-7xl mx-auto overflow-y-auto space-y-8 w-full">
      <section className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-zinc-200 pb-6 gap-4">
        <div>
          <h1 className="text-3xl font-bold font-display text-brand-text">Administration & Analytics</h1>
          <p className="text-brand-muted text-sm mt-1 font-sans">
            {`Administrator: ${session?.user?.name || "Admin"} · Tenant: ${session?.user?.institution_id || "N/A"}`}
          </p>
        </div>
        <div className="text-xs text-brand-muted">
          {summary?.generatedAt ? `Last updated: ${new Date(summary.generatedAt).toLocaleString()}` : "Live telemetry"}
        </div>
      </section>

      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="text-center">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-primary border-t-transparent mx-auto"></div>
            <p className="mt-3 text-xs text-brand-muted font-sans font-semibold">Loading analytics summary...</p>
          </div>
        </div>
      ) : error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      ) : (
        <>
          <section className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {metrics.map((metric) => (
              <div key={metric.id} className="rounded-xl bg-white border border-zinc-200 p-6 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-xs font-bold uppercase tracking-wide text-brand-muted">{metric.label}</h2>
                  {metric.icon}
                </div>
                <p className="text-3xl font-black text-brand-text font-display">{metric.value}</p>
                <p className="text-xs text-brand-muted">{metric.helper}</p>
              </div>
            ))}
          </section>

          <section className="rounded-xl border border-zinc-200 bg-white p-6 grid gap-4 md:grid-cols-2">
            <div>
              <h3 className="text-sm font-bold text-brand-text font-display">M365 Consent Snapshot Health</h3>
              <p className="text-xs text-brand-muted mt-1">
                {summary?.consent.snapshotsAvailable || 0} snapshot(s) across {summary?.consent.trackedStudents || 0} tracked student(s).
              </p>
              <p className="text-xs text-brand-muted mt-2">
                Missing consent: {summary?.consent.missing || 0} · Token refresh needed: {summary?.consent.tokenMissing || 0}
              </p>
            </div>
            <div>
              <h3 className="text-sm font-bold text-brand-text font-display">Handoff Wrap-up Discipline</h3>
              <p className="text-xs text-brand-muted mt-1">
                {summary?.totals.wrapUpCompleted || 0} completed out of {summary?.totals.handoffs || 0} handoff packet(s).
              </p>
              <p className="text-xs text-brand-muted mt-2">
                Resolution rate: {summary?.rates.resolutionRate.toFixed(1) || "0.0"}%
              </p>
            </div>
          </section>
        </>
      )}
    </main>
  );
}
