# Business Requirements Document (BRD)

**Project:** Archon — Agentic AI-Powered Service Desk for Higher Education
**Date:** 2026-06-07
**Version:** 0.1
**Owner:** Regalia Council
**Status:** Draft
**Last reconciled:** N/A — not yet reconciled with reality

---

## 1. Executive Summary

Archon is an Agentic AI-powered service desk platform designed to eliminate the "experience deficit" plaguing higher education institutions — starting with the Philippines. When a student's financial aid is delayed, their classes are at risk of being dropped, or they receive conflicting guidance from siloed university departments, Archon's autonomous AI agents resolve the issue across departmental boundaries in real-time, without the student being bounced between offices. For institutions, Archon converts the service desk from a reactive cost center hemorrhaging capital at up to ₱5,800 ($104.68) per ticket into a proactive resolution engine operating at a blended cost of ₱1,220 ($22) per ticket — a 79% reduction. The platform bridges the gap between fragmented university data and the student's immediate, critical needs through autonomous multi-step workflow execution, seamless human handoff, and proactive crisis prevention.

---

## 2. The Problem & Opportunity

**The Problem:**

Philippine and global universities operate as collections of administrative "small fiefdoms" — siloed registrars, bursars, financial aid offices, and academic departments functioning independently of one another.[^4] When a student encounters a multi-dimensional problem (e.g., a delayed financial aid disbursement triggering an automatic registration hold), they are trapped in an institutional labyrinth requiring them to navigate rigid phone prompts, repeat their narrative to multiple agents, and endure prolonged resolution times that destroy institutional trust.[^5][^6]

The financial drain is severe. Industry benchmarks demonstrate that the cost per ticket ranges from $0.74 (highly optimized) to $104.68 (fully loaded average), with escalations from Tier 1 ($12–$25) to Tier 2/3 specialists reaching $75–$600 per ticket.[^7][^8] Filipino universities, many operating on constrained government funding, face this exact operational bloat — diverting resources from academic mission to administrative overhead.

Empirical analysis of student forums reveals that administrative delays are not merely logistical inconveniences but deeply traumatizing events. Delayed financial aid directly threatens housing stability and food security.[^21] The most common student coping strategy is adversarial micromanagement — demanding everything in writing, verifying faxes were sent, and preemptively consulting attorneys.[^5] This adversarial dynamic proves the problem extends beyond software efficiency to a systemic failure in human-centered service delivery.

**The Opportunity:**

2026 represents the definitive maturity inflection point for Agentic AI — systems that don't just generate text but autonomously execute multi-step workflows.[^10] Gartner predicts that by 2028, 33% of enterprise organizations will leverage agentic AI in ITSM workflows, and 40% of enterprise applications will embed task agents by end of 2026.[^31] The KPMG Academic Innovation Challenge (AIC) in the Philippines, which engaged 211 students from 28 universities building Agentic AI platforms using Microsoft Copilot Studio, has demonstrated that the next generation of workers inherently understands how to build and operate these autonomous tools.[^24]

The architectural solution is industry-proven: Wyndham Hotels achieved a 94% reduction in review times and 28% autonomous call handling.[^13] Adventist Health reduced call handle times by 20% and dropped calls by 24%.[^13] Rush University reduced patient calls by 15% while increasing digital self-service by 25%.[^13] LSU successfully disbursed $235 million in financial aid without systemic failure using unified cloud architecture.[^22]

The critical insight: the technology required to solve a student's financial aid crisis is functionally identical to that solving a franchisee's IT outage or a patient's prescription refill — an autonomous agent accessing a unified data lake to execute a multi-step workflow on behalf of a human user.[^Research §66]

**Target Customer / User:**

- **Primary — The University Student (Philippines):** Gen Z and millennial digital natives expecting consumer-grade, frictionless interactions.[^1] Includes a growing sub-sector of working adults and students across provincial campuses relying on 24/7 asynchronous support for FAFSA-equivalent (CHED/UniFAST) applications, tuition inquiries, and enrollment.[^11] These students experience acute anxiety, abandonment, systemic confusion, helplessness, and administrative exhaustion when support fails.[^15–21]

- **Secondary — Institutional Support Staff:** Tier 1 agents overwhelmed by repetitive tasks consuming ~20% of operational bandwidth.[^12] Registrars, financial aid officers, and academic advisors burdened by manual data retrieval across fragmented systems. Clinicians in affiliated health systems spending up to 40% of their time on administrative tasks.[^13]

- **Tertiary — Institutional Leaders:** CIOs, University Presidents, and Vice Presidents for Student Affairs attempting to balance static budgets against exponentially rising technological demands, while managing profound "change fatigue" from pandemic-era deployments.[^4]

---

## 3. Strategic Alignment

Archon directly addresses three convergent strategic imperatives:

1. **KPMG AIC Ecosystem:** Extends the innovation demonstrated by the 2025 Academic Innovation Challenge — where Filipino university students built helpdesk and smart search platforms with Microsoft Copilot Studio — into a production-grade platform.[^24][^25] This creates a self-sustaining loop: the AIC trains talent → Archon employs that talent → Archon serves the universities that produce that talent.

2. **Philippine Higher Education Modernization:** Aligns with CHED's (Commission on Higher Education) digital transformation mandate and the Data Privacy Act of 2012 (RA 10173) governance framework. Archon provides the unified data architecture Philippine universities need to comply with NPC (National Privacy Commission) requirements while modernizing student services.

3. **Cost Reduction Mandate:** Universities globally are under pressure to reduce administrative costs. Archon's target of reducing blended cost-per-ticket from ~$104.68 to ~$22 (79% reduction) directly frees budget for academic programs, faculty hiring, and research — the institution's core mission.[^32]

---

## 4. Scope

**In Scope:**

- Agentic AI service desk for university student support (enrollment, financial aid, registration, academic advising, IT support)
- Web-based and mobile (Flutter PWA) student-facing chat interface
- AI-powered cross-department data orchestration (registrar, bursar, financial aid, academic records)
- Seamless human handoff with full context preservation
- Proactive alert system for deadlines, holds, and balance changes
- Agent dashboard for institutional support staff
- Philippines-first deployment, English and Filipino language support
- Microsoft Copilot Studio + Azure OpenAI hybrid AI architecture

**Out of Scope:**

- Healthcare-specific deployments (hospital contact centers, patient portals) — deferred to Phase 2 vertical expansion
- Hospitality and retail industry applications — architecturally identical but commercially separate
- Agro-industrial supply chain integrations — different go-to-market entirely
- Multi-tenant SaaS for simultaneous multi-institution deployment — deferred to v2
- Direct integration with government systems (CHED, NPC, UniFAST portals) — v1 operates institution-side only
- Legal document generation (privacy policies, terms of use) — CLR maps obligations; counsel drafts the documents

---

## 5. Success Metrics

Each metric gets a stable **ID** (`BRD-M1`, `BRD-M2`, …), never renumbered — the same traceability discipline as features. The GTM tracks these same IDs in its launch metrics, and the QAD verifies the metric is actually instrumented before launch. A metric with no `BRD-M#` downstream is an aspiration, not a target.

| ID | Metric | Baseline | Target | Timeline |
|----|--------|----------|--------|----------|
| BRD-M1 | **Blended cost per ticket** | ~$104.68 (industry average for fully loaded manual ticketing)[^7] | ≤$22 (79% reduction)[^32] | Within 6 months of deployment at first partner university |
| BRD-M2 | **Tier 1 autonomous deflection rate** | 0% (no AI automation currently) | ≥30% of routine inquiries resolved without human intervention[^31] | Within 3 months of deployment |
| BRD-M3 | **Average handle time (human-assisted tickets)** | Industry avg ~8–12 minutes | ≤6 minutes (30–50% reduction, aligned with PwC/Salesforce benchmarks)[^13] | Within 6 months of deployment |
| BRD-M4 | **Dropped/abandoned call rate** | Estimated 15–25% at Philippine university helpdesks | ≤10% (24%+ reduction, aligned with Adventist Health benchmark)[^13] | Within 3 months of deployment |
| BRD-M5 | **Student satisfaction score (NPS)** | TBD — baseline survey at partner university pre-deployment | ≥+30 NPS (from expected negative baseline, given sentiment analysis)[^15–21] | 30-day post-launch survey |
| BRD-M6 | **Digital self-service adoption** | Estimated <10% (most students call or visit in-person) | ≥25% of students using chat/self-service for routine inquiries[^13] | Within 6 months of deployment |

---

## 6. Stakeholders & Owners

| Role | Person | Responsibility |
|------|--------|----------------|
| Sponsor / Decision Maker | TBD — University Partner VP for Student Affairs or CIO | Final approval, institutional buy-in, funding allocation |
| Business Owner | TBD — KPMG AIC Program Lead or Project Champion | Accountable for the outcome; manages university relationship |
| Product / Tech Lead | Regalia Council (Alaric — structure, Crow — research, Thranduil — expression) | Delivering the build; managing the FMD suite and development |

*Note: For the initial build phase, the Regalia Council operates in all three roles. Once a partner university is engaged, the Sponsor and Business Owner roles transfer to institutional stakeholders.*

---

## Self-Check

Before handing this off or moving to the PRD, confirm:

- [x] Section 1 can be read by a non-technical person and makes immediate sense
- [x] Section 2 quantifies the problem (cost per ticket: $0.74–$104.68; escalation costs: $75–$600; handle time benchmarks; sentiment data from 10 ranked user grievances)
- [x] Section 5 has at least one metric with a number and a timeline (6 metrics, all with baselines, targets, and timelines)
- [x] Section 4 explicitly names at least one thing that is out of scope (6 out-of-scope items named)
- [x] Nothing in this document describes *how* to build the solution (architecture deferred to SDD)

---

## References

[^1]: PwC Australia, "A failing grade: the higher education experience deficit"
[^4]: EY, "How universities can keep people at the center of digital transformation"
[^5]: Reddit r/college, "the registrar's office just ruined my ability to attend college"
[^6]: Reddit r/college, "Credit hours increased after financial aid was applied?"
[^7]: ManageEngine, "How to calculate the cost per ticket for IT service desks"
[^8]: MindMesh Academy, "What is Service Desk Management"
[^10]: Deloitte, "Higher Education AI"
[^11]: ABRF Conference News, "Deloitte's Higher Education Trends"
[^12]: Noform, "AI Chatbots for Universities: Benefits, Use Cases & Best Practices"
[^13]: PwC, "Agentic contact center on Salesforce Agentforce"
[^15–21]: Multiple Reddit r/college threads — student sentiment analysis corpus
[^22]: Deloitte, "Workday Student | Higher Education SIS Solutions"
[^24]: MAP.org.ph, "Academic Innovation Challenge: Where Students Build Intelligent Platforms with AI Agents"
[^25]: Newsbytes.PH, "UP tops KPMG's inaugural tech competition for students"
[^31]: Ivanti, "Agentic AI for ITSM Automation"
[^32]: Clovity, "The Most Overlooked Way to Free Up IT Budget for Student Services"

*All references sourced from [Market Research and Competitive Analysis.md](../Market%20Research%20and%20Competitive%20Analysis.md), accessed June 6–7, 2026.*
