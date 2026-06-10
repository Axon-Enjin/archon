import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser, unauthorizedResponse, forbiddenResponse } from "@/lib/auth-helper";
import { cosmosDbService } from "@/lib/db/cosmos";
import { recordAnalyticsEvent } from "@/lib/analytics-events";

/**
 * Records post-resolution CSAT for a ticket (PRD §5.5 `satisfaction_submitted`).
 * Only the owning student may rate, and only once a ticket is Resolved.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authUser = await getAuthenticatedUser();
  if (!authUser) return unauthorizedResponse();

  const { id: conversationId } = await params;
  const conversation = await cosmosDbService.getConversation(conversationId, authUser.institution_id);
  if (!conversation) {
    return NextResponse.json({ success: false, error: "Ticket not found." }, { status: 404 });
  }

  // Only the owning student can submit satisfaction for their ticket.
  if (authUser.role === "Student" && conversation.student_id !== authUser.entra_oid) {
    return forbiddenResponse("Forbidden: You cannot rate this ticket.");
  }

  if (conversation.status !== "Resolved") {
    return NextResponse.json(
      { success: false, error: "Satisfaction can only be submitted once a ticket is resolved." },
      { status: 409 }
    );
  }

  try {
    const body = await request.json();
    const rating = body?.rating;
    if (rating !== "positive" && rating !== "negative") {
      return NextResponse.json(
        { success: false, error: "rating must be 'positive' or 'negative'." },
        { status: 400 }
      );
    }

    const comment = typeof body?.comment === "string" ? body.comment.slice(0, 500) : undefined;
    const satisfaction = {
      rating: rating as "positive" | "negative",
      score: rating === "positive" ? 5 : 1,
      comment,
      submitted_at: new Date().toISOString(),
    };

    const updated = await cosmosDbService.setConversationSatisfaction(
      conversationId,
      authUser.institution_id,
      satisfaction
    );
    if (!updated) {
      return NextResponse.json({ success: false, error: "Ticket not found." }, { status: 404 });
    }

    recordAnalyticsEvent({
      type: "satisfaction_submitted",
      institutionId: authUser.institution_id,
      ticketId: conversationId,
      studentId: conversation.student_id,
      metadata: { rating: satisfaction.rating, score: satisfaction.score },
    });

    return NextResponse.json({ success: true, data: updated.satisfaction });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to record satisfaction.";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
