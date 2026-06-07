# Request for Comments (RFC): Seamless Human Handoff

**RFC ID:** `archon-rfc-002`
**Project:** Archon — Agentic AI-Powered Service Desk
**Date:** 2026-06-07
**Author:** Regalia Council (Alaric)
**Status:** Accepted
**Feature:** `PRD-F4` (Seamless Human Handoff)

---

## 1. Problem Statement

When the AI cannot resolve a student's inquiry autonomously (due to complexity, edge cases, or safety constraints), it must escalate to a human Tier 1 agent. A poor handoff requires the student to repeat their entire problem (a major driver of the "experience deficit" highlighted in the PRD). A successful handoff preserves full context so the human agent can solve the problem immediately.

## 2. Options Considered

### Option A: Transcript Passthrough
Simply dump the raw chat log between the student and the AI into the human agent's dashboard.
- *Pros:* Easiest to implement. Nothing is lost.
- *Cons:* Agents must read a wall of text (often 10+ messages) before they understand the issue, drastically increasing Average Handle Time (AHT) and cognitive load.

### Option B: Pre-defined Handoff Forms
The AI asks the user to fill out a structured form (Category, Urgency, Description) before escalating.
- *Pros:* Structured data for the agent.
- *Cons:* Creates friction. Makes the user do the work that the AI is supposed to be doing. Feels like a traditional, frustrating ticketing system.

### Option C: AI-Synthesized Context Packet ("Zero-Touch Handoff")
The AI uses an LLM to read the transcript and the internal API responses, then generates a structured, high-signal JSON packet summarizing the state of the world specifically for the human agent.
- *Pros:* Agent gets a 5-second digest of exactly what the problem is, what systems have already been checked, and what needs to be done. Vastly reduces AHT.
- *Cons:* Adds an extra LLM call (cost + latency) at the moment of escalation.

## 3. Decision

**Selected: Option C (AI-Synthesized Context Packet)**

When Copilot Studio determines an escalation is necessary (e.g., via a "talk to human" intent or after 2 failed resolution attempts), it triggers an asynchronous Azure OpenAI call to summarize the session into a `HandoffPacket`. 

The user sees: *"Let me connect you with a specialist. I'm summarizing our conversation for them right now..."*

The human agent sees a UI card containing:
1. **Student Profile:** (Name, ID, Degree, Year)
2. **Current Issue:** 1-2 sentence summary of the core problem.
3. **Actions Attempted:** What the AI already checked (e.g., "Queried FA API: pending disbursement found. Queried Registrar: active hold found.").
4. **Recommended Next Step:** What the human should do (e.g., "Verify SAP status manually and lift registrar hold").

## 4. Contracts & Interfaces

**Contract: `HandoffPacket` schema**

```json
{
  "ticket_id": "TKT-98765",
  "student_id": "2024-00123",
  "escalation_reason": "MAX_ATTEMPTS_REACHED",
  "summary": "Student is asking to lift an enrollment hold caused by a delayed CHED scholarship.",
  "systems_queried": ["bursar_api", "registrar_api"],
  "ai_recommendation": "Check CHED portal manually. If approved, use action 'Lift Hold (Admin)'.",
  "raw_transcript_url": "/api/v1/tickets/TKT-98765/transcript"
}
```

## 5. Security & Rollback

- **Security:** The HandoffPacket must be scrubbed of raw payment data (e.g., card numbers) before being sent to the agent dashboard, in compliance with PCI-DSS guidelines.
- **Rollback:** If the LLM synthesis fails, the system degrades to Option A (Transcript Passthrough) to ensure the escalation still completes successfully.
