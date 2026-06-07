"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";

export default function SAPAppealWizard() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [step, setStep] = useState(1);
  const [extenuatingCircumstance, setExtenuatingCircumstance] = useState("");
  const [mitigatingPlan, setMitigatingPlan] = useState("");
  const [fileUploaded, setFileUploaded] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin");
    }
  }, [status]);

  const handleNextStep = () => setStep((prev) => prev + 1);
  const handlePrevStep = () => setStep((prev) => prev - 1);

  const handleSubmitAppeal = async () => {
    setLoading(true);
    // Simulate submission delay
    setTimeout(async () => {
      setLoading(false);
      // Update local holds database state
      try {
        const holdsKey = `holds:${session?.user?.entra_oid}`;
        const holdsRes = await fetch(`/api/v1/student/${session?.user?.entra_oid}/holds`);
        const holdsData = await holdsRes.json();
        if (holdsData.success) {
          const holds = holdsData.data;
          const acadHold = holds.find((h: any) => h.id === "hold-academic");
          if (acadHold) {
            acadHold.status = "Lifting"; // Transitioning to administrator review
            await fetch(`/api/v1/student/${session?.user?.entra_oid}/holds`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ holdId: "hold-academic", action: "request-lift" }),
            });
          }
        }
      } catch (err) {
        console.error("Failed to update holds status during appeal submit:", err);
      }
      setStep(4);
    }, 2000);
  };

  return (
    <div className="flex min-h-screen bg-brand-surface font-sans">
      {/* Sidebar Navigation */}
      <aside className="w-64 border-r border-zinc-200 bg-white p-6 hidden md:flex flex-col justify-between">
        <div className="space-y-8">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-primary text-white font-extrabold text-lg">
              A
            </span>
            <span className="text-lg font-bold tracking-tight text-brand-text">Archon</span>
          </div>

          <nav className="space-y-1">
            <Link
              href="/student"
              className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-brand-text hover:bg-zinc-50"
            >
              📊 Dashboard
            </Link>
            <Link
              href="/student/chat?ticketId=ticket-001"
              className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-brand-text hover:bg-zinc-50"
            >
              💬 AI Help Desk
            </Link>
            <Link
              href="/student/appeal"
              className="flex items-center gap-3 rounded-lg bg-brand-primary-light/50 px-3 py-2 text-sm font-semibold text-brand-primary"
            >
              📝 SAP Appeal Wizard
            </Link>
          </nav>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-6 md:p-10 max-w-3xl mx-auto overflow-y-auto space-y-8">
        {/* Header */}
        <section className="border-b border-zinc-200 pb-6">
          <div className="flex items-center gap-2 text-xs font-semibold text-brand-primary uppercase tracking-wider">
            <span>📝</span>
            <span>PRD-F9 · Academic Advisory Service</span>
          </div>
          <h1 className="text-3xl font-extrabold text-brand-text mt-1">SAP Appeal Wizard</h1>
          <p className="text-brand-muted text-sm mt-1">
            Build and submit your Satisfactory Academic Progress appeal package to lift academic holds.
          </p>
        </section>

        {/* Wizard Steps indicator */}
        <section className="flex items-center justify-between border-b border-zinc-100 pb-4 text-xs font-semibold text-brand-muted">
          <span className={step === 1 ? "text-brand-primary" : ""}>1. Eligibility & Checklist</span>
          <span className="text-zinc-300">➔</span>
          <span className={step === 2 ? "text-brand-primary" : ""}>2. Narrative Builder</span>
          <span className="text-zinc-300">➔</span>
          <span className={step === 3 ? "text-brand-primary" : ""}>3. Upload Documents</span>
          <span className="text-zinc-300">➔</span>
          <span className={step === 4 ? "text-brand-primary" : ""}>4. Confirmation</span>
        </section>

        {/* Step 1: Eligibility */}
        {step === 1 && (
          <div className="rounded-xl bg-white p-6 border border-zinc-200 shadow-sm space-y-6">
            <h2 className="text-lg font-bold text-brand-text">Check Appeal Eligibility</h2>
            <p className="text-sm text-brand-muted leading-relaxed">
              Based on Registrar policy, an **Academic Hold** is placed if your Cumulative GWA drops below 2.50. To appeal this status, you must submit a written request explaining any extenuating circumstances.
            </p>
            <div className="rounded-lg bg-zinc-50 p-4 border border-zinc-100 space-y-3">
              <p className="text-xs font-bold text-brand-text uppercase tracking-wide">Required appeal document checklist:</p>
              <ul className="text-xs text-brand-muted space-y-2">
                <li className="flex items-center gap-2">✓ Certified True Copy of Grades (GWA 2.65)</li>
                <li className="flex items-center gap-2">✓ Written Appeal Narrative Letter</li>
                <li className="flex items-center gap-2">✓ Supporting Documentation (medical cert, billing, or scholarship slip)</li>
              </ul>
            </div>
            <div className="flex justify-end">
              <button
                onClick={handleNextStep}
                className="flex h-11 items-center justify-center rounded-xl bg-brand-primary px-5 text-sm font-semibold text-white shadow-sm hover:bg-teal-700"
              >
                Begin Narrative Builder
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Narrative Builder */}
        {step === 2 && (
          <div className="rounded-xl bg-white p-6 border border-zinc-200 shadow-sm space-y-6">
            <h2 className="text-lg font-bold text-brand-text">Step 2: Written Appeal Narrative</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-brand-text uppercase mb-1.5">
                  1. What extenuating circumstances affected your academic progress?
                </label>
                <textarea
                  value={extenuatingCircumstance}
                  onChange={(e) => setExtenuatingCircumstance(e.target.value)}
                  placeholder="E.g., Medical issues, family emergency, or unexpected financial hardship..."
                  className="w-full rounded-xl border border-zinc-200 bg-brand-surface p-4 text-sm focus:border-brand-primary focus:outline-none min-h-[120px]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-brand-text uppercase mb-1.5">
                  2. What steps have you taken to resolve this situation?
                </label>
                <textarea
                  value={mitigatingPlan}
                  onChange={(e) => setMitigatingPlan(e.target.value)}
                  placeholder="E.g., Reduced working hours, set up study schedules, enrolled in tutoring groups..."
                  className="w-full rounded-xl border border-zinc-200 bg-brand-surface p-4 text-sm focus:border-brand-primary focus:outline-none min-h-[120px]"
                />
              </div>
            </div>

            <div className="flex justify-between">
              <button
                onClick={handlePrevStep}
                className="flex h-11 items-center justify-center rounded-xl border border-zinc-200 bg-white px-5 text-sm font-semibold text-brand-text hover:bg-zinc-50"
              >
                Back
              </button>
              <button
                onClick={handleNextStep}
                disabled={!extenuatingCircumstance.trim() || !mitigatingPlan.trim()}
                className="flex h-11 items-center justify-center rounded-xl bg-brand-primary px-5 text-sm font-semibold text-white shadow-sm hover:bg-teal-700 disabled:opacity-50"
              >
                Go to Upload
              </button>
            </div>
          </div>
        )}

        {/* Step 3: File Upload */}
        {step === 3 && (
          <div className="rounded-xl bg-white p-6 border border-zinc-200 shadow-sm space-y-6">
            <h2 className="text-lg font-bold text-brand-text">Step 3: Supporting Documents</h2>
            <p className="text-sm text-brand-muted leading-relaxed">
              Upload files to support your narrative (e.g. certified grades PDF, medical certificate, or employment letter).
            </p>

            <div className="border-2 border-dashed border-zinc-200 rounded-xl p-8 text-center bg-zinc-50/50 hover:bg-zinc-50 hover:border-brand-primary transition cursor-pointer"
                 onClick={() => setFileUploaded(true)}>
              <span className="text-3xl block mb-2">📁</span>
              <p className="text-sm font-semibold text-brand-text">
                {fileUploaded ? "grades_certified_2026.pdf uploaded" : "Click to select or drop supporting PDF files here"}
              </p>
              <p className="text-xs text-brand-muted mt-1">Maximum file size: 5MB</p>
            </div>

            <div className="flex justify-between">
              <button
                onClick={handlePrevStep}
                className="flex h-11 items-center justify-center rounded-xl border border-zinc-200 bg-white px-5 text-sm font-semibold text-brand-text hover:bg-zinc-50"
              >
                Back
              </button>
              <button
                onClick={handleSubmitAppeal}
                disabled={!fileUploaded || loading}
                className="flex h-11 items-center justify-center rounded-xl bg-brand-primary px-6 text-sm font-semibold text-white shadow-sm hover:bg-teal-700 disabled:opacity-50"
              >
                {loading ? "Submitting appeal..." : "Submit Appeal Package"}
              </button>
            </div>
          </div>
        )}

        {/* Step 4: Confirmation */}
        {step === 4 && (
          <div className="rounded-xl bg-white p-8 border border-zinc-200 shadow-sm text-center space-y-6">
            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-green-700 text-3xl mx-auto shadow-sm">
              ✓
            </span>
            <div className="space-y-2">
              <h2 className="text-2xl font-extrabold text-brand-text">Appeal Package Submitted</h2>
              <p className="text-sm text-brand-muted leading-relaxed max-w-md mx-auto">
                Your Satisfactory Academic Progress appeal has been received. Your Academic Hold status is now set to **Lifting** while the Advisory Panel reviews your documents.
              </p>
            </div>
            <div className="rounded-lg bg-zinc-50 p-4 max-w-sm mx-auto border border-zinc-100 text-left text-xs text-brand-muted space-y-1">
              <p><span className="font-semibold text-brand-text">Reference ID:</span> SAP-APL-76295</p>
              <p><span className="font-semibold text-brand-text">Review Period:</span> 2-3 business days</p>
              <p><span className="font-semibold text-brand-text">Notification:</span> Email & Teams confirmation sent.</p>
            </div>
            <div className="flex justify-center">
              <Link
                href="/student"
                className="flex h-11 items-center justify-center rounded-xl bg-brand-primary px-6 text-sm font-semibold text-white hover:bg-teal-700"
              >
                Return to Dashboard
              </Link>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
