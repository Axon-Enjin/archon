import { NextResponse } from "next/server";
import { forbiddenResponse, getAuthenticatedUser, unauthorizedResponse, verifyRole } from "@/lib/auth-helper";
import { isM365Enabled } from "@/lib/feature-flags";
import { cosmosDbService } from "@/lib/db/cosmos";

interface HoldItem {
  id: string;
  type: string;
  reason: string;
  status: "Active" | "Lifting" | "Resolved";
}

interface CalendarEvent {
  id: string;
  title: string;
  start: string;
}

interface FinancialData {
  payment_deadline?: string;
  scholarship_renewal_deadline?: string;
}

function daysUntil(isoDate: string, now: Date): number {
  const ts = new Date(isoDate).getTime();
  if (Number.isNaN(ts)) return Number.POSITIVE_INFINITY;
  return Math.floor((ts - now.getTime()) / (1000 * 60 * 60 * 24));
}

function toDayKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export async function POST() {
  const authUser = await getAuthenticatedUser();
  if (!authUser) return unauthorizedResponse();

  if (!verifyRole(authUser, ["Admin"])) {
    return forbiddenResponse("Forbidden: Only admins can run reminder generation.");
  }

  if (!isM365Enabled()) {
    return NextResponse.json(
      { success: false, error: "M365 notifications are disabled by configuration." },
      { status: 503 }
    );
  }

  const now = new Date();
  const dayKey = toDayKey(now);
  const queuedIds = new Set<string>();
  const queuedJobs: Array<{ id: string; channel: "teams" | "outlook"; studentId: string; kind: string }> = [];

  const queueJob = async (
    job: {
      id: string;
      channel: "teams" | "outlook";
      studentId: string;
      kind: string;
      title?: string;
      message?: string;
      subject?: string;
      textBody?: string;
      actionUrl?: string;
      ticketId?: string;
    }
  ) => {
    if (queuedIds.has(job.id)) return;
    queuedIds.add(job.id);

    const nowIso = new Date().toISOString();
    await cosmosDbService.createNotificationJob({
      id: job.id,
      institution_id: authUser.institution_id,
      channel: job.channel,
      recipient_entra_oid: job.studentId,
      status: "pending",
      attempts: 0,
      payload: {
        title: job.title,
        message: job.message,
        subject: job.subject,
        text_body: job.textBody,
        action_url: job.actionUrl,
        ticket_id: job.ticketId,
      },
      created_at: nowIso,
      updated_at: nowIso,
    });

    queuedJobs.push({
      id: job.id,
      channel: job.channel,
      studentId: job.studentId,
      kind: job.kind,
    });
  };

  try {
    const studentIds = await cosmosDbService.getStudentIdentifiers(authUser.institution_id);

    for (const studentId of studentIds) {
      const [holds, events, financial] = await Promise.all([
        cosmosDbService.getCacheData<HoldItem[]>(`holds:${studentId}`, authUser.institution_id),
        cosmosDbService.getCacheData<CalendarEvent[]>(`calendar:${studentId}`, authUser.institution_id),
        cosmosDbService.getCacheData<FinancialData>(`financial:${studentId}`, authUser.institution_id),
      ]);

      for (const hold of (holds || []).filter((h) => h.status === "Active")) {
        const holdTag = hold.id.replace(/[^a-zA-Z0-9_-]/g, "");

        await queueJob({
          id: `notifjob-teams-reminder-hold-${studentId}-${holdTag}-${dayKey}`,
          channel: "teams",
          studentId,
          kind: "hold",
          title: `${hold.type} hold requires action`,
          message: hold.reason,
          actionUrl: "/student/alerts",
        });

        await queueJob({
          id: `notifjob-outlook-reminder-hold-${studentId}-${holdTag}-${dayKey}`,
          channel: "outlook",
          studentId,
          kind: "hold",
          subject: `${hold.type} hold reminder`,
          textBody: `${hold.reason}\n\nPlease check your Archon dashboard for next steps.`,
        });
      }

      for (const event of (events || []).filter((evt) => {
        const diff = daysUntil(evt.start, now);
        return diff >= 0 && diff <= 14;
      })) {
        const eventTag = event.id.replace(/[^a-zA-Z0-9_-]/g, "");
        const eventDate = new Date(event.start).toLocaleDateString();

        await queueJob({
          id: `notifjob-teams-reminder-event-${studentId}-${eventTag}-${dayKey}`,
          channel: "teams",
          studentId,
          kind: "deadline",
          title: "Upcoming academic event",
          message: `${event.title} on ${eventDate}`,
          actionUrl: "/student",
        });

        await queueJob({
          id: `notifjob-outlook-reminder-event-${studentId}-${eventTag}-${dayKey}`,
          channel: "outlook",
          studentId,
          kind: "deadline",
          subject: `Reminder: ${event.title}`,
          textBody: `Upcoming event on ${eventDate}: ${event.title}`,
        });
      }

      const paymentDeadline = financial?.payment_deadline;
      if (paymentDeadline) {
        const diff = daysUntil(paymentDeadline, now);
        if (diff >= 0 && diff <= 14) {
          await queueJob({
            id: `notifjob-outlook-reminder-financial-payment-${studentId}-${dayKey}`,
            channel: "outlook",
            studentId,
            kind: "deadline",
            subject: "Payment deadline reminder",
            textBody: `Your payment deadline is on ${new Date(paymentDeadline).toLocaleDateString()}.`,
          });
        }
      }

      const scholarshipDeadline = financial?.scholarship_renewal_deadline;
      if (scholarshipDeadline) {
        const diff = daysUntil(scholarshipDeadline, now);
        if (diff >= 0 && diff <= 14) {
          await queueJob({
            id: `notifjob-outlook-reminder-scholarship-${studentId}-${dayKey}`,
            channel: "outlook",
            studentId,
            kind: "deadline",
            subject: "Scholarship renewal reminder",
            textBody: `Your scholarship renewal deadline is on ${new Date(scholarshipDeadline).toLocaleDateString()}.`,
          });
        }
      }
    }

    const queuedTeams = queuedJobs.filter((job) => job.channel === "teams").length;
    const queuedOutlook = queuedJobs.filter((job) => job.channel === "outlook").length;

    return NextResponse.json({
      success: true,
      data: {
        studentsScanned: studentIds.length,
        queuedTotal: queuedJobs.length,
        queuedTeams,
        queuedOutlook,
        queuedJobs,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to generate reminder jobs.";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
