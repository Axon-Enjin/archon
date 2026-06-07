import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser, verifyStudentAccess, unauthorizedResponse, forbiddenResponse } from "@/lib/auth-helper";
import { cosmosDbService } from "@/lib/db/cosmos";
import { isM365Enabled } from "@/lib/feature-flags";

interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  isAllDay: boolean;
  source: "M365";
}

interface GraphCalendarViewResponse {
  value?: Array<{
    id?: string;
    subject?: string;
    isCancelled?: boolean;
    isAllDay?: boolean;
    start?: {
      dateTime?: string;
      timeZone?: string;
    };
    end?: {
      dateTime?: string;
      timeZone?: string;
    };
  }>;
}

function toIsoOrNow(value?: string): string {
  if (!value) return new Date().toISOString();
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? new Date().toISOString() : parsed.toISOString();
}

function normalizeGraphEvents(items: GraphCalendarViewResponse["value"]): CalendarEvent[] {
  const raw = items || [];
  return raw
    .filter((evt) => !evt.isCancelled)
    .map((evt) => ({
      id: evt.id || crypto.randomUUID(),
      title: evt.subject || "Untitled Event",
      start: toIsoOrNow(evt.start?.dateTime),
      end: toIsoOrNow(evt.end?.dateTime),
      isAllDay: Boolean(evt.isAllDay),
      source: "M365" as const,
    }))
    .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
}

async function fetchOutlookCalendarEvents(accessToken: string): Promise<CalendarEvent[]> {
  // Broaden window to reduce false "no events" cases.
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 7);
  const startDateTime = startDate.toISOString();
  const endDate = new Date();
  endDate.setDate(endDate.getDate() + 45);
  const endDateTime = endDate.toISOString();

  const response = await fetch(
    `https://graph.microsoft.com/v1.0/me/calendarView?startDateTime=${encodeURIComponent(startDateTime)}&endDateTime=${encodeURIComponent(endDateTime)}&$orderby=start/dateTime&$top=20`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Prefer: 'outlook.timezone="UTC"',
      },
      cache: "no-store",
    }
  );

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Graph calendar request failed (${response.status}): ${body}`);
  }

  const payload = (await response.json()) as GraphCalendarViewResponse;
  const normalizedFromCalendarView = normalizeGraphEvents(payload.value);
  if (normalizedFromCalendarView.length > 0) {
    return normalizedFromCalendarView;
  }

  // Fallback: query events endpoint (some tenants/users expose better results here).
  const eventsResponse = await fetch(
    "https://graph.microsoft.com/v1.0/me/events?$select=id,subject,start,end,isAllDay,isCancelled&$orderby=start/dateTime&$top=50",
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Prefer: 'outlook.timezone="UTC"',
      },
      cache: "no-store",
    }
  );

  if (!eventsResponse.ok) {
    return [];
  }

  const eventsPayload = (await eventsResponse.json()) as GraphCalendarViewResponse;
  const normalizedEvents = normalizeGraphEvents(eventsPayload.value);

  // Keep only events between (now - 7d) and (now + 45d) to match dashboard intent.
  const minTs = new Date(startDateTime).getTime();
  const maxTs = new Date(endDateTime).getTime();
  return normalizedEvents.filter((evt) => {
    const ts = new Date(evt.start).getTime();
    return ts >= minTs && ts <= maxTs;
  });
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isM365Enabled()) {
    return NextResponse.json(
      {
        success: false,
        error: "M365 calendar integration is currently disabled by configuration.",
        data: [],
      },
      { status: 503 }
    );
  }

  const authUser = await getAuthenticatedUser();
  if (!authUser) return unauthorizedResponse();

  const { id: studentOid } = await params;
  if (!verifyStudentAccess(authUser, studentOid)) {
    return forbiddenResponse("Forbidden: You cannot access this student's calendar.");
  }

  const cacheKey = `calendar:${studentOid}`;
  const forceRefresh = request.nextUrl.searchParams.get("refresh") === "1";
  if (!forceRefresh) {
    const cachedEvents = await cosmosDbService.getCacheData<CalendarEvent[]>(cacheKey, authUser.institution_id);
    if (cachedEvents) {
      return NextResponse.json({
        success: true,
        data: cachedEvents,
      });
    }
  }

  if (!authUser.accessToken) {
    return NextResponse.json({
      success: false,
      error: "Missing Microsoft Graph access token. Re-authenticate and grant Calendars.Read.",
      data: [],
    });
  }

  try {
    const calendarEvents = await fetchOutlookCalendarEvents(authUser.accessToken);
    await cosmosDbService.setCacheData(cacheKey, calendarEvents, authUser.institution_id);

    return NextResponse.json({
      success: true,
      data: calendarEvents,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to fetch Outlook calendar events.";
    return NextResponse.json(
      {
        success: false,
        error: message,
        data: [],
      },
      { status: 502 }
    );
  }
}
