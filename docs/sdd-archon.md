# System Design Document (SDD)

**Project:** Archon — Agentic AI-Powered Service Desk for Higher Education
**Date:** 2026-06-07
**Version:** 0.2
**Owner:** Regalia Council (Alaric)
**Status:** Draft
**Last reconciled:** 2026-06-08 — reconciled NextAuth session RBAC and Cosmos DB integration
**PRD:** [prd-archon.md](prd-archon.md)
**DSD:** [dsd-archon.md](dsd-archon.md)

---

## 1. Architecture Overview

Archon uses a **native Azure AI architecture**. It leverages **Azure AI Foundry** as the unified platform for model deployment, agent orchestration, RAG pipelines, evaluation, and distributed tracing. Data is stored in **Azure Cosmos DB for NoSQL** — a globally distributed, serverless document database with native vector search. A unified **Next.js Application** handles the frontend UI, authentication (via NextAuth and Microsoft Entra ID), and backend API routes that act as universal adapters to siloed university systems. Microsoft 365 integration (Calendar, Teams, Outlook) is powered by the **Microsoft Graph API**.

This architecture satisfies `PRD-F2` (cross-department data orchestration), `PRD-F11` (M365 integration), and maintains enterprise-grade security and state management entirely within the Azure ecosystem.

---

## 2. High-Level Architecture (C4 Context/Container)

```mermaid
flowchart TD
    %% Users
    Student["Student (Web/Mobile)"]
    Agent["Tier 1 Support Agent"]
    Admin["University Admin"]

    %% Microsoft 365 / Entra ID
    subgraph Microsoft 365 Tenant
        EntraID["Microsoft Entra ID\n(Identity & Auth — OIDC)"]
        Graph["Microsoft Graph API\n(Calendar · Teams · Outlook)"]
    end

        subgraph Next.js Monolith
            Client["Next.js Web Client (React UI)"]
            Dashboard["React Agent/Admin Dashboard"]
            NextAPI["Next.js API Routes\n+ JWT Token Validation\n+ University Adapters\n+ Graph API Proxy"]
        end

        subgraph AI Layer — Azure AI Foundry
            FoundryAgent["AI Foundry Agent Service\n(Orchestration + Tool Calling)"]
            GPT4o["GPT-4o\n(Complex Reasoning + RAG)"]
            Phi4["Phi-4\n(Intent Routing / FAQ)"]
            FoundryTrace["AI Foundry Tracing\n& Evaluation"]
        end

        subgraph Data Layer — Azure Cosmos DB
            CosmosNoSQL[("Cosmos DB for NoSQL\n(Tickets · Conversations · Handoffs · Users)")]
            CosmosVector[("Cosmos DB Vector Search\n(Policy Embeddings for RAG)")]
        end

        Redis[("Azure Cache for Redis\n(WebSocket Session State)")]
    end

    %% External University Systems
    subgraph University Systems
        SIS["Student Information System (Registrar)"]
        Bursar["Bursar / Payment System"]
        FA["Financial Aid System"]
    end

    %% Connections
    Student --> Client
    Agent --> Dashboard
    Admin --> Dashboard

    Client -->|OIDC auth| EntraID
    Dashboard -->|OIDC auth| EntraID
    EntraID -->|JWT token| NextAPI
    Client -->|Internal API| NextAPI
    Dashboard -->|HTTPS| NextAPI

    NextAPI --> FoundryAgent
    NextAPI --> CosmosNoSQL
    NextAPI --> Redis
    NextAPI --> KeyVault
    NextAPI -->|Graph API calls| Graph

    FoundryAgent <--> GPT4o
    FoundryAgent <--> Phi4
    FoundryAgent --> CosmosVector
    FoundryAgent --> FoundryTrace
    FoundryAgent -->|Tool: CheckHolds| NextAPI
    FoundryAgent -->|Tool: CheckFinancialAid| NextAPI
    FoundryAgent -->|Tool: EscalateToHuman| NextAPI
    FoundryAgent -->|Tool: GetCalendarEvents| NextAPI
    FoundryAgent -->|Tool: SendTeamsNotification| NextAPI
    FoundryAgent -->|Tool: SendOutlookEmail| NextAPI

    NextAPI --> SIS
    NextAPI --> Bursar
    NextAPI --> FA

    Graph -->|Calendar events| NextAPI
    Graph -->|Teams adaptive cards| Student
    Graph -->|Outlook emails| Student
```

---

## 3. Data Architecture & Schema

Archon is *not* the system of record for student data. It is a real-time orchestration engine. It caches data for the duration of a session and stores anonymized transcripts for analytics and AI training.

**Primary Database: Azure Cosmos DB for NoSQL**

All collections are partitioned by `/{institution_id}` to support future multi-tenant deployments.

| Collection | Partition Key | Key Fields | TTL | Notes |
|---|---|---|---|---|
| `users` | `/institution_id` | `entra_oid`, `role`, `preferences` | None | Proxy of Entra ID identity. No passwords stored. Synced from Entra ID claims on session start. |
| `conversations` | `/institution_id` | `ticket_id`, `student_id`, `status`, `assignee_id`, `created_at` | None | Ticket/chat metadata. |
| `messages` | `/institution_id` | `conversation_id`, `role`, `content_scrubbed`, `ts` | 90 days | PII scrubbed before insert. Raw content never persisted. |
| `handoffs` | `/institution_id` | `ticket_id`, `handoff_packet`, `agent_id`, `resolved_at` | 90 days | Structured AI-generated context packets for human agents. |
| `policy_embeddings` | `/institution_id` | `document_id`, `chunk_text`, `embedding` (vector) | None | University policy documents chunked and embedded for RAG. Uses Cosmos DB integrated vector search. |
| `cache_university_data` | `/institution_id` | `cache_key`, `data`, `fetched_at` | 300s (5 min TTL) | Short-lived cache of university API responses (balances, holds). Replaces Redis for non-session caching. |

**Secondary Cache: Azure Cache for Redis**
- WebSocket session state and streaming context (chat response in-flight).
- JWT blocklist for invalidated tokens.
- Rate limiting counters (Graph API call throttle protection).

> **Note:** Cosmos DB's per-document TTL replaces the need for Redis as a general-purpose cache. Redis is retained only for real-time WebSocket session coordination.

---

## 4. API & Interface Contracts

**Internal API (Next.js Client ↔ Next.js API Routes):**
- RESTful JSON over HTTPS for standard CRUD operations (Dashboard, Ticket History).
- WebSockets/Server-Sent Events (SSE) for real-time chat streaming between the Next.js client and the AI Foundry Agent.

**External API (Next.js Backend ↔ University Systems) — The "Adapter Pattern":**
The Next.js backend implements an abstract `UniversityAdapter` interface. This allows Archon to connect to disparate systems (Banner, Workday, legacy Oracle DBs) without changing the core AI logic. **For the V1/Initial Build, we will use Mock/Dummy Data Adapters** that return static JSON to simulate these systems since live API access is unavailable.

- `getStudentProfile(studentId)` → Unified JSON (Name, Major, SAP Status)
- `getHolds(studentId)` → Array of hold objects (Department, Reason, Resolution steps)
- `getFinancialStatus(studentId)` → Object (Balance due, Pending aid, Next deadline)
- `requestHoldLift(studentId, holdId, reason)` → Executes write action (requires prior HITL confirmation).

**Microsoft Graph API (Next.js Backend ↔ Microsoft 365) — PRD-F11:**
- Used for fetching the student's M365 Calendar (`Calendars.Read`).
All Graph API calls are proxied through the Next.js API Routes to enforce RBAC and audit logging. The AI Foundry Agent calls Graph via Next.js backend tools — never directly.

| Graph endpoint | Scope | Purpose |
|---|---|---|
| `GET /me/calendarView?startDateTime=&endDateTime=` | `Calendars.Read` | Fetch student's M365 calendar events for dashboard panel |
| `POST /me/sendMail` | `Mail.Send` | Send Outlook deadline reminders and ticket resolution confirmations |
| `POST /users/{id}/teamwork/sendActivityNotification` | `TeamsActivity.Send` | Send Teams activity feed notifications for deadlines and escalations |

**AI Foundry Agent Tools (internal contract):**

```typescript
// Tools registered with the AI Foundry Agent
const tools = [
  { name: "CheckStudentHolds",      endpoint: "GET /api/v1/student/{id}/holds" },
  { name: "CheckFinancialAidStatus", endpoint: "GET /api/v1/student/{id}/financial" },
  { name: "GetCalendarEvents",       endpoint: "GET /api/v1/student/{id}/calendar" },
  { name: "EscalateToHuman",         endpoint: "POST /api/v1/tickets/{id}/escalate" },
  { name: "SendTeamsNotification",   endpoint: "POST /api/v1/notify/teams" },
  { name: "SendOutlookEmail",        endpoint: "POST /api/v1/notify/email" },
];
```

---

## 5. Security & Authentication

- **Authentication:** Archon relies entirely on **Microsoft Entra ID** (the university's M365 tenant) via OIDC/OAuth 2.0. NextAuth.js (Auth.js) is used on the Next.js client to securely manage the session. JWT validation is performed on the Next.js API routes. Archon stores no passwords.
- **Authorization:** Role-Based Access Control (RBAC) enforced at both the UI routing and API layers using Entra ID JWT claims.
  - `Student`: Accesses `/student/*` routes. Can only read/write data associated with their specific `entra_oid` / `student_id`.
  - `Agent`: Accesses `/agent` (ticket triage). Can read/write data for tickets in their assigned queue.
  - `Admin`: Accesses `/admin/*` routes. Can view aggregated analytics (no PII), trigger notifications, and manage the system outbox queue.
- **UI Routing & Navigation Guards:**
  - `/admin`: Automatically redirects to `/admin/analytics`.
  - `/admin/analytics`: Displays system telemetry metrics and charts for Admins.
  - `/admin/queue`: Active support queue triage console for Admins.
  - `/admin/notifications`: Outbox queue scheduler and diagnostics console for Admins.
  - `/agent`: Real-time queue management for Agents. Admin attempts to access `/agent` are automatically routed to `/admin/queue` to prevent role-based workspace confusion. Unauthenticated sessions are redirected to `/auth/signin`.
- **Graph API Authorization:** Delegated permissions only (acting on behalf of the authenticated user). No application-level Graph permissions that could bypass per-user consent. Admin consent is required at the tenant level for `Calendars.Read`, `Mail.Send`, and `TeamsActivity.Send`.
- **Data in Transit:** TLS 1.3 mandated for all connections (HTTPS + WSS).
- **Data at Rest:** Azure Cosmos DB encryption at rest (AES-256, Microsoft-managed keys).
- **Secrets Management:** All API keys, adapter credentials, and Graph API secrets are stored as Vercel Environment Variables (`.env.local` locally). The Next.js backend accesses them via `process.env`.
- **PII Redaction:** The Next.js API Routes scrub PII (names, specific IDs) using regex/NLP *before* sending conversation transcripts to Azure AI Foundry for reasoning, unless the specific AI operation explicitly requires that data.

---

## 6. Microsoft 365 Integration Architecture (PRD-F11)

### 6.1 Entra ID App Registration

Archon is registered as an application in the partner university's Entra ID tenant (or as a multi-tenant app with per-institution consent).

| Setting | Value |
|---|---|
| App type | Multi-tenant (registered in Archon's Azure tenant; university grants consent) |
| Auth flow | Authorization Code Flow with PKCE (mobile/web) |
| Redirect URIs | `https://app.archon.edu.ph/auth/callback`, `https://localhost:3000/auth/callback` (dev) |
| Token validation | Next.js NextAuth validates Entra ID JWT `iss`, `aud`, `tid` claims |

### 6.2 Required Graph API Scopes (Admin Consent Required)

| Scope | Type | Purpose | UI Disclosure |
|---|---|---|---|
| `User.Read` | Delegated | Read authenticated user's profile (name, email, student ID) | Shown at login |
| `Calendars.Read` | Delegated | Read student's M365 calendar events for dashboard panel | Shown at Calendar consent prompt |
| `Mail.Send` | Delegated | Send Outlook emails for deadline reminders and ticket confirmations | Shown at notification settings |
| `TeamsActivity.Send` | Delegated | Send Teams activity feed notifications | Shown at notification settings |

### 6.3 M365 Calendar Panel — Data Flow

```
Student opens Home Dashboard
  → Client sends GET /api/v1/student/{id}/calendar to Next.js API Route
  → Next.js API Route validates Entra ID session
  → Next.js API Route calls Graph GET /me/calendarView (7-day window)
  → Next.js API Route normalizes events → CalendarEvent[] schema
  → Client renders Academic Calendar panel
  → Events cached in Cosmos DB (TTL: 15 min) to reduce Graph API calls
```

### 6.4 Teams & Outlook Notification — Data Flow

```
Archon Notification Scheduler (daily recurrence via Power Automate)
  → Queries Cosmos DB for students with deadlines ≤14 days
  → For each student:
      → Checks if notification already sent (idempotency key in Cosmos DB)
      → Native Power Automate Connector: Posts Teams Adaptive Card
      → Native Power Automate Connector: Sends Outlook Email
      → Writes notification record to Cosmos DB (TTL: 30 days)
  → Logs m365_notification_sent event to Application Insights
```

---

## 7. Infrastructure & Deployment

| Component | Azure Service | Notes |
|---|---|---|
| Next.js Application (Full-Stack) | Vercel (Serverless Functions + Edge) | SSR rendering, API Routes, NextAuth endpoint hosting |
| Notification Scheduler | Power Automate (Scheduled Cloud Flow) | Cron trigger for daily deadline scans & M365 notifications |
| AI Platform | Azure AI Foundry | GPT-4o + Phi-4 deployments; AI Foundry Tracing |
| Database | Azure Cosmos DB for NoSQL (Serverless) | Scales to zero; native vector search |
| Session Cache | Azure Cache for Redis (C1 Standard) | WebSocket state; JWT blocklist |
| Secrets | Vercel Environment Variables | Environment variables mapped to `process.env` |
| Identity | Microsoft Entra ID | University M365 tenant; Archon app registration |
| M365 Integration | Microsoft Graph API | Calendar, Teams, Outlook |
| CI/CD | GitHub Actions | Tagged releases; Terraform for IaC |
| Monitoring | Azure Monitor + Application Insights + AI Foundry Tracing | Single observability pane |
| Region | Southeast Asia (Singapore) | Data residency preference for Philippine DPA compliance |

---

## 8. Non-Functional Requirements (NFRs)

| NFR | Metric / Target | Verification |
|-----|----------------|--------------|
| **Latency (Chat)** | Time-to-first-token < 3s (3G network). Full resolution < 15s. | Load testing (k6) simulating 3G latency. |
| **Availability** | 99.9% uptime (approx 43m downtime/month). | Azure Monitor synthetic transactions. |
| **Scalability** | Support 500 concurrent chat sessions during peak enrollment weeks. | Load testing (k6). Auto-scaling natively via Vercel Serverless Functions. |
| **Data Freshness** | University API data cached for max 5 minutes (Cosmos DB TTL). Real-time fetch for transaction checks. | Next.js server logging. |
| **Graph API Resilience** | Teams/Outlook notifications retried 3× with exponential backoff on throttling. Calendar falls back gracefully if Graph unavailable. | Integration tests + Application Insights alerts. |
| **Cost (AI)** | Monthly AI compute ≤ $150 for a 12,000-student university. | Azure Cost Management budget alerts. |

---

## 9. AI & Agent Architecture (Azure AI Foundry)

The AI subsystem handles `PRD-F1` (Chat), `PRD-F2` (Orchestration), `PRD-F4` (Handoff), and `PRD-F11` (M365 integration tools).

**AI Foundry Agent Service (The Orchestrator + Reasoner):**
- Manages conversation state, tool selection, and multi-step execution.
- Registered tools call the Next.js API Routes (which in turn call university adapters or Microsoft Graph).
- GPT-4o is the default model for complex reasoning, multi-department data synthesis, and handoff packet generation.
- Phi-4 handles lightweight tasks: intent pre-classification, FAQ matching, simple balance queries — reducing GPT-4o token spend.

**How a complex query flows:**
1. Student asks a question via chat.
2. Next.js backend receives the message, validates the Entra ID session, retrieves the conversation history from Cosmos DB.
3. Next.js backend invokes the AI Foundry Agent with the message + conversation history + RAG context (from Cosmos DB vector search on policy documents).
4. The Agent reasons and determines it needs to call `CheckFinancialAid`.
5. Next.js backend executes the tool call against the university adapters, returns structured JSON.
6. AI Foundry Agent synthesizes the multi-department data into a Filipino/English response.
7. Response streams back to the client via SSE.
8. If context indicates an upcoming deadline, Agent may also call `GetCalendarEvents` to cross-reference, then `SendTeamsNotification` or `SendOutlookEmail` for proactive follow-up.
9. All tool calls, responses, and latencies are traced in AI Foundry Tracing → forwarded to Application Insights.

### 9.1 AI Safety & Guardrails (OWASP LLM Controls)

1. **LLM01: Prompt Injection:** Next.js backend validates and sanitizes user input (length, character set, structural injection patterns) before passing to the Agent. System prompt is static and version-controlled — never modified by user input.
2. **LLM02: Insecure Output Handling:** AI outputs are treated as untrusted markdown. The Next.js client sanitizes all HTML/Markdown before rendering to prevent XSS.
3. **LLM06: Sensitive Information Disclosure:** System prompt explicitly forbids discussing other students' data. RBAC at the API route layer ensures the Agent *cannot* call a tool with a `student_id` different from the authenticated user's ID.
4. **Scope Containment:** The Agent is given read-only tool access by default. Write actions (e.g., lifting a hold, sending a Teams message) require either explicit student confirmation in chat or staff approval in the Agent Dashboard before the Next.js backend executes the Graph API or adapter write call.
5. **Graph API Least Privilege:** Only delegated (user-context) permissions are used. The backend never holds application-level Graph permissions that could act across all students.

---

## Self-Check

- [x] Specifies the exact stack (Node.js, Next.js, Cosmos DB, Redis, React, Azure AI Foundry, Microsoft Graph).
- [x] System diagram maps how all components communicate, including M365 integration.
- [x] Explains how `PRD-F2` (Data Orchestration) works without storing the university's data long-term.
- [x] Explains how `PRD-F11` (M365 Integration) works — Entra ID auth, Graph Calendar, Teams, Outlook.
- [x] Includes NFRs that can be tested (500 concurrent users, 3s TTFT, Graph API resilience).
- [x] Defines specific AI guardrails, notably the separation of read (AI) and write (Human + Backend confirmed) actions.
- [x] Cosmos DB partition strategy documented.
- [x] Microsoft Copilot Studio: not present — replaced by Azure AI Foundry Agent Service.
- [x] PostgreSQL: not present — replaced by Azure Cosmos DB for NoSQL.
