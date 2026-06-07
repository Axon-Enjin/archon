# Cosmos DB Integration Guide (Archon)

## 1. What is now integrated

Archon now supports **real Azure Cosmos DB** via `@azure/cosmos` in `client/src/lib/db/cosmos.ts` with:
- Automatic database + container bootstrap on first request (`createIfNotExists`)
- Partition key set to `/institution_id` for all containers
- TTL-ready containers for ephemeral data
- Safe fallback to local `mock-db.json` when Cosmos credentials are missing

## 2. Required environment variables

Use `client/.env.example` as your template.

Required for Cosmos mode:
- `COSMOS_CONNECTION_STRING` (recommended)

Alternative (if not using connection string):
- `COSMOS_ENDPOINT`
- `COSMOS_KEY`

Optional:
- `COSMOS_DATABASE_ID` (defaults to `archon-db`)

## 3. Containers created automatically

On first Cosmos-backed request, Archon creates these containers in `COSMOS_DATABASE_ID`:
- `users`
- `conversations`
- `messages` (`defaultTtl: -1`, item-level TTL used)
- `handoffs` (`defaultTtl: -1`, item-level TTL used)
- `policy_embeddings`
- `cache_university_data` (`defaultTtl: 300`)

All containers use partition key path:
- `/institution_id`

## 4. TTL behavior

- `messages` and `handoffs` are written with item TTL = `90 days`
- `cache_university_data` uses item TTL = `300 seconds` (5 minutes)
- Cache reads also validate staleness using `fetched_at` + `ttl`

## 5. Local setup

1. Copy env template:

```bash
cd client
cp .env.example .env.local
```

2. Add your Cosmos credentials in `.env.local`.

3. Start app:

```bash
npm run dev
```

## 6. Verification steps

1. Sign in to the app.
2. Call test route:

```text
GET /api/test-db
```

Expected success response includes:
- `mode: "cosmos"` when using real Cosmos
- `mode: "mock"` when credentials are missing

## 7. Production setup (Vercel)

Set these environment variables in Vercel for the `client` project:
- `COSMOS_CONNECTION_STRING`
- `COSMOS_DATABASE_ID` (optional)
- Existing auth vars (`NEXTAUTH_*`, `ARCHON_*`, `ENTRA_*`)

Then redeploy.

## 8. Vector search note

`queryPolicies()` uses `VectorDistance(c.embedding, @vector)` against `policy_embeddings`.
For production-grade vector search, ensure your Cosmos account/container indexing/vector policy supports this query pattern.

## 9. Troubleshooting

### App still in mock mode
- Confirm `COSMOS_CONNECTION_STRING` is set (or both `COSMOS_ENDPOINT` and `COSMOS_KEY`)
- Restart server after changing env vars

### 403/401 from Cosmos
- Verify key validity and account firewall/network access

### Query errors on policy vector search
- Confirm vector indexing policy is configured for `policy_embeddings`
- As a temporary fallback, use mock mode for policy querying during setup
