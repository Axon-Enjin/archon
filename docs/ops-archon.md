# Operations & Observability Runbook (OPS)

**Project:** Archon — Agentic AI-Powered Service Desk
**Date:** 2026-06-07
**Version:** 0.2
**Owner:** Regalia Council (Alaric)
**Status:** Draft
**Last reconciled:** N/A
**PRD:** [prd-archon.md](prd-archon.md)
**SDD:** [sdd-archon.md](sdd-archon.md)

---

## 1. System Health Dashboard (The "Single Pane of Glass")

Archon operations revolve around **Azure Monitor + Application Insights**, integrated with **Azure AI Foundry Tracing**. This provides a unified observability pane across all system layers — no separate Datadog or Grafana instance required.

### 1.1 Gateway Health (Node.js on Azure App Service)
- **Adapter Latency:** Time taken to fetch data from legacy university systems (Target: P95 < 2s). Tracked via Application Insights custom metrics.
- **Adapter Error Rates:** Frequency of `ARCHON_SYSTEM_UNAVAILABLE` errors per adapter.
- **Cosmos DB Latency:** P95 read/write latency on `conversations`, `messages`, and `handoffs` collections (Target: P95 < 50ms for point reads).
- **Graph API Call Success Rate:** Percentage of Microsoft Graph API calls succeeding (Calendar, Teams, Outlook). Target: >99% under normal load. Throttle (429) rate tracked separately.

### 1.2 AI Health (Azure AI Foundry)
- **Time to First Token (TTFT):** Measures perceived responsiveness (Target: < 3s). Tracked via AI Foundry Tracing, forwarded to Application Insights.
- **Tool Call Latency:** Per-tool latency (CheckStudentHolds, CheckFinancialAidStatus, GetCalendarEvents, etc.). High latency indicates adapter or Graph API degradation.
- **Token Usage / Cost Burn:** Real-time tracking of GPT-4o and Phi-4 token spend against monthly budget alert (≥$120/month = alert).
- **Content Filter Blocks:** Rate of prompts blocked by Azure AI Foundry's safety filters (indicates potential abuse or adversarial use).
- **AI Foundry Eval Scores:** Daily batch results from AI Foundry evaluation suite (factuality, tone, language detection). Tracked as custom Application Insights events.
- **Phi-4 Deflection Rate:** Percentage of queries resolved by Phi-4 without GPT-4o invocation (target: 40–60%). Tracks cost optimization effectiveness.

### 1.3 M365 Integration Health (Microsoft Graph)
- **Graph API Throttle Rate:** Frequency of 429 responses from Microsoft Graph (Calendar, Teams, Outlook endpoints).
- **Notification Delivery Success Rate:** Percentage of Teams adaptive cards and Outlook emails successfully delivered per daily scheduler run.
- **Calendar Panel Load Success Rate:** Percentage of Home Dashboard loads where the M365 Calendar panel rendered successfully (vs. fell back to graceful error state).
- **Pending Notification Queue Depth:** Number of notifications in the retry queue (Teams/Outlook send failures awaiting retry).

---

## 2. Alerts & Incident Response

### Severity 1 (Critical) — Azure Monitor Action Group: Immediate Page
*Definition: Core system down; students cannot access service or human agents.*
- **Triggers:**
  - Node.js Gateway 502/503 > 5% for 2 mins (App Service health check)
  - Azure AI Foundry quota exhausted (token limit reached)
  - Cosmos DB connection failures (> 1% error rate on reads)
- **Immediate Action:**
  1. Scale App Service horizontally (add instances via Azure portal or auto-scale rule).
  2. Check Azure Status page (status.azure.com) for regional incidents.
  3. If AI Foundry is down: flip `ARCHON_AI_ENABLED = false` feature flag in Cosmos DB config → Gateway auto-routes to human agent queue.
  4. If Cosmos DB is down: flip `ARCHON_MAINTENANCE_MODE = true` → display maintenance page with direct contact info.

### Severity 2 (High) — Azure Monitor Action Group: Email + Teams Alert (Business Hours)
*Definition: Major component degraded; AI performance degraded or M365 integration failing.*
- **Triggers:**
  - Adapter latency > 10s for 5 mins (university system slow)
  - AI Foundry Factuality Eval drops below 90% in daily batch
  - Graph API throttle rate > 10% on notification scheduler run
  - Notification delivery success rate < 90% on daily scheduler run
- **Immediate Action:**
  - Adapter latency: Check university API status page. Consider temporarily disabling the affected adapter (sets affected tool to `ARCHON_SYSTEM_UNAVAILABLE` response).
  - AI Foundry eval degradation: Review recent AI Foundry Tracing logs for prompt changes or new abuse patterns.
  - Graph throttling: Review Graph API usage. Implement request batching or reduce notification scheduler frequency.

### Severity 3 (Warning) — Teams Channel Alert
*Definition: Non-critical anomalies.*
- **Triggers:** Sudden spike in a specific intent (e.g., thousands of queries about "Typhoon suspension"), M365 Calendar panel error rate > 5%.
- **Immediate Action:** Operations team to quickly draft a "Broadcast Message" pinning the answer to the top of the chat interface, deflecting AI Foundry token costs. For Calendar errors, check Microsoft Graph service health at admin.microsoft.com.

---

## 3. Maintenance Cadence

| Task | Frequency | Owner | Description |
|------|-----------|-------|-------------|
| **Policy Document Sync** | Nightly | Power Automate scheduled flow | Scrape university web pages/PDFs, re-embed vectors into Cosmos DB Vector Search collection for RAG accuracy. |
| **Hallucination Triage** | Weekly | AI Ops Engineer | Review sessions flagged with poor CSAT (BRD-M5) using AI Foundry Tracing. Identify prompt weaknesses or missing RAG context. |
| **Adapter Audit** | Monthly | Gateway Engineer | Review Application Insights adapter error logs. Catch silent API deprecations on the university's side. |
| **Token Cost Analysis** | Monthly | FinOps | Analyze GPT-4o vs. Phi-4 token spend per intent in Application Insights. Look for optimization opportunities (expand Phi-4 routing). |
| **Graph API Scope Review** | Quarterly | Compliance Officer | Verify that only the documented Graph API scopes (RFC-004 §4.2) are in use. Confirm no scope creep in app registration. |
| **Entra ID Token Rotation** | As per institutional policy | Platform Engineer | Rotate Archon client secret in Entra ID app registration. Update Azure App Service Environment Variables. |

---

## 4. Disaster Recovery

- **RTO (Recovery Time Objective):** 4 Hours
- **RPO (Recovery Point Objective):** 1 Hour
- **Procedure:**
  1. Failover Cosmos DB to secondary region (Azure Cosmos DB multi-region writes enabled — SE Asia primary, East Asia secondary).
  2. Redeploy Node.js Gateway via GitHub Actions tagged release to secondary App Service slot.
  4. Confirm Power Automate Cloud Flows are correctly imported or exist in the target region.
  5. Update DNS (Azure Traffic Manager) to point to secondary region.
  6. AI Foundry and Microsoft Graph are Microsoft-managed SaaS — rely on Microsoft's internal redundancy. Monitor at status.azure.com and admin.microsoft.com.
  7. Post-recovery: verify Graph API admin consent is still valid in the university Entra ID tenant (consent is tenant-bound, not region-bound).
