import { NextResponse } from "next/server";
import { cosmosDbService } from "@/lib/db/cosmos";
import { getAuthenticatedUser, unauthorizedResponse } from "@/lib/auth-helper";

export async function GET() {
  // Enforce session presence
  const authUser = await getAuthenticatedUser();
  if (!authUser) {
    return unauthorizedResponse();
  }

  try {
    const mode = cosmosDbService.getConnectionMode();
    // Attempt to read data using the Cosmos/Mock service
    const studentUser = await cosmosDbService.getUser("user-mara", "inst-up");
    const conversations = await cosmosDbService.getStudentConversations("student-mara-oid", "inst-up");
    const policies = await cosmosDbService.queryPolicies([0.1, -0.2, 0.3], "inst-up");

    return NextResponse.json({
      success: true,
      message: `Database service verified successfully in ${mode} mode.`,
      mode,
      currentUser: authUser,
      data: {
        studentUser,
        conversations,
        policies,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error during database verification.";
    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      { status: 500 }
    );
  }
}
