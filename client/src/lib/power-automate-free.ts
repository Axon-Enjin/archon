import { NotificationJobDoc } from "@/lib/db/types";
import { isPowerAutomateFreeEnabled } from "@/lib/feature-flags";

interface AccessTokenCache {
  token: string;
  expiresAt: number;
}

interface PublishResult {
  listItemId: string;
}

export interface PowerAutomateGraphProbeResult {
  endpoint: string;
  ok: boolean;
  status: number;
  requestId?: string;
  clientRequestId?: string;
  bodySnippet?: string;
}

export interface PowerAutomateFreeDiagnostics {
  enabled: boolean;
  graphBaseUrl?: string;
  siteIdPresent: boolean;
  listIdPresent: boolean;
  payloadColumn: string;
  routingColumn: string;
  token?: {
    aud?: string;
    appid?: string;
    tid?: string;
    roles?: string[];
    scp?: string;
  };
  probes: PowerAutomateGraphProbeResult[];
}

let tokenCache: AccessTokenCache | null = null;

function getRequiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function getGraphBaseUrl(): string {
  return process.env.ARCHON_PA_GRAPH_BASE_URL || "https://graph.microsoft.com/v1.0";
}

function getPayloadColumnName(): string {
  return process.env.ARCHON_PA_PAYLOAD_COLUMN || "PayloadJson";
}

function getRoutingColumnName(): string {
  return process.env.ARCHON_PA_ROUTING_COLUMN || "Channel";
}

function getTitleForJob(job: NotificationJobDoc): string {
  return `ARCHON ${job.channel.toUpperCase()} ${job.id}`;
}

interface DecodedJwt {
  aud?: string;
  appid?: string;
  roles?: string[];
  scp?: string;
  tid?: string;
}

function buildFlowPayload(job: NotificationJobDoc): string {
  return JSON.stringify({
    jobId: job.id,
    institutionId: job.institution_id,
    channel: job.channel,
    recipientEntraOid: job.recipient_entra_oid,
    recipientEmail: job.recipient_email || null,
    status: job.status,
    attempts: job.attempts,
    payload: job.payload,
    createdAt: job.created_at,
    updatedAt: job.updated_at,
  });
}

async function getAppAccessToken(): Promise<string> {
  if (tokenCache && tokenCache.expiresAt - Date.now() > 60_000) {
    return tokenCache.token;
  }

  const tenantId = getRequiredEnv("ARCHON_PA_TENANT_ID");
  const clientId = getRequiredEnv("ARCHON_PA_CLIENT_ID");
  const clientSecret = getRequiredEnv("ARCHON_PA_CLIENT_SECRET");
  const tokenUrl = `https://login.microsoftonline.com/${encodeURIComponent(tenantId)}/oauth2/v2.0/token`;

  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    scope: "https://graph.microsoft.com/.default",
    grant_type: "client_credentials",
  });

  const response = await fetch(tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
    cache: "no-store",
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Power Automate token request failed (${response.status}): ${errorText}`);
  }

  const tokenPayload = (await response.json()) as { access_token?: string; expires_in?: number };
  if (!tokenPayload.access_token) {
    throw new Error("Power Automate token request did not return an access_token.");
  }

  tokenCache = {
    token: tokenPayload.access_token,
    expiresAt: Date.now() + (tokenPayload.expires_in || 3600) * 1000,
  };

  return tokenPayload.access_token;
}

async function getFreshAppAccessToken(): Promise<string> {
  tokenCache = null;
  return getAppAccessToken();
}

function decodeJwt(token: string): DecodedJwt | null {
  try {
    const parts = token.split(".");
    if (parts.length < 2) return null;
    const payload = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const normalized = payload.padEnd(Math.ceil(payload.length / 4) * 4, "=");
    const decoded = Buffer.from(normalized, "base64").toString("utf8");
    return JSON.parse(decoded) as DecodedJwt;
  } catch {
    return null;
  }
}

async function postOutboxItem(
  graphBase: string,
  siteId: string,
  listId: string,
  accessToken: string,
  fields: Record<string, string>
): Promise<Response> {
  return fetch(`${graphBase}/sites/${siteId}/lists/${listId}/items`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ fields }),
    cache: "no-store",
  });
}

function truncate(value: string, max = 350): string {
  if (value.length <= max) return value;
  return `${value.slice(0, max)}...`;
}

function getResponseMeta(endpoint: string, response: Response, bodyText: string): PowerAutomateGraphProbeResult {
  return {
    endpoint,
    ok: response.ok,
    status: response.status,
    requestId:
      response.headers.get("request-id") ||
      response.headers.get("x-ms-request-id") ||
      undefined,
    clientRequestId:
      response.headers.get("client-request-id") ||
      response.headers.get("x-ms-client-request-id") ||
      undefined,
    bodySnippet: truncate(bodyText),
  };
}

async function graphGetWithMeta(endpoint: string, accessToken: string): Promise<PowerAutomateGraphProbeResult> {
  const response = await fetch(endpoint, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
    },
    cache: "no-store",
  });
  const body = await response.text();
  return getResponseMeta(endpoint, response, body);
}

export function canPublishToPowerAutomateFree(): boolean {
  return isPowerAutomateFreeEnabled();
}

export async function getPowerAutomateFreeDiagnostics(): Promise<PowerAutomateFreeDiagnostics> {
  const enabled = canPublishToPowerAutomateFree();
  const payloadColumn = getPayloadColumnName();
  const routingColumn = getRoutingColumnName();
  const graphBase = getGraphBaseUrl().replace(/\/+$/, "");
  const siteId = process.env.ARCHON_PA_SITE_ID;
  const listId = process.env.ARCHON_PA_LIST_ID;

  const baseResult: PowerAutomateFreeDiagnostics = {
    enabled,
    graphBaseUrl: graphBase,
    siteIdPresent: Boolean(siteId),
    listIdPresent: Boolean(listId),
    payloadColumn,
    routingColumn,
    probes: [],
  };

  if (!enabled) {
    return baseResult;
  }

  const accessToken = await getFreshAppAccessToken();
  const claims = decodeJwt(accessToken);
  baseResult.token = {
    aud: claims?.aud,
    appid: claims?.appid,
    tid: claims?.tid,
    roles: claims?.roles || [],
    scp: claims?.scp,
  };

  if (!siteId) return baseResult;

  const siteEndpoint = `${graphBase}/sites/${siteId}?$select=id,displayName,webUrl`;
  const siteProbe = await graphGetWithMeta(siteEndpoint, accessToken);
  baseResult.probes.push(siteProbe);

  if (!listId) return baseResult;

  const listEndpoint = `${graphBase}/sites/${siteId}/lists/${listId}?$select=id,displayName,webUrl`;
  const listProbe = await graphGetWithMeta(listEndpoint, accessToken);
  baseResult.probes.push(listProbe);

  const columnEndpoint = `${graphBase}/sites/${siteId}/lists/${listId}/columns?$select=name,displayName`;
  const columnProbe = await graphGetWithMeta(columnEndpoint, accessToken);
  baseResult.probes.push(columnProbe);

  return baseResult;
}

export async function publishNotificationJobToPowerAutomateFree(
  job: NotificationJobDoc
): Promise<PublishResult> {
  if (!canPublishToPowerAutomateFree()) {
    throw new Error("Power Automate Free integration is disabled.");
  }

  let accessToken = await getAppAccessToken();
  const siteId = getRequiredEnv("ARCHON_PA_SITE_ID");
  const listId = getRequiredEnv("ARCHON_PA_LIST_ID");
  const payloadColumn = getPayloadColumnName();
  const routingColumn = getRoutingColumnName();
  const graphBase = getGraphBaseUrl().replace(/\/+$/, "");

  const fields: Record<string, string> = {
    Title: getTitleForJob(job),
    [payloadColumn]: buildFlowPayload(job),
    [routingColumn]: job.channel,
  };

  let response = await postOutboxItem(graphBase, siteId, listId, accessToken, fields);

  // Retry once with a fresh token for stale/invalid cached token cases.
  if (response.status === 401) {
    accessToken = await getFreshAppAccessToken();
    response = await postOutboxItem(graphBase, siteId, listId, accessToken, fields);
  }

  if (!response.ok) {
    const errorText = await response.text();
    const claims = decodeJwt(accessToken);
    const roleText =
      Array.isArray(claims?.roles) && claims.roles.length > 0 ? claims.roles.join(",") : "none";
    throw new Error(
      `Power Automate outbox publish failed (${response.status}): ${errorText}. ` +
        `Token aud=${claims?.aud || "unknown"}, appid=${claims?.appid || "unknown"}, roles=${roleText}. ` +
        `requestId=${response.headers.get("request-id") || response.headers.get("x-ms-request-id") || "unknown"}, ` +
        `clientRequestId=${response.headers.get("client-request-id") || response.headers.get("x-ms-client-request-id") || "unknown"}. ` +
        `Check app Application permissions (Sites.ReadWrite.All or Sites.Selected + site grant), admin consent, ` +
        `and ARCHON_PA_SITE_ID/ARCHON_PA_LIST_ID values.`
    );
  }

  const json = (await response.json()) as { id?: string };
  return { listItemId: json.id || "unknown" };
}
