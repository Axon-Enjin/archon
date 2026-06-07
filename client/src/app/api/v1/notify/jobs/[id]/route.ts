import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser, verifyRole, unauthorizedResponse, forbiddenResponse } from "@/lib/auth-helper";
import { cosmosDbService } from "@/lib/db/cosmos";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authUser = await getAuthenticatedUser();
  if (!authUser) return unauthorizedResponse();

  if (!verifyRole(authUser, ["Agent", "Admin"])) {
    return forbiddenResponse();
  }

  try {
    const { id } = await params;
    const body = await request.json();

    const status = body.status as "pending" | "processing" | "sent" | "failed";
    if (!status) {
      return NextResponse.json({ success: false, error: "status is required." }, { status: 400 });
    }

    const updated = await cosmosDbService.updateNotificationJobStatus(id, authUser.institution_id, {
      status,
      provider_message_id: body.providerMessageId,
      error_message: body.errorMessage,
      attempts: typeof body.attempts === "number" ? body.attempts : undefined,
    });

    if (!updated) {
      return NextResponse.json({ success: false, error: "Notification job not found." }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: updated });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to update notification job.";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
