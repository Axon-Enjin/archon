import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser, unauthorizedResponse } from "@/lib/auth-helper";
import { cosmosDbService } from "@/lib/db/cosmos";
import { MessageDoc, HandoffDoc } from "@/lib/db/types";

interface HoldItem {
  id: string;
  type: string;
  reason: string;
  status: "Active" | "Lifting" | "Resolved";
  resolution_steps: string;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authUser = await getAuthenticatedUser();
  if (!authUser) return unauthorizedResponse();

  const { id: conversationId } = await params;
  const messages = await cosmosDbService.getMessages(conversationId, authUser.institution_id);
  return NextResponse.json({ success: true, data: messages });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authUser = await getAuthenticatedUser();
  if (!authUser) return unauthorizedResponse();

  try {
    const { id: conversationId } = await params;
    const { content } = await request.json();

    // 1. Save the user's message
    const userMsg: MessageDoc = {
      id: `msg-${Date.now()}-user`,
      institution_id: authUser.institution_id,
      conversation_id: conversationId,
      role: "user",
      content_scrubbed: content,
      ts: new Date().toISOString(),
    };
    await cosmosDbService.createMessage(userMsg);

    // 2. Fetch active holds/billing to make the AI responses data-driven
    const holdsKey = `holds:${authUser.entra_oid}`;
    const holds = (await cosmosDbService.getCacheData<HoldItem[]>(holdsKey, authUser.institution_id)) || [];
    const activeHoldsCount = holds.filter((h) => h.status === "Active").length;

    // 3. Mock AI agent response generation loop
    let aiContent = "";
    const toolCalls: string[] = [];

    const normalizedContent = content.toLowerCase();

    if (normalizedContent.includes("hold") || normalizedContent.includes("why") || normalizedContent.includes("block")) {
      toolCalls.push("CheckStudentHolds");
      if (activeHoldsCount === 0) {
        aiContent = "Checking your records... I don't see any active holds on your account at the moment. Your status with the Registrar is clear.";
      } else {
        const holdLines = holds
          .map((h, i: number) => `${i + 1}. **${h.type} Hold** (${h.status}): ${h.reason}\n   *Resolution:* ${h.resolution_steps}`)
          .join("\n\n");
        aiContent = `I found **${activeHoldsCount}** active hold(s) on your account:\n\n${holdLines}\n\nFor your Financial Hold, I can temporarily lift it so you can enroll if you have a pending scholarship. Would you like me to do that?`;
      }
    } else if (normalizedContent.includes("lift") || normalizedContent.includes("remove") || normalizedContent.includes("yes") || normalizedContent.includes("please") || normalizedContent.includes("do it")) {
      const financialHold = holds.find((h) => h.id === "hold-financial" && h.status === "Active");
      if (financialHold) {
        toolCalls.push("CheckFinancialAidStatus");
        toolCalls.push("requestHoldLift");
        
        // Update mock database hold status
        financialHold.status = "Resolved";
        await cosmosDbService.setCacheData(holdsKey, holds, authUser.institution_id);

        aiContent = "Checking your Financial Aid records... I can see your pending CHED UniFAST grant of ₱15,000. Because of this, I have requested the Bursar and Registrar to temporarily lift your **Financial Hold**.\n\nThe lift was successful! This hold is cleared for the next 14 days so you can enroll. You can see this reflected on your Student Dashboard. Is there anything else I can help you with?";
      } else {
        aiContent = "Is there anything else I can help with regarding your holds? If you'd like to clear your Academic (SAP) hold, please use the SAP Appeal Wizard in the sidebar.";
      }
    } else if (normalizedContent.includes("sap") || normalizedContent.includes("appeal") || normalizedContent.includes("academic")) {
      toolCalls.push("queryPolicies");
      aiContent = "For your **Academic Hold (SAP deficiency)**, you are required to file a formal SAP Appeal. \n\nYou can open the **SAP Appeal Wizard** from the dashboard sidebar to prepare your appeal narrative and checklist of documents (such as transcript or medical certificate). Would you like me to guide you there?";
    } else if (normalizedContent.includes("human") || normalizedContent.includes("agent") || normalizedContent.includes("talk") || normalizedContent.includes("staff")) {
      toolCalls.push("EscalateToHuman");
      
      // Update ticket status to Pending Agent
      await cosmosDbService.updateConversationStatus(conversationId, authUser.institution_id, "Pending Agent");

      // Write handoff packet
      const handoffDoc: HandoffDoc = {
        id: `handoff-${conversationId}`,
        institution_id: authUser.institution_id,
        ticket_id: conversationId,
        handoff_packet: {
          student_profile: {
            name: authUser.name || "Student",
            student_id: authUser.entra_oid,
            major: "N/A",
            year: "N/A",
          },
          diagnosis: "Student queries holds. Financial hold temporarily lifted based on UniFAST status. Academic SAP warning hold requires coordinator review and appeal submission.",
          systems_queried: ["RegistrarHolds", "BursarTuition", "CHEDUniFASTStatus"],
          actions_taken: ["Lifting financial hold (temporary lift approved)"],
          recommended_resolution: "Review student's SAP Appeal narrative once submitted via the Wizard, and clear academic hold if appeal grounds are approved.",
        },
        agent_id: undefined,
        resolved_at: undefined,
      };
      await cosmosDbService.createHandoff(handoffDoc);

      aiContent = "I understand. I have escalated this conversation to our student services support queue. I've included a summary of your holds and the actions I took so you won't have to repeat your story. \n\nPlease hold on a moment while I connect you to the next available support staff.";
    } else {
      aiContent = `Thank you for your message, ${authUser.name || "Student"}. You can ask me about your holds ('why do I have a hold?'), tuition balance, UniFAST scholarship deadlines, or request to speak with a support agent.`;
    }

    // 4. Save the assistant's message
    const assistantMsg: MessageDoc = {
      id: `msg-${Date.now()}-assistant`,
      institution_id: authUser.institution_id,
      conversation_id: conversationId,
      role: "assistant",
      content_scrubbed: JSON.stringify({
        text: aiContent,
        toolCalls: toolCalls,
      }),
      ts: new Date(Date.now() + 1000).toISOString(),
    };
    await cosmosDbService.createMessage(assistantMsg);

    return NextResponse.json({ success: true, data: assistantMsg });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error while processing message.";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
