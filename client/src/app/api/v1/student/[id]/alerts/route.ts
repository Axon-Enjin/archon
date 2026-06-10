import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser, verifyStudentAccess, unauthorizedResponse, forbiddenResponse } from "@/lib/auth-helper";
import { cosmosDbService } from "@/lib/db/cosmos";
import { NotificationDoc } from "@/lib/db/types";
import { collectStudentSignals } from "@/lib/proactive-alerts";

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

function buildDerivedNotifications(studentOid: string, institutionId: string, holds: HoldItem[], events: CalendarEvent[]): NotificationDoc[] {
  const now = new Date();

  const holdNotifications = holds
    .filter((h) => h.status === "Active")
    .map((hold) => ({
      id: `notif-hold-${studentOid}-${hold.id}`,
      institution_id: institutionId,
      user_id: studentOid,
      type: "hold" as const,
      channel: "in_app" as const,
      status: "unread" as const,
      title: `${hold.type} hold requires action`,
      message: hold.reason,
      action_url: "/student",
      created_at: now.toISOString(),
    }));

  const upcomingEventNotifications = events
    .filter((evt) => {
      const ts = new Date(evt.start).getTime();
      const diffDays = Math.floor((ts - now.getTime()) / (1000 * 60 * 60 * 24));
      return diffDays >= 0 && diffDays <= 14;
    })
    .slice(0, 3)
    .map((evt) => ({
      id: `notif-deadline-${studentOid}-${evt.id}`,
      institution_id: institutionId,
      user_id: studentOid,
      type: "deadline" as const,
      channel: "in_app" as const,
      status: "unread" as const,
      title: "Upcoming academic event",
      message: `${evt.title} on ${new Date(evt.start).toLocaleDateString()}`,
      action_url: "/student",
      created_at: now.toISOString(),
    }));

  return [...holdNotifications, ...upcomingEventNotifications];
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authUser = await getAuthenticatedUser();
  if (!authUser) return unauthorizedResponse();

  const { id: studentOid } = await params;
  if (!verifyStudentAccess(authUser, studentOid)) {
    return forbiddenResponse("Forbidden: You cannot access this student's alerts.");
  }

  // Generate in-app alerts based on current holds and calendar to support PRD-F5
  // behavior. Signals are resolved deterministically (and cached) so alerts exist
  // even before the student's data is otherwise populated.
  const { holds, events } = await collectStudentSignals(studentOid, authUser.institution_id);

  const derived = buildDerivedNotifications(studentOid, authUser.institution_id, holds, events);
  for (const notif of derived) {
    await cosmosDbService.upsertNotification(notif);
  }

  const notifications = await cosmosDbService.getNotifications(studentOid, authUser.institution_id);

  return NextResponse.json({
    success: true,
    data: notifications,
  });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authUser = await getAuthenticatedUser();
  if (!authUser) return unauthorizedResponse();

  const { id: studentOid } = await params;
  if (!verifyStudentAccess(authUser, studentOid)) {
    return forbiddenResponse("Forbidden: You cannot modify this student's alerts.");
  }

  try {
    const { notificationId } = await request.json();
    if (!notificationId) {
      return NextResponse.json({ success: false, error: "notificationId is required." }, { status: 400 });
    }

    const updated = await cosmosDbService.markNotificationRead(notificationId, authUser.institution_id);
    if (!updated) {
      return NextResponse.json({ success: false, error: "Notification not found." }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: updated });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to update notification.";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
