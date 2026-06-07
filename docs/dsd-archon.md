# Design System Document (DSD)

**Project:** Archon — Agentic AI-Powered Service Desk for Higher Education
**Date:** 2026-06-07
**Version:** 0.2
**Owner:** Regalia Council (Thranduil)
**Status:** Draft
**Last reconciled:** 2026-06-08 — reconciled landing page UI layout, alignment coordinates, and style standardizations
**PRD:** [prd-archon.md](prd-archon.md)

---

## 1. Design Philosophy & Intent

Archon's UI follows a **"Warm & Approachable"** aesthetic. The design intent is to actively reduce the acute anxiety and feeling of abandonment that students experience when navigating university bureaucracies. The UI must feel like a calm, capable, and empathetic assistant — not a rigid, intimidating institutional form. The Microsoft 365 integration surfaces (Calendar panel, Teams notification previews) should feel native and seamless — students should perceive Archon as a natural extension of their M365 environment, not a foreign application.

**Core Principles:**
1. **Calming, not clinical:** Avoid the harsh whites, generic blues, and sharp corners typical of legacy university portals. Use warm off-whites, soft gradients, and rounded elements.
2. **Clarity over density:** Students are often panicked when accessing the app (e.g., discovering an enrollment hold). Information must be spaced generously, with clear hierarchy and progressive disclosure.
3. **Conversational primacy:** The chat interface is the primary mechanism of interaction. It should feel as fluid and natural as their primary messaging apps (Messenger, WhatsApp), not like a sterile enterprise support widget.
4. **Transparent state:** The AI should always clearly communicate what it is doing (e.g., "Querying the Registrar...", "Fetching your calendar...", "Sending your Teams notification...").
5. **M365 visual coherence:** Components that surface M365 data (Calendar panel, Teams notification status badges) should use Fluent UI-inspired visual language — familiar to Microsoft 365 users — while remaining within Archon's warm color palette.

---

## 2. Core Tokens

### 2.1 Colors

The palette avoids the sterile "enterprise blue" in favor of a warmer, more modern spectrum. The primary brand color is a calming sage green/teal, conveying resolution and forward momentum.

| Token | Hex | Usage |
|-------|-----|-------|
| `--color-primary-500` | `#0D9488` (Teal) | Primary actions, active states, AI avatar background |
| `--color-primary-100` | `#CCFBF1` | Subtle backgrounds, AI message bubbles |
| `--color-surface-base`| `#FAFAF9` (Warm White) | App background (reduces eye strain compared to `#FFFFFF`) |
| `--color-surface-card`| `#FFFFFF` | Elevated cards, user message bubbles |
| `--color-text-primary`| `#1C1917` (Warm Black) | Headings, primary body text |
| `--color-text-muted` | `#78716C` | Timestamps, secondary text, input placeholders |
| `--color-error-500` | `#E11D48` (Rose) | Critical alerts, holds, errors |
| `--color-warning-500` | `#F59E0B` (Amber) | Approaching deadlines, pending status |
| `--color-success-500` | `#10B981` (Emerald) | Resolved tickets, lifted holds, successful actions |
| `--color-m365-blue` | `#0078D4` | M365 integration badges, Teams icon accents, Entra ID badge |

### 2.2 Typography

Typography relies on two modern, friendly sans-serif typefaces to reinforce the approachable aesthetic.

| Role | Font Family | Weight | Size (Base) | Line Height | Usage |
|------|-------------|--------|-------------|-------------|-------|
| **Display/Headings** | Outfit | SemiBold (600) | H1: 2rem, H2: 1.5rem, H3: 1.25rem | 1.2 | Screen titles, prominent status numbers, empty state headers |
| **Body/UI** | Plus Jakarta Sans | Regular (400), Medium (500) | Base: 1rem (16px), Small: 0.875rem | 1.5 | Chat messages, button labels, descriptions, metadata |
| **Monospace** | System Mono | Regular (400) | 0.875rem | 1.5 | Reference numbers (e.g., ticket IDs) |

### 2.3 Spacing & Layout

- **Base unit:** 4px (0.25rem)
- **Border Radius:** Generous. `--radius-md` = 12px (cards, buttons). `--radius-lg` = 20px (chat bubbles). `--radius-full` = 9999px (avatars, pills).
- **Shadows:** Soft and diffused. Avoid harsh drop shadows. Use slight elevation for cards (`box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05)`).
- **Max Width (Web):** 768px for the core chat interface (keeps line lengths readable and maintains the conversational feel). Agent dashboard and Admin Analytics utilize full width (1280px+).

---

## 3. Component Specifications

### 3.1 Buttons & Actions

| State | Visual | Notes |
|-------|--------|-------|
| **Primary** | Solid Teal (`#0D9488`), White text, 12px radius | For the primary action on a screen (e.g., "Submit Appeal") |
| **Secondary** | Outline (Teal border), Transparent bg, Teal text | Alternative actions |
| **Ghost/Tertiary** | No border, Teal text, subtle gray bg on hover | "Cancel", minor actions |
| **Disabled** | `#E7E5E4` bg, `#A8A29E` text | Must remain readable (contrast > 3:1) |
| **Loading** | Same as Primary, but text is replaced by a subtle pulsing spinner | Button width should not change during loading |
| **M365 Connect** | `#0078D4` bg (M365 Blue), White Microsoft logo icon + text | Used specifically for "Connect Microsoft 365" / Entra ID login actions |

### 3.2 Chat Interface

- **AI Messages:** Left-aligned. Avatar (Archon logo or friendly bot icon). Background: `--color-primary-100`. Text: `--color-text-primary`. Corners: 20px radius, with the bottom-left corner slightly sharper (4px) to indicate the speaker.
- **User Messages:** Right-aligned. No avatar needed. Background: `--color-surface-card` (White) with a very subtle border/shadow. Text: `--color-text-primary`. Corners: 20px radius, bottom-right sharper (4px).
- **Typing Indicator:** 3 bouncing dots (warm gray) inside an AI message bubble.
- **System/Action Cards:** Full-width cards embedded in the chat stream (e.g., an "Enrollment Hold" card). These should have a distinct border color based on status (e.g., Red for active hold, Green for resolved) and clear typography.
- **AI State Disclosure:** When the AI is calling a tool, a subtle inline status appears beneath the typing indicator: e.g., `🔍 Querying Registrar...` / `📅 Fetching your calendar...` / `💬 Sending Teams notification...`. This fulfills Design Principle 4 (Transparent state).

### 3.3 M365 Calendar Panel (PRD-F11)

The Calendar panel appears on the Home Dashboard as a card below the Active Tickets section.

- **Header:** "Your Week" with a small Microsoft 365 badge (M365 Blue `#0078D4` background, white "M" icon) indicating the data source.
- **Event items:** Each event shows: colored left-border (Teal for academic, Amber for deadlines), event title in Body/Medium weight, date and time in Body/Regular muted.
- **Empty state:** "No events this week — your week looks clear. ✓" in muted text with a soft check icon.
- **Loading state:** 3 skeleton event items with a subtle pulse animation.
- **Error / No consent state:** A muted panel with a Teams/Calendar icon and text: "Connect your Microsoft 365 Calendar" + a "Connect" button (M365 Blue style).
- **Maximum items displayed:** 5 events. A "View all in Calendar" link opens the student's Outlook calendar in a new tab.

### 3.4 Notification Status Badge (PRD-F11)

Used in the Alert Center and ticket history to indicate the delivery channel of a notification:

| Badge | Visual | Usage |
|-------|--------|-------|
| **Teams** | Small purple Teams icon + "Teams" label, `#6264A7` bg | Notification delivered via Microsoft Teams |
| **Outlook** | Small blue Outlook icon + "Outlook" label, `#0078D4` bg | Notification delivered via Outlook email |
| **In-App** | Small bell icon + "In-App" label, Teal bg | Notification delivered in-app only (M365 not connected) |

### 3.5 Inputs & Forms

- **Chat Input Bar:** Fixed to the bottom. Pill-shaped (fully rounded). Contains a paper-plane send icon. Background: White, slight shadow.
- **Standard Inputs (e.g., SAP Appeal):** Label above input. Input has a subtle border (`#E7E5E4`), 8px radius. Focus state: 2px Teal outline (`ring-primary-500`).
- **Validation:** Inline validation. Red border for errors, with clear, non-technical error text below the input (e.g., "Please upload your medical certificate" instead of "File validation failed").

---

## 4. Accessibility (a11y)

Given the public university context, strict adherence to WCAG 2.1 AA is mandatory.

| Requirement | Implementation |
|-------------|----------------|
| **Color Contrast** | All text must have a minimum 4.5:1 contrast ratio against its background. The Teal (`#0D9488`) on White meets this (4.8:1). M365 Blue (`#0078D4`) on White: 4.5:1 (passes AA). |
| **Screen Readers** | All icon buttons (e.g., Send, Attach, Teams badge) must have `aria-label`s. Chat updates must be announced via `aria-live="polite"`. M365 Calendar panel updates must be announced via `aria-live="polite"`. |
| **Keyboard Nav** | Fully navigable via Tab/Shift+Tab. Focus states must be highly visible (2px Teal ring, no default browser outline). M365 consent flow must be keyboard-accessible. |
| **Reduced Motion** | Respect `@media (prefers-reduced-motion)`. Disable chat bubble animations, Calendar panel skeleton pulse, and slide transitions if true. |
| **Target Sizes** | Minimum touch target on mobile is 48x48px (padding added to smaller icons, including M365 badge and notification channel badges). |

---

## 5. Animation & Motion

Motion should be subtle and serve to provide feedback or smooth transitions, never to distract.

- **Duration:** Fast (150ms-250ms).
- **Easing:** Ease-out for elements entering the screen (decelerating); Ease-in for elements leaving (accelerating).
- **Chat Bubbles:** Enter via a slight fade and upward slide (10px).
- **State Changes:** When an AI resolves a hold, the status card should transition its border from Red to Green with a subtle "pulse" effect to draw attention to the success.
- **Calendar Panel:** Events slide in from below with a 150ms stagger between items on initial load.
- **M365 Consent Success:** When the student grants Calendar consent, the "Connect" prompt transitions to the Calendar panel via a smooth fade (200ms).

---

## 6. Implementation Notes

- **CSS Framework:** Tailwind CSS v4 is the standard styling framework. All design tokens are implemented as Tailwind utilities and CSS variables in the client application.
- **Icon Library:** Lucide React (`lucide-react`) is the standard package for all generic UI icons. Emojis must not be used for interface indicators.
- **M365 Icons:** Use the official Microsoft 365 product icons (available under Microsoft's brand usage guidelines) for Teams, Outlook, and Entra ID UI elements. Do not use generic alternatives.
- **Theme Support:** V1 is Light Mode only (with warm tones). Dark Mode is deferred to V2 to reduce initial design complexity, as the primary persona (students) typically access these services during daytime hours.

---

## Self-Check

- [x] Defines the core visual philosophy (Warm & Approachable + M365 visual coherence)
- [x] Includes specific color hex codes and font families (Outfit, Plus Jakarta Sans)
- [x] Adds `--color-m365-blue` token and M365 Connect button state for consistent Microsoft branding
- [x] Defines M365 Calendar Panel component spec (header, events, empty, loading, error states)
- [x] Defines Notification Status Badges (Teams, Outlook, In-App)
- [x] Defines the appearance of the primary UI pattern (Chat Interface) including AI state disclosure
- [x] Includes strict accessibility requirements (WCAG AA, Contrast, Focus) — M365 Blue verified at 4.5:1
- [x] Translates the PRD's intent (reducing anxiety, M365 coherence) into visual rules
