import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser, unauthorizedResponse } from "@/lib/auth-helper";
import { cosmosDbService } from "@/lib/db/cosmos";
import { MessageDoc, HandoffDoc } from "@/lib/db/types";
import { isAiEnabled } from "@/lib/feature-flags";
import { enqueueOutlookNotification, enqueueTeamsNotification } from "@/lib/notification-jobs";
import { generateFoundryReply, isFoundryConfigured } from "@/lib/azure-foundry";

interface HoldItem {
  id: string;
  type: string;
  reason: string;
  status: "Active" | "Lifting" | "Resolved";
  resolution_steps: string;
}

interface FinancialData {
  student_id: string;
  currency: string;
  total_charges: number;
  payments_made: number;
  balance_due: number;
  pending_financial_aid: number;
  net_balance: number;
  status: string;
  payment_deadline: string;
  scholarship_renewal_deadline: string;
  scholarship_renewal_status?: "not_started" | "in_progress" | "submitted";
  scholarship_renewal_submitted?: boolean;
  scholarship_renewal_submitted_at?: string;
  itemized_charges: Array<{ item: string; amount: number }>;
  pending_disbursements: Array<{
    source: string;
    amount: number;
    status: string;
    expected_release: string;
  }>;
}

type UserLanguage = "en" | "fil" | "ceb";

const pesoFormatter = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
  maximumFractionDigits: 2,
});

const dateFormatter = new Intl.DateTimeFormat("en-PH", {
  month: "long",
  day: "numeric",
  year: "numeric",
});

function detectLanguage(content: string): UserLanguage {
  const normalized = content.toLowerCase();

  const cebuanoHints = [
    "unsa",
    "ngano",
    "bayranan",
    "bayad",
    "palihog",
    "hold nako",
    "nako",
    "pwede",
  ];
  if (cebuanoHints.some((hint) => normalized.includes(hint))) return "ceb";

  const filipinoHints = [
    "ano",
    "bakit",
    "magkano",
    "utang",
    "balanse",
    "bayarin",
    "paki",
    "po",
    "pwede",
    "salamat",
  ];
  if (filipinoHints.some((hint) => normalized.includes(hint))) return "fil";

  return "en";
}

function formatBalanceResponse(financialData: FinancialData, language: UserLanguage): string {
  const itemizedCharges = financialData.itemized_charges
    .map((charge, index) => `${index + 1}. ${charge.item}: ${pesoFormatter.format(charge.amount)}`)
    .join("\n");

  const pendingAidSummary =
    financialData.pending_disbursements.length > 0
      ? financialData.pending_disbursements
          .map(
            (aid) =>
              `- ${aid.source}: ${pesoFormatter.format(aid.amount)} (${aid.status}, ETA: ${aid.expected_release})`
          )
          .join("\n")
      : "- None";

  const dueDate = dateFormatter.format(new Date(financialData.payment_deadline));
  if (financialData.balance_due <= 0 || financialData.net_balance <= 0) {
    if (language === "fil") {
      return `Na-check ko na ang account mo. Fully paid ka na ngayong semester.\n\n` +
        `Total Charges: ${pesoFormatter.format(financialData.total_charges)}\n` +
        `Payments Made: ${pesoFormatter.format(financialData.payments_made)}\n` +
        `Pending Aid: ${pesoFormatter.format(financialData.pending_financial_aid)}\n` +
        `Net Balance: ${pesoFormatter.format(financialData.net_balance)}`;
    }
    if (language === "ceb") {
      return `Na-check nako imong account. Fully paid na ka karong semestra.\n\n` +
        `Total Charges: ${pesoFormatter.format(financialData.total_charges)}\n` +
        `Payments Made: ${pesoFormatter.format(financialData.payments_made)}\n` +
        `Pending Aid: ${pesoFormatter.format(financialData.pending_financial_aid)}\n` +
        `Net Balance: ${pesoFormatter.format(financialData.net_balance)}`;
    }
    return `I checked your account. You are fully paid for this semester.\n\n` +
      `Total Charges: ${pesoFormatter.format(financialData.total_charges)}\n` +
      `Payments Made: ${pesoFormatter.format(financialData.payments_made)}\n` +
      `Pending Aid: ${pesoFormatter.format(financialData.pending_financial_aid)}\n` +
      `Net Balance: ${pesoFormatter.format(financialData.net_balance)}`;
  }

  if (language === "fil") {
    return `Na-check ko na ang tuition account mo. Ito ang current balance mo:\n\n` +
      `Balance Due: ${pesoFormatter.format(financialData.balance_due)}\n` +
      `Payment Deadline: ${dueDate}\n\n` +
      `Itemized Charges:\n${itemizedCharges}\n\n` +
      `Pending Financial Aid:\n${pendingAidSummary}\n\n` +
      `Kapag pumasok ang pending aid, projected net balance mo ay ${pesoFormatter.format(financialData.net_balance)}.`;
  }
  if (language === "ceb") {
    return `Na-check nako imong tuition account. Mao ni imong current balance:\n\n` +
      `Balance Due: ${pesoFormatter.format(financialData.balance_due)}\n` +
      `Payment Deadline: ${dueDate}\n\n` +
      `Itemized Charges:\n${itemizedCharges}\n\n` +
      `Pending Financial Aid:\n${pendingAidSummary}\n\n` +
      `Kung ma-post na ang pending aid, ang projected net balance nimo kay ${pesoFormatter.format(financialData.net_balance)}.`;
  }

  return `I checked your tuition account. Here is your current balance summary:\n\n` +
    `Balance Due: ${pesoFormatter.format(financialData.balance_due)}\n` +
    `Payment Deadline: ${dueDate}\n\n` +
    `Itemized Charges:\n${itemizedCharges}\n\n` +
    `Pending Financial Aid:\n${pendingAidSummary}\n\n` +
    `Once pending aid is posted, your projected net balance is ${pesoFormatter.format(financialData.net_balance)}.`;
}

function getDefaultFinancialData(): FinancialData {
  return {
    student_id: "2024-10025",
    currency: "PHP",
    total_charges: 24500.0,
    payments_made: 12000.0,
    balance_due: 12500.0,
    pending_financial_aid: 15000.0,
    net_balance: -2500.0,
    status: "Hold Active",
    payment_deadline: "2026-06-30",
    scholarship_renewal_deadline: "2026-07-15",
    scholarship_renewal_status: "not_started",
    scholarship_renewal_submitted: false,
    itemized_charges: [
      { item: "Tuition Fee (18 units)", amount: 18000.0 },
      { item: "Laboratory Fees (IT Lab)", amount: 3500.0 },
      { item: "Miscellaneous & Registration", amount: 3000.0 },
    ],
    pending_disbursements: [
      {
        source: "CHED UniFAST Grant",
        amount: 15000.0,
        status: "Pending Verification",
        expected_release: "3 business days",
      },
    ],
  };
}

function extractMessageText(content: string): string {
  try {
    const parsed = JSON.parse(content) as { text?: string };
    if (parsed && typeof parsed.text === "string") return parsed.text;
  } catch {
    // Plain text path.
  }
  return content;
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
    const normalizedContent = String(content || "").toLowerCase();
    const userLanguage = detectLanguage(String(content || ""));

    // Staff updates should not run through AI. Treat as human resolution activity.
    if ((authUser.role === "Agent" || authUser.role === "Admin") && content) {
      const staffMsg: MessageDoc = {
        id: `msg-${Date.now()}-staff`,
        institution_id: authUser.institution_id,
        conversation_id: conversationId,
        role: "system",
        content_scrubbed: content,
        ts: new Date().toISOString(),
      };
      await cosmosDbService.createMessage(staffMsg);

      const conversation = await cosmosDbService.getConversation(conversationId, authUser.institution_id);
      if (conversation) {
        await cosmosDbService.updateConversationStatus(
          conversationId,
          authUser.institution_id,
          "Resolved",
          authUser.entra_oid
        );

        await enqueueOutlookNotification({
          institutionId: authUser.institution_id,
          recipientEntraOid: conversation.student_id,
          subject: `Ticket ${conversation.ticket_id} has been resolved`,
          textBody:
            `Your support ticket ${conversation.ticket_id} has been marked as resolved by ${authUser.name || "Student Support"}. ` +
            "If you still need help, you can open a new ticket from your student dashboard.",
          ticketId: conversationId,
        });
      }

      return NextResponse.json({ success: true, data: staffMsg });
    }

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

    if (!isAiEnabled()) {
      await cosmosDbService.updateConversationStatus(
        conversationId,
        authUser.institution_id,
        "Pending Agent"
      );

      const assistantMsg: MessageDoc = {
        id: `msg-${Date.now()}-assistant`,
        institution_id: authUser.institution_id,
        conversation_id: conversationId,
        role: "assistant",
        content_scrubbed: JSON.stringify({
          text: "AI assistance is temporarily unavailable. Your request has been routed directly to the support queue, and a human agent will assist you shortly.",
          toolCalls: ["EscalateToHuman"],
        }),
        ts: new Date(Date.now() + 1000).toISOString(),
      };
      await cosmosDbService.createMessage(assistantMsg);

      return NextResponse.json({ success: true, data: assistantMsg });
    }

    const conversation = await cosmosDbService.getConversation(conversationId, authUser.institution_id);
    const currentAiAttempts = conversation?.ai_resolution_attempts || 0;
    let nextAiAttempts = currentAiAttempts;

    // 2. Fetch active holds/billing to make the AI responses data-driven
    const holdsKey = `holds:${authUser.entra_oid}`;
    const holds = (await cosmosDbService.getCacheData<HoldItem[]>(holdsKey, authUser.institution_id)) || [];
    const activeHoldsCount = holds.filter((h) => h.status === "Active").length;

    if (isFoundryConfigured()) {
      const history = await cosmosDbService.getMessages(conversationId, authUser.institution_id);
      const lastTurns = history.slice(-14).map((msg) => ({
        role: msg.role === "system" ? "assistant" : msg.role,
        content: extractMessageText(msg.content_scrubbed),
      })) as Array<{ role: "assistant" | "user"; content: string }>;

      const holdSummary =
        holds.length > 0
          ? holds
              .map((hold) => `${hold.type} hold (${hold.status}): ${hold.reason}. Resolution: ${hold.resolution_steps}`)
              .join("\n")
          : "No active hold data available.";

      const foundryResult = await generateFoundryReply({
        systemPrompt:
          "You are Archon, an AI student-services assistant.\n" +
          "Use only provided context and never fabricate institutional actions.\n" +
          "If uncertain, ask a clarifying question.\n" +
          "Respond in the detected language (en, fil, ceb).\n" +
          "Output JSON only with shape: {\"text\":\"...\", \"toolCalls\":[\"...\"]}.\n" +
          `Detected language: ${userLanguage}.\n` +
          `Student: ${authUser.entra_oid}.\n` +
          `Role: ${authUser.role}.\n` +
          `Current AI attempts: ${currentAiAttempts}.\n` +
          `Hold summary:\n${holdSummary}`,
        messages: lastTurns,
      });

      if (foundryResult?.text) {
        await cosmosDbService.updateConversationAiAttempts(conversationId, authUser.institution_id, 0);
        const assistantMsg: MessageDoc = {
          id: `msg-${Date.now()}-assistant`,
          institution_id: authUser.institution_id,
          conversation_id: conversationId,
          role: "assistant",
          content_scrubbed: JSON.stringify({
            text: foundryResult.text,
            toolCalls: foundryResult.toolCalls || [],
          }),
          ts: new Date(Date.now() + 1000).toISOString(),
        };
        await cosmosDbService.createMessage(assistantMsg);
        return NextResponse.json({ success: true, data: assistantMsg });
      }
    }

    // 3. Mock AI agent response generation loop
    let aiContent = "";
    const toolCalls: string[] = [];
    let didEscalate = false;

    const escalateToHuman = async () => {
      toolCalls.push("EscalateToHuman");
      didEscalate = true;
      nextAiAttempts = 0;

      await cosmosDbService.updateConversationStatus(conversationId, authUser.institution_id, "Pending Agent");
      await cosmosDbService.updateConversationAiAttempts(conversationId, authUser.institution_id, 0);

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

      await enqueueTeamsNotification({
        institutionId: authUser.institution_id,
        recipientEntraOid: authUser.entra_oid,
        title: "Ticket escalated to support queue",
        message: "Your ticket has been escalated. A support staff member will assist you shortly.",
        actionUrl: `/student/chat?ticketId=${conversationId}`,
        ticketId: conversationId,
      });
    };

    if (
      normalizedContent.includes("balance") ||
      normalizedContent.includes("owe") ||
      normalizedContent.includes("tuition") ||
      normalizedContent.includes("how much") ||
      normalizedContent.includes("magkano") ||
      normalizedContent.includes("balanse") ||
      normalizedContent.includes("bayarin") ||
      normalizedContent.includes("bayad") ||
      normalizedContent.includes("bayranan")
    ) {
      toolCalls.push("CheckTuitionBalance");
      toolCalls.push("CheckFinancialAidStatus");

      const financialKey = `financial:${authUser.entra_oid}`;
      let financialData = await cosmosDbService.getCacheData<FinancialData>(financialKey, authUser.institution_id);
      if (!financialData) {
        financialData = getDefaultFinancialData();
        await cosmosDbService.setCacheData(financialKey, financialData, authUser.institution_id);
      }

      if (financialData) {
        aiContent = formatBalanceResponse(financialData, userLanguage);
        nextAiAttempts = 0;
      } else if (userLanguage === "fil") {
        aiContent =
          "Hindi ko ma-load ang financial summary mo ngayon. Puwede mo bang subukan ulit in a few seconds, o i-escalate ko ito sa support agent?";
        nextAiAttempts = currentAiAttempts + 1;
      } else if (userLanguage === "ceb") {
        aiContent =
          "Dili pa nako ma-load ang imong financial summary karon. Pwede nimo i-try balik after a few seconds, o i-escalate nako ni sa support agent?";
        nextAiAttempts = currentAiAttempts + 1;
      } else {
        aiContent =
          "I couldn't load your financial summary right now. Please try again in a few seconds, or I can escalate this to a support agent.";
        nextAiAttempts = currentAiAttempts + 1;
      }
    } else
    if (normalizedContent.includes("hold") || normalizedContent.includes("why") || normalizedContent.includes("block")) {
      toolCalls.push("CheckStudentHolds");
      nextAiAttempts = 0;
      if (activeHoldsCount === 0) {
        if (userLanguage === "fil") {
          aiContent = "Na-check ko na ang records mo. Wala akong nakikitang active hold sa account mo ngayon. Clear ang status mo sa Registrar.";
        } else if (userLanguage === "ceb") {
          aiContent = "Na-check nako imong records. Wala koy nakita nga active hold sa imong account karon. Klaro imong status sa Registrar.";
        } else {
          aiContent = "Checking your records... I don't see any active holds on your account at the moment. Your status with the Registrar is clear.";
        }
      } else {
        const holdLines = holds
          .map((h, i: number) => `${i + 1}. **${h.type} Hold** (${h.status}): ${h.reason}\n   *Resolution:* ${h.resolution_steps}`)
          .join("\n\n");
        if (userLanguage === "fil") {
          aiContent = `May nakita akong **${activeHoldsCount}** active hold(s) sa account mo:\n\n${holdLines}\n\nPara sa Financial Hold mo, puwede kong i-request ang temporary lift para makapag-enroll ka kung may pending scholarship ka. Gusto mo bang gawin ko iyon?`;
        } else if (userLanguage === "ceb") {
          aiContent = `Naa koy nakita nga **${activeHoldsCount}** active hold(s) sa imong account:\n\n${holdLines}\n\nPara sa imong Financial Hold, pwede nako i-request og temporary lift aron maka-enroll ka kung naa kay pending scholarship. Gusto nimo buhaton nako ni?`;
        } else {
          aiContent = `I found **${activeHoldsCount}** active hold(s) on your account:\n\n${holdLines}\n\nFor your Financial Hold, I can temporarily lift it so you can enroll if you have a pending scholarship. Would you like me to do that?`;
        }
      }
    } else if (normalizedContent.includes("lift") || normalizedContent.includes("remove") || normalizedContent.includes("yes") || normalizedContent.includes("please") || normalizedContent.includes("do it")) {
      const financialHold = holds.find((h) => h.id === "hold-financial" && h.status === "Active");
      if (financialHold) {
        toolCalls.push("CheckFinancialAidStatus");
        toolCalls.push("requestHoldLift");
        nextAiAttempts = 0;
        
        // Update mock database hold status
        financialHold.status = "Resolved";
        await cosmosDbService.setCacheData(holdsKey, holds, authUser.institution_id);

        if (userLanguage === "fil") {
          aiContent = "Na-check ko ang Financial Aid records mo. Nakikita ko ang pending CHED UniFAST grant mo na ₱15,000. Dahil dito, nag-request na ako sa Bursar at Registrar na i-temporarily lift ang **Financial Hold** mo.\n\nSuccessful ang lift! Cleared na ito sa next 14 days para makapag-enroll ka. Makikita mo ito sa Student Dashboard mo. May iba pa ba akong maitutulong?";
        } else if (userLanguage === "ceb") {
          aiContent = "Na-check nako imong Financial Aid records. Nakita nako ang pending CHED UniFAST grant nimo nga ₱15,000. Tungod ani, naka-request nako sa Bursar ug Registrar nga i-temporarily lift ang imong **Financial Hold**.\n\nSuccessful ang lift! Cleared na ni sa sunod 14 ka adlaw aron maka-enroll ka. Makita nimo ni sa imong Student Dashboard. Naa pa ba koy matabang?";
        } else {
          aiContent = "Checking your Financial Aid records... I can see your pending CHED UniFAST grant of ₱15,000. Because of this, I have requested the Bursar and Registrar to temporarily lift your **Financial Hold**.\n\nThe lift was successful! This hold is cleared for the next 14 days so you can enroll. You can see this reflected on your Student Dashboard. Is there anything else I can help you with?";
        }
      } else {
        nextAiAttempts = 0;
        if (userLanguage === "fil") {
          aiContent = "May iba pa ba akong maitutulong tungkol sa holds mo? Kung gusto mong ma-clear ang Academic (SAP) hold mo, puwede mong gamitin ang SAP Appeal Wizard sa sidebar.";
        } else if (userLanguage === "ceb") {
          aiContent = "Naa pa ba koy matabang bahin sa imong holds? Kung gusto nimo ma-clear ang Academic (SAP) hold, pwede nimo gamiton ang SAP Appeal Wizard sa sidebar.";
        } else {
          aiContent = "Is there anything else I can help with regarding your holds? If you'd like to clear your Academic (SAP) hold, please use the SAP Appeal Wizard in the sidebar.";
        }
      }
    } else if (normalizedContent.includes("sap") || normalizedContent.includes("appeal") || normalizedContent.includes("academic")) {
      toolCalls.push("queryPolicies");
      nextAiAttempts = 0;
      if (userLanguage === "fil") {
        aiContent = "Para sa **Academic Hold (SAP deficiency)** mo, kailangan mong mag-file ng formal SAP Appeal.\n\nMaaari mong buksan ang **SAP Appeal Wizard** mula sa dashboard sidebar para ihanda ang narrative at document checklist mo (hal. transcript o medical certificate). Gusto mo bang i-guide kita roon?";
      } else if (userLanguage === "ceb") {
        aiContent = "Para sa imong **Academic Hold (SAP deficiency)**, kinahanglan ka mo-file og formal SAP Appeal.\n\nPwede nimo ablihan ang **SAP Appeal Wizard** gikan sa dashboard sidebar aron ma-andam nimo ang narrative ug document checklist (sama sa transcript o medical certificate). Gusto nimo i-guide tika didto?";
      } else {
        aiContent = "For your **Academic Hold (SAP deficiency)**, you are required to file a formal SAP Appeal. \n\nYou can open the **SAP Appeal Wizard** from the dashboard sidebar to prepare your appeal narrative and checklist of documents (such as transcript or medical certificate). Would you like me to guide you there?";
      }
    } else if (normalizedContent.includes("human") || normalizedContent.includes("agent") || normalizedContent.includes("talk") || normalizedContent.includes("staff")) {
      if (currentAiAttempts >= 2) {
        await escalateToHuman();
        if (userLanguage === "fil") {
          aiContent = "Naiintindihan ko. In-escalate ko na ang conversation na ito sa student services support queue namin. Isinama ko na rin ang summary ng holds mo at mga actions na ginawa ko para hindi mo na ulitin ang kwento mo.\n\nSandali lang habang kino-connect kita sa next available support staff.";
        } else if (userLanguage === "ceb") {
          aiContent = "Nasabtan nako. Gi-escalate na nako kining conversation ngadto sa among student services support queue. Giapil na nako ang summary sa imong holds ug mga aksyon nga akong gihimo aron dili na nimo usbon ang imong istorya.\n\nPalihog hulat kadiyot samtang i-connect tika sa sunod available nga support staff.";
        } else {
          aiContent = "I understand. I have escalated this conversation to our student services support queue. I've included a summary of your holds and the actions I took so you won't have to repeat your story. \n\nPlease hold on a moment while I connect you to the next available support staff.";
        }
      } else {
        toolCalls.push("AttemptAutonomousResolution");
        nextAiAttempts = currentAiAttempts + 1;
        if (userLanguage === "fil") {
          aiContent = `Naiintindihan ko na gusto mong makausap ang support staff. Bago kita i-escalate, susubukan ko muna ang isa pang autonomous resolution attempt (${nextAiAttempts}/2) para baka ma-resolve agad ito.\n\nPaki-share nang mas specific kung anong outcome ang kailangan mo ngayon (hal. hold lift, exact amount due, o scholarship status).`;
        } else if (userLanguage === "ceb") {
          aiContent = `Nasabtan nako nga gusto nimo makigstorya sa support staff. Sa dili pa tika i-escalate, mosulay sa ko ug usa pa ka autonomous resolution attempt (${nextAiAttempts}/2) basin ma-resolve dayon.\n\nPalihog ihatag ang mas specific nga outcome nga imong kailangan karon (pananglitan: hold lift, exact amount due, o scholarship status).`;
        } else {
          aiContent = `I understand you want to speak with support staff. Before escalation, I need to run one more autonomous resolution attempt (${nextAiAttempts}/2) in case we can resolve this immediately.\n\nPlease share the exact outcome you need right now (e.g., hold lift, exact amount due, or scholarship status).`;
        }
      }
    } else {
      nextAiAttempts = currentAiAttempts + 1;
      if (nextAiAttempts >= 2) {
        await escalateToHuman();
        if (userLanguage === "fil") {
          aiContent = "Mukhang hindi ko pa ito nareresolba sa autonomous flow. In-escalate ko na ito sa support queue para ma-assist ka agad ng human agent. Isinama ko na ang context para hindi mo na ulitin ang details.";
        } else if (userLanguage === "ceb") {
          aiContent = "Murag dili pa nako ni ma-resolve sa autonomous flow. Gi-escalate na nako ni sa support queue aron ma-assist ka dayon sa human agent. Giapil na nako ang context para dili na nimo usbon ang details.";
        } else {
          aiContent = "It looks like I still can't resolve this in autonomous flow. I've escalated this to the support queue so a human agent can assist you right away. I included your context so you won't need to repeat details.";
        }
      } else if (userLanguage === "fil") {
        toolCalls.push("AttemptAutonomousResolution");
        aiContent = `Salamat sa message mo, ${authUser.name || "Student"}. Susubukan ko pa ang autonomous resolution attempt (${nextAiAttempts}/2).\n\nPuwede mo akong tanungin tungkol sa holds mo ("bakit may hold ako?"), tuition balance, UniFAST scholarship deadlines, o specific resolution na kailangan mo.`;
      } else if (userLanguage === "ceb") {
        toolCalls.push("AttemptAutonomousResolution");
        aiContent = `Salamat sa imong mensahe, ${authUser.name || "Student"}. Mosulay pa ko sa autonomous resolution attempt (${nextAiAttempts}/2).\n\nPwede ko nimo pangutan-on bahin sa imong holds ("ngano naa koy hold?"), tuition balance, UniFAST scholarship deadlines, o specific nga resolution nga imong kailangan.`;
      } else {
        toolCalls.push("AttemptAutonomousResolution");
        aiContent = `Thank you for your message, ${authUser.name || "Student"}. I'll run another autonomous resolution attempt (${nextAiAttempts}/2).\n\nYou can ask about holds ("why do I have a hold?"), tuition balance, UniFAST scholarship deadlines, or the specific resolution you need.`;
      }
    }

    if (!didEscalate && nextAiAttempts !== currentAiAttempts) {
      await cosmosDbService.updateConversationAiAttempts(conversationId, authUser.institution_id, nextAiAttempts);
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
