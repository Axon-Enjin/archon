# Archon — Pitch Script (KPMG Academic Innovation 2026)

**Target runtime: ~6 minutes.** Conversational, not read. Bold = the lines that must land.
Lines in _italics_ are delivery cues, not spoken. `★` = the rubric point this slide is graded on.

---

## 1 · Title — *~20s* — hook
> "Meet Mara. It's enrollment week, there's a hold on her account, and to lift it she has to bounce between the Registrar, the Bursar, and Financial Aid — each one telling her to ask the other.
>
> **We built Archon so Mara never has to do that again.**"

_Stand still. Let the name sit on screen for a beat before clicking on._

---

## 2 · Problem — *~50s*
> "Every university says it's student-first. But the actual experience is a runaround. **One problem, many offices, and no single place that can resolve it.**
>
> And the tools meant to fix this don't. FAQ chatbots read from a script — they can't see Mara's actual account. Ticketing systems just hand every routine question to an already-overloaded staff member.
>
> So the student ends up doing the routing herself. **A week of effort. Zero answers.**"

_Point at the three failure cards. Don't read them — gesture and move._

---

## 3 · Solution — *~55s* — ★ Creativity (25%)
> "Archon isn't another chatbot. **It's an autonomous agent.**
>
> It reads the student's real records across every department, figures out what's actually wrong, and resolves it — before a human is ever involved. Four things make it different:
>
> It works **across departments**, not inside one silo. It **resolves on its own** — and when it can't, it scores its own confidence and escalates. It speaks **Filipino, English, and Cebuano**, auto-detected. And it delivers answers in **Teams and Outlook** — not a fourth app nobody opens."

_This is your creativity slide. Slow down on "autonomous agent." That phrase is the whole pitch._

---

## 4 · Interface (student) — *~45s* — ★ User Interface (30%)
> "We designed this for where students actually are: **a phone, in a hallway, on campus data.**
>
> Mobile-first at 375 pixels. It streams a response in under three seconds even on 3G. And instead of a wall of text, answers come back as **glanceable cards** — your balance, your hold, your deadline — with one-tap actions."

_The phones are wireframes. Say it plainly: "These are mockups of the live build" — honesty reads as confidence. If you have screenshots, drop them in first._

---

## 5 · Interface (staff) — *~40s*
> "Same system, second product. **Students get calm and simple. Staff get a power tool.**
>
> When something does escalate, it lands in the agent dashboard with an **AI-suggested reply and a confidence score** — one click to send. The student never repeats their story, because the full context travels with the ticket. And leadership gets the numbers they actually ask for: cost per ticket, deflection rate, satisfaction."

---

## 6 · How it works — *~50s* — ★ Functionality & UX (20%)
> "Here's the loop. The student **asks**. Azure AI Foundry **orchestrates** — it decides which systems to query. Adapters **pull** the real data from Registrar, Bursar, Financial Aid, and Advising. Then Archon **resolves** — and any action that changes a record needs a human's okay.
>
> Two outcomes: routine cases close **zero-touch** — we target at least 30% deflection. Hard cases escalate with a **full context packet** and an alert in Teams or Outlook."

_Walk left to right with the four steps. The "human approves writes" line pre-empts the safety question — say it deliberately._

---

## 7 · Data Model — *~55s* — ★ Data Model Design (25%)
> "None of this works without the data model. **One database, three deliberate decisions.**
>
> Everything partitions on `institution_id` — so one university's data is physically isolated from another's. That's not just clean architecture, it's **Data Privacy Act compliance** built into the schema.
>
> Records expire on their own — messages and handoffs after 90 days, cached university data after five minutes. **Fresh when it matters, minimal by default.**
>
> And the policy documents live in the *same* database as vectors — so retrieval grounds every answer in real university policy. **No bolt-on vector database.** When a campus API goes down, a mock adapter keeps the app alive."

_This is the slide most teams skip. You're not skipping it — that's your edge. Name "Data Privacy Act" clearly; PH judges will catch it._

---

## 8 · Integrations — *~35s*
> "And we didn't ask the university to adopt anything new. **Archon plugs into the Microsoft 365 tenant they already run.**
>
> Single sign-on through Entra ID — the student's existing login. Reasoning on Azure AI Foundry. Data in Cosmos. Delivery through Microsoft Graph — calendar, Teams, Outlook. **Shipped on Next.js, deployed on Vercel.**"

_Fast slide. Keep momentum — this is proof, not a deep-dive._

---

## 9 · Impact + Try it — *~40s* — close
> "So what does it change? **Cost per ticket drops from around 104 pesos to roughly 22 — about 79% lower.** At least 30% of tickets resolve with no human at all. Twenty-four-seven, in three languages.
>
> **Archon turns the service desk from a cost center into a resolution engine.**
>
> It's live — scan the code and try it yourself. We're Team Axon Enjin. Thank you."

_End on "thank you" and stop talking. Don't trail off. Leave the QR on screen for Q&A._

---

## Appendix — likely judge questions (have ready, don't volunteer)

- **"Where do the cost numbers come from?"** — Industry benchmark for a human-handled tier-1 higher-ed ticket (~$1.85 ≈ ₱104); our ~₱22 is the blended cost of an AI-resolved interaction (model + infra) at our projected volume. Happy to share the assumptions.
- **"Is it secure / privacy-compliant?"** — Per-institution partition isolation, TTL-based data minimization, SSO via the university's own Entra ID, and human approval on any write action. Designed against the PH Data Privacy Act of 2012.
- **"Why agentic instead of a good chatbot?"** — A chatbot retrieves text. An agent takes actions across systems — that's the difference between *telling* Mara who to email and *lifting the hold* for her.
- **"What if a university system is down?"** — Graceful degradation: the adapter falls back to mock/cached data so the assistant stays up and flags the stale source.
- **"How does it scale to many universities?"** — Multi-tenant from day one — the `institution_id` partition key means onboarding a new campus is configuration, not re-architecture.

---

## Delivery checklist
- [ ] Replace phone/dashboard wireframes (slides 4–5) with **real screenshots** if available.
- [ ] Generate the **QR code** to your live Vercel URL and drop it on slide 9 (replace the placeholder).
- [ ] Decide one speaker per section, or hand off at slides 4 and 7.
- [ ] Practice once to a timer — cut, don't speed up, if you're over.
