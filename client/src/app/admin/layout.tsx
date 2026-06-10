"use client";

import { useSession, signOut } from "next-auth/react";
import { useRouter, usePathname } from "next/navigation";
import { useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { Inbox, BarChart3, Bell, LogOut } from "lucide-react";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin");
      return;
    }

    if (session?.user && session.user.role !== "Admin") {
      router.push("/auth/signin");
      return;
    }
  }, [session, status, router]);

  if (status === "loading") {
    return (
      <div className="flex h-screen items-center justify-center bg-brand-surface">
        <div className="text-center">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-brand-primary border-t-transparent mx-auto"></div>
          <p className="mt-4 text-sm text-brand-muted font-sans font-medium">Authenticating Admin Session...</p>
        </div>
      </div>
    );
  }

  // Active link logic
  const isQueueActive = pathname === "/admin/queue";
  const isAnalyticsActive = pathname === "/admin/analytics";
  const isNotificationsActive = pathname === "/admin/notifications";

  return (
    <div className="flex h-screen overflow-hidden bg-brand-surface font-sans">
      {/* Persistent Admin Sidebar */}
      <aside className="w-64 h-full border-r border-zinc-200 bg-white p-6 hidden md:flex flex-col justify-between shrink-0">
        <div className="space-y-8">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-primary overflow-hidden">
              <Image src="/archon.svg" alt="Archon Admin Logo" width={36} height={36} className="w-full h-full object-contain" />
            </div>
            <span className="text-lg font-bold tracking-tight text-brand-text font-display">Archon Admin</span>
          </div>

          <nav className="space-y-1">
            <Link
              href="/admin/queue"
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-display transition ${
                isQueueActive
                  ? "bg-brand-primary-light/50 font-semibold text-brand-primary"
                  : "font-medium text-brand-text hover:bg-zinc-50"
              }`}
            >
              <Inbox className="w-4 h-4" /> Active Queue
            </Link>
            <Link
              href="/admin/analytics"
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-display transition ${
                isAnalyticsActive
                  ? "bg-brand-primary-light/50 font-semibold text-brand-primary"
                  : "font-medium text-brand-text hover:bg-zinc-50"
              }`}
            >
              <BarChart3 className="w-4 h-4" /> Analytics
            </Link>
            <Link
              href="/admin/notifications"
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-display transition ${
                isNotificationsActive
                  ? "bg-brand-primary-light/50 font-semibold text-brand-primary"
                  : "font-medium text-brand-text hover:bg-zinc-50"
              }`}
            >
              <Bell className="w-4 h-4" /> Notification Ops
            </Link>
          </nav>
        </div>

        <div>
          <button
            onClick={() => signOut({ callbackUrl: "/" })}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-brand-error hover:bg-red-50"
          >
            <LogOut className="w-4 h-4" /> Sign Out
          </button>
        </div>
      </aside>

      {/* Persistent Layout Content Window */}
      <div className="flex-1 flex flex-col overflow-hidden h-full">
        {children}
      </div>
    </div>
  );
}
