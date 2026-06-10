import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { MessageCircle, Calendar, Building, ShieldCheck, Users, Zap, FileText } from "lucide-react";
import MotionWrapper from "@/components/MotionWrapper";
import ChatSimulation from "@/components/ChatSimulation";
import ArchonLayerFlow from "@/components/ArchonLayerFlow";

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
      <MotionWrapper direction="none" delay={0.05}>
        <header className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-20 items-center justify-between border-b border-zinc-100">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-primary overflow-hidden shadow-sm border border-brand-primary/20">
                <Image src="/archon.svg" alt="Archon" width={40} height={40} className="w-full h-full object-cover" />
              </div>
              <span className="text-2xl font-bold tracking-tight text-brand-text font-display">Archon</span>
            </div>
            <Link
              href="/auth/signin"
              className="flex h-10 items-center justify-center rounded-md bg-brand-primary px-5 text-sm font-bold text-white transition hover:bg-teal-700 shadow-sm"
            >
              Enter Portal
            </Link>
          </div>
        </header>
      </MotionWrapper>

      {/* Hero Section */}
      <main className="flex-1">
        <div className="relative flex min-h-[calc(100svh-5rem)] items-center overflow-hidden py-16 sm:py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="lg:grid lg:grid-cols-12 lg:gap-8 lg:items-center">
              {/* Copy */}
              <MotionWrapper direction="up" delay={0.15} className="sm:text-center md:max-w-2xl md:mx-auto lg:col-span-6 lg:text-left">
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
              </MotionWrapper>

              {/* Graphical Feature Showcase Card */}
              <MotionWrapper direction="up" delay={0.3} className="mt-16 lg:mt-0 lg:col-span-6 w-full max-w-md mx-auto">
                <ChatSimulation />
              </MotionWrapper>
            </div>
          </div>
        </div>

        {/* The Problem (The Broken Experience) */}
        <MotionWrapper direction="up" delay={0.1} triggerOnScroll={true}>
          <div className="bg-brand-surface relative overflow-hidden py-32">
            <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'radial-gradient(#0D9488 1.5px, transparent 1.5px)', backgroundSize: '32px 32px' }}></div>
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 relative z-10">
              <div className="flex flex-col lg:flex-row gap-16 lg:items-center">
                <div className="lg:w-5/12">
                  <span className="text-brand-primary font-mono text-sm mb-4 block tracking-widest uppercase">The Status Quo</span>
                  <h2 className="text-5xl lg:text-6xl font-extrabold tracking-tight text-brand-text font-display mb-8 leading-[1.1]">
                    The Student Experience is Broken.
                  </h2>
                  <p className="text-xl text-brand-muted font-sans leading-relaxed">
                    Students are forced to act as messengers between siloed departments, leading to missed deadlines, lost scholarships, and administrative burnout.
                  </p>
                </div>
                <div className="lg:w-7/12 relative">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 relative">
                    <div className="space-y-6 sm:mt-16">
                      <div className="p-8 rounded-[2rem] bg-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-red-100 transition-all duration-500 hover:-translate-y-2 hover:shadow-[0_20px_40px_rgb(0,0,0,0.08)] group">
                        <div className="h-14 w-14 rounded-2xl bg-red-50 flex items-center justify-center mb-6 text-red-500 group-hover:scale-110 transition-transform duration-500">
                          <Building className="w-7 h-7" />
                        </div>
                        <h3 className="text-2xl font-bold text-brand-text font-display mb-3">Registrar's Office</h3>
                        <p className="text-brand-muted leading-relaxed">Places an Academic Hold but doesn't know the student's financial aid status.</p>
                      </div>
                      <div className="p-8 rounded-[2rem] bg-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-blue-100 transition-all duration-500 hover:-translate-y-2 hover:shadow-[0_20px_40px_rgb(0,0,0,0.08)] group">
                        <div className="h-14 w-14 rounded-2xl bg-blue-50 flex items-center justify-center mb-6 text-blue-500 group-hover:scale-110 transition-transform duration-500">
                          <Building className="w-7 h-7" />
                        </div>
                        <h3 className="text-2xl font-bold text-brand-text font-display mb-3">Financial Aid</h3>
                        <p className="text-brand-muted leading-relaxed">Processes the UniFAST grant but lacks a real-time channel to notify the Bursar to lift holds.</p>
                      </div>
                    </div>
                    <div className="space-y-6 sm:-mt-16">
                      <div className="p-8 rounded-[2rem] bg-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-amber-100 transition-all duration-500 hover:-translate-y-2 hover:shadow-[0_20px_40px_rgb(0,0,0,0.08)] group">
                        <div className="h-14 w-14 rounded-2xl bg-amber-50 flex items-center justify-center mb-6 text-amber-500 group-hover:scale-110 transition-transform duration-500">
                          <Building className="w-7 h-7" />
                        </div>
                        <h3 className="text-2xl font-bold text-brand-text font-display mb-3">Bursar's Office</h3>
                        <p className="text-brand-muted leading-relaxed">Places a Financial Hold, unaware that the student's scholarship is currently being processed.</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </MotionWrapper>

        {/* The Solution (The Archon Layer) */}
        <MotionWrapper direction="up" delay={0.1} triggerOnScroll={true}>
          <div className="bg-white border-y border-zinc-200/50 py-32 relative">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center relative z-10">
              <span className="text-brand-primary font-mono text-sm mb-4 block tracking-widest uppercase">The Architecture</span>
              <h2 className="text-4xl md:text-6xl font-extrabold tracking-tight text-brand-text font-display mb-6">
                Enter the Archon Layer.
              </h2>
              <p className="text-xl text-brand-muted max-w-2xl mx-auto mb-20 leading-relaxed">
                A unified, autonomous AI layer that sits on top of existing university systems. It orchestrates complex queries and executes resolutions seamlessly.
              </p>

              <div className="bg-brand-surface/50 rounded-[2.5rem] p-8 md:p-12 border border-zinc-200/50 shadow-sm">
                <ArchonLayerFlow />
              </div>
            </div>
          </div>
        </MotionWrapper>

        {/* Editorial Use Cases Section */}
        <div className="bg-brand-surface py-32 overflow-hidden">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mb-24 md:mb-32">
              <span className="text-brand-primary font-mono text-sm mb-4 block tracking-widest uppercase">Capabilities</span>
              <h2 className="text-5xl lg:text-7xl font-extrabold tracking-tight text-brand-text font-display max-w-3xl leading-[1.05]">
                Autonomous Cross-Department Action.
              </h2>
            </div>
            
            <div className="space-y-32">
              {/* Case 1 */}
              <MotionWrapper direction="up" delay={0.1} triggerOnScroll={true}>
                <div className="flex flex-col md:flex-row gap-16 items-center group">
                  <div className="md:w-1/2 w-full relative">
                    <div className="aspect-[4/3] rounded-[2rem] bg-brand-primary-light/40 overflow-hidden relative border border-brand-primary/10 flex items-center justify-center p-8">
                      <Zap className="w-64 h-64 text-brand-primary opacity-5 absolute -right-8 -bottom-8 transform group-hover:scale-110 transition-transform duration-700" />
                      <div className="bg-white p-8 rounded-3xl shadow-[0_20px_40px_rgb(0,0,0,0.08)] z-10 w-full max-w-sm transform group-hover:-translate-y-2 transition-transform duration-500 border border-zinc-100">
                        <div className="flex items-center gap-3 border-b border-zinc-100 pb-4 mb-5">
                          <div className="w-2.5 h-2.5 rounded-full bg-brand-primary animate-pulse"></div>
                          <span className="font-mono text-xs text-brand-muted uppercase tracking-widest">System Action</span>
                        </div>
                        <p className="text-brand-text font-semibold text-lg leading-snug">Temporary 14-day hold lift approved. Student cleared to enroll.</p>
                      </div>
                    </div>
                  </div>
                  <div className="md:w-1/2">
                    <div className="text-brand-primary font-mono text-sm mb-4 tracking-widest uppercase border-b border-brand-primary/20 pb-4 inline-block">01 / Resolution</div>
                    <h3 className="text-4xl font-bold text-brand-text font-display mb-6 mt-4">Automated Hold Lifting</h3>
                    <p className="text-xl text-brand-muted leading-relaxed">
                      If a student has a Financial Hold but a pending CHED UniFAST grant, Archon autonomously verifies the grant and triggers a temporary 14-day hold lift, allowing immediate enrollment.
                    </p>
                  </div>
                </div>
              </MotionWrapper>

              {/* Case 2 */}
              <MotionWrapper direction="up" delay={0.1} triggerOnScroll={true}>
                <div className="flex flex-col md:flex-row-reverse gap-16 items-center group">
                  <div className="md:w-1/2 w-full relative">
                    <div className="aspect-[4/3] rounded-[2rem] bg-amber-50 overflow-hidden relative border border-amber-100 flex items-center justify-center p-8">
                      <FileText className="w-64 h-64 text-amber-500 opacity-5 absolute -left-8 -bottom-8 transform group-hover:scale-110 transition-transform duration-700" />
                      <div className="bg-white p-8 rounded-3xl shadow-[0_20px_40px_rgb(0,0,0,0.08)] z-10 w-full max-w-sm transform group-hover:-translate-y-2 transition-transform duration-500 border border-zinc-100">
                        <div className="flex items-center gap-3 border-b border-zinc-100 pb-4 mb-5">
                          <div className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse"></div>
                          <span className="font-mono text-xs text-brand-muted uppercase tracking-widest">Workflow Triggered</span>
                        </div>
                        <p className="text-brand-text font-semibold text-lg leading-snug">Please attach your medical certificate to complete the SAP appeal.</p>
                      </div>
                    </div>
                  </div>
                  <div className="md:w-1/2">
                    <div className="text-amber-600 font-mono text-sm mb-4 tracking-widest uppercase border-b border-amber-200 pb-4 inline-block">02 / Guidance</div>
                    <h3 className="text-4xl font-bold text-brand-text font-display mb-6 mt-4">Guided SAP Appeals</h3>
                    <p className="text-xl text-brand-muted leading-relaxed">
                      When an Academic Hold requires a manual appeal, Archon guides the student through a dedicated Satisfactory Academic Progress (SAP) wizard, ensuring all required documents are attached.
                    </p>
                  </div>
                </div>
              </MotionWrapper>

              {/* Case 3 */}
              <MotionWrapper direction="up" delay={0.1} triggerOnScroll={true}>
                <div className="flex flex-col md:flex-row gap-16 items-center group">
                  <div className="md:w-1/2 w-full relative">
                    <div className="aspect-[4/3] rounded-[2rem] bg-blue-50 overflow-hidden relative border border-blue-100 flex items-center justify-center p-8">
                      <Users className="w-64 h-64 text-blue-500 opacity-5 absolute -right-8 -bottom-8 transform group-hover:scale-110 transition-transform duration-700" />
                      <div className="bg-white p-8 rounded-3xl shadow-[0_20px_40px_rgb(0,0,0,0.08)] z-10 w-full max-w-sm transform group-hover:-translate-y-2 transition-transform duration-500 border border-zinc-100">
                        <div className="flex items-center gap-3 border-b border-zinc-100 pb-4 mb-5">
                          <div className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse"></div>
                          <span className="font-mono text-xs text-brand-muted uppercase tracking-widest">Handoff Packet</span>
                        </div>
                        <p className="text-brand-text font-semibold text-lg leading-snug">Diagnosis complete. Transferring to human agent with context.</p>
                      </div>
                    </div>
                  </div>
                  <div className="md:w-1/2">
                    <div className="text-blue-600 font-mono text-sm mb-4 tracking-widest uppercase border-b border-blue-200 pb-4 inline-block">03 / Escalation</div>
                    <h3 className="text-4xl font-bold text-brand-text font-display mb-6 mt-4">Intelligent Handoffs</h3>
                    <p className="text-xl text-brand-muted leading-relaxed">
                      If an issue is too complex, Archon transfers the chat to a human agent, providing them with a complete AI diagnosis and suggested resolution, drastically reducing triage time.
                    </p>
                  </div>
                </div>
              </MotionWrapper>
            </div>
          </div>
        </div>

        {/* Call to Action Section */}
        <MotionWrapper direction="up" delay={0.1} triggerOnScroll={true}>
          <div className="bg-white py-32 border-t border-zinc-200/50">
            <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
              <div className="relative overflow-hidden rounded-[3rem] bg-brand-primary px-6 py-24 shadow-2xl sm:px-16 text-center isolate">
                <div className="absolute inset-0 bg-white opacity-10" style={{ backgroundImage: 'radial-gradient(#ffffff 2px, transparent 2px)', backgroundSize: '32px 32px' }}></div>
                <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-brand-primary to-teal-900 -z-10"></div>
                
                <div className="relative mx-auto max-w-3xl text-white space-y-8">
                  <h2 className="text-4xl sm:text-6xl font-extrabold tracking-tight font-display leading-tight">
                    Ready to transform the student experience?
                  </h2>
                  <p className="text-xl text-brand-primary-light/90 leading-relaxed font-sans max-w-2xl mx-auto">
                    Empower your university with autonomous cross-department resolution. Eliminate silos between Registrar, Bursar, and Financial Aid offices today.
                  </p>
                  <div className="pt-8 flex flex-col sm:flex-row justify-center gap-6">
                    <Link
                      href="/auth/signin"
                      className="flex h-14 items-center justify-center rounded-2xl bg-white px-8 text-base font-bold text-brand-primary transition-transform hover:scale-105 shadow-lg"
                    >
                      Enter Portal
                    </Link>
                    <Link
                      href="/auth/signin"
                      className="flex h-14 items-center justify-center rounded-2xl border-2 border-white/30 bg-white/5 px-8 text-base font-bold text-white transition-colors hover:bg-white/10 backdrop-blur-sm"
                    >
                      Sign in with Entra ID
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </MotionWrapper>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-zinc-100 py-8 text-center text-xs text-brand-muted">
        <p>© 2026 Project Archon. Built in compliance with Republic Act No. 10173 (Data Privacy Act of 2012).</p>
      </footer>
    </div>
  );
}
