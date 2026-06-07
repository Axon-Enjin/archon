# Project Build Guide (BUILD)

**Project:** Archon — Agentic AI-Powered Service Desk
**Date:** 2026-06-07
**Version:** 0.2
**Owner:** Regalia Council (Alaric)
**Status:** Draft
**Last reconciled:** N/A — not yet reconciled with code
**PRD:** [prd-archon.md](prd-archon.md)
**SDD:** [sdd-archon.md](sdd-archon.md)
**SAD:** [sad-archon.md](sad-archon.md)

---

> **Agent Instructions**
>
> **What this is:** the operating manual for whoever **builds** the product — human or agent. It dictates read order, stack versions, deprecations, and golden-path patterns.
>
> **Output:** This file `docs/build-archon.md` is canonical. It will be materialized to the project root as `AGENTS.md` before coding begins.

---

## 1. How to Build From These Docs

The documentation suite is the source of truth. Read in this order before writing code:

1. **`docs/index.md`** — Start here every session.
2. **PRD** — What to build and why (`PRD-F1` to `PRD-F11`).
3. **SDD** — How the system is architected (Azure AI Foundry + Cosmos DB + Next.js Monolith + Microsoft Graph).
4. **RFCs** — Implementation decisions for Orchestration (RFC-001), Handoff (RFC-002), Adapters (RFC-003), and M365 Integration (RFC-004).
5. **DSD** — Visual tokens and UI components (Warm & Approachable).
6. **This guide** — Stack conventions, patterns, guardrails.

**Traceability map:**

| To implement… | Read | Then verify against |
|---------------|------|---------------------|
| An AI Orchestration Feature | PRD §3 → SDD §9 → RFC-001 | QAD Prompt Evaluations |
| A University Data Adapter | PRD-F2 → SDD §4 → RFC-003 | QAD Sad Paths (Timeouts) |
| A UI Chat Component | DSD §3.2 → PRD §5 | DSD a11y requirements |
| An M365 Integration Feature | PRD-F11 → SDD §6 → RFC-004 | CLR §1 (Graph data flows), QAD §2 (US-08) |
| A Cosmos DB Schema Change | SDD §3 | CLR §1 (data inventory), QAD §3 (sad paths) |

---

## 2. Stack Currency & Deprecations

> **Do not rely on training memory for fast-moving frameworks.** Verify conventions against official docs for the pinned versions below before writing code.

### Pinned Stack

| Layer | Technology | Pinned version | Convention verified |
|-------|------------|----------------|---------------------|
| Client Framework | Next.js (React) | 14.x | 2026-06-07 |
| Client Auth | NextAuth.js (Auth.js) | 4.x | 2026-06-07 |
| Styling Framework | Tailwind CSS | 4.x | 2026-06-07 |
| Backend Language | TypeScript | 5.4.x | 2026-06-07 |
| Backend Framework | Next.js API Routes (Server Actions) | 14.x | 2026-06-07 |
| Backend Auth | `jsonwebtoken` (or similar JWT validator) | 9.x | 2026-06-07 |
| Database | Azure Cosmos DB for NoSQL SDK | `@azure/cosmos` 4.x | 2026-06-07 |
| AI Platform | Azure AI Foundry SDK | `@azure/ai-projects` 1.x | 2026-06-07 |
| AI Model | GPT-4o (via AI Foundry deployment) | `2024-11-20` API version | 2026-06-07 |
| AI Model (Lightweight) | Phi-4 (via AI Foundry deployment) | Latest | 2026-06-07 |
| Microsoft Graph | `@microsoft/microsoft-graph-client` | 3.x | 2026-06-07 |
| Notification Scheduler | Power Automate | Cloud Flow | 2026-06-07 |
| Input Validation | Zod | 3.x | 2026-06-07 |

### Deprecations & Convention Changes

| ❌ Stale / deprecated | ✅ Current convention | Since |
|----------------------|----------------------|-------|
| Microsoft Copilot Studio | **Removed.** Use Azure AI Foundry Agent Service for all orchestration. | CR-001 (v0.2) |
| Azure OpenAI SDK (`openai` npm package direct) | Use `@azure/ai-projects` (AI Foundry SDK) for all model calls. | CR-001 (v0.2) |
| PostgreSQL + Prisma | **Removed.** Use `@azure/cosmos` SDK for all data operations. | CR-001 (v0.2) |
| Redis as primary cache | Redis retained for WebSocket session state and JWT blocklist only. Cosmos DB TTL used for all other caching. | CR-001 (v0.2) |
| Generic SAML / OAuth SSO | Use Microsoft Entra ID via NextAuth. No custom auth flows. | CR-001 (v0.2) |
| Copilot Studio solution exports (`/copilot-studio/` folder) | **Removed.** No Copilot Studio artifacts in the repo. | CR-001 (v0.2) |
| Raw SQL for simple queries | **Not applicable.** Cosmos DB uses SDK point reads and queries. Use `container.item(id).read()` for point reads; `container.items.query()` for queries. | Project start |

---

## 3. Repo Layout

```
/client          — Next.js web application.
/src/app/api     — Next.js API Routes, Cosmos DB data layer, University Adapters, Graph API proxy.
/scheduler       — Power Automate Cloud Flow definitions (JSON/ZIP exports).
/docs            — FMD documentation suite.
/infra           — Terraform infrastructure-as-code (Azure resources).
```

> Note: `/copilot-studio/` directory has been removed. There is no Copilot Studio in this project.

---

## 4. Golden-Path Patterns

### 4.1 University Data Adapter Pattern (TypeScript)

*Verified 2026-06-07 against Node.js v20*

> **V1 / Initial Phase Note:** Because we lack actual API/database access to university systems for the initial build, all adapters must be implemented as **Mock/Dummy Data Adapters** returning hardcoded/static JSON that fulfills the `IUniversityAdapter` contract.

```typescript
import { IUniversityAdapter, ArchonHold } from '../interfaces';
import axios from 'axios';

export class ExampleUniversityAdapter implements IUniversityAdapter {
  constructor(private readonly apiKey: string) {} // Retrieved from Environment Variables at runtime

  async getAcademicHolds(studentId: string): Promise<ArchonHold[]> {
    try {
      const response = await axios.get(
        `https://api.example-univ.edu/v1/students/${studentId}/holds`,
        { headers: { 'X-API-Key': this.apiKey }, timeout: 5000 } // 5s timeout per RFC-003
      );
      return response.data.map(hold => ({
        id: hold.HoldID,
        department: 'Registrar',
        reason: hold.Description,
        canAutoLift: false,
      }));
    } catch (error) {
      throw new Error('ARCHON_SYSTEM_UNAVAILABLE'); // Caught by Next.js Backend for graceful AI fallback
    }
  }
}
```

*Why this shape:* Enforces the contract defined in RFC-003. Strict timeouts prevent the LLM from hanging. Errors are caught and standardized so the AI Foundry Agent knows how to react gracefully.

### 4.2 Cosmos DB Point Read Pattern (TypeScript)

*Verified 2026-06-07 against @azure/cosmos 4.x*

```typescript
import { CosmosClient } from '@azure/cosmos';

const client = new CosmosClient({ endpoint: process.env.COSMOS_ENDPOINT!, key: process.env.COSMOS_KEY! });
const container = client.database('archon').container('conversations');

// Point read (cheapest operation — use whenever you have id + partition key)
const { resource: conversation } = await container
  .item(ticketId, institutionId) // (id, partitionKey)
  .read();

// Query (use when filtering by non-id fields)
const querySpec = {
  query: 'SELECT * FROM c WHERE c.student_id = @studentId AND c.status = "open"',
  parameters: [{ name: '@studentId', value: studentId }],
};
const { resources: tickets } = await container.items.query(querySpec).fetchAll();
```

### 4.3 AI Foundry Agent Tool Call Pattern (TypeScript)

*Verified 2026-06-07 against @azure/ai-projects 1.x*

```typescript
import { AIProjectsClient } from '@azure/ai-projects';
import { DefaultAzureCredential } from '@azure/identity';

const client = AIProjectsClient.fromConnectionString(
  process.env.AZURE_AI_FOUNDRY_CONNECTION_STRING!,
  new DefaultAzureCredential()
);

// Create or resume a thread
const thread = await client.agents.createThread();

// Send a message and run the agent
await client.agents.createMessage(thread.id, { role: 'user', content: studentMessage });
const run = await client.agents.createRun(thread.id, process.env.ARCHON_AGENT_ID!);

// Poll until complete (SDK handles tool call execution callbacks via registered tools)
const completedRun = await client.agents.getRun(thread.id, run.id);
```

### 4.4 Microsoft Graph API Call Pattern (TypeScript)

*Verified 2026-06-07 against @microsoft/microsoft-graph-client 3.x*

```typescript
import { Client } from '@microsoft/microsoft-graph-client';
import { TokenCredentialAuthenticationProvider } from '@microsoft/microsoft-graph-client/authProviders/azureTokenCredentials';

// Delegated auth (user context — use for Calendar reads, Mail.Send)
const authProvider = new TokenCredentialAuthenticationProvider(credential, {
  scopes: ['https://graph.microsoft.com/.default'],
});
const graphClient = Client.initWithMiddleware({ authProvider });

// Get calendar events (7-day window)
const now = new Date().toISOString();
const end = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
const events = await graphClient
  .api(`/me/calendarView?startDateTime=${now}&endDateTime=${end}`)
  .select('id,subject,start,end,isAllDay')
  .get();

// Send a Teams notification
await graphClient.api(`/users/${agentUserId}/teamwork/sendActivityNotification`)
  .post(teamsAdaptiveCardPayload);
```

---

## 5. Conventions & Guardrails

**Always:**
- Validate all external input at the API Route boundary using `Zod` before passing to AI Foundry or adapters.
- Scrub PII (names, specific IDs) from chat transcripts before writing to Cosmos DB `messages` collection.
- Require explicit boolean confirmation (Human-in-the-Loop) before executing any write operations (hold lifts, Graph API `Mail.Send`, Teams notifications on behalf of users).
- Retrieve all secrets from Vercel Environment Variables. Do not hardcode them.
- Validate Entra ID JWT `iss`, `aud`, and `tid` claims on every backend request.

**Never:**
- Commit API keys, connection strings, or client secrets. Use `.env.local` files locally and Vercel Environment Variables in production.
- Modify the AI system prompt dynamically based on user input (Prompt Injection risk).
- Call Microsoft Graph API directly from the Next.js client components — all Graph calls are proxied through the Next.js API Routes for RBAC enforcement and audit logging.
- Store raw Graph API calendar responses permanently in Cosmos DB — only the normalized `CalendarEvent[]` schema with a 15-minute TTL.
- Reference Microsoft Copilot Studio in any code, configuration, or comment. It is not part of this stack.

**Definition of Done (per task):**
- [ ] Implements the referenced `PRD-F#`.
- [ ] Verified framework conventions against §2 (no stale APIs — especially no Copilot Studio or PostgreSQL references).
- [ ] Unit tests pass via `SAD-A3` (Test Runner).
- [ ] No new secrets committed; input validated at boundaries with Zod.
- [ ] Cosmos DB queries use parameterized inputs (no string interpolation in query bodies).
- [ ] Graph API calls are proxied through API Routes (never called directly from client components).
- [ ] Compliance Checker (`SAD-A4`) approves the PR.

---

## 6. Materialization

| Target | File | Notes |
|--------|------|-------|
| Canonical | `docs/build-archon.md` | Edit here |
| All agents | `AGENTS.md` (project root) | Full content; auto-read by IDE agents |
