# Archon — Agentic AI-Powered Service Desk

Archon is an autonomous, agentic AI service desk designed specifically for higher education institutions in the Philippines. It aims to eliminate the "experience deficit" students face when navigating fragmented university bureaucracy—such as delayed enrollments, unclear financial holds, and misrouted inquiries across departments (Registrar, Bursar, Financial Aid, etc.).

## 🚀 Vision
*Stop making students navigate the org chart.*

Archon isn't just a chatbot that points to FAQs. It is an **autonomous agent** capable of directly interacting with internal university APIs to read status, diagnose complex cross-departmental issues, and synthesize clear, actionable responses in multiple languages (English, Filipino, Cebuano).

## 🏗️ Architecture
Archon uses a **native Azure AI architecture**:
- **Azure AI Foundry:** The unified AI platform powering agent orchestration, model deployment (GPT-4o), Retrieval-Augmented Generation (RAG), evaluation, and tracing. Replaces the need for separate orchestration tooling.
- **Azure Cosmos DB for NoSQL:** Serverless, globally distributed document database with native vector search for RAG — storing tickets, conversations, handoff packets, and policy embeddings.
- **Node.js API Gateway (The Adapter Pattern):** A centralized middleware that standardizes messy, legacy university APIs (SOAP, PHP, SQL) into a single, clean REST interface for the AI to query safely.
- **Microsoft 365 Integration:** Microsoft Entra ID handles authentication (OIDC/OAuth 2.0). The Microsoft Graph API powers M365 Calendar display in the student dashboard, and delivers deadline reminders and ticket notifications via Microsoft Teams adaptive cards and Outlook email.

## 📚 Documentation
The full architectural blueprint and product requirements are available in the `docs/` directory.

- [Business Requirements Document (BRD)](docs/brd-archon.md)
- [Product Requirements Document (PRD)](docs/prd-archon.md)
- [System Design Document (SDD)](docs/sdd-archon.md)
- [Design System Document (DSD)](docs/dsd-archon.md)
- [Cosmos DB Integration Guide](docs/cosmos-db-integration-guide.md)

### Agent Operations
- **[AI Agent Playbook (AGENT.md)](AGENT.md)** — Core orchestration and health check playbook for AI agents.
- **[Build Guide (build-archon.md)](docs/build-archon.md)** — Stack currency and golden-path code patterns.

## 🔒 Security & Privacy
Archon is designed with Philippine Data Privacy Act (DPA 2012) compliance at its core.
- The AI has **Read-Only** access by default.
- Any write-actions (e.g., lifting holds) require explicit Human-in-the-Loop (HITL) confirmation.
- Robust Prompt Injection filters and Role-Based Access Control (RBAC) enforce student data isolation.
- Microsoft Entra ID enforces identity; no credentials are stored by Archon.
- Microsoft Graph API access is governed by tenant-level admin consent and least-privilege OAuth scopes.

## 🏢 Microsoft 365 Integration
Archon is built to run natively within a university's existing Microsoft 365 ecosystem:
| Capability | Microsoft Service |
|---|---|
| Authentication & Identity | Microsoft Entra ID (OIDC) |
| AI Agent Orchestration & Models | Azure AI Foundry (GPT-4o) |
| Database & Vector Search | Azure Cosmos DB for NoSQL |
| Student Calendar | Microsoft Graph — Calendars.Read |
| Deadline Reminders | Microsoft Power Automate (Teams + Outlook connectors) |
| Secrets Management | Azure App Service Environment Variables (`.env`) |
| Monitoring & Tracing | Azure Monitor + Application Insights + AI Foundry Tracing |

---
*Project Archon is part of an initiative to modernize student services, reducing cost-per-ticket while dramatically improving student satisfaction.*
