import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser, verifyStudentAccess, unauthorizedResponse, forbiddenResponse } from "@/lib/auth-helper";
import { cosmosDbService } from "@/lib/db/cosmos";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authUser = await getAuthenticatedUser();
  if (!authUser) return unauthorizedResponse();

  const { id: studentOid } = await params;
  if (!verifyStudentAccess(authUser, studentOid)) {
    return forbiddenResponse("Forbidden: You cannot access this student's calendar.");
  }

  const cacheKey = `calendar:${studentOid}`;
  let calendarEvents = await cosmosDbService.getCacheData(cacheKey, authUser.institution_id);

  if (!calendarEvents) {
    const today = new Date();
    const getRelativeDate = (offsetDays: number, hour: number) => {
      const date = new Date(today);
      date.setDate(today.getDate() + offsetDays);
      date.setHours(hour, 0, 0, 0);
      return date.toISOString();
    };

    calendarEvents = [
      {
        id: "evt-midterm-it312",
        title: "Midterm Exam: IT 312 (Systems Integration)",
        start: getRelativeDate(2, 9),
        end: getRelativeDate(2, 11),
        isAllDay: false,
        source: "M365",
      },
      {
        id: "evt-appeal-deadline",
        title: "SAP Academic Appeal Submission Deadline",
        start: getRelativeDate(4, 17),
        end: getRelativeDate(4, 18),
        isAllDay: false,
        source: "M365",
      },
      {
        id: "evt-unifast-renewal",
        title: "CHED UniFAST Scholarship Renewal Portal Opens",
        start: getRelativeDate(7, 8),
        end: getRelativeDate(7, 17),
        isAllDay: false,
        source: "M365",
      },
      {
        id: "evt-enrollment-hold-check",
        title: "Registrar Enrollment Hold Review Date",
        start: getRelativeDate(10, 10),
        end: getRelativeDate(10, 12),
        isAllDay: false,
        source: "M365",
      },
    ];

    await cosmosDbService.setCacheData(cacheKey, calendarEvents, authUser.institution_id);
  }

  return NextResponse.json({
    success: true,
    data: calendarEvents,
  });
}
