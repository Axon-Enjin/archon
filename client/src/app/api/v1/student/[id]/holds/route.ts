import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser, verifyStudentAccess, unauthorizedResponse, forbiddenResponse } from "@/lib/auth-helper";
import { cosmosDbService } from "@/lib/db/cosmos";

// Helper to get holds from the cache or return initial mock list
async function getHoldsList(studentOid: string, institutionId: string) {
  const cacheKey = `holds:${studentOid}`;
  let holds = await cosmosDbService.getCacheData(cacheKey, institutionId);
  if (!holds) {
    holds = [
      {
        id: "hold-financial",
        type: "Financial",
        reason: "Pending tuition balance of ₱12,500.00",
        status: "Active",
        resolution_steps: "Pay the remaining balance at the Bursar counter, or submit your CHED UniFAST clearance.",
      },
      {
        id: "hold-academic",
        type: "Academic",
        reason: "Satisfactory Academic Progress (SAP) GPA deficiency (GWA is 2.65, required is 2.50)",
        status: "Active",
        resolution_steps: "Submit an SAP Appeal narrative and study plan to the Academic Advisory Panel.",
      },
    ];
    await cosmosDbService.setCacheData(cacheKey, holds, institutionId);
  }
  return holds;
}

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

  const holds = await getHoldsList(studentOid, authUser.institution_id);

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
    const cacheKey = `holds:${studentOid}`;
    const holds = await getHoldsList(studentOid, authUser.institution_id);

    const holdIndex = holds.findIndex((h: any) => h.id === holdId);
    if (holdIndex === -1) {
      return NextResponse.json({ success: false, error: "Hold not found." }, { status: 404 });
    }

    if (action === "lift") {
      holds[holdIndex].status = "Resolved";
    } else if (action === "request-lift") {
      holds[holdIndex].status = "Lifting";
    }

    await cosmosDbService.setCacheData(cacheKey, holds, authUser.institution_id);

    return NextResponse.json({
      success: true,
      message: `Hold action '${action}' processed successfully.`,
      data: holds,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
