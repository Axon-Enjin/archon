"use client";

import { getProviders, signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { useEffect, useState, Suspense } from "react";
import Image from "next/image";

function SignInContent() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/";
  const [loading, setLoading] = useState<string | null>("providers");
  const [providerIds, setProviderIds] = useState<string[]>([]);

  useEffect(() => {
    let mounted = true;
    getProviders().then((providers) => {
      if (!mounted) return;
      setProviderIds(Object.keys(providers || {}));
      setLoading(null);
    });
    return () => {
      mounted = false;
    };
  }, []);

  const handleSignIn = async (username: string, redirectPath: string) => {
    setLoading(username);
    await signIn("credentials", {
      username,
      callbackUrl: callbackUrl !== "/" ? callbackUrl : redirectPath,
    });
  };

  const handleEntraSignIn = async () => {
    setLoading("azure-ad");
    await signIn("azure-ad", { callbackUrl });
  };

  const hasEntra = providerIds.includes("azure-ad");
  const hasCredentials = providerIds.includes("credentials");

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-brand-surface px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8 rounded-2xl bg-brand-card p-8 shadow-md border border-zinc-100">
        <div className="text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-brand-primary overflow-hidden shadow-sm border border-zinc-100">
            <Image src="/archon.svg" alt="Archon Portal Logo" width={48} height={48} className="w-full h-full object-contain" />
          </div>
          <h2 className="mt-6 text-3xl font-extrabold tracking-tight text-brand-text font-sans">
            Archon Portal
          </h2>
          <p className="mt-2 text-sm text-brand-muted font-sans">
            Sign in using Microsoft Entra ID
          </p>
        </div>

        <div className="mt-8 space-y-4">
          {hasEntra && (
            <button
              onClick={handleEntraSignIn}
              disabled={loading !== null}
              className="group relative flex w-full justify-between items-center rounded-xl border border-zinc-200 bg-white px-5 py-4 text-left transition hover:border-brand-primary hover:bg-brand-primary-light/10 disabled:opacity-50"
            >
              <div>
                <p className="text-base font-semibold text-brand-text">Continue with Microsoft</p>
                <p className="text-xs text-brand-muted">University SSO via Microsoft Entra ID</p>
              </div>
              <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700 group-hover:bg-brand-m365 group-hover:text-white">
                {loading === "azure-ad" ? "Signing in..." : "Entra ID"}
              </span>
            </button>
          )}

          {hasCredentials && (
            <>
              <button
                onClick={() => handleSignIn("mara", "/student")}
                disabled={loading !== null}
                className="group relative flex w-full justify-between items-center rounded-xl border border-zinc-200 bg-white px-5 py-4 text-left transition hover:border-brand-primary hover:bg-brand-primary-light/10 disabled:opacity-50"
              >
                <div>
                  <p className="text-base font-semibold text-brand-text">Mock Student Login</p>
                  <p className="text-xs text-brand-muted">Development-only fallback account</p>
                </div>
                <span className="rounded-full bg-teal-100 px-3 py-1 text-xs font-semibold text-brand-primary group-hover:bg-brand-primary group-hover:text-white">
                  {loading === "mara" ? "Signing in..." : "Student"}
                </span>
              </button>

              <button
                onClick={() => handleSignIn("jay", "/agent")}
                disabled={loading !== null}
                className="group relative flex w-full justify-between items-center rounded-xl border border-zinc-200 bg-white px-5 py-4 text-left transition hover:border-brand-primary hover:bg-brand-primary-light/10 disabled:opacity-50"
              >
                <div>
                  <p className="text-base font-semibold text-brand-text">Mock Agent Login</p>
                  <p className="text-xs text-brand-muted">Development-only fallback account</p>
                </div>
                <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-600 group-hover:bg-brand-m365 group-hover:text-white">
                  {loading === "jay" ? "Signing in..." : "Agent"}
                </span>
              </button>

              <button
                onClick={() => handleSignIn("reyes", "/admin")}
                disabled={loading !== null}
                className="group relative flex w-full justify-between items-center rounded-xl border border-zinc-200 bg-white px-5 py-4 text-left transition hover:border-brand-primary hover:bg-brand-primary-light/10 disabled:opacity-50"
              >
                <div>
                  <p className="text-base font-semibold text-brand-text">Mock Admin Login</p>
                  <p className="text-xs text-brand-muted">Development-only fallback account</p>
                </div>
                <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700 group-hover:bg-brand-warning group-hover:text-white">
                  {loading === "reyes" ? "Signing in..." : "Admin"}
                </span>
              </button>
            </>
          )}
        </div>

        <div className="mt-6 text-center text-xs text-brand-muted">
          {!hasEntra && !hasCredentials && <p>No authentication provider is configured.</p>}
          {hasCredentials && <p>Local sandbox credentials fallback enabled.</p>}
          <p className="mt-1">Archon is built under DPA 2012 compliance.</p>
        </div>
      </div>
    </div>
  );
}

export default function SignIn() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-brand-surface">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-primary border-t-transparent mx-auto"></div>
      </div>
    }>
      <SignInContent />
    </Suspense>
  );
}
