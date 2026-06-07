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
    // Attempt to read data using the Cosmos/Mock service
    const studentUser = await cosmosDbService.getUser("user-mara", "inst-up");
    const conversations = await cosmosDbService.getStudentConversations("student-mara-oid", "inst-up");
    const policies = await cosmosDbService.queryPolicies([0.1, -0.2, 0.3], "inst-up");

    return NextResponse.json({
      success: true,
      message: "Database connection and mock helper verified successfully.",
      currentUser: authUser,
      data: {
        studentUser,
        conversations,
        policies,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Unknown error during database verification.",
      },
      { status: 500 }
    );
  }
}
