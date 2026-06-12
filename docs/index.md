# Documentation Index — Archon

**Project slug:** `archon`
**Maintained by:** Regalia Council
**Last updated:** 2026-06-12

---

## 1. Document Suite

| Document | File | Version | Status | Last Updated | Last Reconciled |
|----------|------|---------|--------|--------------|-----------------|
| BRD — Business Requirements | [brd-archon.md](brd-archon.md) | 0.2 | Draft | 2026-06-07 | 2026-06-12 |
| PRD — Product Requirements | [prd-archon.md](prd-archon.md) | 0.2 | Draft | 2026-06-07 | 2026-06-12 |
| DSD — Design System | [dsd-archon.md](dsd-archon.md) | 0.2 | Draft | 2026-06-12 | 2026-06-12 |
| SDD — System Design | [sdd-archon.md](sdd-archon.md) | 0.2 | Draft | 2026-06-12 | 2026-06-12 |
| QAD — QA & Test Plan | [qad-archon.md](qad-archon.md) | 0.2 | Draft | 2026-06-12 | 2026-06-12 |
| SAD — Subagents | [sad-archon.md](sad-archon.md) | 0.2 | Draft | 2026-06-12 | 2026-06-12 |
| BUILD — Build Guide | [build-archon.md](build-archon.md) | 0.2 | Draft | 2026-06-12 | 2026-06-12 |
| CLR — Compliance & Legal | [clr-archon.md](clr-archon.md) | 0.2 | Draft | 2026-06-07 | 2026-06-12 |
| GTM — Go-To-Market | [gtm-archon.md](gtm-archon.md) | 0.2 | Draft | 2026-06-07 | 2026-06-12 |
| OPS — Ops & Observability | [ops-archon.md](ops-archon.md) | 0.2 | Draft | 2026-06-12 | 2026-06-12 |
| Cosmos DB Integration Guide | [cosmos-db-integration-guide.md](cosmos-db-integration-guide.md) | 1.0 | Active | 2026-06-08 | 2026-06-12 |

### RFCs (one per major feature)

| RFC ID | File | Feature | Status | Last Updated |
|--------|------|---------|--------|--------------|
| archon-rfc-001 | [rfc-archon-agentic-orchestration.md](rfc-archon-agentic-orchestration.md) | Agentic Workflow Orchestration (Azure AI Foundry) | Accepted | 2026-06-07 |
| archon-rfc-002 | [rfc-archon-human-handoff.md](rfc-archon-human-handoff.md) | Seamless Human Handoff | Accepted | 2026-06-07 |
| archon-rfc-003 | [rfc-archon-university-adapters.md](rfc-archon-university-adapters.md) | University Data Adapters | Accepted | 2026-06-07 |
| archon-rfc-004 | [rfc-archon-m365-integration.md](rfc-archon-m365-integration.md) | Microsoft 365 Integration (Entra ID, Graph API, Teams, Outlook, Calendar) | Accepted | 2026-06-07 |

---

## 2. Change Log

Every material change to a Locked document is recorded as a Change Record. Newest first.

| CR ID | Date | Summary | Trigger doc | Docs touched | File |
|-------|------|---------|-------------|--------------|------|
| CR-009 | 2026-06-12 | Full documentation reconciliation: Fixed stale Node.js API Gateway and KeyVault references in README/AGENT/SDD. Updated Next.js 14.x→16.x in BUILD. Synced 4 DSD color tokens to globals.css. Added test scenarios for streaming, SAP Wizard, CSAT, Power Automate callbacks, AI confidence scoring. Added monitoring for SSE stability, CSAT rates, Power Automate callbacks. Updated all reconciliation dates. Added cosmos-db-integration-guide.md to index. | USER | README, AGENT, SDD, BUILD, DSD, QAD, OPS, SAD, PRD, BRD, GTM, CLR, INDEX, client/README | All docs v0.2 |
| CR-008 | 2026-06-10 | Fonts changed to Outfit & Plus Jakarta Sans. UI Tokens updated to align with sage (#0D9488) and proper border radii. | USER | DSD, INDEX | All docs v0.2 |
| CR-007 | 2026-06-09 | Staff workspace layout shift and loading state optimization. Split admin routes into dedicated /admin/analytics (with root /admin redirect) and /admin/queue. Audited layouts to ensure persistent staff sidebars (Lucide icons) and local spinner encapsulation, eliminating dashboard route transition flashes. | USER | DSD, SDD, QAD, INDEX | All docs v0.2 |
| CR-006 | 2026-06-08 | Reconcile implementation: Scanned and confirmed full alignment of UI components, NextAuth.js session RBAC, Cosmos DB service client, Graph API calendar integrations, retry logs, and compliance filters across all active documents. | USER | PRD, DSD, SDD, CLR, QAD, OPS, SAD, BUILD, INDEX | All docs v0.2 |
| CR-005 | 2026-06-07 | CSS Framework standard: Pinned Tailwind CSS v4.x replacing default Vanilla CSS; updated build-archon.md, dsd-archon.md, and index.md. | USER | DSD, BUILD, INDEX | All docs v0.2 |
| CR-001 | 2026-06-07 | Tech stack modernization: Azure AI Foundry replaces Azure OpenAI service; Microsoft Copilot Studio removed; Cosmos DB replaces PostgreSQL; Entra ID + Microsoft Graph API added for M365 integration (Calendar, Teams, Outlook); new PRD-F11 and RFC-004. | PRD | ALL | All docs v0.2 |
| CR-002 | 2026-06-07 | Architecture update: Azure Key Vault removed (switched to Vercel Env Vars). Azure Functions Notification Scheduler replaced with Power Automate. | PRD | ALL | All docs v0.2 |
| CR-003 | 2026-06-07 | Frontend framework migration: Replaced Flutter PWA with Next.js React web application deployed on Vercel. Replaced MSAL.js with NextAuth.js (Auth.js) for Entra ID authentication. Replaced Flutter Driver with Playwright. | PRD | ALL | All docs v0.2 |
| CR-004 | 2026-06-07 | Monolith Migration: Collapsed standalone Node.js API Gateway (Express) into Next.js API Routes, transitioning to a single Next.js full-stack Vercel deployment. | PRD | ALL | All docs v0.2 |
| CR-005 | 2026-06-07 | Cloud Hosting Migration: Migrated Next.js hosting from Azure App Service to Vercel (Serverless Functions + Edge). Cosmos DB, Entra ID, and AI Foundry remain in Azure. | PRD | ALL | All docs v0.2 |

---

## 3. Incident Log (Postmortems)

Every P0/P1 incident gets a Postmortem. Newest first.

| PM ID | Incident date | Severity | Summary | Action items closed? | File |
|-------|---------------|----------|---------|----------------------|------|
| *(none yet)* | — | — | — | — | — |

---

## 4. Health Check

Quick triage an agent runs at the start of a session. Anything that fails gets surfaced to the user.

- [ ] Every Locked doc's **Last Reconciled** date is newer than the last code change to its area.
- [ ] No doc has been in `Draft` longer than expected without movement.
- [ ] Every open Change Record has propagated to all docs listed in its "Docs touched" column.
- [ ] Feature IDs (`PRD-F#`) referenced by SDD / RFC / QAD / SAD / BUILD still exist in the PRD.
- [ ] Metric IDs (`BRD-M#`) flow to the GTM and have a feeding event in PRD §5.5.
- [ ] The SAD roster matches the materialized agent files (no orphans, no missing).
- [ ] The BUILD guide's pinned versions and golden-path samples have been re-verified recently (stale samples = stale code).
- [ ] Every open Postmortem's action items are closed (or tracked somewhere durable).
- [ ] No references to "Microsoft Copilot Studio" remain (replaced by Azure AI Foundry).
- [ ] No references to "PostgreSQL" as primary database remain (replaced by Cosmos DB).
- [ ] No references to "Azure Key Vault" or `KeyVault` remain (replaced by Vercel Env Vars in CR-002).
- [ ] No references to `gateway/`, `scheduler/`, or `infra/` directories remain (collapsed into Next.js monolith in CR-004).
- [ ] PRD-F11 (M365 Integration) is traced through SDD §9, RFC-004, QAD §2/§3, and CLR §1.

---

## 5. Notes

- **Source research:** [Market Research and Competitive Analysis.md](../Market%20Research%20and%20Competitive%20Analysis.md) — the foundational market analysis driving all FMD documents.
- **FMD templates:** Canonical templates are maintained separately. Do not edit templates during doc generation.
- **Project scale:** Full (11 core documents + 4 RFCs + 1 integration guide).
- **Primary market:** Philippines-first (RA 10173 / Data Privacy Act 2012).
- **Tech stack:** Azure-native. Entra ID (identity) + Azure AI Foundry (AI) + Cosmos DB (data) + Microsoft Graph (M365). Hosted on Vercel.
