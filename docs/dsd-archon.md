# Design System Document (DSD)

**Project:** Archon — Agentic AI-Powered Service Desk for Higher Education
**Date:** 2026-06-07
**Version:** 0.2
**Owner:** Regalia Council (Thranduil)
**Status:** Draft
**Last reconciled:** 2026-06-10 — reconciled font and color primary choices to remove boxiness and match user preferences
**PRD:** [prd-archon.md](prd-archon.md)

---

## 1. Design Philosophy & Intent

Archon's UI balances official authority with an **"Organic & Soft Archival"** aesthetic. To avoid both the generic, hyper-bubbly "AI slop" and the overly rigid, brutalist "boxy" feel, Archon blends the high-quality, tactile feel of archival university documents with soft geometries and a deep, calming Sage green.

The design inspires trust through its organic, tactile nature, combining official typesetting with gentle arcs and warm, earthy tones.

**Core Principles:**
1. **Organic Authority:** Use refined, softly-rounded typography that is legible and friendly but unmistakably high-quality. The aesthetic should feel like a premium, modern university prospectus printed on thick matte paper.
2. **Soft Structural Flow:** Avoid both stark `0px` harshness and floating blobs. Use gentle padding and naturally rounded containers (`16px` to `24px` radius) that guide the eye comfortably without aggressive borders.
3. **Earthy, Archival Colors:** Retain the warm archival paper background, but use a deep, grounding Sage Green as the primary anchor, supported by rich graphite ink and soft highlights.
4. **Transparent State & Fluid Motion:** AI progress should appear as organic, flowing transitions rather than stark mechanical terminals.
5. **M365 Integration as Institutional Modules:** Microsoft 365 surfaces integrate organically into the warm palette, maintaining distinct Microsoft identity but blending via natural, soft bounding boxes.

---

## 2. Core Tokens

### 2.1 Colors

The palette embraces an earthy, calming spectrum, anchored by a deep Sage instead of harsh dark blues or stark blacks.

| Token | Hex | Usage |
|-------|-----|-------|
| `--color-surface-base`| `#FAFAF9` (Warm Off-White) | Main app background, warm, matte paper feel |
| `--color-surface-card`| `#FFFFFF` (Stark White) | Only for elevated focal elements, softened by radius |
| `--color-text-primary`| `#2C332F` (Deep Forest Ink) | All primary typography, softer than pure black |
| `--color-text-muted` | `#6B706D` (Moss Graphite) | Metadata, timestamps, logs |
| `--color-primary-500` | `#0D9488` (Sage/Teal) | Primary actions, focal accents, AI naming |
| `--color-accent-red`  | `#D64933` (Warm Vermillion) | Critical actions, alerts, holds, errors |
| `--color-success-500` | `#3A7D5C` (Leaf Green) | Resolved tickets, success states |
| `--color-m365-blue` | `#0078D4` | Microsoft 365 badge and button accents |

### 2.2 Typography

Typography rejects brutalist sharp corners in favor of elegant, softly-geometric and humanist typefaces.

| Role | Font Family | Weight | Usage |
|------|-------------|--------|-------|
| **Display/Headings** | Outfit | Medium (500) | Screen titles, primary branding, empty states |
| **Body/UI** | Plus Jakarta Sans | Regular (400), Medium (500) | Main UI text, transcript content, buttons |
| **Monospace/Data** | JetBrains Mono | Regular (400) | Prompts, tool states, IDs, timestamps |

### 2.3 Spacing & Layout

- **Base unit:** 4px (0.25rem).
- **Border Radius:** Soft and organic. `--radius-md` = 16px, `--radius-lg` = 24px, `--radius-full` = 9999px.
- **Borders:** Minimal borders; prefer soft background differentiation or very light 1px borders colored subtly (`#E3DFD5`).
- **Shadows:** Natural, diffused elevation (`box-shadow: 0 10px 25px -5px rgba(44, 51, 47, 0.05)`).

---

## 3. Component Specifications

### 3.1 Buttons & Actions

| State | Visual | Notes |
|-------|--------|-------|
| **Primary** | Solid Sage/Teal (`#0D9488`), White text, 9999px radius (Pill) | For the primary action. Approachable but grounded. |
| **Secondary** | Sage Border (`1px solid`), Sage text, 9999px radius | Alternative actions. |
| **Danger** | Solid Warm Vermillion (`#D64933`), White text, 9999px radius | For destructive actions or appeals. |
| **Ghost/Tertiary** | No border, subtle Sage background on hover | Soft textual links. |
| **Loading** | Soft rotating organic spinner | Replaces rigid processing text. |

### 3.2 Chat / Transcript Interface

- **Layout:** Softly rounded, distinct modules rather than one harsh column. Continuous flow but with natural padding (`24px` radius cards).
- **AI Speaker:** Left-aligned rounded card. Background: Very light Sage (`#E8EFEA`).
- **User Speaker:** Right-aligned rounded card. Background: White. Slight diffused shadow.
- **Tool / Thought State:** Inline, softly pulsating text in JetBrains Mono.
- **System/Action Cards:** Full-width rounded cards (`24px` radius) with organic spacing.

### 3.3 M365 Calendar Panel (PRD-F11)

- **Header:** "Weekly Schedule" in Display font.
- **Event items:** Rectangular list items with `16px` radius and a soft sage left-indicator.
- **Empty state:** "No events scheduled."
- **Loading state:** Fully rounded (`9999px`) fluid skeleton sweeps.

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
- **Persistent Staff Sidebar & Layouts:** Staff sidebars (Admin and Agent) must be implemented at the layout-level or root-page level rather than inside sub-page components. Transitions between tabs or routes must not re-render the sidebar container, ensuring zero visual layout flashing.
- **Localized Loading States:** Data fetches (such as ticket queues or job logs) must isolate loading spinners to their content panes. The sidebar navigation and app frame must remain fully visible, rendered, and interactive during data loading to prevent full-page flashing.
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
