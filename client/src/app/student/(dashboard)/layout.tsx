"use client";

import { useSession, signOut } from "next-auth/react";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { LayoutDashboard, MessageCircle, FileText, LogOut, Bell, ChevronLeft, ChevronRight } from "lucide-react";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const [creatingTicket, setCreatingTicket] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

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
      <aside
        className={`h-screen sticky top-0 border-r border-zinc-200 bg-white hidden md:flex flex-col justify-between shrink-0 transition-all duration-300 ease-in-out ${
          isCollapsed ? "w-20 p-4" : "w-64 p-6"
        }`}
      >
        <div className="space-y-8">
          <div className="flex items-center justify-between">
            <div className={`flex items-center gap-3 ${isCollapsed ? "justify-center w-full" : ""}`}>
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-primary text-white font-extrabold text-lg font-display">
                A
              </span>
              {!isCollapsed && (
                <span className="text-lg font-bold tracking-tight text-brand-text font-display transition-opacity duration-300">
                  Archon
                </span>
              )}
            </div>
            {!isCollapsed && (
              <button
                onClick={() => setIsCollapsed(true)}
                className="rounded-lg p-1.5 hover:bg-zinc-100 text-brand-muted hover:text-brand-text transition"
                title="Collapse sidebar"
              >
                <ChevronLeft className="w-4.5 h-4.5" />
              </button>
            )}
          </div>

          {isCollapsed && (
            <div className="flex justify-center">
              <button
                onClick={() => setIsCollapsed(false)}
                className="rounded-lg p-1.5 hover:bg-zinc-100 text-brand-muted hover:text-brand-text transition"
                title="Expand sidebar"
              >
                <ChevronRight className="w-4.5 h-4.5" />
              </button>
            </div>
          )}

          <nav className="space-y-1">
            <Link
              href="/student"
              title={isCollapsed ? "Dashboard" : undefined}
              className={`flex items-center rounded-lg px-3 py-2 text-sm transition-all duration-200 ${
                isCollapsed ? "justify-center" : "gap-3"
              } ${
                isDashboardActive
                  ? "bg-brand-primary-light/50 font-semibold text-brand-primary"
                  : "font-medium text-brand-text hover:bg-zinc-50"
              }`}
            >
              <LayoutDashboard className="w-4 h-4 shrink-0" />
              {!isCollapsed && <span>Dashboard</span>}
            </Link>
            <Link
              href="/student/alerts"
              title={isCollapsed ? "Alert Center" : undefined}
              className={`flex items-center rounded-lg px-3 py-2 text-sm transition-all duration-200 ${
                isCollapsed ? "justify-center" : "gap-3"
              } ${
                isAlertsActive
                  ? "bg-brand-primary-light/50 font-semibold text-brand-primary"
                  : "font-medium text-brand-text hover:bg-zinc-50"
              }`}
            >
              <Bell className="w-4 h-4 shrink-0" />
              {!isCollapsed && <span>Alert Center</span>}
            </Link>
            <button
              onClick={handleStartNewChat}
              disabled={creatingTicket}
              title={isCollapsed ? "AI Help Desk" : undefined}
              className={`w-full flex items-center rounded-lg px-3 py-2 text-sm font-medium text-brand-text hover:bg-zinc-50 transition-all duration-200 text-left ${
                isCollapsed ? "justify-center" : "gap-3"
              }`}
            >
              <MessageCircle className="w-4 h-4 shrink-0" />
              {!isCollapsed && <span>AI Help Desk</span>}
            </button>
            <Link
              href="/student/appeal"
              title={isCollapsed ? "SAP Appeal Wizard" : undefined}
              className={`flex items-center rounded-lg px-3 py-2 text-sm transition-all duration-200 ${
                isCollapsed ? "justify-center" : "gap-3"
              } ${
                isAppealActive
                  ? "bg-brand-primary-light/50 font-semibold text-brand-primary"
                  : "font-medium text-brand-text hover:bg-zinc-50"
              }`}
            >
              <FileText className="w-4 h-4 shrink-0" />
              {!isCollapsed && <span>SAP Appeal Wizard</span>}
            </Link>
          </nav>
        </div>

        <div className="space-y-4">
          <button
            onClick={() => signOut({ callbackUrl: "/" })}
            title={isCollapsed ? "Sign Out" : undefined}
            className={`flex w-full items-center rounded-lg px-3 py-2 text-sm font-medium text-brand-error hover:bg-red-50 transition-all duration-200 ${
              isCollapsed ? "justify-center" : "gap-3"
            }`}
          >
            <LogOut className="w-4 h-4 shrink-0" />
            {!isCollapsed && <span>Sign Out</span>}
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
