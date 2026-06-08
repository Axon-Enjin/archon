import { NextRequest, NextResponse } from "next/server";
import { forbiddenResponse, getAuthenticatedUser, unauthorizedResponse, verifyRole } from "@/lib/auth-helper";
import { cosmosDbService } from "@/lib/db/cosmos";
import {
  canPublishToPowerAutomateFree,
  publishNotificationJobToPowerAutomateFree,
} from "@/lib/power-automate-free";

export async function POST(request: NextRequest) {
  const authUser = await getAuthenticatedUser();
  if (!authUser) return unauthorizedResponse();

  if (!verifyRole(authUser, ["Admin"])) {
    return forbiddenResponse("Forbidden: Only admins can sync Power Automate outbox.");
  }

  if (!canPublishToPowerAutomateFree()) {
    return NextResponse.json(
      { success: false, error: "Power Automate Free integration is disabled by configuration." },
      { status: 503 }
    );
  }

  const limitRaw = Number(request.nextUrl.searchParams.get("limit") || "50");
  const limit = Number.isFinite(limitRaw) ? Math.max(1, Math.min(200, limitRaw)) : 50;
  const requestedStatus = request.nextUrl.searchParams.get("status");
  const status =
    requestedStatus === "pending" || requestedStatus === "failed" ? requestedStatus : "pending";

  try {
    const jobs = await cosmosDbService.getNotificationJobs(authUser.institution_id, {
      status,
      limit,
    });

    const results: Array<{ id: string; status: "processing" | "failed"; error?: string }> = [];
    let sentToOutbox = 0;
    let failed = 0;

    for (const job of jobs) {
      try {
        const published = await publishNotificationJobToPowerAutomateFree(job);
        await cosmosDbService.updateNotificationJobStatus(job.id, authUser.institution_id, {
          status: "processing",
          provider_message_id: published.listItemId,
          error_message: undefined,
          attempts: (job.attempts || 0) + 1,
        });
        sentToOutbox += 1;
        results.push({ id: job.id, status: "processing" });
      } catch (error: unknown) {
        const message =
          error instanceof Error ? error.message : "Power Automate outbox publish failed.";
        await cosmosDbService.updateNotificationJobStatus(job.id, authUser.institution_id, {
          status: "failed",
          error_message: message,
          attempts: (job.attempts || 0) + 1,
        });
        failed += 1;
        results.push({ id: job.id, status: "failed", error: message });
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        scanned: jobs.length,
        sentToOutbox,
        failed,
        results,
      },
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to sync jobs to Power Automate outbox.";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
