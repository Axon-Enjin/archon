"use client";

import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";

export default function AdminDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();

  // Chart hover interactivity states
  const [hoveredPoint, setHoveredPoint] = useState<any>(null);
  const [hoveredBar, setHoveredBar] = useState<number | null>(null);

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
              {`Administrator: ${session?.user?.name || "Admin"} · Tenant: ${session?.user?.institution_id || "N/A"}`}
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

        {/* Visual Analytics Trends */}
        <section className="grid gap-6 md:grid-cols-2">
          {/* Area Chart: Savings / Deflection Trend */}
          <div className="rounded-xl bg-white border border-zinc-200 p-6 shadow-sm space-y-4 relative">
            <div>
              <h3 className="text-base font-bold text-brand-text font-display">Cost Deflection & Savings</h3>
              <p className="text-xs text-brand-muted font-sans">Monthly growth in student self-service deflection</p>
            </div>
            
            <div className="relative h-[220px] w-full">
              <svg className="w-full h-full" viewBox="0 0 500 220" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="savingsGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#0D9488" stopOpacity="0.25" />
                    <stop offset="100%" stopColor="#0D9488" stopOpacity="0.0" />
                  </linearGradient>
                </defs>

                {/* Y Axis Grid lines */}
                <line x1="50" y1="180" x2="470" y2="180" stroke="#F3F4F6" strokeWidth="1" />
                <line x1="50" y1="130" x2="470" y2="130" stroke="#F3F4F6" strokeWidth="1" />
                <line x1="50" y1="80" x2="470" y2="80" stroke="#F3F4F6" strokeWidth="1" />
                <line x1="50" y1="30" x2="470" y2="30" stroke="#F3F4F6" strokeWidth="1" />

                {/* Y Axis Labels */}
                <text x="40" y="184" textAnchor="end" className="text-[10px] font-medium fill-zinc-400 font-sans">₱0</text>
                <text x="40" y="134" textAnchor="end" className="text-[10px] font-medium fill-zinc-400 font-sans">₱50k</text>
                <text x="40" y="84" textAnchor="end" className="text-[10px] font-medium fill-zinc-400 font-sans">₱100k</text>
                <text x="40" y="34" textAnchor="end" className="text-[10px] font-medium fill-zinc-400 font-sans">₱150k</text>

                {/* Area under the curve */}
                <path
                  d="M 50,180 L 50,165 Q 120,140 130,139 L 210,111 Q 280,80 290,79 L 370,61 Q 440,40 450,38 L 450,180 Z"
                  fill="url(#savingsGrad)"
                />

                {/* The main line path */}
                <path
                  d="M 50,165 Q 120,140 130,139 L 210,111 Q 280,80 290,79 L 370,61 Q 440,40 450,38"
                  fill="none"
                  stroke="#0D9488"
                  strokeWidth="3"
                  strokeLinecap="round"
                />

                {/* X Axis line */}
                <line x1="50" y1="180" x2="470" y2="180" stroke="#E5E7EB" strokeWidth="1.5" />

                {/* Data Points / Interactivity circles */}
                {[
                  { x: 50, y: 165, val: "₱15,000", def: "10.0%", month: "Ene" },
                  { x: 130, y: 139, val: "₱38,000", def: "25.0%", month: "Peb" },
                  { x: 210, y: 111, val: "₱65,000", def: "45.0%", month: "Mar" },
                  { x: 290, y: 79, val: "₱92,000", def: "60.0%", month: "Abr" },
                  { x: 370, y: 61, val: "₱110,000", def: "70.0%", month: "May" },
                  { x: 450, y: 38, val: "₱124,500", def: "73.5%", month: "Hun" },
                ].map((pt, idx) => (
                  <g key={idx}>
                    {/* Tick label */}
                    <text x={pt.x} y="198" textAnchor="middle" className="text-[10px] font-semibold fill-zinc-500 font-sans">
                      {pt.month}
                    </text>
                    {/* Interactive dot hover handle */}
                    <circle
                      cx={pt.x}
                      cy={pt.y}
                      r="5"
                      className="fill-white stroke-brand-primary stroke-[3] cursor-pointer hover:r-[7] transition-all"
                      onMouseEnter={() => setHoveredPoint({ ...pt })}
                      onMouseLeave={() => setHoveredPoint(null)}
                    />
                  </g>
                ))}
              </svg>

              {/* HTML Tooltip overlay */}
              {hoveredPoint && (
                <div
                  className="absolute bg-zinc-900 text-white rounded-lg p-2 text-[10px] shadow-lg pointer-events-none z-10 space-y-0.5"
                  style={{
                    left: `${(hoveredPoint.x / 500) * 100}%`,
                    top: `${(hoveredPoint.y / 220) * 100 - 30}%`,
                    transform: "translate(-50%, -100%)",
                  }}
                >
                  <p className="font-bold border-b border-zinc-700 pb-1 text-center font-display">{hoveredPoint.month} Status</p>
                  <p><span className="text-zinc-400 font-sans">Savings:</span> <span className="font-semibold font-sans">{hoveredPoint.val}</span></p>
                  <p><span className="text-zinc-400 font-sans">Deflection:</span> <span className="font-semibold font-sans text-brand-primary-light">{hoveredPoint.def}</span></p>
                </div>
              )}
            </div>
          </div>

          {/* Bar Chart: CSAT Trends */}
          <div className="rounded-xl bg-white border border-zinc-200 p-6 shadow-sm space-y-4 relative">
            <div>
              <h3 className="text-base font-bold text-brand-text font-display">Student CSAT Trends</h3>
              <p className="text-xs text-brand-muted font-sans">Monthly average satisfaction score (Target: ≥4.5)</p>
            </div>
            
            <div className="relative h-[220px] w-full">
              <svg className="w-full h-full" viewBox="0 0 500 220" preserveAspectRatio="none">
                {/* Y Axis Grid lines */}
                <line x1="50" y1="180" x2="470" y2="180" stroke="#F3F4F6" strokeWidth="1" />
                <line x1="50" y1="116" x2="470" y2="116" stroke="#F3F4F6" strokeWidth="1" />
                <line x1="50" y1="52" x2="470" y2="52" stroke="#F3F4F6" strokeWidth="1" />

                {/* Y Axis Labels */}
                <text x="40" y="184" textAnchor="end" className="text-[10px] font-medium fill-zinc-400 font-sans">0.0</text>
                <text x="40" y="120" textAnchor="end" className="text-[10px] font-medium fill-zinc-400 font-sans">2.5</text>
                <text x="40" y="56" textAnchor="end" className="text-[10px] font-medium fill-zinc-400 font-sans">5.0</text>

                {/* Target line */}
                <line x1="50" y1="64.8" x2="470" y2="64.8" stroke="#E11D48" strokeWidth="1" strokeDasharray="3 3" />
                <text x="465" y="60" textAnchor="end" className="text-[8px] font-bold fill-red-500 font-sans">Target 4.5</text>

                {/* Bars */}
                {[
                  { label: "Buwan 1", csat: 3.2, y: 98, h: 82, color: "#F59E0B" },
                  { label: "Buwan 2", csat: 3.5, y: 90, h: 90, color: "#F59E0B" },
                  { label: "Buwan 3", csat: 3.9, y: 80, h: 100, color: "#0D9488" },
                  { label: "Buwan 4", csat: 4.2, y: 72, h: 108, color: "#0D9488" },
                  { label: "Buwan 5", csat: 4.6, y: 62, h: 118, color: "#10B981" },
                  { label: "Buwan 6", csat: 4.8, y: 57, h: 123, color: "#10B981" },
                ].map((bar, idx) => {
                  const barWidth = 32;
                  const x = 70 + idx * 65;
                  const isHovered = hoveredBar === idx;

                  return (
                    <g key={idx}>
                      {/* Bar shadow/glow on hover */}
                      <rect
                        x={x}
                        y={bar.y}
                        width={barWidth}
                        height={bar.h}
                        rx="4"
                        fill={bar.color}
                        opacity={isHovered ? 0.95 : 0.75}
                        className="transition-all cursor-pointer"
                        onMouseEnter={() => setHoveredBar(idx)}
                        onMouseLeave={() => setHoveredBar(null)}
                      />
                      {/* CSAT value text above bar on hover */}
                      <text
                        x={x + barWidth / 2}
                        y={bar.y - 6}
                        textAnchor="middle"
                        className={`text-[9px] font-black font-sans transition-all ${
                          isHovered ? "opacity-100 fill-zinc-800" : "opacity-0"
                        }`}
                      >
                        {bar.csat.toFixed(1)}
                      </text>
                      {/* X Label */}
                      <text x={x + barWidth / 2} y="198" textAnchor="middle" className="text-[10px] font-semibold fill-zinc-500 font-sans">
                        {bar.label}
                      </text>
                    </g>
                  );
                })}

                {/* X Axis line */}
                <line x1="50" y1="180" x2="470" y2="180" stroke="#E5E7EB" strokeWidth="1.5" />
              </svg>

              {/* Floating detail box if hovered */}
              {hoveredBar !== null && (
                <div className="absolute right-3 bottom-12 bg-zinc-900 text-white rounded-lg p-2 text-[9px] shadow-md z-10 pointer-events-none font-sans">
                  <p className="font-bold font-display">Month {hoveredBar + 1} CSAT</p>
                  <p className="text-brand-primary-light font-bold text-center mt-0.5">
                    {([3.2, 3.5, 3.9, 4.2, 4.6, 4.8][hoveredBar]).toFixed(2)} / 5.0
                  </p>
                </div>
              )}
            </div>
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
