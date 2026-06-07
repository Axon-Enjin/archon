# Request for Comments (RFC): Seamless Human Handoff

**RFC ID:** `archon-rfc-002`
**Project:** Archon — Agentic AI-Powered Service Desk
**Date:** 2026-06-07
**Version:** 0.2
**Author:** Regalia Council (Alaric)
**Status:** Accepted
**Feature:** `PRD-F4` (Seamless Human Handoff)

---

## 1. Problem Statement

When the AI cannot resolve a student's inquiry autonomously (due to complexity, edge cases, or safety constraints), it must escalate to a human Tier 1 agent. A poor handoff requires the student to repeat their entire problem (a major driver of the "experience deficit" highlighted in the PRD). A successful handoff preserves full context so the human agent can solve the problem immediately. The handoff system must also integrate with Microsoft 365: agents receive escalation alerts via Microsoft Teams, and students receive resolution confirmations via Outlook email.

## 2. Options Considered

### Option A: Transcript Passthrough
Simply dump the raw chat log between the student and the AI into the human agent's dashboard.
- *Pros:* Easiest to implement. Nothing is lost.
- *Cons:* Agents must read a wall of text (often 10+ messages) before they understand the issue, drastically increasing Average Handle Time (AHT) and cognitive load.

### Option B: Pre-defined Handoff Forms
The AI asks the user to fill out a structured form (Category, Urgency, Description) before escalating.
- *Pros:* Structured data for the agent.
- *Cons:* Creates friction. Makes the user do the work that the AI is supposed to be doing. Feels like a traditional, frustrating ticketing system.

### Option C: AI-Synthesized Context Packet with M365 Agent Notification ("Zero-Touch Handoff")
The AI Foundry Agent reads the transcript and internal API responses, generates a structured JSON `HandoffPacket`, persists it to Cosmos DB, and simultaneously sends a Teams adaptive card to the assigned agent notifying them of the escalation.
- *Pros:* Agent gets a 5-second digest of exactly what the problem is, what systems have already been checked, and what needs to be done. Teams notification ensures agents are alerted immediately — no need to monitor a dashboard queue continuously. Vastly reduces AHT.
- *Cons:* Adds an extra AI Foundry invocation (cost + latency) at the moment of escalation. Requires M365 Teams admin consent (`TeamsActivity.Send`).

## 3. Decision

**Selected: Option C (AI-Synthesized Context Packet with M365 Agent Notification)**

When the AI Foundry Agent determines an escalation is necessary (after 2 failed resolution attempts or a "talk to human" intent), it:
1. Generates a `HandoffPacket` (GPT-4o call synthesizing the conversation + API data).
2. Persists the `HandoffPacket` to the `handoffs` Cosmos DB collection.
3. Triggers the `EscalateToHuman` tool → Gateway → queues the ticket in the Agent Dashboard.
4. Triggers the `SendTeamsNotification` tool → Gateway → Microsoft Graph `TeamsActivity.Send` → agent receives a Teams adaptive card.

The student sees: *"Let me connect you with a specialist. I'm summarizing our conversation for them right now…"*

The human agent receives a Teams adaptive card with:
1. **Student Profile:** Name, ID, Degree, Year, Scholarship status.
2. **Current Issue:** 1–2 sentence summary of the core problem.
3. **Actions Attempted:** What the AI already checked (e.g., "Queried FA Adapter: pending disbursement found. Queried Registrar Adapter: active hold found.").
4. **Recommended Next Step:** What the human should do (e.g., "Verify SAP status manually and lift registrar hold").
5. **Deep link:** "Open in Agent Dashboard" button in the Teams card.

After the agent resolves the ticket and marks it resolved, the Gateway calls `SendOutlookEmail` → Microsoft Graph `/me/sendMail` to notify the student of the resolution. Zero-Touch Wrap-Up logs the outcome to Cosmos DB automatically.

## 4. Contracts & Interfaces

**Contract: `HandoffPacket` schema (stored in Cosmos DB `handoffs` collection)**

```json
{
  "ticket_id": "TKT-98765",
  "institution_id": "univ-ph-001",
  "student_id": "2024-00123",
  "escalation_reason": "MAX_ATTEMPTS_REACHED",
  "summary": "Student is asking to lift an enrollment hold caused by a delayed CHED scholarship.",
  "systems_queried": ["bursar_adapter", "registrar_adapter"],
  "ai_recommendation": "Check CHED portal manually. If approved, use action 'Lift Hold (Admin)'.",
  "teams_notification_sent": true,
  "teams_notification_ts": "2026-06-07T12:00:00Z",
  "raw_transcript_url": "/api/v1/tickets/TKT-98765/transcript",
  "created_at": "2026-06-07T12:00:00Z"
}
```

## 5. Security & Rollback

- **Security:** The HandoffPacket must be scrubbed of raw payment data (e.g., card numbers) before being stored in Cosmos DB or sent via Teams, in compliance with PCI-DSS guidelines and Philippine DPA 2012.
- **Graph API Fallback:** If the Teams notification fails (Graph API throttled or `TeamsActivity.Send` consent not yet granted), the escalation still completes — the ticket enters the Agent Dashboard queue and the agent sees a visual badge on their next dashboard visit. The Teams notification failure is logged to Application Insights and retried once after 5 minutes.
- **Rollback:** If the AI Foundry `HandoffPacket` generation fails, the system degrades to Option A (Transcript Passthrough) — the raw conversation history is sent to the agent. The escalation always completes; only the quality of the context packet degrades.
