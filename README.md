# Archon — Agentic AI-Powered Service Desk

Archon is an autonomous, agentic AI service desk designed specifically for higher education institutions in the Philippines. It aims to eliminate the "experience deficit" students face when navigating fragmented university bureaucracy—such as delayed enrollments, unclear financial holds, and misrouted inquiries across departments (Registrar, Bursar, Financial Aid, etc.).

## 🚀 Vision
*Stop making students navigate the org chart.*

Archon isn't just a chatbot that points to FAQs. It is an **autonomous agent** capable of directly interacting with internal university APIs to read status, diagnose complex cross-departmental issues, and synthesize clear, actionable responses in multiple languages (English, Filipino, Cebuano).

## 🏗️ Architecture
Archon uses a **Hybrid Orchestration Model**:
- **Microsoft Copilot Studio:** Handles intent recognition and deterministic routing to enforce strict guardrails.
- **Azure OpenAI:** Synthesizes structured API data into conversational, empathetic responses.
- **Node.js API Gateway (The Adapter Pattern):** A centralized middleware that standardizes messy, legacy university APIs (SOAP, PHP, SQL) into a single, clean GraphQL/REST interface for the AI to query safely.

## 📚 Documentation
The full architectural blueprint and product requirements are available in the `docs/` directory.

- [Business Requirements Document (BRD)](docs/brd-archon.md)
- [Product Requirements Document (PRD)](docs/prd-archon.md)
- [System Design Document (SDD)](docs/sdd-archon.md)
- [Design System Document (DSD)](docs/dsd-archon.md)

### Agent Operations
To build on this project, please consult the canonical **[Build Guide / AGENTS.md](docs/build-archon.md)**.

## 🔒 Security & Privacy
Archon is designed with Philippine Data Privacy Act (DPA 2012) compliance at its core. 
- The AI has **Read-Only** access by default.
- Any write-actions (e.g., lifting holds) require explicit Human-in-the-Loop (HITL) confirmation.
- Robust Prompt Injection filters and Role-Based Access Control (RBAC) prevent cross-tenant queries.

---
*Project Archon is part of an initiative to modernize student services, reducing cost-per-ticket while dramatically improving student satisfaction.*
