import { NextRequest, NextResponse } from "next/server";
import { forbiddenResponse, getAuthenticatedUser, unauthorizedResponse, verifyRole } from "@/lib/auth-helper";
import { cosmosDbService } from "@/lib/db/cosmos";

interface ConsentSnapshot {
  m365Enabled: boolean;
  accessTokenPresent: boolean;
  calendarConsent: "granted" | "not_granted" | "token_missing" | "unavailable";
  message: string;
  lastCheckedAt: string;
}

function toPercent(numerator: number, denominator: number): number {
  if (denominator <= 0) return 0;
  return Number(((numerator / denominator) * 100).toFixed(1));
}

export async function GET(request: NextRequest) {
  const authUser = await getAuthenticatedUser();
  if (!authUser) return unauthorizedResponse();
  if (!verifyRole(authUser, ["Admin"])) return forbiddenResponse("Forbidden: Admin role required.");

  const limitRaw = Number(request.nextUrl.searchParams.get("limit") || "1000");
  const limit = Number.isFinite(limitRaw) && limitRaw > 0 ? Math.min(limitRaw, 5000) : 1000;

  try {
    const [conversations, handoffs, jobs, studentIds] = await Promise.all([
      cosmosDbService.getConversations(authUser.institution_id, limit),
      cosmosDbService.getHandoffs(authUser.institution_id, limit),
      cosmosDbService.getNotificationJobs(authUser.institution_id, { limit }),
      cosmosDbService.getStudentIdentifiers(authUser.institution_id),
    ]);

    const totalTickets = conversations.length;
    const resolvedTickets = conversations.filter((c) => c.status === "Resolved").length;
    const pendingAgent = conversations.filter((c) => c.status === "Pending Agent").length;

    const handoffTicketIds = new Set(handoffs.map((h) => h.ticket_id));
    const resolvedWithHandoff = conversations.filter(
      (c) => c.status === "Resolved" && handoffTicketIds.has(c.id)
    ).length;
    const autoResolved = Math.max(0, resolvedTickets - resolvedWithHandoff);

    const handleDurationsMs = handoffs
      .map((handoff) => {
        if (!handoff.resolved_at) return null;
        const ticket = conversations.find((c) => c.id === handoff.ticket_id);
        if (!ticket) return null;
        const start = new Date(ticket.created_at).getTime();
        const end = new Date(handoff.resolved_at).getTime();
        if (Number.isNaN(start) || Number.isNaN(end) || end < start) return null;
        return end - start;
      })
      .filter((value): value is number => typeof value === "number");

    const avgHandleMs =
      handleDurationsMs.length > 0
        ? Math.round(handleDurationsMs.reduce((sum, value) => sum + value, 0) / handleDurationsMs.length)
        : 0;

    const wrapUpCompleted = handoffs.filter((h) => h.handoff_packet.wrap_up_status === "completed").length;
    const wrapUpPending = handoffs.filter((h) => h.handoff_packet.wrap_up_status === "pending").length;

    // CSAT (PRD §5.5 `satisfaction_submitted`): aggregate post-resolution ratings.
    const ratedConversations = conversations.filter((c) => c.satisfaction);
    const csatResponses = ratedConversations.length;
    const csatPositive = ratedConversations.filter((c) => c.satisfaction?.rating === "positive").length;
    const csatAvgScore =
      csatResponses > 0
        ? Number(
            (
              ratedConversations.reduce((sum, c) => sum + (c.satisfaction?.score ?? 0), 0) / csatResponses
            ).toFixed(2)
          )
        : 0;
    const csatResponseRate = toPercent(csatResponses, resolvedTickets);
    const csatPositiveRate = toPercent(csatPositive, csatResponses);

    // Average AI confidence at escalation (PRD-F3 / US-05) across handoff packets.
    const confidenceValues = handoffs
      .map((h) => h.handoff_packet.ai_confidence)
      .filter((v): v is number => typeof v === "number");
    const avgAiConfidence =
      confidenceValues.length > 0
        ? Number(
            (confidenceValues.reduce((sum, v) => sum + v, 0) / confidenceValues.length).toFixed(2)
          )
        : 0;

    const sentJobs = jobs.filter((j) => j.status === "sent").length;
    const failedJobs = jobs.filter((j) => j.status === "failed").length;
    const notificationActionRate = toPercent(sentJobs, jobs.length);

    const consentSnapshots = await Promise.all(
      studentIds.map((studentId) =>
        cosmosDbService.getCacheData<ConsentSnapshot>(`m365-consent:${studentId}`, authUser.institution_id)
      )
    );

    const knownConsent = consentSnapshots.filter((snapshot): snapshot is ConsentSnapshot => Boolean(snapshot));
    const consentGranted = knownConsent.filter((snapshot) => snapshot.calendarConsent === "granted").length;
    const consentMissing = knownConsent.filter((snapshot) => snapshot.calendarConsent === "not_granted").length;
    const consentTokenMissing = knownConsent.filter((snapshot) => snapshot.calendarConsent === "token_missing").length;

    return NextResponse.json({
      success: true,
      data: {
        generatedAt: new Date().toISOString(),
        totals: {
          tickets: totalTickets,
          resolvedTickets,
          pendingAgent,
          handoffs: handoffs.length,
          wrapUpCompleted,
          wrapUpPending,
        },
        rates: {
          deflectionRate: toPercent(autoResolved, totalTickets),
          resolutionRate: toPercent(resolvedTickets, totalTickets),
          wrapUpCompletionRate: toPercent(wrapUpCompleted, handoffs.length),
          notificationActionRate,
          consentCoverageRate: toPercent(consentGranted, Math.max(knownConsent.length, 1)),
          csatResponseRate,
          csatPositiveRate,
        },
        operations: {
          avgHandleMs,
          avgHandleMinutes: Number((avgHandleMs / 60000).toFixed(2)),
          autoResolved,
          resolvedWithHandoff,
          sentJobs,
          failedJobs,
          avgAiConfidence,
        },
        satisfaction: {
          responses: csatResponses,
          positive: csatPositive,
          negative: csatResponses - csatPositive,
          avgScore: csatAvgScore,
        },
        consent: {
          trackedStudents: studentIds.length,
          snapshotsAvailable: knownConsent.length,
          granted: consentGranted,
          missing: consentMissing,
          tokenMissing: consentTokenMissing,
        },
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to generate admin analytics summary.";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
