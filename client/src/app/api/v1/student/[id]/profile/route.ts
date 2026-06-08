import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser, verifyStudentAccess, unauthorizedResponse, forbiddenResponse } from "@/lib/auth-helper";
import { cosmosDbService } from "@/lib/db/cosmos";

interface AcademicSnapshot {
  major?: string;
  year?: string;
  sap_status?: string;
  gwa?: string | number;
  scholarship?: string;
}

interface FinancialSnapshot {
  pending_disbursements?: Array<{
    source?: string;
  }>;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authUser = await getAuthenticatedUser();
  if (!authUser) return unauthorizedResponse();

  const { id: studentOid } = await params;
  if (!verifyStudentAccess(authUser, studentOid)) {
    return forbiddenResponse("Forbidden: You cannot access this student's profile.");
  }

  const [academic, financial] = await Promise.all([
    cosmosDbService.getCacheData<AcademicSnapshot>(`academic:${studentOid}`, authUser.institution_id),
    cosmosDbService.getCacheData<FinancialSnapshot>(`financial:${studentOid}`, authUser.institution_id),
  ]);

  const normalizedGwa =
    typeof academic?.gwa === "number" ? academic.gwa.toFixed(2) : (academic?.gwa || "Not available");
  const scholarshipFromFinancial = financial?.pending_disbursements?.[0]?.source;

  // Return profile fields from live claims + adapter caches; avoid static profile constants.
  return NextResponse.json({
    success: true,
    data: {
      student_id: authUser.entra_oid,
      name: authUser.name || "Student",
      email: authUser.email || "",
      major: academic?.major || authUser.major || "Not available",
      year: academic?.year || authUser.year || "Not available",
      sap_status: academic?.sap_status || "Not available",
      gwa: normalizedGwa,
      scholarship: academic?.scholarship || scholarshipFromFinancial || "Not available",
    },
  });
}
