# Compliance & Legal Readiness Register (CLR)

**Project:** Archon — Agentic AI-Powered Service Desk
**Date:** 2026-06-07
**Version:** 0.2
**Owner:** Regalia Council (Alaric)
**Status:** Draft
**Last reconciled:** N/A — not yet reconciled with code
**PRD:** [prd-archon.md](prd-archon.md)
**SDD:** [sdd-archon.md](sdd-archon.md)

---

> ⚠️ **Structural and regulatory awareness only — NOT legal advice.** This register helps map what data is handled and surfaces obligations. Any item flagged **"counsel needed"** must be reviewed by a lawyer qualified in the relevant jurisdiction before launch.

---

## 0. Target Markets

| Region | In scope? | Notes |
|--------|-----------|-------|
| Philippines (Data Privacy Act 2012, RA 10173) | Yes | Primary market. Data localization preferred; Azure Southeast Asia region (Singapore) satisfies equivalent protection requirements under PH DPA. |
| European Union / UK (GDPR / UK GDPR) | No | Not actively targeted in V1. |
| California, USA (CCPA / CPRA) | No | Not actively targeted in V1. |
| Other: USA (FERPA compliance) | Yes | Highly relevant if scaling to US universities or managing US student data. Treat PH data with FERPA-equivalent strictness. |

**Geo-blocking:** None — globally accessible to enrolled students traveling abroad, so underlying data protection must be robust regardless of physical location.

---

## 1. Data Inventory / Record of Processing

| Activity | Purpose | Data categories | Data subjects | Recipients / sub-processors | Cross-border transfer | Retention | Legal basis |
|----------|---------|-----------------|---------------|-----------------------------|-----------------------|-----------|-------------|
| Authentication (Entra ID) | Verify identity via Microsoft Entra ID OIDC | Email, Student ID, Name, Entra Object ID (`oid`) | Students, Staff | Microsoft Entra ID (University M365 tenant) | Dependent on university's Azure region (prefer SE Asia) | Life of session + 24h (JWT) | Legitimate interest (service provision) |
| Conversation Logging | Audit, analytics, AI context | Chat transcripts (PII scrubbed before insert) | Students | Cosmos DB (SE Asia), Azure AI Foundry | Azure AI Foundry endpoints (Azure region-bound) | 90 days (messages), permanent (conversation metadata) | Legitimate interest / Consent |
| Financial Status Query | Resolve balance inquiries | Tuition balances, hold status | Students | API Routes → University Bursar Adapter | None (transit only; 5-min Cosmos DB TTL cache only) | 5 min TTL cache in Cosmos DB | Performance of a contract |
| Agent Escalation (Handoff) | Handoff to human staff | HandoffPacket JSON, Name, Issue summary | Students | Cosmos DB `handoffs` collection | None | 90 days | Performance of a contract |
| M365 Calendar Events | Display student's academic calendar on Home Dashboard | Calendar event titles, start/end times | Students | Microsoft Graph API, Cosmos DB (15-min TTL cache) | Microsoft Graph (Microsoft global, Azure region-bound for stored data) | 15-min TTL in Cosmos DB; not stored permanently | Consent (Calendars.Read — user-granted via OIDC) |
| Teams Notifications | Deadline reminders and escalation alerts | Student name (in card body), deadline name, ticket ID | Students, Agents | Power Automate → Teams (Microsoft global infrastructure) | Microsoft Teams global infrastructure | Not stored by Archon; Teams message history governed by university Teams policies | Legitimate interest / Consent |
| Outlook Email | Deadline reminders and ticket resolution confirmations | Recipient email, deadline/ticket summary | Students, Agents | Power Automate → Outlook (Microsoft global infrastructure) | Microsoft Exchange Online global infrastructure | Not stored by Archon; Outlook governed by university Exchange policies | Legitimate interest / Consent |
| Policy Vector Embeddings (RAG) | Answer student questions about university policies | Anonymized text chunks from public university policy documents | None (public data) | Cosmos DB Vector Search, Azure AI Foundry | Azure AI Foundry (embedding model) | Permanent (until policy updated) | Legitimate interest |

**Sensitivity flags:**

| Data type | Collected? | Notes |
|-----------|-----------|-------|
| Basic PII (name, email) | Yes | Received from Entra ID via OIDC claims. Not stored permanently in Cosmos DB — retrieved on session start. |
| Special-category (health, etc.) | No | Out of scope. Health center inquiries must be deflected to external health services. |
| Children's data | No | Higher education context (generally 17+). |
| Financial / Payment data | Yes | Read-only. Archon views balances via university adapter but *never* processes payments directly. Cached in Cosmos DB for max 5 minutes. |
| M365 Calendar data | Yes | Read-only via `Calendars.Read` delegated permission. Cached 15 min in Cosmos DB. Not permanently stored. |
| Microsoft Graph tokens | Yes | Access tokens held in memory / Azure Cache for Redis session. Never persisted to Cosmos DB. |

---

## 2. Microsoft 365 / Graph API Compliance Notes

M365 integration introduces additional compliance obligations that must be addressed before launch:

| Obligation | Requirement | Status |
|---|---|---|
| **Entra ID Admin Consent** | University M365 tenant admin must grant consent for `Calendars.Read`, `Mail.Send`, `TeamsActivity.Send` scopes before M365 features activate | Pending (M2 milestone) |
| **Data Processing Agreement with Microsoft** | Microsoft's Online Services Terms (OST) and DPA cover Azure and M365 services. University likely already has this via their M365 subscription. Archon inherits as a sub-processor. | Pending legal review |
| **Graph API Data Minimization** | Calendar event data must not be stored beyond 15-minute TTL. Outlook email content must not be stored in Cosmos DB after send. | Implemented (SDD §6.3) |
| **Teams/Outlook Content Compliance** | Adaptive cards and email content must not include raw PII beyond what is necessary (e.g., ticket ID + summary only). Full student records must not appear in notification payloads. | Implemented (RFC-004 §4.5) |
| **User Disclosure** | Students must be clearly informed (at consent prompt and in privacy policy) what data Archon reads from their M365 account and what notifications it sends on their behalf. | Pending (Terms of Use — §4) |

---

## 3. Multi-Jurisdiction Obligations Matrix

| Dimension | Philippines DPA 2012 |
|-----------|----------------------|
| **Consent / legal basis** | Consent or performance of a contract (provision of university services). Student handbook ToS updates usually cover this. M365 Calendar access requires explicit user consent via OIDC scope consent screen. |
| **Data subject rights** | Access, correct, erase/block, object, portability, claim damages. Archon's Cosmos DB data can be purged per student on request (point delete by `student_id`). |
| **Breach notification** | NPC **and** subjects ≤72h from knowledge if real risk of serious harm. |
| **DPO / representative** | **Mandatory DPO** required for the university. Archon must designate a Compliance Officer to interface with university DPOs. |
| **Cross-border transfer** | Controller (University) stays accountable; comparable protection required for processors (Archon, Microsoft). Azure SE Asia region + Microsoft OST satisfy this. |
| **Our status / action** | Need Data Processing Agreement (DPA) with partner universities. Need sub-processor DPA acknowledgment covering Microsoft Azure, AI Foundry, and M365 Graph API. |

---

## 4. Escalation Flags — Counsel Required

*Any "Yes" here means: do not launch this surface without a lawyer.*

| Flag | Present? | Why it escalates |
|------|----------|------------------|
| Health / medical data | No | |
| Payments / card data | Yes (Read-only) | Even read-only access to balances requires strict audit logging and DPA coverage. |
| Automated decisions with legal/significant effect | Yes | AI triggering a hold lift could impact enrollment status. |
| Large-scale / systematic monitoring or profiling | Yes | Continuous AI analysis of student inquiries across the entire university body. |
| Cross-border data transfer to Microsoft Graph infrastructure | Yes | Teams and Outlook are routed through Microsoft global infrastructure. Must confirm equivalent protection under PH DPA. |
| M365 Calendar access | Yes | `Calendars.Read` reads personal schedule data. DPIA scope must include this. |

**DPIA required?** Yes — A Data Protection Impact Assessment is required before deploying AI against student academic, financial, and calendar records. The M365 integration expands the DPIA scope relative to v0.1.

---

## 5. Terms of Use / EULA Readiness

| Clause | Present? | Evidence link | Counsel needed? |
|--------|----------|---------------|-----------------|
| License grant + scope | [ ] | | Yes |
| Acceptable use / prohibited conduct (e.g., prompt injection bans) | [ ] | | Yes |
| Limitation of liability (Crucial for AI hallucination protection) | [ ] | | Yes |
| Dispute resolution | [ ] | | Yes |
| M365 data access disclosure (Calendar, Teams, Outlook) | [ ] | | Yes |
| Graph API scope disclosure and user consent language | [ ] | | Yes |

---

## 6. IP Infringement & Protection Readiness

| Item | Status | Evidence link | Counsel needed? |
|------|--------|---------------|-----------------|
| Product/brand name trademark knockout search ("Archon") | Pending | | Yes |
| AI training-data provenance + model-output ownership reviewed | Pending | Azure AI Foundry ToS applies | Yes |
| Microsoft Graph API terms compliance (Personal Data handling) | Pending | Microsoft API Terms of Use | Yes |
| Open-source license compliance (SBOM maintained) | Pending | Generated via CI | No |

---

## Self-Check

- [x] Declares primary market (Philippines).
- [x] Maps expanded data inventory including M365 Calendar, Teams, and Outlook data flows.
- [x] Escalation flags raised for automated decisions, large-scale monitoring, cross-border Graph API data transfer, and M365 Calendar access.
- [x] DPIA identified as necessary (scope expanded from v0.1 due to M365 integration).
- [x] M365 admin consent requirement documented as a pre-launch gate.
- [x] Cosmos DB and Azure AI Foundry sub-processor relationships noted.
