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

  // Return profile data derived from authenticated Entra session claims
  return NextResponse.json({
    success: true,
    data: {
      student_id: authUser.entra_oid,
      name: authUser.name || "Student",
      email: authUser.email || "",
      major: "BS Information Technology",
      year: "3rd Year",
      sap_status: "Warning",
      gwa: "2.65",
      scholarship: "CHED UniFAST Scholar",
    },
  });
}
