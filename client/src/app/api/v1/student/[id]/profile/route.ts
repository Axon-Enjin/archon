import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser, verifyStudentAccess, unauthorizedResponse, forbiddenResponse } from "@/lib/auth-helper";
import { getUniversityAdapter } from "@/lib/adapters";
import type { AdapterContext } from "@/lib/adapters/types";

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

  const adapter = getUniversityAdapter(authUser.institution_id);
  const context: AdapterContext = {
    institutionId: authUser.institution_id,
    studentOid,
    major: authUser.major,
    year: authUser.year,
    name: authUser.name,
    email: authUser.email,
  };
  const profile = await adapter.getStudentProfile(context);

  return NextResponse.json({
    success: true,
    data: profile,
  });
}
