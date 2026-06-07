# Compliance & Legal Readiness Register (CLR)

**Project:** Archon — Agentic AI-Powered Service Desk
**Date:** 2026-06-07
**Version:** 0.1
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
| Philippines (Data Privacy Act 2012, RA 10173) | Yes | Primary market. Data localization preferred but not strictly mandated if protection is equivalent. |
| European Union / UK (GDPR / UK GDPR) | No | Not actively targeted in V1. |
| California, USA (CCPA / CPRA) | No | Not actively targeted in V1. |
| Other: USA (FERPA compliance) | Yes | Highly relevant if scaling to US universities or managing US student data. Treat PH data with FERPA-equivalent strictness. |

**Geo-blocking:** None — globally accessible to enrolled students traveling abroad, so underlying data protection must be robust regardless of physical location.

---

## 1. Data Inventory / Record of Processing

| Activity | Purpose | Data categories | Data subjects | Recipients / sub-processors | Cross-border transfer | Retention | Legal basis |
|----------|---------|-----------------|---------------|-----------------------------|-----------------------|-----------|-------------|
| Authentication | Verify identity via SSO | Email, Student ID, Name | Students, Staff | Azure AD / University IdP | Dependent on Azure region (prefer SE Asia) | Life of session + 24h | Legitimate interest (service provision) |
| Conversation Logging | Audit, analytics, AI context | Chat transcripts (scrubbed of PII) | Students | Archon PostgreSQL, Azure OpenAI | US/Global (Azure OpenAI endpoints) | 30 days (raw), 1 year (scrubbed) | Legitimate interest / Consent |
| Financial Status Query | Resolve balance inquiries | Tuition balances, hold status | Students | Gateway to University Bursar API | None (transit only, no storage) | Ephemeral (5 min cache) | Performance of a contract |
| Agent Escalation | Handoff to human staff | HandoffPacket JSON, Name, Issue | Students | Archon PostgreSQL | None | 90 days | Performance of a contract |

**Sensitivity flags:**

| Data type | Collected? | Notes |
|-----------|-----------|-------|
| Basic PII (name, email) | Yes | Received from IdP via SSO. |
| Special-category (health, etc.) | No | Out of scope. Health center inquiries must be deflected to external health services. |
| Children's data | No | Higher education context (generally 17+). |
| Financial / Payment data | Yes | Read-only. Archon views balances but *never* processes payments directly. |

---

## 2. Multi-Jurisdiction Obligations Matrix

| Dimension | Philippines DPA 2012 |
|-----------|----------------------|
| **Consent / legal basis** | Consent or performance of a contract (provision of university services). Student handbook ToS updates usually cover this. |
| **Data subject rights** | Access, correct, erase/block, object, portability, claim damages. |
| **Breach notification** | NPC **and** subjects ≤72h from knowledge if real risk of serious harm. |
| **DPO / representative** | **Mandatory DPO** required for the university. Archon must designate a Compliance Officer to interface with university DPOs. |
| **Cross-border transfer** | Controller (University) stays accountable; comparable protection required for processors (Archon). |
| **Our status / action** | Need Data Processing Agreement (DPA) with partner universities. |

---

## 3. Escalation Flags — Counsel Required

*Any "Yes" here means: do not launch this surface without a lawyer.*

| Flag | Present? | Why it escalates |
|------|----------|------------------|
| Health / medical data | No | |
| Payments / card data | Yes (Read-only) | Even read-only access to balances requires strict audit logging. |
| Automated decisions with legal/significant effect | Yes | AI triggering a hold lift could impact enrollment status. |
| Large-scale / systematic monitoring or profiling | Yes | Continuous AI analysis of student inquiries across the entire university body. |

**DPIA required?** Yes — A Data Protection Impact Assessment is highly recommended before deploying AI against student academic and financial records.

---

## 4. Terms of Use / EULA Readiness

| Clause | Present? | Evidence link | Counsel needed? |
|--------|----------|---------------|-----------------|
| License grant + scope | [ ] | | Yes |
| Acceptable use / prohibited conduct (e.g., prompt injection bans) | [ ] | | Yes |
| Limitation of liability (Crucial for AI hallucination protection) | [ ] | | Yes |
| Dispute resolution | [ ] | | Yes |

---

## 5. IP Infringement & Protection Readiness

| Item | Status | Evidence link | Counsel needed? |
|------|--------|---------------|-----------------|
| Product/brand name trademark knockout search ("Archon") | Pending | | Yes |
| AI training-data provenance + model-output ownership reviewed | Pending | Azure OpenAI ToS applies | Yes |
| Open-source license compliance (SBOM maintained) | Pending | Generated via CI | No |

---

## Self-Check

- [x] Declares primary market (Philippines).
- [x] Maps data inventory (SSO, Logging, Queries).
- [x] Escalation flags raised for automated decisions and large-scale monitoring.
- [x] DPIA identified as necessary.
