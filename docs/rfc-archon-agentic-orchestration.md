# Request for Comments (RFC): Agentic Workflow Orchestration

**RFC ID:** `archon-rfc-001`
**Project:** Archon — Agentic AI-Powered Service Desk
**Date:** 2026-06-07
**Author:** Regalia Council (Alaric)
**Status:** Accepted
**Feature:** `PRD-F2`, `PRD-F3` (Cross-Department Orchestration & Autonomous Resolution)

---

## 1. Problem Statement

Archon must autonomously execute multi-step workflows that span disconnected university systems. For example, resolving a "Why can't I register?" query may require checking the Registrar API (for academic holds), the Bursar API (for financial holds), and the Financial Aid API (to see if pending aid covers the balance). The AI must decide *which* systems to query, *in what order*, and how to synthesize the results without hallucinating capabilities or getting stuck in infinite loops.

## 2. Options Considered

### Option A: Fully Autonomous LLM Routing (e.g., LangGraph / AutoGen)
The LLM is given access to all available API tools and told to "figure it out" dynamically via reasoning loops.
- *Pros:* Highly flexible; requires less hardcoded configuration per institution.
- *Cons:* Prone to "tool loop" hallucinations; unpredictable token costs; highly non-deterministic (a compliance risk for university data); hard to audit *why* a specific API was called.

### Option B: Deterministic State Machine (e.g., Traditional Chatbot)
All paths are hardcoded. User selects "Registration Issue" → system checks DB → outputs static response.
- *Pros:* 100% deterministic, zero hallucination risk, extremely cheap.
- *Cons:* Brittle. Cannot handle edge cases or compound questions ("I have a hold AND my scholarship hasn't posted"). Violates the `PRD-F1` requirement for natural language agentic experience.

### Option C: Hybrid Orchestration (Microsoft Copilot Studio + Azure OpenAI)
Copilot Studio handles intent recognition and high-level deterministic routing (the "Topics"). Azure OpenAI handles data synthesis and natural language generation within those boundaries.
- *Pros:* High guardrails (Topics are deterministic and auditable); natural conversation flow; Azure OpenAI excels at synthesizing multiple JSON payloads into plain text; natively integrates with existing Microsoft ecosystems common in higher education.
- *Cons:* Vendor lock-in to Microsoft Azure.

## 3. Decision

**Selected: Option C (Hybrid Orchestration)**

We will use Microsoft Copilot Studio as the primary state engine. 

**How it works:**
1. User asks a question.
2. Copilot Studio's intent engine matches it to a defined Topic (e.g., `Topic_HoldResolution`).
3. The Topic executes a deterministic sequence: `Action: Call Node.js Gateway -> /api/v1/student/{id}/holds`.
4. If multiple holds are found across departments, the Gateway aggregates the raw JSON.
5. Copilot Studio passes the aggregated JSON to an Azure OpenAI Prompt Node: *"Analyze this JSON hold data and explain to the student, in Filipino, what they need to do to clear their account."*
6. Azure OpenAI streams the synthesized response back to the user.

## 4. Contracts & Interfaces

The Node.js API Gateway must expose a universal `/graphql` or aggregated REST endpoint so Copilot Studio doesn't need to orchestrate multiple atomic HTTP calls.

**Contract `GET /api/v1/student/{id}/status-aggregate`**
Returns:
```json
{
  "academic": { "holds": [], "sap_status": "Eligible" },
  "financial": { "balance": 1500.00, "holds": [{"id": "H-12", "dept": "Bursar"}] },
  "aid": { "pending_disbursements": 2000.00 }
}
```

## 5. Security & Rollback

- **Safety Check:** Copilot Studio variables will strip any execution instructions before passing them to Azure OpenAI, preventing prompt injection where a student attempts to command the backend via the chat interface.
- **Rollback:** If OpenAI latency exceeds 8 seconds, Copilot Studio will gracefully degrade to a static "escalating to human agent" fallback.
