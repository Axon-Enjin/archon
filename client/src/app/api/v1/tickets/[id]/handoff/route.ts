import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser, verifyRole, unauthorizedResponse, forbiddenResponse } from "@/lib/auth-helper";
import { cosmosDbService } from "@/lib/db/cosmos";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authUser = await getAuthenticatedUser();
  if (!authUser) return unauthorizedResponse();

  // Enforce agent or admin role boundaries
  if (!verifyRole(authUser, ["Agent", "Admin"])) {
    return forbiddenResponse("Forbidden: Only support staff can retrieve handoff packets.");
  }

  const { id: conversationId } = await params;
  const handoff = await cosmosDbService.getHandoffByTicketId(conversationId, authUser.institution_id);

  if (!handoff) {
    return NextResponse.json({ success: false, error: "Handoff packet not found for this ticket." }, { status: 404 });
  }

  return NextResponse.json({ success: true, data: handoff });
}
