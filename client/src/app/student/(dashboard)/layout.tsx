"use client";

import { useSession, signOut } from "next-auth/react";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { LayoutDashboard, MessageCircle, FileText, LogOut, Bell } from "lucide-react";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const [creatingTicket, setCreatingTicket] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin");
    }
  }, [status, router]);

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

  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-brand-surface">
        <div className="text-center">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-brand-primary border-t-transparent mx-auto"></div>
          <p className="mt-4 text-sm text-brand-muted font-sans">Loading...</p>
        </div>
      </div>
    );
  }

  const isDashboardActive = pathname === "/student";
  const isAlertsActive = pathname === "/student/alerts";
  const isAppealActive = pathname === "/student/appeal";

  return (
    <div className="flex min-h-screen bg-brand-surface font-sans">
      {/* Sidebar Navigation */}
      <aside className="w-64 h-screen sticky top-0 border-r border-zinc-200 bg-white p-6 hidden md:flex flex-col justify-between shrink-0">
        <div className="space-y-8">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-primary text-white font-extrabold text-lg font-display">
              A
            </span>
            <span className="text-lg font-bold tracking-tight text-brand-text font-display">Archon</span>
          </div>

          <nav className="space-y-1">
            <Link
              href="/student"
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition ${
                isDashboardActive
                  ? "bg-brand-primary-light/50 font-semibold text-brand-primary"
                  : "font-medium text-brand-text hover:bg-zinc-50"
              }`}
            >
              <LayoutDashboard className="w-4 h-4" /> Dashboard
            </Link>
            <Link
              href="/student/alerts"
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition ${
                isAlertsActive
                  ? "bg-brand-primary-light/50 font-semibold text-brand-primary"
                  : "font-medium text-brand-text hover:bg-zinc-50"
              }`}
            >
              <Bell className="w-4 h-4" /> Alert Center
            </Link>
            <button
              onClick={handleStartNewChat}
              disabled={creatingTicket}
              className="w-full flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-brand-text hover:bg-zinc-50 transition text-left"
            >
              <MessageCircle className="w-4 h-4" /> AI Help Desk
            </button>
            <Link
              href="/student/appeal"
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition ${
                isAppealActive
                  ? "bg-brand-primary-light/50 font-semibold text-brand-primary"
                  : "font-medium text-brand-text hover:bg-zinc-50"
              }`}
            >
              <FileText className="w-4 h-4" /> SAP Appeal Wizard
            </Link>
          </nav>
        </div>

        <div className="space-y-4">
          <button
            onClick={() => signOut({ callbackUrl: "/" })}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-brand-error hover:bg-red-50 transition"
          >
            <LogOut className="w-4 h-4" /> Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 min-w-0">
        {children}
      </div>
    </div>
  );
}
