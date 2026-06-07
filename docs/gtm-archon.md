# Go-To-Market (GTM) Strategy

**Project:** Archon — Agentic AI-Powered Service Desk
**Date:** 2026-06-07
**Version:** 0.1
**Owner:** Regalia Council (Zilch)
**Status:** Draft
**Last reconciled:** N/A
**PRD:** [prd-archon.md](prd-archon.md)

---

## 1. Product Summary (GTM View)

**What it does:** Archon is an autonomous AI service desk that resolves university student inquiries across departmental boundaries.
**Who it's for:** Philippine higher education institutions struggling with high administrative costs, and students frustrated by fragmented bureaucratic processes.
**Core value proposition:** Eliminate the "experience deficit" by reducing cost-per-ticket by 79% while resolving routine student inquiries instantly and autonomously.
**Category:** Enterprise / Higher Education ITSM

---

## 2. Target Audience

**Primary ICP (Ideal Customer Profile) - The Buyer:**
- *Who:* Vice Presidents for Student Affairs, CIOs, or Provosts at Philippine State Universities and Colleges (SUCs) or large private institutions (10,000+ students).
- *Where they hang out:* Management Association of the Philippines (MAP) events, CHED digital transformation summits, EduTech Asia.
- *What they already believe:* "We don't have the budget to hire more support staff, but student complaints are increasing."
- *What will make them try this:* A benchmark showing cost reduction from ₱5,800 to ₱1,220 per ticket, backed by the KPMG AIC ecosystem credibility.

**Secondary Audience - The User:**
- *Who:* Digital-native Gen Z university students managing complex financial aid (UniFAST/CHED) and enrollment scenarios.

---

## 3. Pricing Model

**Model:** `SaaS + Implementation Fee`

| Tier | Price | What's Included |
|------|-------|-----------------|
| **Pilot (Alpha)** | Heavily Discounted / Free Implementation | Core features, 1 instance, close partnership. Requires university to provide a dedicated IT liaison for adapter development. |
| **Standard** | Base Platform Fee + $X / active student / year | Full agentic chat, 3 core adapters (SIS, Bursar, FA), Agent Dashboard up to 10 seats. |
| **Enterprise** | Custom | Unlimited seats, custom adapters, priority SLAs, white-labeled UI. |

**Pricing rationale:** A predictable per-student annual fee aligns with university budget cycles better than volatile token-based pricing. The implementation fee covers the custom adapter engineering required for legacy systems.

---

## 4. Positioning & Messaging

**Tagline:** `Archon: Stop making students navigate the org chart.`

**Primary message:**
Universities operate in silos; students experience them as a single entity. Archon bridges that gap. It's not a chatbot—it's an autonomous agent that accesses the registrar, bursar, and financial aid systems simultaneously to resolve student crises before they escalate.

**Proof points:**
- KPMG AIC recognized architecture framework.
- Reduces blended cost-per-ticket by up to 79%.
- Built on enterprise-grade Microsoft Azure + Copilot Studio (data stays secure).

**Objection handling:**

| Objection | Response |
|-----------|----------|
| "We already have a chatbot." | "Chatbots point to FAQs. Archon acts on APIs. It can temporarily lift a hold or diagnose a missing disbursement across departments." |
| "Our systems are too old/custom." | "Our Adapter pattern is specifically built to wrap legacy Oracle, PHP, and SOAP backends without replacing them." |
| "AI hallucinates." | "Archon uses a hybrid orchestration model. The AI is bounded by strict deterministic workflows (Copilot Studio) and has zero direct write access to your database." |

---

## 5. Launch Channels & Tactics

**Launch Phases:**

| Phase | Criteria to Enter | Target Date | Goal |
|-------|------------------|-------------|------|
| **Alpha** | PRD-F1 through F4 complete, QAD passing. | TBD | Secure 1 forward-thinking Philippine university as a design partner. Build the first real-world adapters. |
| **Beta** | Alpha case study published demonstrating cost reduction. | TBD | Onboard 3-5 universities. Refine pricing model based on actual AI token costs. |
| **Public** | Beta retention high; CLR cleared. | TBD | Scale GTM via EduTech conferences and MAP partnerships. |

---

## 6. Success Metrics (30-day post-launch at Alpha Partner)

| BRD-M# | Metric | Target | How to Measure |
|--------|--------|--------|----------------|
| BRD-M2 | Tier 1 autonomous deflection rate | >30% | `ticket_resolved_auto` / `ticket_created` |
| BRD-M3 | Average handle time (human-assisted) | ≤6 minutes | Time from `ticket_escalated` to `ticket_resolved_human` |
| BRD-M5 | Student satisfaction score (NPS) | ≥+30 | `satisfaction_submitted` event data |
