import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser, verifyRole, unauthorizedResponse, forbiddenResponse } from "@/lib/auth-helper";
import { cosmosDbService } from "@/lib/db/cosmos";

export async function GET(request: NextRequest) {
  const authUser = await getAuthenticatedUser();
  if (!authUser) return unauthorizedResponse();

  if (!verifyRole(authUser, ["Agent", "Admin"])) {
    return forbiddenResponse();
  }

  const statusParam = request.nextUrl.searchParams.get("status") as "pending" | "processing" | "sent" | "failed" | null;
  const channelParam = request.nextUrl.searchParams.get("channel") as "teams" | "outlook" | null;
  const limitParam = Number(request.nextUrl.searchParams.get("limit") || "50");

  const jobs = await cosmosDbService.getNotificationJobs(authUser.institution_id, {
    status: statusParam || undefined,
    channel: channelParam || undefined,
    limit: Number.isFinite(limitParam) ? limitParam : 50,
  });

  return NextResponse.json({ success: true, data: jobs });
}
