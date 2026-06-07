import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";
import Link from "next/link";

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
                  🇵🇭 Philippine Higher Education Service Desk
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
                    Get Started as Mara (Student)
                  </Link>
                  <Link
                    href="/auth/signin"
                    className="flex h-12 items-center justify-center rounded-xl border border-zinc-200 bg-white px-6 text-base font-semibold text-brand-text transition hover:bg-zinc-50"
                  >
                    Sign in as Jay (Agent)
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
                        Bakit po may hold ako sa registration ko? Di ako makapag-enroll.
                      </div>
                    </div>

                    <div className="flex gap-2 justify-end">
                      <div className="rounded-lg bg-brand-primary-light/50 p-3 text-brand-text max-w-[80%]">
                        <p className="text-xs font-bold text-brand-primary mb-1">🔍 Querying Registrar & Bursar...</p>
                        Sinisiyasat ko po ang iyong account. May nakita akong **Financial Hold** dahil sa kulang na balanse sa tuition na ₱12,500.
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

        {/* Feature Grid */}
        <div className="bg-zinc-50 border-t border-zinc-100 py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <h2 className="text-center text-3xl font-bold tracking-tight text-brand-text sm:text-4xl">
              Engineered for Frictionless Resolution
            </h2>
            <div className="mt-16 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
              {/* Feature 1 */}
              <div className="rounded-xl bg-white p-6 shadow-sm border border-zinc-100">
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-primary text-white text-lg mb-4">
                  💬
                </span>
                <h3 className="text-lg font-bold text-brand-text">Multi-Lingual Agentic Chat</h3>
                <p className="mt-2 text-sm text-brand-muted leading-relaxed">
                  Communicates fluently in English, Filipino (Tagalog), and Cebuano, auto-detecting language.
                </p>
              </div>

              {/* Feature 2 */}
              <div className="rounded-xl bg-white p-6 shadow-sm border border-zinc-100">
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-m365 text-white text-lg mb-4">
                  📅
                </span>
                <h3 className="text-lg font-bold text-brand-text">M365 Calendar Dashboard</h3>
                <p className="mt-2 text-sm text-brand-muted leading-relaxed">
                  Surfaces exam slots, registration windows, and renewal events right on the home interface.
                </p>
              </div>

              {/* Feature 3 */}
              <div className="rounded-xl bg-white p-6 shadow-sm border border-zinc-100">
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-warning text-white text-lg mb-4">
                  🔔
                </span>
                <h3 className="text-lg font-bold text-brand-text">Proactive Teams Alerts</h3>
                <p className="mt-2 text-sm text-brand-muted leading-relaxed">
                  Sends adaptive card reminders to Microsoft Teams 14 days before critical deadlines.
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
