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
- Entra roles are mapped to app roles:
  - `Admin` -> `Admin`
  - `Agent` -> `Agent`
  - all other users -> `Student`
- `/student`, `/agent`, and `/admin` are protected by middleware and redirect unauthenticated users to `/auth/signin`.
- The shared NextAuth configuration lives in `src/lib/auth.ts` and is reused by the route handler, server helpers, and the home page redirect.
- Optional tenant allowlist can be configured with `ARCHON_ALLOWED_TENANT_IDS`.
- Local persona logins are available only when `ARCHON_ENABLE_MOCK_AUTH=true` or Entra credentials are missing.
- Runtime rollback flags:
  - `ARCHON_AI_ENABLED=false` routes chat traffic directly to human queue.
  - `ARCHON_M365_ENABLED=false` disables Microsoft Graph calendar integration.

## Deploy

For production, update your Entra redirect URI to your deployed domain:

```text
https://<your-domain>/api/auth/callback/azure-ad
```
