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

## 3. Showcase Persona — "Mara Lim"

> This persona is **faithful to the live demo account**. Logging in as the mock **Student** (`mara`) deterministically generates exactly the data below, so what you say on stage matches what's on screen.

**Mara Lim** — *the anxious scholar fighting to stay enrolled.*

| Field | Value |
|---|---|
| **Name** | Mara Lim |
| **Login** | Mock Student → `mara` (or Microsoft Entra ID SSO) |
| **Email** | mara@archon.edu.ph |
| **Institution** | University Partner (UP), tenant `inst-up` |
| **Program** | BS Biology — 4th Year |
| **Enrolled load** | 15 units this term |
| **GWA** | 2.80 (Philippine scale; 2.50 is the SAP threshold) |
| **Academic standing** | **SAP Probation** — below the required GWA |
| **Scholarship** | **DOST-SEI Scholarship** |
| **Tuition status** | **Paid** — ₱20,930.00 fully settled (Tuition ₱15,930 + Lab ₱1,900 + Misc ₱3,100) |
| **Active hold** | **1 × Academic Hold** — SAP GPA deficiency (GWA 2.80, required 2.50) |
| **Preferred language** | Filipino |

**Her current courses (shown in chat schedule lookups):**
- BIO 242 — Ecology (TTh 09:00–10:30, AVR 312, Prof. E. Cruz)
- BIO 407 — Cell Biology (Sat 07:30–09:00, CL 567, Prof. E. Santos)
- BIO 288 — Molecular Biology (MWF 07:30–09:00, Lab 496, Prof. A. Garcia)
- GE 336 — Understanding the Self (MWF 09:00–10:30, Prof. E. Mendoza)
- GE 111 — Science, Technology & Society (Sat 09:00–10:30, Prof. J. Ramos)

**Her upcoming M365 calendar (Home Dashboard panel):** SAP Academic Appeal Submission Deadline, CHED UniFAST renewal window, Registrar enrollment-hold review date.

**Her story (the emotional hook):**
> Mara is a graduating Biology scholar. One bad semester pushed her GWA to 2.80 — just under the 2.50 SAP line — so her account now has an **academic hold** that blocks enrollment. Her DOST scholarship is at risk. The appeal deadline is days away. She doesn't know what "SAP" means, which office to visit, or what to write in an appeal. Last year this meant a week of office-hopping. With Archon, it's five minutes on her phone — in Filipino.

> **Supporting cast (already in the app):**
> - **Jay Mendoza** — Mock **Agent** (`jay`): Tier-1 support staff who receives Mara's escalation with a full context packet.
> - **Dr. Elena Reyes** — Mock **Admin** (`reyes`): VP for Student Affairs who watches cost-per-ticket and deflection on the analytics dashboard.

---

## 4. The Pitch Script (≈3 minutes)

**[0:00 — Hook]**
> "Imagine you're a graduating scholar. One bad semester drops your GPA just below the line, and suddenly there's a hold on your account, your scholarship is at risk, and the appeal deadline is in three days. Today, that means a week of bouncing between the Registrar, the Bursar, and Financial Aid — repeating your story to everyone. This is the higher-education *experience deficit*, and it costs universities up to **₱5,800 per ticket**."

**[0:30 — The shift]**
> "Meet Archon. Not a chatbot that points to FAQs — an **autonomous AI agent** that reads live university data across departments, diagnoses the real problem, and either fixes it or hands it to a human with the full story already written down."

**[0:50 — Who we help]**
> "This is Mara, a 4th-year Biology scholar on a DOST grant. She has an academic hold she doesn't understand. Watch."

**[1:00–2:30 — Live demo]** → run the walkthrough in [§5](#5-live-demo-walkthrough).

**[2:30 — The payoff]**
> "Mara went from panic to a filed appeal in five minutes, in Filipino, on her phone. The university just deflected a Tier-1 ticket, and when human judgment *was* needed, the agent got a pre-digested context packet instead of a cold call. We take cost-per-ticket from ₱5,800 to about **₱1,220 — a 79% reduction** — while raising satisfaction."

**[2:50 — Close]**
> "Archon runs natively on the Microsoft 365 and Azure stack universities already own — Entra ID, Azure AI Foundry, Cosmos DB, and Microsoft Graph. No new tool for students to adopt. We're not digitizing the org chart. We're making students never have to see it. Thank you."

---

## 5. Live Demo Walkthrough

**Setup:** `cd client && nvm use && npm run dev`, open the app, go to **Sign In**.

### Act 1 — The student (login: `mara`)
1. **Sign in → "Mock Student" (Mara Lim).** Land on the **Home Dashboard**.
   - Point out: her profile (BS Biology, 4th Year, GWA 2.80, **SAP Probation**, DOST-SEI), the **Academic Hold** card, the **paid** balance, and the **M365 Calendar** panel with the SAP appeal deadline counting down.
2. **Open Chat.** Type in **Filipino**: *"Bakit ako may hold sa enrollment?"*
   - Narrate the agentic loop: Archon calls `check_student_holds` / `get_account_diagnosis`, queries across Registrar + Academic Advising, and replies in Filipino: it has an **Academic Hold** from a SAP GPA deficiency, explained in plain language with resolution steps.
3. **Ask:** *"Paano ko ito maa-appeal?"*
   - Archon explains SAP, checks eligibility, and surfaces a **"Launch SAP Appeal Wizard"** action button.
4. **Click the wizard** → walk the guided steps (eligibility → documents → narrative template with prompts → review/submit). Emphasize: it *guides*, it doesn't write the narrative for her.
5. **Show escalation:** ask something needing human judgment (or request a change the AI won't auto-approve). Archon triggers **`EscalateToHuman`** and the ticket flips to **Pending Agent**.

### Act 2 — The agent (login: `jay`)
6. **Sign out → "Mock Agent" (Jay Mendoza)** → **Agent Dashboard**.
   - Open Mara's escalated ticket. Show the **handoff packet**: student profile, diagnosis, *systems queried*, *AI actions taken*, AI confidence, and a **recommended resolution** pre-filled in the reply box.
   - Key line: *"Jay never asks Mara to repeat her story — the AI already wrote it down."* Approve & send.

### Act 3 — The leader (login: `reyes`)
7. **Sign out → "Mock Admin" (Dr. Elena Reyes)** → **Admin → Analytics**.
   - Show cost-per-ticket trend, deflection rate, average handle time, and the M365 notification action rate — mapped to BRD-M1…M7. Close on the 79% cost story.

> **Bonus (optional) — the autonomous auto-lift:** Archon can *autonomously lift a financial hold* when pending aid covers the balance (the marquee agentic action). To demo this path on the chat screen, append `?scenario=fa_delayed` to the chat URL (a built-in dev override). The AI will detect a liftable financial hold and, after confirmation, call `request_hold_lift`. *(Note: this override affects the chat only; see §9.)*

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
- [ ] Log in as `mara`, `jay`, `reyes` once each to warm caches.
- [ ] Confirm the Home Dashboard shows **Mara Lim** (real name now wired in mock auth), SAP Probation, and the academic hold.
- [ ] Pre-type your Filipino prompts so you don't fumble live.
- [ ] Decide whether you're showing the **academic/SAP** hero path (default `mara`, fully consistent) or the **financial auto-lift** bonus (`?scenario=fa_delayed`, chat-only).

**Known gaps worth a sentence of honesty (or a quick fix):**
1. **Calendar is aligned.** The demo calendar and Mara's stale chat-history ticket now reflect **BS Biology / DOST-SEI / SAP** (BIO 288 midterm, DOST-SEI renewal, academic-only hold) — consistent with her generated profile.
2. **Auto-lift is chat-only via override.** The dashboard profile/holds/financial routes ignore the `?scenario=` dev override, so for a *fully consistent* run, prefer the default `mara` SAP path as your hero and treat the financial auto-lift as a clearly-labeled "here's another path" moment.
3. **Live AI dependency.** The agentic chat calls Azure AI Foundry — verify the API key/env is set and reachable on demo Wi-Fi, and have a screen recording as a backup.

---

*Built by the Regalia Council. Full architecture and requirements live in `docs/` (BRD, PRD, SDD, DSD, RFCs).*
