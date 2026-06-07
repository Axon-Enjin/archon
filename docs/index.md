# Documentation Index — Archon

**Project slug:** `archon`
**Maintained by:** Regalia Council
**Last updated:** 2026-06-07

---

## 1. Document Suite

| Document | File | Version | Status | Last Updated | Last Reconciled |
|----------|------|---------|--------|--------------|-----------------|
| BRD — Business Requirements | [brd-archon.md](brd-archon.md) | 0.1 | Draft | 2026-06-07 | N/A |
| PRD — Product Requirements | [prd-archon.md](prd-archon.md) | — | N/A — not written | — | N/A |
| DSD — Design System | [dsd-archon.md](dsd-archon.md) | — | N/A — not written | — | N/A |
| SDD — System Design | [sdd-archon.md](sdd-archon.md) | — | N/A — not written | — | N/A |
| QAD — QA & Test Plan | [qad-archon.md](qad-archon.md) | — | N/A — not written | — | N/A |
| SAD — Subagents | [sad-archon.md](sad-archon.md) | — | N/A — not written | — | N/A |
| BUILD — Build Guide | [build-archon.md](build-archon.md) | — | N/A — not written | — | N/A |
| CLR — Compliance & Legal | [clr-archon.md](clr-archon.md) | — | N/A — not written | — | N/A |
| GTM — Go-To-Market | [gtm-archon.md](gtm-archon.md) | — | N/A — not written | — | N/A |
| OPS — Ops & Observability | [ops-archon.md](ops-archon.md) | — | N/A — not written | — | N/A |

### RFCs (one per major feature)

| RFC ID | File | Feature | Status | Last Updated |
|--------|------|---------|--------|--------------|
| archon-rfc-001 | [rfc-archon-agentic-orchestration.md](rfc-archon-agentic-orchestration.md) | Agentic Workflow Orchestration | N/A — not written | — |
| archon-rfc-002 | [rfc-archon-human-handoff.md](rfc-archon-human-handoff.md) | Seamless Human Handoff | N/A — not written | — |
| archon-rfc-003 | [rfc-archon-university-adapters.md](rfc-archon-university-adapters.md) | University Data Adapters | N/A — not written | — |

---

## 2. Change Log

Every material change to a Locked document is recorded as a Change Record. Newest first.

| CR ID | Date | Summary | Trigger doc | Docs touched | File |
|-------|------|---------|-------------|--------------|------|
| *(none yet)* | — | — | — | — | — |

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

---

## 5. Notes

- **Source research:** [Market Research and Competitive Analysis.md](../Market%20Research%20and%20Competitive%20Analysis.md) — the foundational market analysis driving all FMD documents.
- **FMD templates:** Located at `../FMD/` — canonical templates; never edited during doc generation.
- **Project scale:** Full (all 11 documents required).
- **Primary market:** Philippines-first (RA 10173 / Data Privacy Act 2012).
