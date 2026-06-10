import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser, verifyStudentAccess, unauthorizedResponse, forbiddenResponse } from "@/lib/auth-helper";
import { cosmosDbService } from "@/lib/db/cosmos";
import { isM365Enabled } from "@/lib/feature-flags";
import { generateCalendarEvents, generateCalendarEventsOverride, isStudentArchetype } from "@/lib/adapters/mock-data-generator";
import type { StudentArchetype } from "@/lib/adapters/mock-data-generator";

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

type GraphErrorCode =
  | "GRAPH_THROTTLED"
  | "GRAPH_CONSENT_REQUIRED"
  | "GRAPH_UNAUTHORIZED"
  | "GRAPH_UPSTREAM_ERROR";

class GraphIntegrationError extends Error {
  code: GraphErrorCode;
  status: number;

  constructor(code: GraphErrorCode, status: number, message: string) {
    super(message);
    this.code = code;
    this.status = status;
  }
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

function logGraphEvent(eventName: string, details: Record<string, unknown>) {
  console.warn(`[${eventName}]`, JSON.stringify(details));
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseRetryAfterMs(value: string | null): number | null {
  if (!value) return null;
  const asSeconds = Number(value);
  if (!Number.isNaN(asSeconds)) return asSeconds * 1000;

  const retryDate = new Date(value);
  if (Number.isNaN(retryDate.getTime())) return null;
  return Math.max(0, retryDate.getTime() - Date.now());
}

async function graphGetWithRetry(url: string, accessToken: string): Promise<Response> {
  const maxRetries = 3;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Prefer: 'outlook.timezone="UTC"',
      },
      cache: "no-store",
    });

    if (response.status === 429) {
      const retryAfterMs = parseRetryAfterMs(response.headers.get("retry-after"));
      const backoffMs = retryAfterMs ?? Math.min(1000 * 2 ** attempt, 8000);

      logGraphEvent("graph_api_throttle", {
        status: response.status,
        attempt,
        backoff_ms: backoffMs,
        url,
      });

      if (attempt === maxRetries) {
        return response;
      }

      await sleep(backoffMs);
      continue;
    }

    // Retry transient Graph upstream failures.
    if (response.status >= 500 && response.status <= 599 && attempt < maxRetries) {
      const backoffMs = Math.min(1000 * 2 ** attempt, 8000);
      await sleep(backoffMs);
      continue;
    }

    return response;
  }

  throw new GraphIntegrationError("GRAPH_UPSTREAM_ERROR", 502, "Graph request exhausted retry attempts.");
}

async function fetchOutlookCalendarEvents(accessToken: string): Promise<CalendarEvent[]> {
  // Broaden window to reduce false "no events" cases.
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 7);
  const startDateTime = startDate.toISOString();
  const endDate = new Date();
  endDate.setDate(endDate.getDate() + 45);
  const endDateTime = endDate.toISOString();

  const calendarViewUrl =
    `https://graph.microsoft.com/v1.0/me/calendarView?startDateTime=${encodeURIComponent(startDateTime)}&endDateTime=${encodeURIComponent(endDateTime)}&$orderby=start/dateTime&$top=20`;

  const response = await graphGetWithRetry(
    calendarViewUrl,
    accessToken
  );

  if (!response.ok) {
    const body = await response.text();
    if (response.status === 401) {
      throw new GraphIntegrationError("GRAPH_UNAUTHORIZED", 401, "Graph token expired or invalid.");
    }
    if (response.status === 403) {
      throw new GraphIntegrationError("GRAPH_CONSENT_REQUIRED", 403, "Calendars.Read consent not granted.");
    }
    if (response.status === 429) {
      throw new GraphIntegrationError("GRAPH_THROTTLED", 429, "Graph API throttled.");
    }
    throw new GraphIntegrationError(
      "GRAPH_UPSTREAM_ERROR",
      response.status,
      `Graph calendarView failed (${response.status}): ${body}`
    );
  }

  const payload = (await response.json()) as GraphCalendarViewResponse;
  const normalizedFromCalendarView = normalizeGraphEvents(payload.value);
  if (normalizedFromCalendarView.length > 0) {
    return normalizedFromCalendarView;
  }

  // Fallback: query events endpoint (some tenants/users expose better results here).
  const eventsUrl =
    "https://graph.microsoft.com/v1.0/me/events?$select=id,subject,start,end,isAllDay,isCancelled&$orderby=start/dateTime&$top=50";
  const eventsResponse = await graphGetWithRetry(eventsUrl, accessToken);

  if (!eventsResponse.ok) {
    if (eventsResponse.status === 401) {
      throw new GraphIntegrationError("GRAPH_UNAUTHORIZED", 401, "Graph token expired or invalid.");
    }
    if (eventsResponse.status === 403) {
      throw new GraphIntegrationError("GRAPH_CONSENT_REQUIRED", 403, "Calendars.Read consent not granted.");
    }
    if (eventsResponse.status === 429) {
      throw new GraphIntegrationError("GRAPH_THROTTLED", 429, "Graph API throttled.");
    }
    const body = await response.text();
    throw new GraphIntegrationError(
      "GRAPH_UPSTREAM_ERROR",
      eventsResponse.status,
      `Graph events failed (${eventsResponse.status}): ${body}`
    );
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

  // Dev-only scenario override (non-production): ?seed=/?scenario= force a
  // deterministic calendar and bypass the cache.
  const devSeed =
    process.env.NODE_ENV !== "production" ? request.nextUrl.searchParams.get("seed") : null;
  const devScenario =
    process.env.NODE_ENV !== "production" ? request.nextUrl.searchParams.get("scenario") : null;
  const devOverride = Boolean(devSeed || devScenario);

  if (!forceRefresh && !devOverride) {
    const cachedEvents = await cosmosDbService.getCacheData<CalendarEvent[]>(cacheKey, authUser.institution_id);
    if (cachedEvents) {
      return NextResponse.json({
        success: true,
        data: cachedEvents,
      });
    }
  }

  // Demo / no live tenant: synthesize a calendar from the student's own scenario
  // (deadlines, disbursements, SAP appeal) so the panel is dynamic and coherent
  // with their holds and finances instead of requiring a real Graph token.
  if (cosmosDbService.getConnectionMode() === "mock") {
    const generated = devOverride
      ? (generateCalendarEventsOverride(
          devSeed || studentOid,
          isStudentArchetype(devScenario || "") ? (devScenario as StudentArchetype) : undefined
        ) as CalendarEvent[])
      : (generateCalendarEvents(studentOid) as CalendarEvent[]);
    if (!devOverride) {
      await cosmosDbService.setCacheData(cacheKey, generated, authUser.institution_id, 900);
    }
    return NextResponse.json({
      success: true,
      data: generated,
    });
  }

  if (!authUser.accessToken) {
    return NextResponse.json(
      {
        success: false,
        error: "Missing Microsoft Graph access token. Re-authenticate and grant Calendars.Read.",
        errorCode: "GRAPH_UNAUTHORIZED",
        data: [],
      },
      { status: 401 }
    );
  }

  try {
    const calendarEvents = await fetchOutlookCalendarEvents(authUser.accessToken);
    await cosmosDbService.setCacheData(cacheKey, calendarEvents, authUser.institution_id, 900);

    return NextResponse.json({
      success: true,
      data: calendarEvents,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to fetch Outlook calendar events.";
    const code = error instanceof GraphIntegrationError ? error.code : "GRAPH_UPSTREAM_ERROR";
    const status = error instanceof GraphIntegrationError ? error.status : 502;

    return NextResponse.json(
      {
        success: false,
        error: message,
        errorCode: code,
        data: [],
      },
      { status }
    );
  }
}
