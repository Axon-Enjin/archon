import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { MessageCircle, Calendar, Bell, Search, Building, ArrowRight, ShieldCheck, Users, Bot, Database, Zap, FileText } from "lucide-react";

export default async function Home() {
  const session = await getServerSession(authOptions);

  // Automatic redirect if session is already active
  if (session?.user) {
    if (session.user.role === "Student") redirect("/student");
    if (session.user.role === "Agent") redirect("/agent");
    if (session.user.role === "Admin") redirect("/admin");
  }

  return (
    <div className="flex min-h-screen flex-col bg-brand-surface font-sans">
      {/* Header / Nav */}
      <header className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-20 items-center justify-between border-b border-zinc-100">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-primary text-white font-extrabold text-xl shadow-sm">
              A
            </span>
            <span className="text-xl font-bold tracking-tight text-brand-text">Archon</span>
          </div>
          <Link
            href="/auth/signin"
            className="flex h-10 items-center justify-center rounded-lg bg-brand-primary px-4 text-sm font-semibold text-white transition hover:bg-teal-700 shadow-sm"
          >
            Enter Portal
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1">
        <div className="relative overflow-hidden py-24 sm:py-32">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="lg:grid lg:grid-cols-12 lg:gap-8 lg:items-center">
              {/* Copy */}
              <div className="sm:text-center md:max-w-2xl md:mx-auto lg:col-span-6 lg:text-left">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-primary-light px-3 py-1 text-xs font-semibold text-brand-primary">
                  Philippine Higher Education Service Desk
                </span>
                <h1 className="mt-6 text-4xl font-extrabold tracking-tight text-brand-text sm:text-5xl lg:text-6xl font-sans leading-tight">
                  Stop making students navigate the org chart.
                </h1>
                <p className="mt-6 text-lg text-brand-muted leading-relaxed">
                  Archon is an autonomous, agentic AI service desk that resolves student inquiries
                  across departmental silos (Registrar, Bursar, Financial Aid) instantly. Native
                  M365 integration delivers proactive alerts straight to Microsoft Teams and Outlook.
                </p>
                <div className="mt-10 flex flex-col sm:flex-row sm:justify-center lg:justify-start gap-4">
                  <Link
                    href="/auth/signin"
                    className="flex h-12 items-center justify-center rounded-xl bg-brand-primary px-6 text-base font-semibold text-white transition hover:bg-teal-700 shadow-md"
                  >
                    Get Started
                  </Link>
                  <Link
                    href="/auth/signin"
                    className="flex h-12 items-center justify-center rounded-xl border border-zinc-200 bg-white px-6 text-base font-semibold text-brand-text transition hover:bg-zinc-50"
                  >
                    Sign in with Entra ID
                  </Link>
                </div>
              </div>

              {/* Graphical Feature Showcase Card */}
              <div className="mt-16 lg:mt-0 lg:col-span-6">
                <div className="mx-auto w-full max-w-md rounded-2xl bg-white p-6 shadow-xl border border-zinc-100 space-y-6">
                  <div className="flex items-center justify-between border-b border-zinc-100 pb-4">
                    <div className="flex items-center gap-2">
                      <div className="h-3 w-3 rounded-full bg-red-400"></div>
                      <div className="h-3 w-3 rounded-full bg-yellow-400"></div>
                      <div className="h-3 w-3 rounded-full bg-green-400"></div>
                    </div>
                    <span className="text-xs font-medium text-brand-muted">Archon Agent Mock-up</span>
                  </div>

                  {/* Chat simulation */}
                  <div className="space-y-4 text-sm">
                    <div className="flex gap-2">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-primary-light text-brand-primary font-bold text-xs">
                        M
                      </div>
                      <div className="rounded-lg bg-zinc-100 p-3 text-brand-text max-w-[80%]">
                        Why do I have a hold on my registration? I can&apos;t enroll.
                      </div>
                    </div>

                    <div className="flex gap-2 justify-end">
                      <div className="rounded-lg bg-brand-primary-light/50 p-3 text-brand-text max-w-[80%]">
                        <p className="text-xs font-bold text-brand-primary mb-1 flex items-center gap-1.5"><Search className="w-3 h-3" /> Querying Registrar & Bursar...</p>
                        I am checking your account. I found a **Financial Hold** due to an outstanding tuition balance of ₱12,500.
                      </div>
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-primary text-white font-bold text-xs">
                        A
                      </div>
                    </div>
                  </div>

                  {/* M365 badge */}
                  <div className="rounded-xl bg-brand-m365/5 p-4 border border-brand-m365/10 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-m365 text-white font-bold text-xs">
                        M365
                      </span>
                      <div>
                        <p className="text-xs font-semibold text-brand-text">Microsoft 365 Connected</p>
                        <p className="text-[10px] text-brand-muted">Teams and Calendar synced</p>
                      </div>
                    </div>
                    <span className="rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-bold text-green-700">
                      Active
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* The Problem (The Broken Experience) */}
        <div className="bg-white border-t border-zinc-100 py-24">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-3xl mx-auto mb-16">
              <h2 className="text-3xl font-bold tracking-tight text-brand-text sm:text-4xl">
                The Student Experience is Broken
              </h2>
              <p className="mt-4 text-lg text-brand-muted">
                Students are forced to act as messengers between siloed departments, leading to missed deadlines, lost scholarships, and administrative burnout.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8 text-center">
              <div className="p-6 rounded-2xl bg-red-50/50 border border-red-100 relative">
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-white rounded-full p-2 shadow-sm border border-zinc-100">
                  <Building className="w-6 h-6 text-red-500" />
                </div>
                <h3 className="mt-4 font-bold text-brand-text">Registrar&apos;s Office</h3>
                <p className="text-sm text-brand-muted mt-2">Places an Academic Hold but doesn&apos;t know the student&apos;s financial aid status.</p>
              </div>
              <div className="p-6 rounded-2xl bg-amber-50/50 border border-amber-100 relative mt-8 md:mt-0">
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-white rounded-full p-2 shadow-sm border border-zinc-100">
                  <Building className="w-6 h-6 text-amber-500" />
                </div>
                <h3 className="mt-4 font-bold text-brand-text">Bursar&apos;s Office</h3>
                <p className="text-sm text-brand-muted mt-2">Places a Financial Hold, unaware that the student&apos;s scholarship is currently being processed.</p>
              </div>
              <div className="p-6 rounded-2xl bg-blue-50/50 border border-blue-100 relative mt-8 md:mt-0">
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-white rounded-full p-2 shadow-sm border border-zinc-100">
                  <Building className="w-6 h-6 text-blue-500" />
                </div>
                <h3 className="mt-4 font-bold text-brand-text">Financial Aid</h3>
                <p className="text-sm text-brand-muted mt-2">Processes the UniFAST grant but lacks a real-time channel to notify the Bursar to lift holds.</p>
              </div>
            </div>
          </div>
        </div>

        {/* The Solution (The Archon Layer) */}
        <div className="bg-brand-surface border-t border-zinc-100 py-24">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-3xl font-bold tracking-tight text-brand-text sm:text-4xl mb-4">
              Enter the Archon Layer
            </h2>
            <p className="text-lg text-brand-muted max-w-2xl mx-auto mb-16">
              A unified, autonomous AI layer that sits on top of existing university systems. It orchestrates complex queries and executes resolutions seamlessly.
            </p>

            <div className="relative max-w-4xl mx-auto p-8 rounded-3xl bg-white border border-zinc-200 shadow-xl overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-brand-primary to-teal-400"></div>
              
              <div className="flex flex-col md:flex-row items-center justify-center gap-8 md:gap-16">
                
                {/* User Side */}
                <div className="flex flex-col items-center gap-2">
                  <div className="h-16 w-16 bg-zinc-100 rounded-full flex items-center justify-center border border-zinc-200">
                    <Users className="w-8 h-8 text-brand-text" />
                  </div>
                  <span className="font-bold text-brand-text text-sm">Students & Staff</span>
                </div>

                {/* Arrow */}
                <ArrowRight className="hidden md:block w-8 h-8 text-zinc-300" />

                {/* Archon Agent Layer */}
                <div className="flex flex-col items-center gap-4 bg-brand-primary-light/10 p-6 rounded-2xl border border-brand-primary/20 min-w-[250px]">
                  <div className="h-16 w-16 bg-brand-primary rounded-xl flex items-center justify-center shadow-lg shadow-brand-primary/20">
                    <Bot className="w-8 h-8 text-white" />
                  </div>
                  <div className="text-center">
                    <span className="font-bold text-brand-text text-lg block">Archon Agent</span>
                    <span className="text-xs text-brand-primary font-semibold">Orchestrator Engine</span>
                  </div>
                </div>

                {/* Arrow */}
                <ArrowRight className="hidden md:block w-8 h-8 text-zinc-300" />

                {/* Systems Side */}
                <div className="flex flex-col gap-4">
                  <div className="flex items-center gap-3 bg-zinc-50 px-4 py-2 rounded-lg border border-zinc-200">
                    <Database className="w-4 h-4 text-zinc-500" />
                    <span className="text-sm font-semibold text-brand-text">Cosmos DB (Data)</span>
                  </div>
                  <div className="flex items-center gap-3 bg-blue-50 px-4 py-2 rounded-lg border border-blue-200">
                    <ShieldCheck className="w-4 h-4 text-blue-600" />
                    <span className="text-sm font-semibold text-blue-900">Entra ID (Auth)</span>
                  </div>
                  <div className="flex items-center gap-3 bg-brand-m365/10 px-4 py-2 rounded-lg border border-brand-m365/20">
                    <Bell className="w-4 h-4 text-brand-m365" />
                    <span className="text-sm font-semibold text-brand-m365">M365 (Alerts)</span>
                  </div>
                </div>

              </div>
            </div>
          </div>
        </div>

        {/* Use Cases Section */}
        <div className="bg-white border-t border-zinc-100 py-24">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <h2 className="text-center text-3xl font-bold tracking-tight text-brand-text sm:text-4xl mb-16">
              Autonomous Cross-Department Action
            </h2>
            <div className="grid md:grid-cols-3 gap-8">
              <div className="bg-zinc-50 p-8 rounded-2xl border border-zinc-100">
                <Zap className="w-8 h-8 text-brand-primary mb-6" />
                <h3 className="text-xl font-bold text-brand-text mb-3">Automated Hold Lifting</h3>
                <p className="text-brand-muted text-sm leading-relaxed">
                  If a student has a Financial Hold but a pending CHED UniFAST grant, Archon autonomously verifies the grant and triggers a temporary 14-day hold lift, allowing immediate enrollment.
                </p>
              </div>
              <div className="bg-zinc-50 p-8 rounded-2xl border border-zinc-100">
                <FileText className="w-8 h-8 text-amber-500 mb-6" />
                <h3 className="text-xl font-bold text-brand-text mb-3">Guided SAP Appeals</h3>
                <p className="text-brand-muted text-sm leading-relaxed">
                  When an Academic Hold requires a manual appeal, Archon guides the student through a dedicated Satisfactory Academic Progress (SAP) wizard, ensuring all required documents are attached.
                </p>
              </div>
              <div className="bg-zinc-50 p-8 rounded-2xl border border-zinc-100">
                <Users className="w-8 h-8 text-blue-500 mb-6" />
                <h3 className="text-xl font-bold text-brand-text mb-3">Intelligent Handoffs</h3>
                <p className="text-brand-muted text-sm leading-relaxed">
                  If an issue is too complex, Archon transfers the chat to a human agent, providing them with a complete AI diagnosis and suggested resolution, drastically reducing triage time.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Value-Driven Feature Grid */}
        <div className="bg-brand-surface border-t border-zinc-100 py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-3xl mx-auto mb-12">
              <h2 className="text-3xl font-bold tracking-tight text-brand-text sm:text-4xl">
                Engineered for Frictionless Resolution
              </h2>
              <p className="mt-4 text-lg text-brand-muted">
                Delivering immediate value to students while drastically reducing administrative overhead across the university.
              </p>
            </div>
            <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
              {/* Feature 1 */}
              <div className="rounded-xl bg-white p-6 shadow-sm border border-zinc-100">
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-primary text-white mb-4">
                  <MessageCircle className="w-5 h-5" />
                </span>
                <h3 className="text-lg font-bold text-brand-text">Instant Resolution, Zero Lines</h3>
                <p className="mt-2 text-sm text-brand-muted leading-relaxed">
                  Multilingual agentic chat (English, Tagalog, Cebuano) resolves 70%+ of student inquiries instantly without human intervention.
                </p>
              </div>

              {/* Feature 2 */}
              <div className="rounded-xl bg-white p-6 shadow-sm border border-zinc-100">
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-m365 text-white mb-4">
                  <Calendar className="w-5 h-5" />
                </span>
                <h3 className="text-lg font-bold text-brand-text">Meet Students Where They Are</h3>
                <p className="mt-2 text-sm text-brand-muted leading-relaxed">
                  Seamless Microsoft 365 integration surfaces exam slots and registration windows, while sending proactive Adaptive Card alerts to MS Teams.
                </p>
              </div>

              {/* Feature 3 */}
              <div className="rounded-xl bg-white p-6 shadow-sm border border-zinc-100">
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500 text-white mb-4">
                  <ShieldCheck className="w-5 h-5" />
                </span>
                <h3 className="text-lg font-bold text-brand-text">Institutional Savings</h3>
                <p className="mt-2 text-sm text-brand-muted leading-relaxed">
                  By shifting routine balance and hold lookups to the Archon AI Agent, universities save hundreds of thousands in administrative labor overhead.
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-zinc-100 py-8 text-center text-xs text-brand-muted">
        <p>© 2026 Project Archon. Built in compliance with Republic Act No. 10173 (Data Privacy Act of 2012).</p>
      </footer>
    </div>
  );
}
