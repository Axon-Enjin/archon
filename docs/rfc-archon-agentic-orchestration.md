# Request for Comments (RFC): Agentic Workflow Orchestration

**RFC ID:** `archon-rfc-001`
**Project:** Archon — Agentic AI-Powered Service Desk
**Date:** 2026-06-07
**Version:** 0.2
**Author:** Regalia Council (Alaric)
**Status:** Accepted
**Feature:** `PRD-F2`, `PRD-F3` (Cross-Department Orchestration & Autonomous Resolution)

---

## 1. Problem Statement

Archon must autonomously execute multi-step workflows that span disconnected university systems. For example, resolving a "Why can't I register?" query may require checking the Registrar API (for academic holds), the Bursar API (for financial holds), and the Financial Aid API (to see if pending aid covers the balance). The AI must decide *which* systems to query, *in what order*, and how to synthesize the results without hallucinating capabilities or getting stuck in infinite loops. Additionally, the orchestration engine must integrate with Microsoft Graph API tools (Calendar, Teams, Outlook) for proactive M365 notifications (`PRD-F11`).

## 2. Options Considered

### Option A: Fully Autonomous LLM Routing (e.g., LangGraph / AutoGen)
The LLM is given access to all available API tools and told to "figure it out" dynamically via reasoning loops.
- *Pros:* Highly flexible; requires less hardcoded configuration per institution.
- *Cons:* Prone to "tool loop" hallucinations; unpredictable token costs; highly non-deterministic (a compliance risk for university data); hard to audit *why* a specific API was called.

### Option B: Deterministic State Machine (e.g., Traditional Chatbot)
All paths are hardcoded. User selects "Registration Issue" → system checks DB → outputs static response.
- *Pros:* 100% deterministic, zero hallucination risk, extremely cheap.
- *Cons:* Brittle. Cannot handle edge cases or compound questions ("I have a hold AND my scholarship hasn't posted"). Violates the `PRD-F1` requirement for natural language agentic experience.

### Option C: Azure AI Foundry Agent Service (Code-First Hybrid Orchestration)
The Azure AI Foundry Agent Service manages conversation state, tool registration, and execution loops. GPT-4o handles reasoning and synthesis within those boundaries. Phi-4 handles lightweight intent pre-classification.
- *Pros:* High guardrails (tool schemas are static and auditable); natural conversation flow; GPT-4o excels at synthesizing multiple JSON payloads into plain Filipino/English; natively integrates with Azure ecosystem (Cosmos DB, Key Vault, Application Insights, Microsoft Graph); full code control — no low-code vendor lock-in; AI Foundry Tracing provides per-tool-call audit logs.
- *Cons:* Requires more upfront engineering than a no-code platform. Tool schemas must be maintained as university adapters evolve.

## 3. Decision

**Selected: Option C (Azure AI Foundry Agent Service)**

We will use the Azure AI Foundry Agent Service as the primary orchestration engine. This replaces the earlier Copilot Studio-based design (v0.1) with a code-first approach that provides equivalent guardrails, full observability, and native Azure integration — without the constraints of a low-code platform.

**How it works:**
1. Student sends a message via the Flutter PWA.
2. The Node.js Gateway validates the Entra ID JWT, retrieves conversation history from Cosmos DB.
3. Gateway invokes the AI Foundry Agent with: the student message + conversation history + RAG context (vector search over university policy documents in Cosmos DB).
4. The AI Foundry Agent (GPT-4o) reasons about the query and selects tools from its registered tool set.
5. For a hold inquiry, it calls `CheckStudentHolds` → Gateway → Registrar Adapter, and `CheckFinancialAidStatus` → Gateway → FA Adapter.
6. Gateway returns the aggregated JSON to the Agent.
7. Agent synthesizes the multi-department data into a clear Filipino/English response.
8. Response streams back via SSE. The entire tool-call chain is traced in AI Foundry Tracing.

**Phi-4 as cost optimization:**
Simple intents ("What is my balance?", "When does enrollment open?") are pre-classified by Phi-4 before invoking GPT-4o. If Phi-4 can answer from the knowledge base directly, GPT-4o is not invoked. Estimated 40–60% token cost reduction on FAQ-class queries.

## 4. Contracts & Interfaces

The Node.js API Gateway must expose a universal status aggregate endpoint that the AI Agent tools call:

**Contract `GET /api/v1/student/{id}/status-aggregate`**
Returns:
```json
{
  "academic": { "holds": [], "sap_status": "Eligible" },
  "financial": { "balance": 1500.00, "holds": [{"id": "H-12", "dept": "Bursar"}] },
  "aid": { "pending_disbursements": 2000.00 }
}
```

**Tool schema (registered with AI Foundry Agent):**
```typescript
{
  name: "CheckStudentHolds",
  description: "Fetch all active academic and financial holds for the authenticated student.",
  parameters: {
    type: "object",
    properties: {
      student_id: { type: "string", description: "The authenticated student's internal ID." }
    },
    required: ["student_id"]
  }
}
```

All tool parameters that accept student identifiers are validated server-side against the authenticated Entra ID JWT — the Agent cannot call a tool for a different student.

## 5. Observability

AI Foundry Tracing captures every tool call made by the Agent:
- Which tool was called
- Input parameters
- Response payload
- Latency (ms)
- Token count (input + output)

Traces are forwarded to Azure Application Insights and surfaced in the OPS runbook's single observability pane.

## 6. Security & Rollback

- **Safety Check:** Tool schemas explicitly define allowed parameter types. The Gateway validates all tool call parameters against the authenticated user's claims — preventing a student from calling a tool on behalf of another student even if the Agent were manipulated via prompt injection.
- **Rollback:** If AI Foundry Agent latency exceeds 8 seconds, the Gateway falls back to direct Cosmos DB vector search FAQ mode and returns the top 3 policy articles. If AI Foundry is entirely unavailable, the Gateway auto-escalates to the human agent queue with a context packet built from the cached conversation state.
