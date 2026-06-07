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

    if (normalizedContent.includes("hold") || normalizedContent.includes("bakit may") || normalizedContent.includes("sagabal")) {
      toolCalls.push("CheckStudentHolds");
      if (activeHoldsCount === 0) {
        aiContent = "Suriin ko ang iyong records... Wala po akong nakikitang aktibong hold sa iyong account sa kasalukuyan. Malinis po ang iyong katayuan sa Registrar.";
      } else {
        const holdLines = holds
          .map((h, i: number) => `${i + 1}. **${h.type} Hold** (${h.status}): ${h.reason}\n   *Lunas:* ${h.resolution_steps}`)
          .join("\n\n");
        aiContent = `Nahanap ko po na mayroon kang **${activeHoldsCount}** na aktibong hold sa iyong account:\n\n${holdLines}\n\nPara sa iyong Financial Hold, maaari ko po itong pansamantalang i-lift para makapag-enroll ka kung mayroon kang scholarship na inaasahan. Gusto mo bang gawin natin ito?`;
      }
    } else if (normalizedContent.includes("lift") || normalizedContent.includes("tanggalin") || normalizedContent.includes("yes") || normalizedContent.includes("oo") || normalizedContent.includes("opo")) {
      const financialHold = holds.find((h) => h.id === "hold-financial" && h.status === "Active");
      if (financialHold) {
        toolCalls.push("CheckFinancialAidStatus");
        toolCalls.push("requestHoldLift");
        
        // Update mock database hold status
        financialHold.status = "Resolved";
        await cosmosDbService.setCacheData(holdsKey, holds, authUser.institution_id);

        aiContent = "Sinusuri ko ang iyong Financial Aid records... Nakita ko po ang iyong pending CHED UniFAST grant na ₱15,000. Dahil dito, hiningi ko na po sa Bursar at Registrar na tanggalin muna ang iyong **Financial Hold** (temporary lift).\n\nTagumpay po ang pagtanggal! Na-clear na po ang hold na ito para sa susunod na 14 na araw para makapag-enroll ka. Maaari mo itong makita sa iyong Student Dashboard. May iba pa po ba ako maitutulong?";
      } else {
        aiContent = "May maitutulong ba ako sa iba pang holds? Kung nais mong i-clear ang Academic (SAP) hold, mangyaring gumamit ng SAP Appeal Wizard sa sidebar.";
      }
    } else if (normalizedContent.includes("sap") || normalizedContent.includes("appeal") || normalizedContent.includes("akademiko")) {
      toolCalls.push("queryPolicies");
      aiContent = "Para po sa iyong **Academic Hold (SAP deficiency)**, kinakailangan pong mag-file ng pormal na SAP Appeal. \n\nMaaari mo pong buksan ang **SAP Appeal Wizard** sa dashboard side panel upang maihanda ang appeal narrative at checklist ng mga dokumento (katulad ng transcript o medical certificate). Nais mo bang gabayan kita doon?";
    } else if (normalizedContent.includes("human") || normalizedContent.includes("agent") || normalizedContent.includes("makausap") || normalizedContent.includes("staff")) {
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

      aiContent = "Nauunawaan ko po. Inilipat ko na ang usapang ito sa ating student services support queue. Kasama po sa inilipat ko ang summary ng holds at mga naisagawa ko upang hindi mo na kailangang ulitin ang kwento mo. \n\nMangyaring maghintay ng ilang sandali habang kumokonekta ang available support staff.";
    } else {
      aiContent = `Salamat sa mensahe, ${authUser.name || "Student"}. Maaari mo akong tanungin tungkol sa iyong holds ('bakit may hold ako?'), balanse sa tuition, UniFAST scholarship deadlines, o mag-request na makipag-usap sa support agent.`;
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
