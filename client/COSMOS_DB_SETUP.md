# Azure Cosmos DB Setup for Archon

This guide shows how to connect Archon to Azure Cosmos DB for the client app in this workspace.

## 1. What Archon expects

The app uses Cosmos DB as a single-tenant data store partitioned by `institution_id`.

Default runtime values in the app:

- Database name: `archon-db`
- Partition key: `/institution_id`
- Container names:
  - `users`
  - `conversations`
  - `messages`
  - `handoffs`
  - `policy_embeddings`
  - `cache_university_data`

The app can still run without Cosmos DB because it falls back to local mock storage when the Cosmos env vars are missing.

## 2. Create the Cosmos DB account

In the Azure Portal:

1. Open **Azure Cosmos DB**.
2. Create a new account.
3. Choose **Azure Cosmos DB for NoSQL**.
4. Pick the subscription, resource group, and region you want.
5. Use the default network settings unless your organization requires private networking.

If you already have a Cosmos account, you can reuse it.

## 3. Create the database and containers

Inside the Cosmos account:

1. Create a new database named `archon-db`.
2. Create these containers with partition key path `/institution_id`:
   - `users`
   - `conversations`
   - `messages`
   - `handoffs`
   - `policy_embeddings`
   - `cache_university_data`

Recommended TTL settings based on the app:

- `users`: no default TTL
- `conversations`: no default TTL
- `messages`: default TTL disabled at the container level, but individual records can carry a `ttl` value for retention
- `handoffs`: default TTL disabled at the container level, but individual records can carry a `ttl` value for retention
- `policy_embeddings`: no default TTL
- `cache_university_data`: default TTL `300` seconds

The app code also sets document-level `ttl` values for some records:

- `messages`: 90 days
- `handoffs`: 90 days
- `cache_university_data`: 300 seconds

## 4. Set the environment variables

Add these values to `client/.env` or better, to `client/.env.local`:

```dotenv
COSMOS_CONNECTION_STRING=<your-cosmos-connection-string>
COSMOS_DATABASE_ID=archon-db
```

You can also use endpoint/key instead of the full connection string:

```dotenv
COSMOS_ENDPOINT=<your-cosmos-endpoint>
COSMOS_KEY=<your-cosmos-key>
COSMOS_DATABASE_ID=archon-db
```

The app checks for `COSMOS_CONNECTION_STRING` first. If that is not present, it uses `COSMOS_ENDPOINT` and `COSMOS_KEY`.

## 5. Leave mock mode only if needed

If none of the Cosmos env vars are present, Archon uses the local mock database file at:

- `src/lib/db/mock-db.json`

That is useful for development, but production should always connect to Cosmos DB.

## 6. Verify the setup

After saving the env vars:

1. Start the app.
2. Open the test route:
   - `/api/test-db`
3. Confirm the response returns seeded student, conversation, and message data.
4. Try the student dashboard and chat flow to confirm reads and writes succeed.

If the app still shows mock data, verify that the Cosmos env vars are present in the active shell or deployment environment.

## 7. Suggested Cosmos documents

The app stores these document shapes:

- `users`: app user profile linked to `entra_oid`
- `conversations`: ticket records
- `messages`: chat history with scrubbed content
- `handoffs`: AI handoff packets for human agents
- `policy_embeddings`: policy knowledge chunks
- `cache_university_data`: short-lived cached SIS / bursar / calendar data

Every document must include:

- `id`
- `institution_id`

That `institution_id` field is the partition key.

## 8. Recommended production notes

- Use a separate Cosmos account or database for each environment.
- Keep secrets out of source control.
- Use private endpoints or IP restrictions if your Azure policy requires them.
- Keep the TTL policy aligned with the app's compliance requirements.
