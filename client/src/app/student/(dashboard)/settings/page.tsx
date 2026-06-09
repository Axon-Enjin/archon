"use client";

import { useSession, signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { RefreshCw, ShieldCheck, ShieldAlert, Link as LinkIcon } from "lucide-react";

interface ConsentData {
  m365Enabled: boolean;
  accessTokenPresent: boolean;
  calendarConsent: "granted" | "not_granted" | "token_missing" | "unavailable";
  message: string;
  lastCheckedAt: string;
}

export default function StudentSettingsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [consent, setConsent] = useState<ConsentData | null>(null);

  const loadConsentStatus = async (isRefresh = false) => {
    const studentOid = session?.user?.entra_oid;
    if (!studentOid) return;

    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      const res = await fetch(`/api/v1/student/${studentOid}/m365-consent`);
      const data = await res.json();
      if (data.success) {
        setConsent(data.data);
      }
    } catch (error) {
      console.error("Failed to load M365 consent status", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin");
      return;
    }

    if (session?.user?.role && session.user.role !== "Student") {
      router.push("/auth/signin");
      return;
    }

    if (session?.user?.entra_oid) {
      const studentOid = session.user.entra_oid;
      const timer = setTimeout(() => {
        void (async () => {
          try {
            setLoading(true);
            const res = await fetch(`/api/v1/student/${studentOid}/m365-consent`);
            const data = await res.json();
            if (data.success) {
              setConsent(data.data);
            }
          } catch (error) {
            console.error("Failed to load M365 consent status", error);
          } finally {
            setLoading(false);
          }
        })();
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [session, status, router]);

  const reconnectM365 = async () => {
    await signIn("azure-ad", {
      callbackUrl: "/student/settings",
      prompt: "consent",
    });
  };

  if (loading || status === "loading") {
    return (
      <div className="flex h-[calc(100vh-80px)] items-center justify-center">
        <div className="text-center">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-brand-primary border-t-transparent mx-auto"></div>
          <p className="mt-4 text-sm text-brand-muted font-sans">Loading settings...</p>
        </div>
      </div>
    );
  }

  const statusBadgeClass =
    consent?.calendarConsent === "granted"
      ? "bg-green-100 text-green-700"
      : consent?.calendarConsent === "not_granted"
      ? "bg-amber-100 text-amber-700"
      : "bg-zinc-100 text-zinc-700";

  const showReconnectAction =
    consent?.calendarConsent === "not_granted" || consent?.calendarConsent === "token_missing";

  return (
    <main className="p-6 md:p-10 max-w-4xl mx-auto space-y-6">
      <section className="border-b border-zinc-200 pb-4 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold font-display text-brand-text">Settings</h1>
          <p className="text-brand-muted text-sm mt-1">Manage account integrations and consent status.</p>
        </div>
        <button
          onClick={() => void loadConsentStatus(true)}
          disabled={refreshing}
          className="inline-flex items-center gap-2 rounded-lg border border-zinc-200 px-3 py-2 text-xs font-semibold text-brand-text hover:bg-zinc-50 disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </section>

      <section className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm space-y-4">
        <div className="flex items-center gap-3">
          {consent?.calendarConsent === "granted" ? (
            <ShieldCheck className="w-5 h-5 text-green-600" />
          ) : (
            <ShieldAlert className="w-5 h-5 text-amber-600" />
          )}
          <h2 className="text-lg font-bold font-display text-brand-text">Microsoft 365 Consent Status</h2>
          <span className={`ml-auto rounded-full px-2.5 py-1 text-[10px] font-bold uppercase ${statusBadgeClass}`}>
            {consent?.calendarConsent || "unknown"}
          </span>
        </div>

        <p className="text-sm text-brand-muted">{consent?.message || "Consent status unavailable."}</p>

        <div className="grid gap-3 sm:grid-cols-2 text-xs">
          <div className="rounded-lg border border-zinc-100 bg-zinc-50 p-3">
            <p className="text-brand-muted">M365 Integration</p>
            <p className="mt-1 font-semibold text-brand-text">{consent?.m365Enabled ? "Enabled" : "Disabled"}</p>
          </div>
          <div className="rounded-lg border border-zinc-100 bg-zinc-50 p-3">
            <p className="text-brand-muted">Session Token</p>
            <p className="mt-1 font-semibold text-brand-text">{consent?.accessTokenPresent ? "Present" : "Missing"}</p>
          </div>
        </div>

        {consent?.lastCheckedAt && (
          <p className="text-[11px] text-brand-muted">Last checked: {new Date(consent.lastCheckedAt).toLocaleString()}</p>
        )}

        {showReconnectAction && (
          <button
            onClick={reconnectM365}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-brand-m365 px-4 text-xs font-semibold text-white shadow-sm hover:bg-blue-700 transition"
          >
            <LinkIcon className="w-4 h-4" />
            Connect / Re-consent M365 Calendar
          </button>
        )}
      </section>
    </main>
  );
}
