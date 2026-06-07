# Go-To-Market (GTM) Strategy

**Project:** Archon — Agentic AI-Powered Service Desk
**Date:** 2026-06-07
**Version:** 0.2
**Owner:** Regalia Council (Zilch)
**Status:** Draft
**Last reconciled:** N/A
**PRD:** [prd-archon.md](prd-archon.md)

---

## 1. Product Summary (GTM View)

**What it does:** Archon is an autonomous AI service desk that resolves university student inquiries across departmental boundaries and integrates natively with the Microsoft 365 tools students and staff already use.
**Who it's for:** Philippine higher education institutions struggling with high administrative costs, and students frustrated by fragmented bureaucratic processes.
**Core value proposition:** Eliminate the "experience deficit" by reducing cost-per-ticket by 79% while resolving routine student inquiries instantly and autonomously — with deadline reminders delivered to Teams and Outlook, not just a new app nobody checks.
**Category:** Enterprise / Higher Education ITSM (Azure-native)

---

## 2. Target Audience

**Primary ICP (Ideal Customer Profile) — The Buyer:**
- *Who:* Vice Presidents for Student Affairs, CIOs, or Provosts at Philippine State Universities and Colleges (SUCs) or large private institutions (10,000+ students) that have **Microsoft 365 / Entra ID deployed**.
- *Where they hang out:* Management Association of the Philippines (MAP) events, CHED digital transformation summits, Microsoft for Education events, EduTech Asia.
- *What they already believe:* "We don't have the budget to hire more support staff, but student complaints are increasing. And we're already paying for Microsoft 365 — we should be getting more out of it."
- *What will make them try this:* A benchmark showing cost reduction from ₱5,800 to ₱1,220 per ticket, backed by the KPMG AIC ecosystem credibility and a Microsoft Azure-native deployment that fits their existing M365 investment.

**Secondary Audience — The User:**
- *Who:* Digital-native Gen Z university students managing complex financial aid (UniFAST/CHED) and enrollment scenarios. Already using Microsoft Teams and Outlook for class coordination — Archon notifications reach them where they already are.

**Qualifying criterion:** Partner university must have an active Microsoft 365 subscription with Entra ID. This is the non-negotiable technical prerequisite for M365 integration features (PRD-F11).

---

## 3. Pricing Model

**Model:** `SaaS + Implementation Fee`

| Tier | Price | What's Included |
|------|-------|-----------------|
| **Pilot (Alpha)** | Heavily Discounted / Free Implementation | Core features, 1 instance, close partnership. Requires university to provide a dedicated IT liaison for adapter development and to grant M365 admin consent for Graph API scopes. |
| **Standard** | Base Platform Fee + $X / active student / year | Full agentic chat, 3 core adapters (SIS, Bursar, FA), Agent Dashboard up to 10 seats, full M365 integration (Calendar, Teams, Outlook). |
| **Enterprise** | Custom | Unlimited seats, custom adapters, priority SLAs, white-labeled UI, custom Entra ID branding. |

**Pricing rationale:** A predictable per-student annual fee aligns with university budget cycles better than volatile token-based pricing. The implementation fee covers the custom adapter engineering required for legacy systems.

---

## 4. Positioning & Messaging

**Tagline:** `Archon: Stop making students navigate the org chart.`

**Primary message:**
Universities operate in silos; students experience them as a single entity. Archon bridges that gap. It's not a chatbot — it's an autonomous agent that accesses the registrar, bursar, and financial aid systems simultaneously, and delivers answers inside Teams and Outlook where students already live.

**Proof points:**
- KPMG AIC recognized architecture framework.
- Reduces blended cost-per-ticket by up to 79%.
- **Built entirely on Microsoft Azure** — Azure AI Foundry (GPT-4o), Cosmos DB, Entra ID, Microsoft Graph. Data stays within your Microsoft 365 compliance boundary.
- No new app for students to adopt — notifications reach them in Teams and Outlook.

**Objection handling:**

| Objection | Response |
|-----------|----------|
| "We already have a chatbot." | "Chatbots point to FAQs. Archon acts on APIs. It can temporarily lift a hold or diagnose a missing disbursement across departments." |
| "Our systems are too old/custom." | "Our Adapter pattern is specifically built to wrap legacy Oracle, PHP, and SOAP backends without replacing them." |
| "AI hallucinates." | "Archon uses Azure AI Foundry with strict tool schemas and RBAC-enforced tool calls. The AI is bounded by auditable, deterministic tool definitions — and has zero direct write access to your database." |
| "We don't want another vendor to manage." | "Archon runs entirely on Microsoft Azure — the same platform you already manage for your M365 and Azure subscription. There's no new cloud vendor to evaluate or contract with." |
| "Students won't download another app." | "They don't have to. Archon notifications arrive in Teams and Outlook. The web app is a Flutter PWA — installable from the browser, no app store required." |

---

## 5. Launch Channels & Tactics

**Launch Phases:**

| Phase | Criteria to Enter | Target Date | Goal |
|-------|------------------|-------------|------|
| **Alpha** | PRD-F1 through F4 + PRD-F11 complete, QAD passing, M365 admin consent granted at partner university. | TBD | Secure 1 forward-thinking Philippine university with M365 deployment as a design partner. Build the first real-world adapters and validate Graph API integration in production. |
| **Beta** | Alpha case study published demonstrating cost reduction and M365 notification engagement (BRD-M7). | TBD | Onboard 3–5 universities. Refine pricing model based on actual AI token costs. Validate Teams/Outlook engagement rates. |
| **Public** | Beta retention high; CLR cleared; M365 integration stable. | TBD | Scale GTM via EduTech conferences, Microsoft for Education channels, and MAP partnerships. |

**Channel strategy:**
- **Microsoft Partner Network:** List Archon on Microsoft AppSource as an Azure-native solution. This gives visibility to Philippine universities already evaluating Microsoft ISV solutions.
- **KPMG AIC Alumni Network:** AIC participants who built student services platforms are natural early adopters and internal champions at their universities.
- **CHED Digital Transformation Summits:** Direct access to the institutional buyers (VPs, CIOs) responsible for digital transformation budgets.

---

## 6. Success Metrics (30-day post-launch at Alpha Partner)

| BRD-M# | Metric | Target | How to Measure |
|--------|--------|--------|----------------|
| BRD-M2 | Tier 1 autonomous deflection rate | >30% | `ticket_resolved_auto` / `ticket_created` |
| BRD-M3 | Average handle time (human-assisted) | ≤6 minutes | Time from `ticket_escalated` to `ticket_resolved_human` |
| BRD-M5 | Student satisfaction score (NPS) | ≥+30 | `satisfaction_submitted` event data |
| BRD-M7 | M365 notification action rate | ≥40% | `m365_notification_actioned` / `m365_notification_sent` (Teams + Outlook combined) |
