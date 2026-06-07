# Request for Comments (RFC): University Data Adapters

**RFC ID:** `archon-rfc-003`
**Project:** Archon — Agentic AI-Powered Service Desk
**Date:** 2026-06-07
**Version:** 0.2
**Author:** Regalia Council (Alaric)
**Status:** Accepted
**Feature:** `PRD-F2` (Cross-Department Data Orchestration)

---

## 1. Problem Statement

Every Philippine university has a different backend stack. University A uses Oracle PeopleSoft for everything. University B uses a modern SaaS SIS but a legacy 1990s database for Financial Aid. University C uses custom-built PHP apps. If Archon's AI Foundry Agent tools are tightly coupled to these specific endpoints, scaling to a second university (or even handling a system upgrade at the first) requires rewriting the core AI logic. We need a way to isolate the AI from the chaos of university IT infrastructure.

## 2. Options Considered

### Option A: Direct API Integration in AI Agent Tools
Build HTTP requests directly into the AI Foundry Agent tool definitions, pointing at the university's specific APIs.
- *Pros:* Fast to build for a single proof-of-concept.
- *Cons:* Zero reusability. Breaks when API schemas change. The AI Foundry Agent SDK is not designed for complex data transformation or XML/SOAP parsing (which many legacy systems use). Tool schemas would need to be redefined per university.

### Option B: Data Lake / Replication
Dump all university data into Archon's Cosmos DB nightly, and have the AI query the Archon database.
- *Pros:* Instant query speeds; standard NoSQL interface.
- *Cons:* Massive data privacy/compliance risk (CLR nightmare under PH DPA). Data is always stale by up to 24 hours (unacceptable for real-time holds).

### Option C: The Adapter Middleware Pattern
Archon's Node.js API Gateway acts as a translation layer. It exposes a single, clean REST API to the AI Foundry Agent tools. Internally, the Gateway loads an institution-specific "Adapter" plugin that knows how to fetch data from the university's systems and map it to Archon's standard schema.
- *Pros:* Core AI Agent logic and tool schemas never change. Highly secure (no data replicated to Cosmos DB long-term). Can handle SOAP, REST, or direct DB queries within the Node.js layer. New universities only require a new Adapter implementation.
- *Cons:* Requires writing a custom adapter for each new university or system.

## 3. Decision

**Selected: Option C (Adapter Middleware Pattern)**

We will implement the Adapter Pattern in the Node.js Gateway.

The AI Foundry Agent will *only* know about Archon's standardized internal schema:
- `Archon.StudentProfile`
- `Archon.FinancialBalance`
- `Archon.AcademicHold`

When the Agent calls `CheckFinancialAidStatus`, the Gateway looks up the active institution configuration (loaded from Cosmos DB), instantiates `Adapters.UniversityFA.fetchStatus()`, translates the messy XML/JSON into `Archon.FinancialBalance`, and returns it to the Agent. The Agent never sees university-specific data formats.

## 4. Contracts & Interfaces

**Base Interface (`IUniversityAdapter.ts`):**

```typescript
export interface IUniversityAdapter {
  getStudentProfile(studentId: string): Promise<ArchonStudentProfile>;
  getFinancialHolds(studentId: string): Promise<ArchonHold[]>;
  getAcademicHolds(studentId: string): Promise<ArchonHold[]>;
  getFinancialBalance(studentId: string): Promise<ArchonFinancialBalance>;

  // Write actions (Must be idempotent; Gateway enforces HITL before calling these)
  requestHoldLift(studentId: string, holdId: string, reason: string): Promise<boolean>;
}
```

**V1 / Initial Phase Note (Dummy Data):**
Because we do not have direct API access to actual university systems during the initial build, we will implement **Mock/Dummy Data Adapters**. These adapters will implement the same `IUniversityAdapter` interface but will return static, hardcoded JSON data (or use a local database) to simulate university responses. This allows us to build and test the AI orchestration engine without waiting for live backend integrations.

**Example Production Adapter implementation:**

```typescript
import { IUniversityAdapter, ArchonHold } from '../interfaces';
import axios from 'axios';

export class ExampleUniversityAdapter implements IUniversityAdapter {
  private readonly apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey; // Retrieved from Environment Variables at runtime
  }

  async getAcademicHolds(studentId: string): Promise<ArchonHold[]> {
    try {
      const response = await axios.get(
        `https://api.example-univ.edu/v1/students/${studentId}/holds`,
        {
          headers: { 'X-API-Key': this.apiKey },
          timeout: 5000 // Strict 5s timeout per RFC-003
        }
      );
      return response.data.map(hold => ({
        id: hold.HoldID,
        department: 'Registrar',
        reason: hold.Description,
        canAutoLift: false
      }));
    } catch (error) {
      // Caught by Gateway to trigger graceful AI fallback
      throw new Error('ARCHON_SYSTEM_UNAVAILABLE');
    }
  }
  // ... other methods
}
```

When deploying to a new institution, engineers only need to implement this interface and register the adapter in the institution's Cosmos DB configuration document. The AI Agent requires no retraining or tool schema changes.

## 5. Institution Configuration (Cosmos DB)

Each institution has a configuration document in Cosmos DB:

```json
{
  "id": "univ-ph-001",
  "institution_id": "univ-ph-001",
  "name": "University of the Philippines Manila",
  "adapter_class": "UPManilaAdapter",
  "entra_tenant_id": "<university-m365-tenant-id>",
  "sis_endpoint": "https://sis.upm.edu.ph/api",
  "bursar_endpoint": "https://bursar.upm.edu.ph/api",
  "fa_endpoint": "https://fa.upm.edu.ph/soap",
  "env_prefix": "UPM_"
}
```

All sensitive credentials (API keys, connection strings) are injected into the Gateway container via Azure App Service Environment Variables using the `env_prefix` (e.g., `UPM_API_KEY`). The Gateway passes these to the Adapter constructor at startup.

## 6. Security & Rollback

- **Security:** Adapters run with least-privilege credentials provided by the university. All credentials are provided securely via environment variables. All adapter egress traffic is logged to Application Insights for auditability.
- **Circuit Breaker:** If a university backend goes down or times out (>5s), the Adapter throws `ARCHON_SYSTEM_UNAVAILABLE`. The Gateway catches this and instructs the AI Foundry Agent to inform the student gracefully: "I'm having trouble reaching the financial aid system right now. Let me connect you with an agent who can check directly." The circuit breaker opens for 60 seconds before retrying.
- **Data Isolation:** Adapters can only query for the `student_id` provided by the Gateway, which validates the ID against the authenticated Entra ID JWT. Cross-student queries are impossible at the adapter level.
