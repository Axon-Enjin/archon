"use client";

import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import Link from "next/link";

export default function AdminDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin");
      return;
    }

    if (session?.user) {
      if (session.user.role !== "Admin") {
        router.push("/auth/signin");
        return;
      }
    }
  }, [session, status]);

  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-brand-surface">
        <div className="text-center">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-brand-primary border-t-transparent mx-auto"></div>
          <p className="mt-4 text-sm text-brand-muted">Kargang muli ang Admin Analytics...</p>
        </div>
      </div>
    );
  }

  // Sample analytics mapping directly to BRD metrics
  const metrics = [
    {
      id: "BRD-M1",
      name: "Blended Cost per Ticket",
      value: "₱22.50",
      baseline: "₱104.68 (Legacy Baseline)",
      target: "Target: ₱22.00",
      status: "success",
      icon: "💸",
    },
    {
      id: "BRD-M2",
      name: "AI deflection Rate",
      value: "73.5%",
      baseline: "0% (Previous Baseline)",
      target: "Target: ≥30.0%",
      status: "success",
      icon: "🤖",
    },
    {
      id: "BRD-M3",
      name: "Average Handle Time (AHT)",
      value: "2m 14s",
      baseline: "18m 30s (Legacy)",
      target: "Target: <5m 00s",
      status: "success",
      icon: "⏳",
    },
    {
      id: "BRD-M4",
      name: "Student CSAT Rating",
      value: "4.8 / 5.0",
      baseline: "3.2 / 5.0 (Legacy)",
      target: "Target: ≥4.5 / 5.0",
      status: "success",
      icon: "⭐",
    },
    {
      id: "BRD-M5",
      name: "SLA Resolution Rate",
      value: "98.2%",
      baseline: "71.0% (Legacy)",
      target: "Target: ≥95.0%",
      status: "success",
      icon: "🎯",
    },
    {
      id: "BRD-M7",
      name: "M365 Alert Action Rate",
      value: "64.0%",
      baseline: "N/A (New Metric)",
      target: "Target: ≥50.0%",
      status: "success",
      icon: "🔔",
    },
  ];

  return (
    <div className="flex min-h-screen bg-brand-surface font-sans">
      {/* Sidebar */}
      <aside className="w-64 border-r border-zinc-200 bg-white p-6 hidden md:flex flex-col justify-between shrink-0">
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
              className="flex items-center gap-3 rounded-lg bg-brand-primary-light/50 px-3 py-2 text-sm font-semibold text-brand-primary font-display"
            >
              📊 Analytics
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

      {/* Main Console */}
      <main className="flex-1 p-6 md:p-10 max-w-7xl mx-auto overflow-y-auto space-y-8">
        {/* Header */}
        <section className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-zinc-200 pb-6 gap-4">
          <div>
            <h1 className="text-3xl font-bold font-display text-brand-text">Administration & Analytics</h1>
            <p className="text-brand-muted text-sm mt-1">
              VP Student Affairs: Dr. Reyes · University of the Philippines System (Mock)
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse"></span>
            <span className="text-xs font-semibold text-brand-primary font-display">Telemetry Online</span>
          </div>
        </section>

        {/* Highlight Banner */}
        <section className="rounded-xl border border-brand-primary/20 bg-brand-primary-light/10 p-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1">
            <h2 className="text-lg font-bold font-display text-brand-text">Estimated Institutional Savings</h2>
            <p className="text-sm text-brand-muted max-w-xl">
              By shifting routine balance and hold lookups to the Archon AI Agent, the university has saved an estimated **₱124,500.00** in administrative labor overhead this semester.
            </p>
          </div>
          <div className="bg-brand-primary text-white rounded-xl px-5 py-4 text-center shrink-0 shadow-sm border border-brand-primary">
            <p className="text-xs uppercase font-bold tracking-wide opacity-80 font-display">Blended Net Savings</p>
            <p className="text-2xl font-black mt-1 font-display">₱124,500</p>
          </div>
        </section>

        {/* Metrics Grid */}
        <section className="space-y-4">
          <h2 className="text-xl font-bold font-display text-brand-text">Core Business Metrics (BRD Traced)</h2>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {metrics.map((metric) => (
              <div key={metric.id} className="rounded-xl bg-white border border-zinc-200 p-6 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-semibold text-brand-muted bg-zinc-50 border border-zinc-100 rounded-full px-2.5 py-0.5">
                    {metric.id}
                  </span>
                  <span className="text-xl">{metric.icon}</span>
                </div>
                <div>
                  <h3 className="text-xs font-bold text-brand-muted uppercase tracking-wide font-display">
                    {metric.name}
                  </h3>
                  <p className="text-3xl font-black text-brand-text mt-1 font-display">{metric.value}</p>
                </div>
                <div className="border-t border-zinc-100 pt-3 flex justify-between text-[10px] text-brand-muted">
                  <span>{metric.baseline}</span>
                  <span className="font-semibold text-brand-primary">{metric.target}</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
