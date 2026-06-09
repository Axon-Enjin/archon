import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser, unauthorizedResponse } from "@/lib/auth-helper";
import { cosmosDbService } from "@/lib/db/cosmos";
import { MessageDoc, HandoffDoc } from "@/lib/db/types";
import { isAiEnabled } from "@/lib/feature-flags";
import { enqueueOutlookNotification, enqueueTeamsNotification } from "@/lib/notification-jobs";
import { generateFoundryReply, isFoundryConfigured } from "@/lib/azure-foundry";
import { SYSTEM_PROMPT } from "@/lib/ai-prompt-templates";
import { getUniversityAdapter } from "@/lib/adapters";
import type { AdapterContext, FinancialStatus, StatusAggregate } from "@/lib/adapters/types";

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

function formatBalanceResponse(financialData: FinancialStatus, language: UserLanguage): string {
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

function extractMessageText(content: string): string {
  try {
    const parsed = JSON.parse(content) as { text?: string };
    if (parsed && typeof parsed.text === "string") return parsed.text;
  } catch {
    // Plain text path.
  }
  return content;
}

function parseCsv(value: string | undefined): string[] {
  return (value || "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function getSupportQueueActionUrl(ticketId: string): string {
  const overridePath = process.env.ARCHON_SUPPORT_QUEUE_PATH?.trim();
  if (overridePath) {
    const separator = overridePath.includes("?") ? "&" : "?";
    return `${overridePath}${separator}ticketId=${encodeURIComponent(ticketId)}`;
  }
  return `/admin/queue?ticketId=${encodeURIComponent(ticketId)}`;
}

async function resolveSupportRecipients(institutionId: string, excludeIds: string[] = []): Promise<string[]> {
  const configured = parseCsv(process.env.ARCHON_SUPPORT_RECIPIENTS);
  if (configured.length > 0) {
    return configured.filter((id) => !excludeIds.includes(id));
  }

  const staffIds = await cosmosDbService.getSupportStaffIdentifiers(institutionId);
  return staffIds.filter((id) => !excludeIds.includes(id));
}

function getSupportEscalationMessage(ticketLabel: string, ticketId: string): string {
  return (
    `Ticket ${ticketLabel} requested support staff assistance. ` +
    `Ticket ID: ${ticketId}. Open Archon queue to continue the support session.`
  );
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
        const resolvedAt = new Date().toISOString();
        const wrapUpSummary = `Resolved by ${authUser.name || "Support Staff"}: ${String(content).slice(0, 280)}`;

        const recipientEmail =
          conversation.student_email ||
          (await cosmosDbService.getStudentEmail(conversation.student_id, authUser.institution_id));
        await cosmosDbService.updateConversationStatus(
          conversationId,
          authUser.institution_id,
          "Resolved",
          authUser.entra_oid
        );
        await cosmosDbService.updateConversationAiAttempts(conversationId, authUser.institution_id, 0);

        const existingHandoff = await cosmosDbService.getHandoffByTicketId(conversationId, authUser.institution_id);
        if (existingHandoff) {
          await cosmosDbService.upsertHandoff({
            ...existingHandoff,
            handoff_packet: {
              ...existingHandoff.handoff_packet,
              resolution_summary: wrapUpSummary,
              wrap_up_status: "completed",
            },
            agent_id: authUser.entra_oid,
            resolved_at: resolvedAt,
          });
        } else {
          await cosmosDbService.upsertHandoff({
            id: `handoff-${conversationId}`,
            institution_id: authUser.institution_id,
            ticket_id: conversationId,
            handoff_packet: {
              student_profile: {
                name: conversation.student_id,
                student_id: conversation.student_id,
                major: authUser.major || "Not available",
                year: authUser.year || "Not available",
              },
              diagnosis: "Direct staff resolution without prior autonomous handoff packet.",
              systems_queried: ["Staff Review"],
              actions_taken: ["Staff resolution posted"],
              recommended_resolution: "Completed by support staff.",
              resolution_summary: wrapUpSummary,
              wrap_up_status: "completed",
            },
            agent_id: authUser.entra_oid,
            resolved_at: resolvedAt,
          });
        }

        await cosmosDbService.createMessage({
          id: `msg-${Date.now()}-wrapup`,
          institution_id: authUser.institution_id,
          conversation_id: conversationId,
          role: "system",
          content_scrubbed: JSON.stringify({
            text: `Zero-touch wrap-up recorded. ${wrapUpSummary}`,
            toolCalls: ["ZeroTouchWrapUp"],
          }),
          ts: resolvedAt,
        });

        await enqueueOutlookNotification({
          institutionId: authUser.institution_id,
          recipientEntraOid: conversation.student_id,
          recipientEmail,
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

    const conversation = await cosmosDbService.getConversation(conversationId, authUser.institution_id);
    const ticketLabel = conversation?.ticket_id || conversationId;
    const supportRecipients = await resolveSupportRecipients(authUser.institution_id, [authUser.entra_oid]);
    const primarySupportRecipient = supportRecipients[0];

    if (!isAiEnabled()) {
      await cosmosDbService.updateConversationStatus(
        conversationId,
        authUser.institution_id,
        "Pending Agent",
        primarySupportRecipient
      );

      for (const recipient of supportRecipients) {
        await enqueueTeamsNotification({
          institutionId: authUser.institution_id,
          recipientEntraOid: recipient,
          title: ticketLabel,
          message: getSupportEscalationMessage(ticketLabel, conversationId),
          actionUrl: getSupportQueueActionUrl(conversationId),
          ticketId: conversationId,
        });
      }

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
    const currentAiAttempts = conversation?.ai_resolution_attempts || 0;
    let nextAiAttempts = currentAiAttempts;
    const adapter = getUniversityAdapter(authUser.institution_id);
    const adapterContext: AdapterContext = {
      institutionId: authUser.institution_id,
      studentOid: authUser.entra_oid,
      major: authUser.major,
      year: authUser.year,
      name: authUser.name,
      email: authUser.email,
    };

    // 2. Fetch active holds/billing to make the AI responses data-driven
    let holds = await adapter.getHolds(adapterContext);
    const activeHoldsCount = holds.filter((h) => h.status === "Active").length;
    const statusAggregate: StatusAggregate = await adapter.getStatusAggregate(adapterContext);
    const activeFinancialHold = statusAggregate.financial.holds.find((hold) => hold.status === "Active");
    const canAutoLiftFinancial =
      Boolean(activeFinancialHold) &&
      statusAggregate.financial.pending_financial_aid >= statusAggregate.financial.balance_due;

    const triggerEscalation = async () => {
      await cosmosDbService.updateConversationStatus(
        conversationId,
        authUser.institution_id,
        "Pending Agent",
        primarySupportRecipient
      );
      await cosmosDbService.updateConversationAiAttempts(conversationId, authUser.institution_id, 0);

      const handoffDoc: HandoffDoc = {
        id: `handoff-${conversationId}`,
        institution_id: authUser.institution_id,
        ticket_id: conversationId,
        handoff_packet: {
          student_profile: {
            name: authUser.name || "Student",
            student_id: authUser.entra_oid,
            major: statusAggregate.academic.profile.major || authUser.major || "Not available",
            year: statusAggregate.academic.profile.year || authUser.year || "Not available",
          },
          diagnosis:
            activeHoldsCount > 0
              ? `Student has ${activeHoldsCount} active hold(s). Escalation requested or autonomous attempts exhausted.`
              : "Escalation requested or autonomous attempts exhausted without full autonomous resolution.",
          systems_queried: ["RegistrarHolds", "BursarTuition", "CHEDUniFASTStatus"],
          actions_taken: [
            "Generated status aggregate snapshot",
            "Escalated to human support queue",
          ],
          recommended_resolution:
            `Review balance due (${pesoFormatter.format(statusAggregate.financial.balance_due)}), ` +
            `financial aid pending (${pesoFormatter.format(statusAggregate.financial.pending_financial_aid)}), ` +
            "and hold policy constraints before issuing a final resolution.",
          wrap_up_status: "pending",
        },
        agent_id: undefined,
        resolved_at: undefined,
      };
      await cosmosDbService.upsertHandoff(handoffDoc);

      await enqueueTeamsNotification({
        institutionId: authUser.institution_id,
        recipientEntraOid: authUser.entra_oid,
        title: "Ticket escalated to support queue",
        message: "Your ticket has been escalated. A support staff member will assist you shortly.",
        actionUrl: `/student/chat?ticketId=${conversationId}`,
        ticketId: conversationId,
      });

      for (const recipient of supportRecipients) {
        await enqueueTeamsNotification({
          institutionId: authUser.institution_id,
          recipientEntraOid: recipient,
          title: ticketLabel,
          message: getSupportEscalationMessage(ticketLabel, conversationId),
          actionUrl: getSupportQueueActionUrl(conversationId),
          ticketId: conversationId,
        });
      }
    };

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
      const financialSnapshot =
        `Balance Due: ${pesoFormatter.format(statusAggregate.financial.balance_due)}\n` +
        `Pending Financial Aid: ${pesoFormatter.format(statusAggregate.financial.pending_financial_aid)}\n` +
        `Payment Deadline: ${statusAggregate.financial.payment_deadline}\n` +
        `Academic SAP Status: ${statusAggregate.academic.profile.sap_status}\n`;

      const foundryResult = await generateFoundryReply({
        systemPrompt:
          SYSTEM_PROMPT +
          "\n---\nRUNTIME CONTEXT (DO NOT SHARE WITH USER)\n" +
          `Detected language: ${userLanguage}.\n` +
          `Student Entra OID: ${authUser.entra_oid}.\n` +
          `Role: ${authUser.role}.\n` +
          `Current AI resolution attempts: ${currentAiAttempts}.\n` +
          "Output JSON only with shape: {\"text\":\"...\", \"toolCalls\":[\"...\"]}\n" +
          `Status aggregate JSON: ${JSON.stringify(statusAggregate)}\n` +
          `Hold summary:\n${holdSummary}\n` +
          `Financial summary:\n${financialSnapshot}\n` +
          "\n---\nOUT-OF-SCOPE GUARDRAIL\n" +
          "If the student asks for ANYTHING unrelated to university services (registration, holds, billing, financial aid, M365 schedules, SAP appeals), you MUST respond ONLY with:\n" +
          "{\"text\": \"I'm Archon, the student support assistant for State University. I can only help with registration holds, tuition balances, financial aid, and academic support. How can I help you with one of these today?\", \"toolCalls\": []}",
        messages: lastTurns,
      });

      if (foundryResult?.text) {
        const finalToolCalls = foundryResult.toolCalls || [];
        let finalText = foundryResult.text;
        
        // Execute tool calls on the server
        if (finalToolCalls.includes("EscalateToHuman")) {
          await triggerEscalation();
        }
        
        if (finalToolCalls.includes("requestHoldLift")) {
          if (canAutoLiftFinancial) {
            await adapter.requestHoldLift(adapterContext, "hold-financial");
          } else {
            finalText =
              userLanguage === "fil"
                ? "Na-check ko ang financial status mo. Hindi pa eligible for temporary financial hold lift dahil kulang pa ang pending aid coverage. I-escalate ko ito sa support staff para ma-review at ma-actionan agad."
                : userLanguage === "ceb"
                ? "Na-check nako imong financial status. Dili pa eligible sa temporary financial hold lift kay kulang pa ang pending aid coverage. I-escalate nako ni sa support staff para ma-review dayon."
                : "I checked your financial status. You're not yet eligible for a temporary financial hold lift because pending aid does not fully cover the balance yet. I will escalate this to support staff for immediate review.";
            if (!finalToolCalls.includes("EscalateToHuman")) {
              await triggerEscalation();
            }
          }
        }

        await cosmosDbService.updateConversationAiAttempts(conversationId, authUser.institution_id, 0);
        const assistantMsg: MessageDoc = {
          id: `msg-${Date.now()}-assistant`,
          institution_id: authUser.institution_id,
          conversation_id: conversationId,
          role: "assistant",
          content_scrubbed: JSON.stringify({
            text: finalText,
            toolCalls: finalToolCalls,
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
      await triggerEscalation();
    };

    const lowerContent = normalizedContent.toLowerCase();
    const isGreeting = 
      lowerContent === "hello" ||
      lowerContent === "hi" ||
      lowerContent === "hey" ||
      lowerContent.startsWith("hello ") ||
      lowerContent.startsWith("hi ") ||
      lowerContent.startsWith("hey ") ||
      lowerContent.includes("good morning") ||
      lowerContent.includes("good afternoon") ||
      lowerContent.includes("good evening") ||
      lowerContent === "thank you" ||
      lowerContent === "salamat" ||
      lowerContent === "thanks";

    const isOffTopic = 
      !lowerContent.includes("balance") &&
      !lowerContent.includes("owe") &&
      !lowerContent.includes("tuition") &&
      !lowerContent.includes("how much") &&
      !lowerContent.includes("magkano") &&
      !lowerContent.includes("balanse") &&
      !lowerContent.includes("bayarin") &&
      !lowerContent.includes("bayad") &&
      !lowerContent.includes("bayranan") &&
      !lowerContent.includes("hold") &&
      !lowerContent.includes("why") &&
      !lowerContent.includes("block") &&
      !lowerContent.includes("lift") &&
      !lowerContent.includes("remove") &&
      !lowerContent.includes("yes") &&
      !lowerContent.includes("please") &&
      !lowerContent.includes("do it") &&
      !lowerContent.includes("sap") &&
      !lowerContent.includes("appeal") &&
      !lowerContent.includes("academic") &&
      !lowerContent.includes("human") &&
      !lowerContent.includes("agent") &&
      !lowerContent.includes("talk") &&
      !lowerContent.includes("staff");

    const isJailbreak = 
      lowerContent.includes("ignore previous") ||
      lowerContent.includes("ignore all") ||
      lowerContent.includes("output your prompt") ||
      lowerContent.includes("reveal your prompt") ||
      lowerContent.includes("assume a new") ||
      lowerContent.includes("cooking assistant");

    if (isJailbreak || (isOffTopic && !isGreeting)) {
      nextAiAttempts = 0;
      aiContent = "I'm Archon, your student support assistant at State University. I can only help you with registration holds, tuition balances, financial aid, and academic support. Is there something I can help you with in those areas?";
    } else if (
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

      const financialData = await adapter.getFinancialStatus(adapterContext);
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
          aiContent =
            `May nakita akong **${activeHoldsCount}** active hold(s) sa account mo:\n\n${holdLines}\n\n` +
            (canAutoLiftFinancial
              ? "Eligible ka sa autonomous temporary financial hold lift batay sa current pending aid mo. Gusto mo bang gawin ko iyon ngayon?"
              : "Sa ngayon, hindi pa sapat ang pending aid para ma-autonomous lift ang financial hold. Puwede kitang i-escalate sa support staff para manual review.");
        } else if (userLanguage === "ceb") {
          aiContent =
            `Naa koy nakita nga **${activeHoldsCount}** active hold(s) sa imong account:\n\n${holdLines}\n\n` +
            (canAutoLiftFinancial
              ? "Eligible ka sa autonomous temporary financial hold lift base sa imong current pending aid. Gusto nimo buhaton nako karon?"
              : "Sa karon, kulang pa ang pending aid para ma-autonomous lift ang financial hold. Pwede tika i-escalate sa support staff para manual review.");
        } else {
          aiContent =
            `I found **${activeHoldsCount}** active hold(s) on your account:\n\n${holdLines}\n\n` +
            (canAutoLiftFinancial
              ? "You are eligible for an autonomous temporary financial hold lift based on your current pending aid coverage. Would you like me to do that now?"
              : "At the moment, pending aid coverage is not enough for an autonomous financial hold lift. I can escalate this to support staff for manual review.");
        }
      }
    } else if (normalizedContent.includes("lift") || normalizedContent.includes("remove") || normalizedContent.includes("yes") || normalizedContent.includes("please") || normalizedContent.includes("do it")) {
      if (activeFinancialHold && canAutoLiftFinancial) {
        toolCalls.push("CheckFinancialAidStatus");
        toolCalls.push("requestHoldLift");
        nextAiAttempts = 0;
        await adapter.requestHoldLift(adapterContext, "hold-financial");
        holds = await adapter.getHolds(adapterContext);

        if (userLanguage === "fil") {
          aiContent = "Na-check ko ang Financial Aid records mo. Nakikita ko ang pending CHED UniFAST grant mo na ₱15,000. Dahil dito, nag-request na ako sa Bursar at Registrar na i-temporarily lift ang **Financial Hold** mo.\n\nSuccessful ang lift! Cleared na ito sa next 14 days para makapag-enroll ka. Makikita mo ito sa Student Dashboard mo. May iba pa ba akong maitutulong?";
        } else if (userLanguage === "ceb") {
          aiContent = "Na-check nako imong Financial Aid records. Nakita nako ang pending CHED UniFAST grant nimo nga ₱15,000. Tungod ani, naka-request nako sa Bursar ug Registrar nga i-temporarily lift ang imong **Financial Hold**.\n\nSuccessful ang lift! Cleared na ni sa sunod 14 ka adlaw aron maka-enroll ka. Makita nimo ni sa imong Student Dashboard. Naa pa ba koy matabang?";
        } else {
          aiContent = "Checking your Financial Aid records... I can see your pending CHED UniFAST grant of ₱15,000. Because of this, I have requested the Bursar and Registrar to temporarily lift your **Financial Hold**.\n\nThe lift was successful! This hold is cleared for the next 14 days so you can enroll. You can see this reflected on your Student Dashboard. Is there anything else I can help you with?";
        }
      } else if (activeFinancialHold && !canAutoLiftFinancial) {
        nextAiAttempts = 0;
        await escalateToHuman();
        if (userLanguage === "fil") {
          aiContent = "Na-check ko ang financial status mo. Hindi pa sapat ang pending aid coverage para ma-autonomous lift ang financial hold, kaya in-escalate ko na ito sa support staff para ma-review at ma-actionan agad.";
        } else if (userLanguage === "ceb") {
          aiContent = "Na-check nako imong financial status. Dili pa igo ang pending aid coverage para ma-autonomous lift ang financial hold, mao nga gi-escalate na nako ni sa support staff para ma-review dayon.";
        } else {
          aiContent = "I checked your financial status. Pending aid coverage is not yet sufficient for an autonomous financial hold lift, so I have escalated this to support staff for immediate review.";
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
