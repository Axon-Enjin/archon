import { NextRequest, NextResponse } from "next/server";
import {
  getAuthenticatedUser,
  verifyStudentAccess,
  unauthorizedResponse,
  forbiddenResponse,
} from "@/lib/auth-helper";
import { isM365Enabled } from "@/lib/feature-flags";
import { cosmosDbService } from "@/lib/db/cosmos";

interface ConsentStatusPayload {
  m365Enabled: boolean;
  accessTokenPresent: boolean;
  calendarConsent: "granted" | "not_granted" | "token_missing" | "unavailable";
  message: string;
  lastCheckedAt: string;
}

function buildResponse(data: ConsentStatusPayload) {
  return NextResponse.json({ success: true, data });
}

async function persistConsentSnapshot(institutionId: string, studentOid: string, data: ConsentStatusPayload) {
  await cosmosDbService.setCacheData(`m365-consent:${studentOid}`, data, institutionId, 24 * 60 * 60);
}

async function probeCalendarConsent(accessToken: string): Promise<ConsentStatusPayload["calendarConsent"]> {
  const start = new Date().toISOString();
  const end = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  const url =
    `https://graph.microsoft.com/v1.0/me/calendarView?startDateTime=${encodeURIComponent(start)}&endDateTime=${encodeURIComponent(end)}&$top=1`;

  const response = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Prefer: 'outlook.timezone="UTC"',
    },
    cache: "no-store",
  });

  if (response.ok) return "granted";
  if (response.status === 403) return "not_granted";
  if (response.status === 401) return "token_missing";
  return "unavailable";
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authUser = await getAuthenticatedUser();
  if (!authUser) return unauthorizedResponse();

  const { id: studentOid } = await params;
  if (!verifyStudentAccess(authUser, studentOid)) {
    return forbiddenResponse("Forbidden: You cannot access this student's M365 consent status.");
  }

  const lastCheckedAt = new Date().toISOString();
  if (!isM365Enabled()) {
    const payload = {
      m365Enabled: false,
      accessTokenPresent: Boolean(authUser.accessToken),
      calendarConsent: "unavailable",
      message: "M365 integration is currently disabled by configuration.",
      lastCheckedAt,
    } as const;
    await persistConsentSnapshot(authUser.institution_id, studentOid, payload);
    return buildResponse(payload);
  }

  if (!authUser.accessToken) {
    const payload = {
      m365Enabled: true,
      accessTokenPresent: false,
      calendarConsent: "token_missing",
      message: "Reconnect your Microsoft account to refresh Calendars.Read consent.",
      lastCheckedAt,
    } as const;
    await persistConsentSnapshot(authUser.institution_id, studentOid, payload);
    return buildResponse(payload);
  }

  try {
    const consentStatus = await probeCalendarConsent(authUser.accessToken);

    const message =
      consentStatus === "granted"
        ? "Calendar consent is active. Outlook Calendar can be used in Archon."
        : consentStatus === "not_granted"
        ? "Calendars.Read consent is missing. Grant consent to enable M365 calendar visibility."
        : consentStatus === "token_missing"
        ? "Your M365 session token is expired or invalid. Reconnect your account."
        : "Unable to verify M365 consent right now. Try again shortly.";

    const payload = {
      m365Enabled: true,
      accessTokenPresent: true,
      calendarConsent: consentStatus,
      message,
      lastCheckedAt,
    } as const;
    await persistConsentSnapshot(authUser.institution_id, studentOid, payload);
    return buildResponse(payload);
  } catch {
    const payload = {
      m365Enabled: true,
      accessTokenPresent: true,
      calendarConsent: "unavailable",
      message: "Unable to verify M365 consent right now. Try again shortly.",
      lastCheckedAt,
    } as const;
    await persistConsentSnapshot(authUser.institution_id, studentOid, payload);
    return buildResponse(payload);
  }
}
