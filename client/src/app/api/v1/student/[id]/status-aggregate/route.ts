import { NextRequest, NextResponse } from "next/server";
import {
  getAuthenticatedUser,
  verifyStudentAccess,
  unauthorizedResponse,
  forbiddenResponse,
} from "@/lib/auth-helper";
import { cosmosDbService } from "@/lib/db/cosmos";
import { getUniversityAdapter } from "@/lib/adapters";
import type { AdapterContext, StatusAggregate } from "@/lib/adapters/types";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authUser = await getAuthenticatedUser();
  if (!authUser) return unauthorizedResponse();

  const { id: studentOid } = await params;
  if (!verifyStudentAccess(authUser, studentOid)) {
    return forbiddenResponse("Forbidden: You cannot access this student's status aggregate.");
  }

  const forceRefresh = request.nextUrl.searchParams.get("refresh") === "1";
  const cacheKey = `status-aggregate:${studentOid}`;

  if (!forceRefresh) {
    const cached = await cosmosDbService.getCacheData<StatusAggregate>(cacheKey, authUser.institution_id);
    if (cached) {
      return NextResponse.json({ success: true, data: cached });
    }
  }

  try {
    const adapter = getUniversityAdapter(authUser.institution_id);
    const context: AdapterContext = {
      institutionId: authUser.institution_id,
      studentOid,
      major: authUser.major,
      year: authUser.year,
      name: authUser.name,
      email: authUser.email,
    };

    const aggregate = await adapter.getStatusAggregate(context);
    await cosmosDbService.setCacheData(cacheKey, aggregate, authUser.institution_id, 300);

    return NextResponse.json({ success: true, data: aggregate });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to fetch status aggregate.";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
