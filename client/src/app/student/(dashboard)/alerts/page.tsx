"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Bell, Mail, MessageSquare } from "lucide-react";

interface NotificationItem {
  id: string;
  type: "deadline" | "hold" | "ticket" | "system";
  channel: "in_app" | "teams" | "outlook";
  status: "unread" | "read";
  title: string;
  message: string;
  action_url?: string;
  created_at: string;
}

export default function AlertCenterPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);

  async function loadNotifications(studentOid: string) {
    try {
      const res = await fetch(`/api/v1/student/${studentOid}/alerts`);
      const data = await res.json();
      if (data.success) {
        setNotifications(data.data);
      }
    } catch (err) {
      console.error("Error loading notifications:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin");
      return;
    }

    if (session?.user) {
      if (session.user.role !== "Student") {
        router.push("/auth/signin");
        return;
      }
      const timer = setTimeout(() => {
        void loadNotifications(session.user.entra_oid);
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [session, status, router]);

  const markAsRead = async (notificationId: string) => {
    if (!session?.user) return;
    try {
      const res = await fetch(`/api/v1/student/${session.user.entra_oid}/alerts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notificationId }),
      });
      const data = await res.json();
      if (data.success) {
        setNotifications((prev) =>
          prev.map((n) => (n.id === notificationId ? { ...n, status: "read" } : n))
        );
      }
    } catch (err) {
      console.error("Error marking notification as read:", err);
    }
  };

  if (loading || status === "loading") {
    return (
      <div className="flex h-[calc(100vh-80px)] items-center justify-center">
        <div className="text-center">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-brand-primary border-t-transparent mx-auto"></div>
          <p className="mt-4 text-sm text-brand-muted font-sans">Loading your alerts...</p>
        </div>
      </div>
    );
  }

  return (
    <main className="p-6 md:p-10 max-w-5xl mx-auto space-y-6">
      <section className="flex items-center justify-between border-b border-zinc-200 pb-4">
        <div>
          <h1 className="text-3xl font-bold font-display text-brand-text">Alert Center</h1>
          <p className="text-brand-muted text-sm mt-1">In-app notifications derived from holds, deadlines, and ticket activity.</p>
        </div>
        <button
          onClick={() => session?.user && void loadNotifications(session.user.entra_oid)}
          className="inline-flex h-9 items-center justify-center rounded-lg border border-zinc-200 px-4 text-xs font-semibold text-brand-text hover:bg-zinc-50"
        >
          Refresh
        </button>
      </section>

      {notifications.length === 0 ? (
        <section className="rounded-xl border border-zinc-200 bg-white p-8 text-center">
          <p className="text-sm text-brand-muted">No alerts right now.</p>
        </section>
      ) : (
        <section className="space-y-3">
          {notifications.map((notif) => (
            <div key={notif.id} className={`rounded-xl border p-4 bg-white shadow-sm ${notif.status === "unread" ? "border-brand-primary/30" : "border-zinc-200"}`}>
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${notif.status === "unread" ? "bg-brand-primary-light text-brand-primary" : "bg-zinc-100 text-zinc-600"}`}>
                      {notif.status}
                    </span>
                    <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold bg-blue-50 text-blue-700 uppercase">{notif.type}</span>
                    {notif.channel === "teams" && (
                      <span className="rounded-full px-2 py-0.5 text-[10px] font-bold bg-[#6264A7] text-white flex items-center gap-1">
                        <MessageSquare className="w-3 h-3" /> Teams
                      </span>
                    )}
                    {notif.channel === "outlook" && (
                      <span className="rounded-full px-2 py-0.5 text-[10px] font-bold bg-[#0078D4] text-white flex items-center gap-1">
                        <Mail className="w-3 h-3" /> Outlook
                      </span>
                    )}
                    {notif.channel === "in_app" && (
                      <span className="rounded-full px-2 py-0.5 text-[10px] font-bold bg-brand-primary text-white flex items-center gap-1">
                        <Bell className="w-3 h-3" /> In-App
                      </span>
                    )}
                  </div>
                  <p className="text-sm font-semibold text-brand-text">{notif.title}</p>
                  <p className="text-xs text-brand-muted">{notif.message}</p>
                  <p className="text-[10px] text-brand-muted">{new Date(notif.created_at).toLocaleString()}</p>
                </div>

                <div className="flex flex-col items-end gap-2">
                  {notif.action_url && (
                    <Link
                      href={notif.action_url}
                      className="text-xs font-semibold text-brand-primary hover:underline"
                    >
                      Open
                    </Link>
                  )}
                  {notif.status === "unread" && (
                    <button
                      onClick={() => markAsRead(notif.id)}
                      className="inline-flex h-8 items-center justify-center rounded-md border border-zinc-200 px-3 text-[11px] font-semibold text-brand-text hover:bg-zinc-50"
                    >
                      Mark read
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </section>
      )}
    </main>
  );
}
