# Operations & Observability Runbook (OPS)

**Project:** Archon — Agentic AI-Powered Service Desk
**Date:** 2026-06-07
**Version:** 0.1
**Owner:** Regalia Council (Alaric)
**Status:** Draft
**Last reconciled:** N/A
**PRD:** [prd-archon.md](prd-archon.md)
**SDD:** [sdd-archon.md](sdd-archon.md)

---

## 1. System Health Dashboard (The "Single Pane of Glass")

Archon operations revolve around a single observability dashboard (Datadog/Grafana) that tracks the three pillars of hybrid AI health:

### 1.1 Gateway Health (Node.js)
- **Adapter Latency:** Time taken to fetch data from legacy university systems (Target: P95 < 2s).
- **Adapter Error Rates:** Frequency of `ARCHON_SYSTEM_UNAVAILABLE` errors.
- **RAG Postgres Performance:** Vector search latency on policy documents (Target: P95 < 200ms).

### 1.2 Orchestration Health (Copilot Studio)
- **Topic Match Rate:** Percentage of user queries successfully routed to a defined topic vs. falling back to the generic LLM node (Target: >85%).
- **Escalation Rate:** Percentage of sessions ending in human handoff (Target: decreasing over time).
- **Handoff Synthesizer Failure Rate:** Errors when creating the `HandoffPacket`.

### 1.3 LLM Health (Azure OpenAI)
- **Time to First Token (TTFT):** Measures perceived responsiveness (Target: < 3s).
- **Token Usage / Cost Burn:** Real-time tracking of token spend against university quotas.
- **Content Filter Blocks:** Rate of prompts blocked by Azure's safety filters (indicates potential abuse).

---

## 2. Alerts & Incident Response

### Severity 1 (Critical) - PagerDuty Immediate Page
*Definition: Core system down; students cannot access service or human agents.*
- **Triggers:** Node.js Gateway 502/503 > 5% for 2 mins; Azure OpenAI quota exceeded; PostgreSQL connection limit reached.
- **Immediate Action:** Scale horizontally (Azure App Service / K8s). Check Azure Status page. If OpenAI is down, flip Copilot Studio to "Degraded Mode" (bypass LLM, static routing to human agents only).

### Severity 2 (High) - PagerDuty Page (Business Hours)
*Definition: Major component degraded; AI hallucinating heavily or failing to escalate.*
- **Triggers:** Adapter latency > 10s for 5 mins (university system slow); LLM Factuality Eval drops below 90% in daily batch.
- **Immediate Action:** Check university API status. Review recent Promptfoo eval logs. Roll back any recent Copilot Studio topic updates.

### Severity 3 (Warning) - Slack Alert
*Definition: Non-critical anomalies.*
- **Triggers:** Sudden spike in a specific intent (e.g., thousands of queries about "Typhoon suspension").
- **Immediate Action:** Operations team to quickly draft a "Broadcast Message" pinning the answer to the top of the chat interface, deflecting LLM token costs.

---

## 3. Maintenance Cadence

| Task | Frequency | Owner | Description |
|------|-----------|-------|-------------|
| **Policy Document Sync** | Nightly | Gateway Job | Scrape university web pages/PDFs, re-embed vectors into PostgreSQL for RAG accuracy. |
| **Hallucination Triage** | Weekly | AI Ops Engineer | Review sessions flagged with poor CSAT (BRD-M5) to identify prompt weaknesses or missing context. |
| **Adapter Audit** | Monthly | Gateway Engineer | Review error logs for university adapters to catch silent API deprecations on the institution's side. |
| **Token Cost Analysis**| Monthly | FinOps | Analyze token spend per intent. Look for optimization opportunities (e.g., caching frequent exact-match queries). |

---

## 4. Disaster Recovery

- **RTO (Recovery Time Objective):** 4 Hours
- **RPO (Recovery Point Objective):** 1 Hour
- **Procedure:** 
  1. Failover PostgreSQL database to secondary region.
  2. Redeploy Node.js Gateway via GitHub Actions to secondary region.
  3. Ensure Azure Key Vault secrets are synced to the secondary region. Copilot Studio is SaaS and relies on Microsoft's internal redundancy.
