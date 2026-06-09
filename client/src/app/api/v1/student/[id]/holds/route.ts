import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser, verifyStudentAccess, unauthorizedResponse, forbiddenResponse } from "@/lib/auth-helper";
import { getUniversityAdapter } from "@/lib/adapters";
import type { AdapterContext } from "@/lib/adapters/types";
import { cosmosDbService } from "@/lib/db/cosmos";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authUser = await getAuthenticatedUser();
  if (!authUser) return unauthorizedResponse();

  const { id: studentOid } = await params;
  if (!verifyStudentAccess(authUser, studentOid)) {
    return forbiddenResponse("Forbidden: You cannot access this student's holds.");
  }

  const adapter = getUniversityAdapter(authUser.institution_id);
  const context: AdapterContext = {
    institutionId: authUser.institution_id,
    studentOid,
    major: authUser.major,
    year: authUser.year,
    name: authUser.name,
    email: authUser.email,
  };
  const holds = await adapter.getHolds(context);

  return NextResponse.json({
    success: true,
    data: holds,
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
    return forbiddenResponse("Forbidden: You cannot modify this student's holds.");
  }

  try {
    const { holdId, action } = await request.json();
    const adapter = getUniversityAdapter(authUser.institution_id);
    const context: AdapterContext = {
      institutionId: authUser.institution_id,
      studentOid,
      major: authUser.major,
      year: authUser.year,
      name: authUser.name,
      email: authUser.email,
    };
    const holds = await adapter.getHolds(context);

    const holdIndex = holds.findIndex((h) => h.id === holdId);
    if (holdIndex === -1) {
      return NextResponse.json({ success: false, error: "Hold not found." }, { status: 404 });
    }

    if (action === "lift") {
      await adapter.requestHoldLift(context, holdId);
    } else if (action === "request-lift") {
      holds[holdIndex].status = "Lifting";
      const cacheKey = `holds:${studentOid}`;
      const updated = [...holds];
      await cosmosDbService.setCacheData(cacheKey, updated, authUser.institution_id);
    }

    const updatedHolds = await adapter.getHolds(context);

    return NextResponse.json({
      success: true,
      message: `Hold action '${action}' processed successfully.`,
      data: updatedHolds,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error while processing hold action.";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
