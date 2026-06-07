# Request for Comments (RFC): University Data Adapters

**RFC ID:** `archon-rfc-003`
**Project:** Archon — Agentic AI-Powered Service Desk
**Date:** 2026-06-07
**Author:** Regalia Council (Alaric)
**Status:** Accepted
**Feature:** `PRD-F2` (Cross-Department Data Orchestration)

---

## 1. Problem Statement

Every Philippine university has a different backend stack. University A uses Oracle PeopleSoft for everything. University B uses a modern SaaS SIS but a legacy 1990s database for Financial Aid. University C uses custom-built PHP apps. If Archon's Copilot Studio orchestration logic is tightly coupled to these specific endpoints, scaling to a second university (or even handling a system upgrade at the first) requires rewriting the core AI logic. We need a way to isolate the AI from the chaos of university IT infrastructure.

## 2. Options Considered

### Option A: Direct API Integration in Copilot Studio
Build HTTP requests directly inside Copilot Studio pointing at the university's specific APIs.
- *Pros:* Fast to build for a single proof-of-concept.
- *Cons:* Zero reusability. Breaks when API schemas change. Copilot Studio is not designed for complex data transformation or XML/SOAP parsing (which many legacy systems use).

### Option B: Data Lake / Replication
Dump all university data into Archon's PostgreSQL database nightly, and have the AI query the Archon database.
- *Pros:* Instant query speeds; standard SQL interface.
- *Cons:* Massive data privacy/compliance risk (CLR nightmare under PH DPA). Data is always stale by up to 24 hours (unacceptable for real-time holds).

### Option C: The Adapter Middleware Pattern
Archon's Node.js API Gateway acts as a translation layer. It exposes a single, clean REST API to Copilot Studio. Internally, the Gateway loads an institution-specific "Adapter" plugin that knows how to fetch data from the university and map it to Archon's standard schema.
- *Pros:* Core AI logic never changes. Highly secure (no data replicated). Can handle SOAP, REST, or direct DB queries within the Node.js layer.
- *Cons:* Requires writing a custom adapter for each new university or system.

## 3. Decision

**Selected: Option C (Adapter Middleware Pattern)**

We will implement the Adapter Pattern in the Node.js Gateway. 

The AI orchestration layer (Copilot Studio) will *only* know about Archon's standardized internal schema:
- `Archon.StudentProfile`
- `Archon.FinancialBalance`
- `Archon.AcademicHold`

When Copilot Studio requests `Archon.FinancialBalance`, the Gateway looks up the active configuration, loads `Adapters.UniversityBursar.fetchBalance()`, translates the messy XML/JSON into `Archon.FinancialBalance`, and returns it to the AI.

## 4. Contracts & Interfaces

**Base Interface (`IUniversityAdapter.ts`):**

```typescript
export interface IUniversityAdapter {
  getStudentProfile(studentId: string): Promise<ArchonStudentProfile>;
  getFinancialHolds(studentId: string): Promise<ArchonHold[]>;
  getAcademicHolds(studentId: string): Promise<ArchonHold[]>;
  getFinancialBalance(studentId: string): Promise<ArchonFinancialBalance>;
  
  // Write actions (Must be idempotent)
  requestHoldLift(studentId: string, holdId: string, reason: string): Promise<boolean>;
}
```

When deploying to a new institution, engineers only need to implement this interface. The AI requires no retraining.

## 5. Security & Rollback

- **Security:** Adapters run with least-privilege credentials provided by the university. The Gateway must encrypt these credentials at rest in Azure Key Vault. All adapter egress traffic is logged for auditability.
- **Circuit Breaker:** If a university backend goes down or times out (>5s), the Adapter must catch the error and return a standardized `ArchonSystemUnavailable` response to the AI, allowing Copilot Studio to gracefully inform the student rather than crashing.
