# Archon — Hackathon Presentation Pack

> **Stop making students navigate the org chart.**
> One-page pitch, demo script, walkthrough, and showcase persona for Project Archon — the agentic AI service desk for higher education.

---

## 0. Is this presentation hackathon-ready?

**Verdict: Yes — with ~30 minutes of demo prep.** The product is genuinely demo-able end-to-end today: real auth, a working agentic chat (Filipino + English), cross-department data orchestration, autonomous diagnosis, human handoff, an agent queue, an admin analytics dashboard, a SAP appeal wizard, and M365 calendar integration. The story maps cleanly to the BRD/PRD. The full demo script ([§4](#4-demo-script--your-lines--what-to-click-1012-minutes)) runs **10–12 minutes** plus Q&A.

What makes it strong for judges:
- A real, runnable full-stack app (Next.js + Azure AI Foundry + Cosmos DB + Microsoft Graph), not slideware.
- A concrete, quantified problem (₱5,800 → ₱1,220 per ticket, 79% reduction).
- An emotionally resonant, locally-grounded persona (Filipino working scholar, Private Foundation Grant, financial hold awaiting disbursement).
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

## 4. Demo Script — Your Lines + What to Click (10–12 minutes)

> Each beat has **🎙️ your lines** (say out loud) and **🖱️ what to click**. Total runtime ≈ 11 minutes plus Q&A. Pace yourself — pause after each punchline.
> **Before you start (off-stage):** dev server running (`cd client && nvm use && npm run dev`), browser on the **Sign In** page, logged out. Have your Entra account (sales@axonenjin.com) or mock `rhandie` ready, and pre-type the Filipino prompts somewhere you can paste from. Have the architecture slide (or [§2](#2-the-solution--archon)) ready to show during the "How it works" beat.

### 0:00 — Hook *(no clicking, face the audience)* — 1 min
🎙️ *"Imagine you're a working scholar. You've done everything right — your grant is approved, the money is on its way — but it hasn't landed in your account yet. And because of that one timing gap, there's now a hold on your record that blocks you from enrolling. The registration window is closing. Miss it, and you lose your slot for the whole semester."*

🎙️ *"So what do you do today? You call the Financial Aid office — no answer. You line up at the Bursar — they tell you it's a Registrar problem. The Registrar sends you back to Financial Aid. You repeat your story to every single person, you take screenshots of everything, you start to panic. This isn't a rare horror story — this is Tuesday at most universities."*

🎙️ *"We call this the higher-education experience deficit. And it's not just painful for students — it's expensive. A single fully-loaded support ticket can cost a university up to ₱5,800. Multiply that across enrollment season and you're burning budget that should be going to teaching."*

### 1:00 — The shift: what Archon is — 1 min
🎙️ *"We built Archon to end that. Archon is not a chatbot that points you to an FAQ page. It's an autonomous AI agent. That word — agentic — matters. It means Archon doesn't just talk; it reads live data from across the university's departments, reasons about what's actually wrong, and then takes action to resolve it — or hands it to a human with the entire story already written up."*

🎙️ *"It speaks Filipino, English, and Cebuano. It runs on the Microsoft stack universities already own. And critically — it's safe: read-only by default, with a human in the loop for anything sensitive. Let me show you, with a real student account."*

🖱️ Click **"Continue with Microsoft"** (or the **Mock Student** button).

🎙️ *(while it signs in)* *"We authenticate through Microsoft Entra ID — the same university login students already use. No new password, no new app to install."*

🖱️ Land on the **Home Dashboard**.

### 2:00 — Meet Rhandie *(Home Dashboard tour)* — 1.5 min
🎙️ *"This is Rhandie — a 2nd-year BS Information Technology student on a Private Foundation Grant. Everything you're seeing here is pulled live from the university's systems through Archon's data layer — nothing is typed in by hand."*

🖱️ Point at each element as you say it:
- **Profile chip:** *"His program, year, and standing — he's in good academic standing, a strong student."*
- **Financial Hold card:** *"But here's the problem: an enrollment hold tied to a ₱20,235 outstanding balance."*
- **Countdown cards:** *"Archon is already counting down his real deadlines — tuition due July 4, grant renewal July 2. It's proactive; it surfaces the cliff before he falls off it."*
- **Outlook Calendar:** *"And this is his actual Outlook calendar, pulled in through the Microsoft Graph API — his classes and his grant disbursement date, side by side with his academic deadlines."*

🖱️ **Click a calendar date with events** (e.g., the disbursement date or a class day) to pin the popover open.

🎙️ *"You can hover any date to peek, or click to keep it open and scroll. One unified view — the student never has to jump between five different portals."*

🖱️ Click the **X** (or the date again) to close the popover.

🎙️ *"So Rhandie opens this on his phone, sees the hold, and naturally panics. Instead of lining up at three offices — he just asks."*

### 3:30 — The agentic moment *(Chat — the heart of the demo)* — 2.5 min
🖱️ Click **"Initiate Consultation"** (the new-chat button). Chat opens.

🎙️ *"He opens the assistant and asks in his own language — Filipino."*

🖱️ Type / paste:
> **Bakit ako may hold sa enrollment?**

🎙️ *(while it runs — point at the tool-call indicators)* *"Now watch carefully. See these tool calls appearing? Archon isn't making anything up. It's actually reaching into the Registrar system, the Bursar's billing system, and the Financial Aid system — all at once — and correlating them. This is the cross-department orchestration that no human agent can do in real time, because in most universities those systems literally don't talk to each other."*

🎙️ *(when it answers)* *"And here's the diagnosis, in Filipino. It found the financial hold — the ₱20,235 balance. But it also did something a Tier-1 human often misses: it checked his Financial Aid and noticed his Private Foundation Grant — ₱22,000, approved and already scheduled to disburse — more than covers that balance. So instead of just saying 'pay up,' it understands the real situation and offers to temporarily lift the hold so he can enroll while the money posts."*

🎙️ *"This is the difference between information and resolution. A chatbot tells you the rule. An agent solves your problem. Let's let it."*

🖱️ Type / paste:
> **Oo po, sige.**

🎙️ *(when it confirms — THE punchline, slow down here)* *"And — that's it. Archon just lifted the enrollment hold autonomously. No staff member touched this. It gave him a reference number for the audit trail, and it's logged. Rhandie can go enroll right now. What used to be a week of office-hopping and panic just became five minutes, in his own language, on his phone."*

🖱️ Go **back to the dashboard** to show the hold status has changed to lifted/resolved.

🎙️ *"And the dashboard reflects it immediately — the hold is cleared. That's a full Tier-1 ticket resolved end-to-end, with zero human cost."*

### 6:00 — Guardrails: when Archon should NOT act *(Handoff)* — 2 min
🎙️ *"Now — you might be thinking: an AI that can change a student's record? That should make you nervous. It makes us nervous too. So Archon is deliberately conservative. It's read-only by default. The only reason it could lift that hold is that the pending aid mathematically covered the balance — a safe, reversible, policy-backed action. Anything outside those rails, it refuses to do alone."*

🖱️ In chat, ask something requiring human judgment (e.g., *"Gusto ko pong i-waive ang late payment penalty ko"* — a billing dispute / fee waiver it won't auto-approve).

🎙️ *(while it processes)* *"Here I'm asking for something that needs real human judgment — a fee waiver. Watch what it does."*

🎙️ *(when it escalates)* *"It doesn't guess, and it doesn't fake authority. It escalates to a human — and the ticket flips to 'Pending Agent.' But here's the magic: it doesn't dump a cold ticket on the staff. Let me show you what the agent actually receives."*

🖱️ Sign out → log in as **Mock Agent (Jay)** → **Agent Dashboard** → open Rhandie's ticket.

🎙️ *"This is Jay's view — a Tier-1 support agent. Look at this handoff packet. Archon has already written up who Rhandie is, the full diagnosis, every system it checked, every action it took, its confidence level, and a recommended reply — drafted and ready. Jay reads this in fifteen seconds instead of fifteen minutes. And Rhandie never has to repeat his story. That's the seamless human handoff."*

🖱️ Edit the draft if you like, then click **Approve & Send**.

🎙️ *"One click, resolved. The AI handled the routine 70%, and it made the human dramatically faster on the 30% that genuinely needs a person."*

### 8:00 — The business case *(Admin dashboard)* — 1.5 min
🎙️ *"Students love it, agents love it — but the people who sign the check are administrators. So we built for them too."*

🖱️ Sign out → log in as **Mock Admin (Dr. Reyes)** → **Admin → Analytics**.

🎙️ *"This is the view for a VP of Student Affairs. Cost per ticket, deflection rate, average handle time, satisfaction — the numbers that justify the investment. Our target is concrete: take the blended cost per ticket from around ₱5,800 down to about ₱1,220. That's a 79% reduction — while satisfaction goes up, not down. For a university running on a flat budget through a 3x enrollment-season spike, that's the difference between drowning and breathing."*

🖱️ *(optional)* Click a filter (e.g., by department) to show the breakdown.

🎙️ *"And every number here traces back to a measurable target we committed to — these aren't vanity metrics, they're the business case."*

### 9:30 — How it works *(architecture — show the slide or §2)* — 1 min
🖱️ Show the architecture diagram / slide.

🎙️ *"Quickly, under the hood — because this is buildable today, not science fiction. The brain is Azure AI Foundry running GPT-4o, which orchestrates the agent and its tools. The memory is Azure Cosmos DB — it stores tickets, conversations, and policy embeddings for retrieval. The bridge to the university's messy legacy systems is our adapter layer — it standardizes old SOAP, PHP, and SQL APIs into one clean interface the AI can safely query. And the whole experience lives inside Microsoft 365 — Entra ID for identity, Microsoft Graph for Calendar, Teams, and Outlook. Universities in this program already run all of this. Archon doesn't ask them to adopt a new tool — it activates the infrastructure they already pay for."*

### 10:30 — Close *(face the audience)* — 30 sec
🎙️ *"So that's Archon. We took a student who was one timing gap away from losing his semester, and resolved it in five minutes — autonomously, safely, in his own language. We make routine tickets disappear, we make human agents faster, and we cut cost per ticket by nearly 80%. We're not here to digitize the university org chart. We're here to make sure students never have to see it again. Thank you — we'd love your questions."*

---

## 5. Quick Reference Card

| Time | Beat | You click | You say / type |
|---|---|---|---|
| 0:00 | Hook | — | "experience deficit… ₱5,800 per ticket" |
| 1:00 | What Archon is | Continue with Microsoft / Mock Student | "autonomous AI agent, not a chatbot" |
| 2:00 | Dashboard tour | Pin a calendar date, then close it | "live data… real Outlook calendar" |
| 3:30 | Agentic chat | Initiate Consultation | **Bakit ako may hold sa enrollment?** |
| ~5:00 | Auto-lift | back to dashboard | **Oo po, sige.** → "lifted autonomously" |
| 6:00 | Guardrails + handoff | Ask a fee-waiver Q → switch to Jay | "it escalates… story already packaged" |
| 8:00 | Business case | Switch to Reyes → Analytics | "₱5,800 → ₱1,220, 79%" |
| 9:30 | Architecture | Show architecture slide | "Foundry, Cosmos, adapters, M365" |
| 10:30 | Close | — | "never have to see the org chart" |

**Personas:** `rhandie` (Student, BS IT — hero), `jay` (Agent), `reyes` (Admin).
**Safety nets:** keep a screen recording as backup (live AI needs Foundry + Wi-Fi); the auto-lift works on Rhandie's default account with **no dev flags**.

**If you're running long,** trim the architecture beat (9:30) and the optional admin filter — the chat auto-lift and handoff are the non-negotiable core. **If you're running short,** add the SAP appeal bonus below or take more questions.

> **Bonus (optional, +1–2 min) — the SAP appeal path:** Archon also guides students through a **Satisfactory Academic Progress (SAP) appeal wizard** when a student has an academic hold. To demo without disturbing Rhandie's account, append `?scenario=sap_warning` to the chat URL (a non-production dev override) and ask about academic standing — Archon explains SAP in plain language and surfaces a **"Launch SAP Appeal Wizard"** action that walks through eligibility → documents → a guided narrative template → review. Good line: *"It guides the student through the appeal — it gives them the structure and the prompts, but it never writes the personal narrative for them."* *(Chat-only; see §9.)*

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
