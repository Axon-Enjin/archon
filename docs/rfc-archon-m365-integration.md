# Request for Comments (RFC): Microsoft 365 Integration

**RFC ID:** `archon-rfc-004`
**Project:** Archon — Agentic AI-Powered Service Desk
**Date:** 2026-06-07
**Version:** 0.1
**Author:** Regalia Council (Alaric)
**Status:** Accepted
**Feature:** `PRD-F11` (Microsoft 365 Integration — Entra ID, Calendar, Teams, Outlook)

---

## 1. Problem Statement

Students and staff at partner universities already use Microsoft 365 daily — Outlook for email, Teams for communication, and M365 Calendar for scheduling. Archon must integrate with these tools rather than require adoption of new notification channels. Three specific integration challenges must be solved:

1. **Authentication:** Replace generic SAML/OAuth SSO with Microsoft Entra ID to leverage the university's existing M365 identity infrastructure.
2. **Calendar Awareness:** Surface the student's M365 Calendar on the Archon Home Dashboard so they have a single view of academic deadlines without switching apps.
3. **Proactive Notifications:** Deliver deadline reminders and ticket updates through Teams and Outlook — the channels students and agents already monitor — rather than requiring them to check Archon directly.

## 2. Options Considered

### Option A: Third-Party Notification Service (e.g., Firebase Cloud Messaging + SendGrid)
Build standard push notifications and email through third-party services.
- *Pros:* Vendor-agnostic; works regardless of whether the institution uses M365.
- *Cons:* Requires students to install and allow a separate push notification app. Email via SendGrid doesn't land in students' university Outlook inboxes. Requires managing additional vendor relationships and API keys. Misses the M365 ecosystem advantage entirely.

### Option B: Microsoft Graph API (Native M365 Integration)
Use the Microsoft Graph API, authenticated via the university's Entra ID tenant, to read Calendar events and send Teams/Outlook notifications.
- *Pros:* Notifications land directly in the student's Teams and university Outlook inbox — channels they already check. Calendar data is already in M365 — no duplicate data entry. Entra ID is the university's existing identity provider — no new credentials for students or staff. All within the Azure compliance boundary already established by the institution.
- *Cons:* Requires M365 tenant admin consent for Graph API scopes. Adds dependency on Microsoft Graph API availability and throttling limits. Implementation is more complex than a simple push service.

## 3. Decision

**Selected: Option B (Microsoft Graph API)**

The M365 ecosystem advantage is decisive. Archon's target institutions (KPMG AIC universities) already run M365 with Entra ID. Using Graph API means zero additional app adoption by students — they receive Archon notifications in the same Teams and Outlook they use for classes.

## 4. Implementation Details

### 4.1 Entra ID App Registration

Archon is registered as a **multi-tenant application** in Archon's Azure tenant. Each partner university's M365 admin grants tenant-level consent, scoping all Graph API access to their tenant's users.

**App registration settings:**

```
App name:           Archon Student Services
Application type:   Multi-tenant web application
Auth flows:         Authorization Code with PKCE (students), Client Credentials (background scheduler)
Token validation:   Gateway validates: iss (Entra ID), aud (Archon client ID), tid (university tenant ID)
```

**Redirect URIs:**
```
Production: https://app.archon.edu.ph/auth/callback
Development: http://localhost:3000/auth/callback
```

### 4.2 Required Scopes & Admin Consent

| Scope | Type | Purpose | Consent level |
|---|---|---|---|
| `openid` | Delegated | OIDC authentication | User |
| `profile` | Delegated | Read user's name and UPN | User |
| `email` | Delegated | Read user's email address | User |
| `User.Read` | Delegated | Read authenticated user's M365 profile | User |
| `Calendars.Read` | Delegated | Read student's M365 calendar events | **Admin consent required** |
| `Mail.Send` | Delegated | Send Outlook emails via student/agent's mailbox | **Admin consent required** |
| `TeamsActivity.Send` | Delegated | Send Teams activity feed notifications | **Admin consent required** |

**Admin consent URL** (generated during M2 onboarding):
```
https://login.microsoftonline.com/{tenant_id}/adminconsent?client_id={archon_client_id}&redirect_uri={callback_uri}
```

This URL is shared with the university's M365 tenant admin as part of the M2 onboarding checklist. Until consent is granted, Archon operates in "reduced mode": Entra ID auth works, but Calendar panel and Teams/Outlook notifications are disabled with a clear user-facing prompt.

### 4.3 MSAL Configuration

**Client (Flutter PWA) — MSAL.js:**
```typescript
import { PublicClientApplication } from '@azure/msal-browser';

const msalConfig = {
  auth: {
    clientId: process.env.ARCHON_CLIENT_ID,
    authority: `https://login.microsoftonline.com/${process.env.ENTRA_TENANT_ID}`,
    redirectUri: 'https://app.archon.edu.ph/auth/callback',
  },
  cache: { cacheLocation: 'sessionStorage', storeAuthStateInCookie: false },
};

const loginRequest = {
  scopes: ['openid', 'profile', 'email', 'User.Read', 'Calendars.Read'],
};
```

**Gateway (Node.js) — MSAL Node:**
```typescript
import { ConfidentialClientApplication } from '@azure/msal-node';

// Used for background scheduler (Teams/Outlook notifications)
// Requires Client Credentials flow with admin-consented app permissions
const ccaConfig = {
  auth: {
    clientId: process.env.ARCHON_CLIENT_ID,
    clientSecret: process.env.ARCHON_CLIENT_SECRET, // Stored in Azure Key Vault
    authority: `https://login.microsoftonline.com/${universityTenantId}`,
  },
};
```

### 4.4 M365 Calendar Panel — API Contract

The Gateway proxies the Graph Calendar call and normalizes it to Archon's internal schema:

**Gateway endpoint:** `GET /api/v1/student/{id}/calendar?days=7`

**Response schema (`CalendarEvent[]`):**
```typescript
interface CalendarEvent {
  id: string;          // Graph event ID
  title: string;       // Event subject
  start: string;       // ISO 8601
  end: string;         // ISO 8601
  isAllDay: boolean;
  source: 'M365';      // Future: may include SIS events
  archon_alert_id?: string; // Cross-referenced Archon deadline if matched
}
```

Calendar events are cached in Cosmos DB with a 15-minute TTL to prevent hammering the Graph API during peak dashboard loads.

### 4.5 Teams Notification — Adaptive Card Schema

**Deadline reminder card (sent when deadline is ≤14 days):**
```json
{
  "type": "AdaptiveCard",
  "version": "1.5",
  "body": [
    { "type": "TextBlock", "text": "📅 Deadline Reminder", "weight": "Bolder", "size": "Medium" },
    { "type": "TextBlock", "text": "Your CHED scholarship renewal is due in {{days_remaining}} days.", "wrap": true },
    { "type": "FactSet", "facts": [
      { "title": "Deadline", "value": "{{deadline_date}}" },
      { "title": "Required", "value": "{{required_documents}}" }
    ]}
  ],
  "actions": [
    { "type": "Action.OpenUrl", "title": "Begin Renewal in Archon", "url": "{{archon_deep_link}}" }
  ]
}
```

**Escalation alert card (sent to agent when a ticket is escalated):**
```json
{
  "type": "AdaptiveCard",
  "version": "1.5",
  "body": [
    { "type": "TextBlock", "text": "🚨 New Escalated Ticket", "weight": "Bolder", "size": "Medium" },
    { "type": "TextBlock", "text": "{{student_name}} — {{issue_summary}}", "wrap": true },
    { "type": "FactSet", "facts": [
      { "title": "Student ID", "value": "{{student_id}}" },
      { "title": "Program", "value": "{{program}}" },
      { "title": "AI Recommendation", "value": "{{ai_recommendation}}" }
    ]}
  ],
  "actions": [
    { "type": "Action.OpenUrl", "title": "Open in Agent Dashboard", "url": "{{dashboard_deep_link}}" }
  ]
}
```

### 4.6 Notification Scheduler — Azure Functions

A daily cron Azure Function (`notification-scheduler`) runs at 08:00 Philippine time (UTC+8):

```
Trigger: Timer (CRON: "0 0 8 * * *", Asia/Manila)

For each active student with a deadline in the next 14 days:
  1. Check Cosmos DB for existing notification (idempotency: ticket_id + notification_type + date)
  2. If not already sent:
     a. Build Teams adaptive card payload
     b. Build Outlook email payload
     c. POST to /api/v1/notify/teams   (Gateway → Graph TeamsActivity.Send)
     d. POST to /api/v1/notify/email   (Gateway → Graph /me/sendMail)
     e. Write notification record to Cosmos DB (TTL: 30 days)
     f. Log m365_notification_sent event to Application Insights
```

## 5. Reduced Mode (Admin Consent Not Yet Granted)

Archon operates gracefully without Graph API admin consent:

| Feature | With Admin Consent | Reduced Mode |
|---|---|---|
| Authentication (Entra ID) | ✅ Full Entra ID SSO | ✅ Full Entra ID SSO |
| M365 Calendar Panel | ✅ Shows M365 events | ⚠️ "Connect your M365 Calendar" prompt |
| Teams Notifications | ✅ Adaptive cards delivered | ⚠️ In-app push only |
| Outlook Email | ✅ Delivered to university inbox | ⚠️ In-app push only |

The `ARCHON_M365_ENABLED` feature flag (per-institution in Cosmos DB config) controls reduced mode. It is set to `true` only after the M365 admin consent URL has been actioned.

## 6. Security & Rollback

- **Least Privilege:** Only delegated permissions are requested. The app never holds application-level permissions that would allow querying all students' data without their session context. The background scheduler uses Client Credentials only for sending notifications — not for reading any student data.
- **Data Minimization:** Calendar events are cached in Cosmos DB for 15 minutes for performance. They are never stored permanently or used for AI training. The Gateway normalizes events before caching — raw Graph API responses are not persisted.
- **Throttling:** Microsoft Graph API enforces per-tenant throttling limits. The notification scheduler respects `Retry-After` headers. If throttled, notifications are queued and retried with exponential backoff (max 3 retries, max 1 hour delay).
- **Rollback:** If Graph API integration causes issues, the `ARCHON_M365_ENABLED` flag is set to `false` in Cosmos DB. All M365 features are disabled immediately (within 1 Cosmos DB TTL cycle) without a code deployment. Auth (Entra ID) remains unaffected by this flag.
