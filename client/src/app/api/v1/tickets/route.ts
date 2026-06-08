import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser, verifyRole, unauthorizedResponse, forbiddenResponse } from "@/lib/auth-helper";
import { cosmosDbService } from "@/lib/db/cosmos";
import { ConversationDoc } from "@/lib/db/types";

export async function GET(request: NextRequest) {
  const authUser = await getAuthenticatedUser();
  if (!authUser) return unauthorizedResponse();

  const url = new URL(request.url);
  const studentId = url.searchParams.get("studentId");
  const type = url.searchParams.get("type"); // e.g. "queue" for agents

  // If fetching agent queue
  if (type === "queue") {
    if (!verifyRole(authUser, ["Agent", "Admin"])) {
      return forbiddenResponse("Forbidden: Only support staff can view the queue.");
    }
    const openTickets = await cosmosDbService.getOpenConversations(authUser.institution_id);
    return NextResponse.json({ success: true, data: openTickets });
  }

  // Otherwise, fetching student's tickets
  const targetStudent = studentId || authUser.entra_oid;
  if (authUser.role === "Student" && targetStudent !== authUser.entra_oid) {
    return forbiddenResponse("Forbidden: You can only view your own tickets.");
  }

  const tickets = await cosmosDbService.getStudentConversations(targetStudent, authUser.institution_id);
  return NextResponse.json({ success: true, data: tickets });
}

export async function POST(request: NextRequest) {
  const authUser = await getAuthenticatedUser();
  if (!authUser) return unauthorizedResponse();

  try {
    const { studentId } = await request.json();
    const targetStudent = studentId || authUser.entra_oid;

    if (authUser.role === "Student" && targetStudent !== authUser.entra_oid) {
      return forbiddenResponse("Forbidden: You cannot create a ticket for another student.");
    }

    const ticketCount = (await cosmosDbService.getStudentConversations(targetStudent, authUser.institution_id)).length;
    const nextTicketId = `ARC-T-${1001 + ticketCount}`;

    const newTicket: ConversationDoc = {
      id: `ticket-${Date.now()}`,
      institution_id: authUser.institution_id,
      ticket_id: nextTicketId,
      student_id: targetStudent,
      status: "Open",
      ai_resolution_attempts: 0,
      created_at: new Date().toISOString(),
    };

    const created = await cosmosDbService.createConversation(newTicket);

    // Seed initial assistant greeting message
    await cosmosDbService.createMessage({
      id: `msg-${Date.now()}`,
      institution_id: authUser.institution_id,
      conversation_id: created.id,
      role: "assistant",
      content_scrubbed: "Kumusta! Ako si Archon, ang iyong AI Service Desk Assistant. Paano kita matutulungan ngayon sa iyong mga holds, bayarin, o scholarship?",
      ts: new Date().toISOString(),
    });

    return NextResponse.json({ success: true, data: created });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to create ticket.";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
