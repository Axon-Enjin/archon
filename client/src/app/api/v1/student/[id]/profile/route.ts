import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser, verifyStudentAccess, unauthorizedResponse, forbiddenResponse } from "@/lib/auth-helper";

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

  // Return mock profile data mapping to the primary persona (Mara)
  return NextResponse.json({
    success: true,
    data: {
      student_id: "2024-10025",
      name: "Mara Salvador",
      email: "mara@archon.edu.ph",
      major: "BS Information Technology",
      year: "3rd Year",
      sap_status: "Warning",
      gwa: "2.65",
      scholarship: "CHED UniFAST Scholar",
    },
  });
}
