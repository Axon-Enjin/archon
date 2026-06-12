# Product Requirements Document (PRD)

**Project:** Archon — Agentic AI-Powered Service Desk for Higher Education
**Date:** 2026-06-07
**Version:** 0.2
**Owner:** Regalia Council
**Status:** Draft
**Last reconciled:** 2026-06-12 — verified all PRD-F# features against implementation; no structural changes
**BRD:** [brd-archon.md](brd-archon.md)

---

## 1. Product Purpose & Value Proposition

Archon is an autonomous AI service desk that resolves university student inquiries across departmental boundaries — without the student being bounced between offices, ghosted by advisors, or forced to micromanage their own support tickets. Powered by **Azure AI Foundry** (agent orchestration + GPT-4o reasoning) and integrated with the **Microsoft 365 ecosystem** via Microsoft Graph API, Archon accesses a student's enrollment, financial aid, registration, and billing data through a unified orchestration layer, executes multi-step resolutions autonomously for routine inquiries, surfaces the student's own M365 Calendar events on their dashboard, and delivers proactive deadline reminders through Microsoft Teams and Outlook — the tools they already use. It hands off complex cases to human agents with full context preserved. For universities, it transforms the helpdesk from a cost center at ~$104.68 per ticket into a proactive resolution engine at ~$22 per ticket. For students, it replaces anxiety and abandonment with instant, accurate, empathetic support — 24/7, in Filipino and English.

---

## 2. Target Personas

**Primary Persona — Mara (The Anxious Student)**
- *Who they are:* A 20-year-old BS Information Technology student at a state university in the Philippines. Working part-time. Relies on UniFAST/CHED scholarship for tuition. Accesses university services primarily via mobile phone. Her university runs Microsoft 365 — she uses Outlook for student email and Teams for class coordination.
- *Their core frustration:* Her financial aid disbursement was delayed without explanation. She received an auto-generated email threatening class de-enrollment. She called the financial aid office — no answer for 3 days. She visited the registrar in person; they redirected her to the bursar. The bursar said it's a financial aid issue. She's been bouncing between offices for a week, missing classes, and now panicking about losing her scholarship.[^15][^19]
- *What success looks like for them:* Opens Archon on her phone, describes the problem in Filipino, gets an instant diagnosis ("Your CHED scholarship disbursement is pending verification — expected clearance in 3 business days. Your enrollment hold has been temporarily lifted to prevent de-registration. Here's your reference number."), and returns to studying within 5 minutes. She also receives a Teams notification 14 days before her scholarship renewal deadline — she doesn't have to remember it herself.

**Secondary Persona — Jay (The Overwhelmed Agent)**
- *Who they are:* A 28-year-old Tier 1 support staff at the university's One-Stop Student Services office. Handles 60–80 tickets per day. Has access to 4 different backend systems (SIS, bursar portal, FA tracking, academic advising tool) — none of which talk to each other.
- *Their core frustration:* 70% of his tickets are routine (password resets, balance inquiries, enrollment verification) that consume all his cognitive bandwidth, leaving him unable to properly handle the 30% that require actual expertise and empathy.[^12]
- *What success looks like for them:* Archon autonomously deflects the routine 70%. For the complex 30%, Jay receives a pre-digested context packet in his Agent Dashboard (which runs in Microsoft Teams as a tab). He receives Teams notifications when high-priority escalations arrive.

**Tertiary Persona — Dr. Reyes (The Institutional Leader)**
- *Who they are:* Vice President for Student Affairs at a mid-sized Philippine university (12,000 students). Manages a support team of 15 with a flat budget.
- *Their core frustration:* Enrollment season generates 3× ticket volume. She can't hire more staff. Students are publicly complaining on social media about the university's support. The university president is asking why administrative costs keep climbing while student satisfaction drops.[^4]

---

## 3. Core Features & Priorities

Each feature gets a stable **ID** (`PRD-F1`, `PRD-F2`, …). These IDs are permanent — never renumber them. Downstream docs reference them directly: SDD components, RFCs, QAD test cases, CLR data flows, and SAD subagents all trace back to a `PRD-F#`.

| ID | Feature | Description | Priority |
|----|---------|-------------|----------|
| PRD-F1 | **Agentic Chat Interface** | Natural language conversational helpdesk accessible via responsive Next.js web application. Supports Filipino, English, and Cebuano. Text-based with rich media responses (status cards, document links, progress trackers). Powered by Azure AI Foundry. | Must-Have |
| PRD-F2 | **Cross-Department Data Orchestration** | AI agent accesses registrar (enrollment, academic records), bursar (balances, payments), financial aid (scholarships, disbursements), and academic advising (SAP status, degree audit) via a unified adapter layer. Single query can span multiple departments. Orchestrated by the Azure AI Foundry Agent Service. | Must-Have |
| PRD-F3 | **Autonomous Ticket Resolution** | Zero-touch resolution for Tier 1 inquiries: password resets, balance inquiries, enrollment verification, FAFSA/UniFAST deadline reminders, class schedule lookups, hold explanations. Target: ≥30% of all incoming tickets resolved without human intervention. | Must-Have |
| PRD-F4 | **Seamless Human Handoff** | Context-preserving escalation to human agents for complex cases. The AI generates a structured handoff packet: student profile summary, issue diagnosis, systems queried, actions taken, recommended resolution. Human agent receives full context — student never repeats their story. Includes Zero-Touch Wrap-Up (AI auto-logs ticket outcome post-resolution). | Must-Have |
| PRD-F5 | **Proactive Alert System** | Push notifications, Microsoft Teams adaptive cards, and Outlook email alerts for: approaching financial aid deadlines, new holds on account, balance changes, registration windows opening/closing, scholarship renewal deadlines. Delivered via Microsoft Graph API. Prevents crises before they happen. | Should-Have |
| PRD-F6 | **Multi-Language Support** | Full conversational support in Filipino (Tagalog), English, and Cebuano. Language auto-detected from user input. Culturally appropriate response patterns (e.g., respectful forms of address). | Should-Have |
| PRD-F7 | **Agent Dashboard** | Real-time queue management for human support staff. Shows: active tickets, AI-suggested responses, one-click resolution actions, student context cards, escalation history, and resolution timer. Designed for Jay's 60–80 tickets/day workload. | Should-Have |
| PRD-F8 | **Analytics & Cost Dashboard** | Administrative dashboard showing: cost-per-ticket trends, deflection rate, average handle time, student satisfaction (CSAT/NPS), ticket volume by department, peak hours, and AI confidence scores. Maps directly to BRD-M1 through BRD-M7 metrics. | Could-Have |
| PRD-F9 | **SAP Appeal Wizard** | Guided, step-by-step workflow for Satisfactory Academic Progress (SAP) appeal submission. Includes: eligibility checker, required document checklist, narrative template with prompts, document upload, and status tracker. Addresses sentiment 4 (Helplessness & Despair) from the research. | Could-Have |
| PRD-F10 | **Multi-Tenant Architecture** | Serve multiple universities from a single deployment with institution-specific branding, data isolation (Cosmos DB partition key per institution), and custom adapter configurations. | Won't-Have (v1) |
| PRD-F11 | **Microsoft 365 Integration** | Full M365 ecosystem integration powered by Microsoft Graph API: (1) **Entra ID SSO** — students and staff authenticate with their existing university Microsoft account via OIDC; (2) **M365 Calendar Panel** — the Home Dashboard reads the student's Microsoft 365 calendar (`Calendars.Read`) and displays upcoming academic events (exam dates, enrollment windows, scholarship deadlines) alongside Archon's proactive alerts; (3) **Teams Notifications** — Archon sends adaptive card notifications to the student's and agent's Microsoft Teams when deadlines are ≤14 days away, a hold is placed, or a ticket is escalated; (4) **Outlook Email** — Archon sends structured email digests for ticket resolution confirmations and deadline reminders via `Mail.Send`. All Graph API calls require M365 admin consent granted by the institution's Entra ID tenant admin. | Must-Have |

---

## 4. User Stories & Acceptance Criteria

**US-01 — Student resolves a balance inquiry via chat**
> As Mara (student), I want to ask Archon "How much do I owe this semester?" so that I can plan my payment without visiting the bursar's office.

Acceptance Criteria:
- Given Mara is authenticated via Entra ID and has an active enrollment, when she types "How much do I owe?" in Filipino or English, then Archon responds within 5 seconds with her current balance, itemized charges, applied scholarships, and payment due date.
- Given Mara has a ₱0 balance, when she asks about her balance, then Archon responds "Your account is fully paid for this semester" with a summary of applied aid.

**US-02 — Student gets an enrollment hold explained and resolved**
> As Mara (student), I want to understand why I have a hold on my account and get it resolved so that I don't get de-enrolled.

Acceptance Criteria:
- Given Mara has an active hold, when she asks "Why can't I register?", then Archon identifies the hold type (financial, academic, administrative), explains the reason in plain language, and provides specific resolution steps.
- Given the hold is caused by a pending financial aid disbursement (an issue crossing FA and registrar systems), when Archon identifies this, then it queries both systems, determines the disbursement status, and if the disbursement is in-progress, temporarily lifts the registration hold and notifies both departments.
- Given the hold requires human judgment (e.g., academic misconduct), when Archon identifies this, then it escalates to the appropriate human agent with a full context packet per PRD-F4.

**US-03 — Student receives a proactive deadline alert via Teams**
> As Mara (student), I want to be notified in Microsoft Teams before my scholarship renewal deadline so that I don't miss it and lose funding.

Acceptance Criteria:
- Given Mara has a CHED scholarship with a renewal deadline in 14 days, when the system runs its daily alert scan, then Mara receives a Teams adaptive card notification with: the deadline date, required documents, and a deep link to begin the renewal process in Archon. She also receives an Outlook email summary.
- Given Mara has already submitted her renewal, when the deadline alert fires, then the notification is suppressed and she instead receives a Teams confirmation of submission status.
- Given the institution's M365 admin has granted `TeamsActivity.Send` and `Mail.Send` consent, the notifications are delivered. If consent has not been granted, the system falls back to in-app push notification and logs the consent gap.

**US-04 — Agent receives a pre-digested handoff**
> As Jay (agent), I want to receive a structured context packet when a ticket is escalated to me so that I can resolve the student's issue without asking them to repeat their story.

Acceptance Criteria:
- Given Archon has been unable to resolve Mara's issue autonomously after 2 resolution attempts, when Archon escalates to Jay, then Jay's dashboard shows: student name, ID, program, year, scholarship status, the specific issue, systems queried, AI-attempted actions, and a recommended resolution — all in a single card.
- Given Jay resolves the ticket, when he marks it as resolved, then Archon auto-generates the ticket summary, logs the resolution to Cosmos DB, and sends Mara a confirmation via Outlook email and Teams notification.

**US-05 — Agent uses the dashboard to manage daily queue**
> As Jay (agent), I want a real-time view of my ticket queue with AI-suggested responses so that I can handle 60+ tickets per day without burnout.

Acceptance Criteria:
- Given Jay logs into the Agent Dashboard (authenticated via Entra ID), when tickets are in his queue, then each ticket displays: student context card, AI confidence score, suggested response (editable), and a one-click "Approve & Send" action.
- Given a ticket has been waiting >15 minutes, when Jay views the queue, then it is visually flagged as urgent with an escalating priority indicator.

**US-06 — Administrator views cost-per-ticket metrics**
> As Dr. Reyes (VP Student Affairs), I want to see the cost-per-ticket trend and deflection rate so that I can justify the Archon investment to the university president.

Acceptance Criteria:
- Given Dr. Reyes accesses the Analytics Dashboard (authenticated via Entra ID), when she views the cost overview, then she sees: current blended cost-per-ticket (BRD-M1), deflection rate (BRD-M2), average handle time (BRD-M3), M365 notification action rate (BRD-M7), and month-over-month trend lines.
- Given the dashboard is filtered by department, when she selects "Financial Aid", then all metrics reflect only financial-aid-related tickets.

**US-07 — Student navigates SAP appeal process**
> As Mara (student), I want step-by-step guidance for filing a Satisfactory Academic Progress (SAP) appeal so that I don't lose my scholarship due to a process I don't understand.

Acceptance Criteria:
- Given Mara's SAP status is "Suspended", when she asks Archon about her academic standing, then Archon explains SAP in plain language, checks her eligibility for appeal, and offers to guide her through the appeal process.
- Given Mara begins the appeal wizard, when she reaches the narrative section, then Archon provides a template with prompts ("Describe the circumstances that affected your academic performance...") and examples — without writing the narrative for her.

**US-08 — Student views M365 Calendar on Home Dashboard**
> As Mara (student), I want to see my Microsoft 365 calendar events on the Archon Home Dashboard so that I have a single view of my upcoming academic deadlines and appointments.

Acceptance Criteria:
- Given Mara is authenticated via Entra ID and has granted `Calendars.Read` permission, when she loads the Home Dashboard, then an "Academic Calendar" panel displays her next 7 days of M365 calendar events alongside Archon's proactive alerts.
- Given Mara has no calendar events in the next 7 days, when the panel loads, then it displays "No upcoming events — your week looks clear." with an option to view her full calendar.
- Given the `Calendars.Read` permission has not been granted, when the panel loads, then it displays a prompt: "Connect your M365 Calendar for deadline visibility" with a one-click consent flow.

---

## 5. App Flow & UX Intent

**Design reference:** see [dsd-archon.md](dsd-archon.md)

### 5.1 Screen Inventory

| Screen | Purpose | Entry points | States to design |
|--------|---------|--------------|------------------|
| Splash | Brand loading screen with Archon logo | App launch, deep link | Loading only |
| Auth / Entra ID SSO | Microsoft Entra ID OIDC authentication | Splash (unauthenticated), session expiry | SSO redirect / loading / error / success |
| Home Dashboard | Student's hub — active tickets, alerts, M365 Calendar panel, quick actions | Auth success, deep link, back navigation | Empty (no tickets) / active (tickets in progress) / alerts (pending deadlines) / calendar (events loaded) |
| Chat | Primary interaction — conversational helpdesk | Home "New inquiry" button, push notification tap, deep link | Empty (new conversation) / loading (AI processing) / streaming (AI responding) / resolved / escalated / error |
| Ticket History | Past interactions and resolutions | Home "History" tab | Empty / list / detail view |
| Alert Center | All proactive notifications (in-app + Teams/Outlook status) | Home bell icon, push notification | Empty / unread / read |
| SAP Appeal Wizard | Guided SAP appeal flow | Chat suggestion, Home quick action | Step 1 (eligibility) / Step 2 (documents) / Step 3 (narrative) / Step 4 (review) / Submitted / Status tracking |
| Settings / Profile | Language, notifications, account, M365 connection status | Home menu | Default / editing / M365 consent management |
| Agent Dashboard | Support staff queue and tools (Entra ID staff auth) | Separate auth (staff login via Entra ID) | Queue empty / queue active / ticket detail / handoff view |
| Admin Analytics | Cost and performance dashboards (Entra ID admin auth) | Separate auth (admin login via Entra ID) | Loading / dashboard / filtered view / export |
| M365 Consent Flow | Guided permission consent for Calendar, Teams, Outlook | Settings, Home Calendar panel prompt | Consent pending / granted / denied |

### 5.2 App Flow

**Legend:** `[Screen]` = a screen · `{Decision}` = a branch · `((Exit))` = terminal/leave · `-->|condition|` = conditional path.

**Linear (primary path — student):**

`Splash → Entra ID SSO → Home Dashboard (+ M365 Calendar) → Chat → [AI Resolution | Human Handoff] → Resolution Confirmation (Teams/Outlook notify) → Home`

**Branching (Mermaid — version-controlled):**

```mermaid
flowchart TD
    Splash --> Auth{Entra ID Session?}
    Auth -->|Yes| Home[Home Dashboard]
    Auth -->|No| SSO[Entra ID OIDC Login]
    SSO --> AuthResult{SSO Success?}
    AuthResult -->|Yes| Home
    AuthResult -->|No| AuthError[Auth Error] --> SSO

    Home --> CalendarLoad{M365 Calendars.Read?}
    CalendarLoad -->|Granted| CalPanel[M365 Calendar Panel loaded]
    CalendarLoad -->|Not granted| CalPrompt[Connect Calendar prompt]
    CalPrompt --> ConsentFlow[M365 Consent Flow]
    ConsentFlow --> CalPanel

    Home --> Chat[New Inquiry Chat]
    Home --> History[Ticket History]
    Home --> Alerts[Alert Center]
    Home --> SAP[SAP Appeal Wizard]
    Home --> Settings[Settings]

    Chat --> AIProcess{AI Can Resolve?}
    AIProcess -->|Yes| AutoResolve[Autonomous Resolution]
    AIProcess -->|No - 2 attempts failed| Handoff[Human Handoff]
    AIProcess -->|Needs clarification| Clarify[AI Asks Follow-up] --> Chat

    AutoResolve --> Confirm[Resolution Confirmation]
    Confirm --> M365Notify[Teams + Outlook Notification]
    Handoff --> AgentQueue[Agent Dashboard Queue]
    AgentQueue --> AgentResolve[Agent Resolves]
    AgentResolve --> WrapUp[Zero-Touch Wrap-Up]
    WrapUp --> Confirm

    Confirm --> Home

    Alerts -->|Deadline alert| Chat
    SAP --> SAPStep1[Eligibility Check]
    SAPStep1 --> SAPStep2[Document Upload]
    SAPStep2 --> SAPStep3[Narrative Writing]
    SAPStep3 --> SAPStep4[Review & Submit]
    SAPStep4 --> SAPStatus[Status Tracker]
```

**Flow annotations:**

| Flow concern | Detail |
|--------------|--------|
| Entry points | Cold launch, Teams notification deep link, Outlook email link, push notification (deep links to Chat or Alert), shared link, Entra ID SSO redirect |
| Decision branches | "Entra ID session valid?" / "AI can resolve?" / "Needs human judgment?" / "SAP eligible?" / "M365 Calendars.Read granted?" |
| Dead ends | None — every screen has a forward or back path. Auth error loops back to SSO. AI failure escalates to human. Calendar permission denial shows connect prompt. |
| Abandonment / exit | User closes app mid-chat → conversation state persisted in Cosmos DB, resumes at last message. Mid-SAP-appeal → progress saved, resumes at last completed step. |
| Edge cases | Offline (queued message with retry on reconnect), SSO timeout (re-auth prompt), Graph API throttling (exponential backoff, graceful calendar fallback), session expiry (soft redirect to SSO, no data loss), duplicate submit (idempotency key prevents double-processing) |

### 5.3 Onboarding Flow

- **Aha / first-value moment:** Student asks a question and gets an accurate, context-aware answer within 10 seconds — no hold music, no office visit, no being bounced.
- **Time-to-first-value target:** < 3 minutes (Entra ID SSO auth + first query + first resolution)
- **Skippable / resumable:** Yes — Entra ID handles identity; no additional onboarding steps. M365 Calendar consent is prompted inline (non-blocking). Language preference auto-detected; notification settings default to on.
- **Friction budget:** Zero additional fields at first use. Entra ID SSO provides identity. M365 Calendar and notification permissions can be granted or skipped from Settings.

### 5.4 UX Constraints

- Mobile-first; primary breakpoint is 375px (most common Philippine smartphone screen width)
- Must function on 3G connections (many provincial campuses have limited connectivity)
- Chat responses must begin streaming within 3 seconds on 3G
- All text must be readable at default system font size (no tiny disclaimers)
- Touch targets minimum 48×48px (accommodating older/lower-cost devices)
- No required app download — Fully responsive Next.js web application optimized for mobile browsers
- Microsoft Teams notifications must use adaptive card format (not plain text) to maintain readability on mobile Teams client

### 5.5 Instrumentation & Event Taxonomy

| Event name | Fires when | Key properties | Feeds metric |
|------------|-----------|----------------|--------------|
| `ticket_created` | Student initiates a new inquiry | `user_id, channel (web/mobile), language, department_detected, ts` | BRD-M2 (deflection rate denominator) |
| `ticket_resolved_auto` | AI resolves a ticket without human intervention | `user_id, ticket_id, resolution_type, departments_queried, duration_ms, token_cost` | BRD-M1 (cost/ticket), BRD-M2 (deflection rate numerator) |
| `ticket_escalated` | AI escalates to a human agent | `user_id, ticket_id, escalation_reason, ai_confidence_score, attempts_before_escalation` | BRD-M2 (inverse), BRD-M3 (handle time) |
| `ticket_resolved_human` | Human agent resolves an escalated ticket | `user_id, ticket_id, agent_id, handle_time_ms, resolution_type` | BRD-M1, BRD-M3 |
| `ticket_abandoned` | Student leaves chat without resolution (>10 min inactivity after last AI response) | `user_id, ticket_id, last_state, abandonment_point` | BRD-M4 (dropped rate) |
| `alert_sent` | Proactive alert dispatched to student | `user_id, alert_type, department, days_until_deadline, channel (teams/outlook/in-app)` | BRD-M6 (self-service) |
| `alert_actioned` | Student taps alert and takes action | `user_id, alert_id, action_taken, time_to_action_ms, channel` | BRD-M6, BRD-M7 |
| `m365_notification_sent` | Teams adaptive card or Outlook email sent via Graph API | `user_id, notification_type, graph_request_id, deadline_days_remaining` | BRD-M7 (numerator) |
| `m365_notification_actioned` | Student interacts with Teams card or clicks Outlook email link | `user_id, notification_id, action, channel (teams/outlook), time_to_action_ms` | BRD-M7 |
| `calendar_panel_loaded` | M365 Calendar panel successfully renders on Home Dashboard | `user_id, events_count, date_range` | Internal (adoption) |
| `calendar_consent_granted` | Student grants Calendars.Read permission | `user_id, ts` | Internal (M365 adoption) |
| `satisfaction_submitted` | Student rates the interaction (post-resolution CSAT prompt) | `user_id, ticket_id, rating (1-5), nps_score, free_text_feedback` | BRD-M5 (NPS) |
| `session_started` | User opens the web application | `user_id, device_type, os, connection_type, language, entra_id_tenant` | BRD-M6 (adoption) |
| `sap_appeal_started` | Student begins SAP appeal wizard | `user_id, current_sap_status, step_reached` | Internal tracking |
| `sap_appeal_submitted` | Student completes and submits SAP appeal | `user_id, appeal_id, documents_uploaded_count, narrative_word_count` | Internal tracking |

**Naming convention:** `snake_case` `object_action`; past tense; no PII in property values (user_id is internal ID, never name/email).
**Analytics tool:** Azure Monitor + Application Insights (native Azure, integrates with AI Foundry tracing for AI-specific events).

---

## 6. Out of Scope for This Release

- **Multi-tenant deployment** — serving multiple universities from one instance (deferred to v2; v1 is single-institution)
- **Healthcare patient portal** — architecturally similar but commercially separate vertical
- **Hospitality / retail integrations** — different market, different GTM
- **Direct government system integration** — CHED, NPC, UniFAST API access requires inter-agency agreements not feasible for v1
- **Voice/phone channel** — v1 is text-only (web + mobile chat); voice integration deferred to v2
- **Automated document generation** — Archon guides students through processes but does not auto-generate legal/academic documents
- **Grade or academic performance analysis** — Archon handles administrative support, not academic advising content
- **Microsoft Viva / SharePoint integration** — potential v2 feature for deeper M365 embedding

---

## 7. AI / Agent Feature Specifications

**AI Component:** Archon Agentic Orchestration Engine
**Platform:** Azure AI Foundry
**Model(s):** GPT-4o (primary reasoning, multi-department synthesis, handoff packet generation); Phi-4 (lightweight FAQ routing and intent classification for cost optimization)
**Reasoning:** Azure AI Foundry is the unified 2026 Microsoft AI platform that consolidates model deployment, agent orchestration, RAG pipelines, prompt evaluation, and distributed tracing in a single control plane. It replaces the need for discrete Azure OpenAI service management and separate orchestration tooling. The Agent Service within AI Foundry provides code-first, auditable orchestration with full tool-calling support — giving Archon the deterministic guardrails of structured workflows with the reasoning flexibility of LLMs.

**What the AI does:**
The AI operates as an autonomous service desk agent capable of: (1) understanding student inquiries in Filipino, English, or Cebuano; (2) determining which university systems to query; (3) executing read operations across registrar, bursar, FA, and academic advising systems via adapters; (4) synthesizing cross-department data into a coherent diagnosis; (5) executing write operations for approved actions (e.g., temporary hold lifts, appointment scheduling) following HITL confirmation; (6) generating structured handoff packets for human escalation; (7) reading the student's M365 Calendar via Graph API for context-enriched responses; and (8) performing zero-touch wrap-up after human resolution.

**Input → Output contract:**
- Input: Natural language text (Filipino/English/Cebuano), up to 2,000 characters per message. Contextual data injected from university systems via RAG pipeline (Cosmos DB vector search). M365 Calendar events injected as structured context when available.
- Output: Structured response (plain text + rich cards for balances/schedules/deadlines), action confirmations, handoff packets (JSON), Teams adaptive cards, Outlook email payloads, or escalation notices.
- Latency expectation: First token within 2 seconds (3G target: 3 seconds). Full response within 8 seconds for simple queries; up to 15 seconds for multi-department orchestration.

**Human-in-the-loop points:**
- Any write action affecting enrollment status (hold lifts, registration changes) requires either: (a) student confirmation in chat, or (b) staff approval in Agent Dashboard.
- Financial transactions (payment processing, refund initiation) are never executed by AI — always routed to human agent.
- Academic standing changes (SAP status, grade disputes) are always escalated with recommendation, never auto-resolved.
- Microsoft Graph write operations (sending Teams messages or Outlook emails) are executed by Power Automate flows triggered by Cosmos DB events, not by the LLM or Next.js backend directly — the LLM generates the data, Power Automate handles the reliable M365 delivery.

**Fallback behavior when AI fails or is unavailable:**
- If Azure AI Foundry returns an error: retry once with exponential backoff. On second failure, present a clear message: "I'm having trouble processing your request right now. Let me connect you with a human agent who can help." Auto-escalate with context.
- If AI Foundry Agent Service is unavailable: degrade to simple FAQ search against knowledge base (Cosmos DB vector search direct query). Surface top 3 relevant articles.
- If all AI components are unavailable: display "Live chat with a support agent" button, routing directly to the Agent Dashboard queue. No silent failures.
- If Microsoft Graph API is throttled or unavailable: M365 Calendar panel shows a graceful "Calendar temporarily unavailable" state. Teams/Outlook notifications are queued and retried with exponential backoff (max 3 retries over 1 hour).

**Token / cost budget per operation:**
- Simple query (balance, schedule lookup): ~1,500 tokens at GPT-4o pricing = ~$0.005/query
- Multi-department orchestration (cross-system diagnosis): ~4,000 tokens = ~$0.015/query
- Handoff packet generation: ~2,000 tokens = ~$0.007/operation
- FAQ / intent routing (Phi-4): ~500 tokens = ~$0.0002/query
- Monthly budget assumption: 10,000 queries/month at a 12,000-student university = ~$80–$120/month in AI compute (blended GPT-4o + Phi-4)

---

## 8. Dependencies & Assumptions

**Dependencies:**
- For V1/Initial Build, the system will use **Mock/Dummy Data Adapters** instead of requiring actual API/database read access to university core systems (SIS, bursar, financial aid).
- University has an active **Microsoft 365 tenant with Entra ID** — students and staff have M365 accounts
- **University M365 tenant admin grants consent** in Entra ID for the Archon app registration (required for `Calendars.Read`, `Mail.Send`, `TeamsActivity.Send`)
- Azure subscription with Azure AI Foundry (including GPT-4o deployment) and Cosmos DB provisioned
- Partner university identified and MOU signed before development begins
- Philippine Data Privacy Act compliance framework reviewed by counsel (CLR prerequisite)

**Assumptions:**
- Students access primarily from mobile devices (Android dominant in PH market, ~85% market share)
- Most students have intermittent 3G/4G connectivity, not consistent broadband
- University backend systems have at least REST API or ODBC/JDBC database access available (even if undocumented)
- Tier 1 support staff are comfortable with web-based dashboard interfaces and use Microsoft Teams daily
- The university is willing to grant Archon read access to student records (this is the single biggest institutional barrier)
- Microsoft 365 licenses (Business Basic or above) are already provisioned for students and staff at the partner institution

---

## 9. Implementation Plan

| # | Phase / Milestone | Entry criteria | Exit criteria (Definition of Done) | Deliverable | Depends on | Owner (DRI) | Top risk |
|---|-------------------|----------------|-------------------------------------|-------------|------------|-------------|----------|
| M1 | Planning & Requirements locked | BRD approved, partner university identified | PRD, DSD, SDD locked; scope signed off; out-of-scope explicit | Approved PRD, DSD, SDD | BRD | Regalia (Alaric) | Scope creep; partner university delays |
| M2 | Design (UX + system) | PRD locked | DSD token system implemented in code; SDD architecture validated with university IT; RFCs approved; Entra ID app registration created with correct Graph API scopes | Design system + architecture + adapter specs + Entra ID app registration | M1 | Regalia (Alaric + Thranduil) | University IT/M365 admin unwilling to grant Graph API consent |
| M3 | Development — Core | Design signed off | PRD-F1 (chat), PRD-F2 (orchestration), PRD-F3 (auto-resolution), PRD-F4 (handoff), PRD-F11 (M365 integration) feature-complete; all Must-Have AC pass locally | Feature-complete core build | M2 | Regalia (Alaric) | AI Foundry agent latency on 3G; Graph API throttling; adapter complexity for legacy SIS |
| M4 | Testing & QA | Build feature-complete | QAD release criteria met; 0 P0/P1 bugs; AI evals pass; red-team evals pass; load test at 500 concurrent users; Graph API sad-path tests pass | QA sign-off | M3 | Regalia (Rogue) | Prompt injection vulnerabilities; student data leakage; Graph API scope over-privilege |
| M5 | Deployment / Rollout | QA signed off; CLR cleared; M365 admin consent granted | Live in production at partner university; smoke tests green; monitoring active; first 50 students onboarded | Production release at 1 university | M4 | Regalia (Zonia) | SSO integration issues; Graph API admin consent delays |
| M6 | Post-launch / Maintenance | Released to students | BRD-M1–M7 reviewed at 30 days; NPS survey collected; cost-per-ticket validated; M365 notification action rate measured (BRD-M7); hotfix path tested | Monitoring + 30-day report | M5 | Regalia (Alaric) | Low M365 notification action rate; AI hallucination in production |

**Rollout strategy:** `phased` — single partner university first (alpha), then 3–5 universities (beta), then general availability.

**Rollback plan:**
- *Trigger criteria:* P0 bug affecting >5% of users, any student data breach, or AI generating harmful/incorrect financial guidance in >1% of interactions.
- *Revert mechanism:* Feature flag `ARCHON_AI_ENABLED` disables all AI processing; app falls back to direct human agent queue. Feature flag `ARCHON_M365_ENABLED` disables all Graph API calls independently. Database migrations are backward-compatible for one release. Revert to previous tagged release via Vercel Instant Rollbacks.

**RFC cross-reference:** Phases with non-obvious technical work:
- M3 agentic orchestration → see `rfc-archon-agentic-orchestration.md`
- M3 human handoff → see `rfc-archon-human-handoff.md`
- M2–M3 university adapters → see `rfc-archon-university-adapters.md`
- M2–M3 M365 integration → see `rfc-archon-m365-integration.md`

---

## Self-Check

- [x] Every Must-Have feature in Section 3 has at least one user story in Section 4 (F1→US-01/02, F2→US-02, F3→US-01, F4→US-04, F11→US-08)
- [x] Acceptance criteria are testable (Given/When/Then format)
- [x] Section 5.1: every interactive screen defines empty / loading / error / success states
- [x] Section 5.2: flow has no unintended dead ends; entry, exit, and edge cases annotated
- [x] Section 5.5: every BRD-M# metric has at least one feeding event defined and instrumented
- [x] Section 6 explicitly names things that were discussed but cut (8 items)
- [x] Section 7 is filled — AI component fully specified with models, contracts, HITL, fallbacks, and cost budget
- [x] Section 8 explicitly calls out M365 admin consent as a hard dependency
- [x] Section 9 covers all phases through Post-launch (M1–M6) with M365 risks called out
- [x] Section 9 has an explicit rollback trigger and revert mechanism (including ARCHON_M365_ENABLED flag)
- [x] This document answers *what* to build, not *how* (architecture goes in the SDD)
