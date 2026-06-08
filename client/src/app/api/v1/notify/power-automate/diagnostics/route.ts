import { NextResponse } from "next/server";
import { forbiddenResponse, getAuthenticatedUser, unauthorizedResponse, verifyRole } from "@/lib/auth-helper";
import { getPowerAutomateFreeDiagnostics } from "@/lib/power-automate-free";

export async function GET() {
  const authUser = await getAuthenticatedUser();
  if (!authUser) return unauthorizedResponse();

  if (!verifyRole(authUser, ["Admin"])) {
    return forbiddenResponse("Forbidden: Only admins can run Power Automate diagnostics.");
  }

  try {
    const diagnostics = await getPowerAutomateFreeDiagnostics();
    return NextResponse.json({ success: true, data: diagnostics });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to run Power Automate diagnostics.";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
