# Archon — Client Application

> **Next.js 16 full-stack monolith** — React UI + API Routes + University Adapters + Cosmos DB data layer + Graph API proxy.
> See the [full documentation suite](../docs/index.md) and the [Cosmos DB Integration Guide](../docs/cosmos-db-integration-guide.md) for architecture details.

This client is a Next.js app for Archon and uses `next-auth` with Microsoft Entra ID (Azure AD OIDC).

## Getting Started

1. Copy the environment template and fill in your Entra app registration values.

```bash
cp .env.example .env.local
```

2. In Microsoft Entra ID, add this redirect URI to your app registration:

```text
http://localhost:3000/api/auth/callback/azure-ad
```

3. Run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Authentication Notes

- Provider id for Entra sign-in is `azure-ad`.
- Entra RBAC mapping is dynamic via env configuration:
  - `ARCHON_ENTRA_ROLE_CLAIMS` (default: `roles,groups,wids`)
  - `ARCHON_ENTRA_ADMIN_ROLE_KEYS` (default: `Admin`)
  - `ARCHON_ENTRA_AGENT_ROLE_KEYS` (default: `Agent`)
  - `ARCHON_ENTRA_STUDENT_ROLE_KEYS` (default: `Student`)
  - `ARCHON_ENTRA_DEFAULT_ROLE` (default: `Student`)
- `/student`, `/agent`, and `/admin` are protected by middleware and redirect unauthenticated users to `/auth/signin`.
- The shared NextAuth configuration lives in `src/lib/auth.ts` and is reused by the route handler, server helpers, and the home page redirect.
- Optional tenant allowlist can be configured with `ARCHON_ALLOWED_TENANT_IDS`.
- Local persona logins are available only when `ARCHON_ENABLE_MOCK_AUTH=true` or Entra credentials are missing.
- Entra role setup guide: `ENTRA_RBAC_SETUP.md`.
- Runtime rollback flags:
  - `ARCHON_AI_ENABLED=false` routes chat traffic directly to human queue.
  - `ARCHON_M365_ENABLED=false` disables Microsoft Graph calendar integration.

## Deploy

For production, update your Entra redirect URI to your deployed domain:

```text
https://<your-domain>/api/auth/callback/azure-ad
```
