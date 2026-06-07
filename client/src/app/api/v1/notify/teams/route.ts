import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser, verifyRole, unauthorizedResponse, forbiddenResponse } from "@/lib/auth-helper";
import { isM365Enabled } from "@/lib/feature-flags";
import { enqueueTeamsNotification } from "@/lib/notification-jobs";

export async function POST(request: NextRequest) {
  const authUser = await getAuthenticatedUser();
  if (!authUser) return unauthorizedResponse();

  if (!verifyRole(authUser, ["Agent", "Admin", "Student"])) {
    return forbiddenResponse();
  }

  if (!isM365Enabled()) {
    return NextResponse.json({ success: false, error: "M365 notifications are disabled by configuration." }, { status: 503 });
  }

  try {
    const body = await request.json();
    const recipientEntraOid: string = body.recipientEntraOid || authUser.entra_oid;
    const title: string = body.title || "Archon Notification";
    const message: string = body.message || "You have an update from Archon.";
    const actionUrl: string | undefined = body.actionUrl;
    const ticketId: string | undefined = body.ticketId;

    if (authUser.role === "Student" && recipientEntraOid !== authUser.entra_oid) {
      return forbiddenResponse("Students can only send notifications to their own account.");
    }

    const job = await enqueueTeamsNotification({
      institutionId: authUser.institution_id,
      recipientEntraOid,
      title,
      message,
      actionUrl,
      ticketId,
    });

    return NextResponse.json({ success: true, data: job });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to queue Teams notification.";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
