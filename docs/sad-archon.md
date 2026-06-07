# Subagents Document (SAD)

**Project:** Archon — Agentic AI-Powered Service Desk
**Date:** 2026-06-07
**Version:** 0.1
**Owner:** Regalia Council (Alaric)
**Status:** Draft
**Last reconciled:** N/A — not yet reconciled with code
**PRD:** [prd-archon.md](prd-archon.md)
**SDD:** [sdd-archon.md](sdd-archon.md)
**QAD:** [qad-archon.md](qad-archon.md)

---

## 1. Orchestration Strategy

Archon is built by AI agents, for AI agents. The Regalia Council manages the overarching architecture, but specific development tasks are delegated to specialized subagents. This document defines the roster of builder agents responsible for constructing and verifying Archon's codebase.

**Anti-Sprawl Principle:** We utilize exactly 4 specialist agents. No ad-hoc agents are created. If a task doesn't fit a specialist, it is executed inline by the main orchestration agent.

---

## 2. Agent Roster

| ID | Name | Role & Specialization | Persona / Tone |
|----|------|-----------------------|----------------|
| `SAD-A1` | **Feature Builder** (`archon-feature-builder`) | Implements full-stack features. Specializes in Flutter PWA UI and Node.js backend logic. Reads the PRD for requirements and the SDD for architectural boundaries. | Pragmatic, fast, focused on shipping code that compiles. |
| `SAD-A2` | **Adapter Scaffolder** (`archon-adapter-scaffolder`) | Generates boilerplate and mapping logic for University Data Adapters (`PRD-F2`). Reads API documentation (WSDL, OpenAPI) from legacy systems and maps them to the `IUniversityAdapter` interface. | Pedantic, highly focused on data types and error handling. |
| `SAD-A3` | **Test Runner** (`archon-test-runner`) | Executes the QAD test suite. Writes unit tests in Jest, UI tests in Flutter, and configures Promptfoo for AI evaluations. Triages test failures and routes fixes back to `SAD-A1`. | Ruthless, skeptical, focused on edge cases and abuse scenarios. |
| `SAD-A4` | **Compliance Checker** (`archon-compliance-checker`) | Validates code against the CLR. Specifically audits for PII logging, hardcoded secrets, and lack of RBAC enforcement before code is merged. | Strict, uncompromising on security and privacy. |

---

## 3. Delegation & Handoff Protocols

**Standard Feature Implementation Loop:**
1. Orchestrator reads PRD feature (e.g., `PRD-F1`).
2. Orchestrator invokes `SAD-A1` (Feature Builder) with context: "Implement PRD-F1 according to DSD aesthetics and SDD architecture."
3. `SAD-A1` writes code and returns.
4. Orchestrator invokes `SAD-A3` (Test Runner) to verify `SAD-A1`'s work against the QAD.
5. If `SAD-A3` finds issues, Orchestrator loops back to `SAD-A1`.
6. Once green, Orchestrator invokes `SAD-A4` (Compliance Checker) for final review.

**Adapter Implementation Loop:**
1. Orchestrator provides legacy API docs to `SAD-A2` (Adapter Scaffolder).
2. `SAD-A2` generates the adapter.
3. Orchestrator tests the adapter.

## 4. Platform Materialization

The subagents defined above are materialized as distinct skill folders or configuration files depending on the development environment.

| Target Platform | Materialization Method |
|-----------------|------------------------|
| **Claude Code** | `.claude/agents/` — Each agent gets a dedicated Markdown instruction file. |
| **Cursor** | `.cursor/rules/` — Each agent's persona and constraints are mapped to Cursor rules. |
| **Antigravity** | `skills/` — Each agent is implemented as an Antigravity skill for invocation. |

---

## Self-Check

- [x] Strict limit applied (4 agents defined, preventing sprawl).
- [x] Roles directly map to the architecture (Feature Builder, Adapter Scaffolder).
- [x] Test and Compliance roles are explicitly separated from the Builder roles.
- [x] Clear handoff protocols defined for standard development loops.
