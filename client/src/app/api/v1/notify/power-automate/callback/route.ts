import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { cosmosDbService } from "@/lib/db/cosmos";
import { getPowerAutomateCallbackSecret } from "@/lib/feature-flags";
import { recordAnalyticsEvent } from "@/lib/analytics-events";

/**
 * Power Automate delivery callback (PRD-F11).
 *
 * After a Power Automate flow delivers a queued job to Teams/Outlook, it calls
 * this server-to-server webhook to confirm the outcome, flipping the job from
 * `processing` to `sent` (or `failed`). This closes the delivery loop end-to-end
 * and is what makes the admin "delivery success" metric reflect reality.
 *
 * Auth: a shared secret (`ARCHON_PA_CALLBACK_SECRET`) presented in the
 * `x-archon-pa-secret` header. There is no user session on this path, so the
 * secret is the only trust boundary — compared in constant time.
 */
function secretMatches(provided: string, expected: string): boolean {
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export async function POST(request: NextRequest) {
  const expectedSecret = getPowerAutomateCallbackSecret();
  if (!expectedSecret) {
    return NextResponse.json(
      { success: false, error: "Power Automate callback is not configured." },
      { status: 503 }
    );
  }

  const providedSecret = request.headers.get("x-archon-pa-secret") || "";
  if (!providedSecret || !secretMatches(providedSecret, expectedSecret)) {
    return NextResponse.json({ success: false, error: "Unauthorized." }, { status: 401 });
  }

  let body: {
    jobId?: string;
    institutionId?: string;
    status?: string;
    providerMessageId?: string;
    errorMessage?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON body." }, { status: 400 });
  }

  const jobId = body.jobId?.trim();
  const institutionId = body.institutionId?.trim();
  const status = body.status === "failed" ? "failed" : body.status === "sent" ? "sent" : null;

  if (!jobId || !institutionId) {
    return NextResponse.json(
      { success: false, error: "jobId and institutionId are required." },
      { status: 400 }
    );
  }
  if (!status) {
    return NextResponse.json(
      { success: false, error: "status must be 'sent' or 'failed'." },
      { status: 400 }
    );
  }

  try {
    const updated = await cosmosDbService.updateNotificationJobStatus(jobId, institutionId, {
      status,
      provider_message_id: body.providerMessageId,
      error_message: status === "failed" ? body.errorMessage || "Delivery failed." : undefined,
    });

    if (!updated) {
      return NextResponse.json(
        { success: false, error: "Notification job not found." },
        { status: 404 }
      );
    }

    recordAnalyticsEvent({
      type: status === "sent" ? "notification_delivered" : "notification_delivery_failed",
      institutionId,
      metadata: {
        jobId,
        channel: updated.channel,
        providerMessageId: body.providerMessageId,
      },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to record delivery callback.";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
