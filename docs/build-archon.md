# Project Build Guide (BUILD)

**Project:** Archon — Agentic AI-Powered Service Desk
**Date:** 2026-06-07
**Version:** 0.1
**Owner:** Regalia Council (Alaric)
**Status:** Draft
**Last reconciled:** N/A — not yet reconciled with code
**PRD:** [prd-archon.md](prd-archon.md)
**SDD:** [sdd-archon.md](sdd-archon.md)
**SAD:** [sad-archon.md](sad-archon.md)

---

> **Agent Instructions**
>
> **What this is:** the operating manual for whoever **builds** the product — human or agent. It dictates read order, stack versions, deprecations, and golden-path patterns.
>
> **Output:** This file `docs/build-archon.md` is canonical. It will be materialized to the project root as `AGENTS.md` before coding begins.

---

## 1. How to Build From These Docs

The documentation suite is the source of truth. Read in this order before writing code:

1. **`docs/index.md`** — Start here every session.
2. **PRD** — What to build and why (`PRD-F1` to `PRD-F10`).
3. **SDD** — How the system is architected (Gateway + Copilot Studio + Azure OpenAI).
4. **RFCs** — Implementation decisions for Orchestration, Handoff, and Adapters.
5. **DSD** — Visual tokens and UI components (Warm & Approachable).
6. **This guide** — Stack conventions, patterns, guardrails.

**Traceability map:**

| To implement… | Read | Then verify against |
|---------------|------|---------------------|
| An AI Orchestration Feature | PRD §3 → SDD §8 → RFC 001 | QAD Prompt Evaluations |
| A University Data Adapter | PRD-F2 → SDD §4 → RFC 003 | QAD Sad Paths (Timeouts) |
| A UI Chat Component | DSD §3.2 → PRD §5 | DSD a11y requirements |

---

## 3. Stack Currency & Deprecations

> **Do not rely on training memory for fast-moving frameworks.** Verify conventions against official docs for the pinned versions below before writing code.

### Pinned Stack

| Layer | Technology | Pinned version | Convention verified |
|-------|------------|----------------|---------------------|
| Client Language | Dart | 3.4.x | 2026-06-07 |
| Client Framework | Flutter | 3.22.x | 2026-06-07 |
| Backend Language| TypeScript | 5.4.x | 2026-06-07 |
| Backend Framework| Node.js + Express | v20 LTS / 4.19.x | 2026-06-07 |
| Database / ORM | PostgreSQL + Prisma | 16 / 5.14.x | 2026-06-07 |
| AI Orchestration| Microsoft Copilot Studio| Latest | 2026-06-07 |
| AI Reasoning | Azure OpenAI SDK | 1.0.0-beta.12+ | 2026-06-07 |

### Deprecations & Convention Changes

| ❌ Stale / deprecated | ✅ Current convention | Since |
|----------------------|----------------------|-------|
| Older OpenAI Node.js SDK patterns | Use the official `@azure/openai` SDK for Azure-specific auth and deployments. | 2024+ |
| Raw SQL for simple queries | Use Prisma ORM for standard CRUD; raw SQL only for complex `pgvector` operations. | Project start |

---

## 4. Golden-Path Patterns

### 4.1 University Data Adapter Pattern (TypeScript)

*verified 2026-06-07 against Node.js v20*

```typescript
import { IUniversityAdapter, ArchonHold } from '../interfaces';
import axios from 'axios';

export class ExampleUniversityAdapter implements IUniversityAdapter {
  async getAcademicHolds(studentId: string): Promise<ArchonHold[]> {
    try {
      // Direct call to the university's legacy API
      const response = await axios.get(`https://api.example-univ.edu/v1/students/${studentId}/holds`, {
        timeout: 5000 // Strict 5s timeout per RFC-003
      });
      
      // Map to Archon standard schema
      return response.data.map(hold => ({
        id: hold.HoldID,
        department: 'Registrar',
        reason: hold.Description,
        canAutoLift: false
      }));
    } catch (error) {
      console.error(`Adapter Error: Failed to fetch holds for ${studentId}`, error);
      throw new Error('ARCHON_SYSTEM_UNAVAILABLE'); // Caught by Gateway to gracefully degrade AI
    }
  }
  // ... other methods
}
```

*Why this shape:* Enforces the contract defined in RFC-003. Strict timeouts prevent the LLM from hanging. Errors are caught and standardized so the AI knows how to react gracefully.

---

## 5. Conventions & Guardrails

**Repo layout:**
- `/client` — Flutter PWA application.
- `/gateway` — Node.js Express server, Prisma schema, and Adapters.
- `/docs` — FMD documentation suite.
- `/copilot-studio` — Exported Copilot Studio solution configurations.

**Always:**
- Validate external input at the Gateway boundary using `Zod`.
- Scrub PII (names, specific IDs) from chat transcripts before saving to the database.
- Require explicit boolean confirmation (Human-in-the-Loop) before executing any write operations (e.g., lifting a hold).

**Never:**
- Commit API keys or connection strings. Use `.env` files locally and Azure Key Vault in production.
- Modify the AI system prompt dynamically based on user input (Prompt Injection risk).

**Definition of Done (per task):**
- [ ] Implements the referenced `PRD-F#`.
- [ ] Verified framework conventions against §3 (no stale APIs).
- [ ] Unit tests pass via `SAD-A3` (Test Runner).
- [ ] No new secrets committed; input validated at boundaries.
- [ ] Compliance Checker (`SAD-A4`) approves the PR.

---

## 6. Materialization

| Target | File | Notes |
|--------|------|-------|
| Canonical | `docs/build-archon.md` | Edit here |
| All agents | `AGENTS.md` (project root) | Full content; auto-read by IDE agents |
