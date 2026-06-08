interface FoundryChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface FoundryChatRequest {
  systemPrompt: string;
  messages: FoundryChatMessage[];
  maxOutputTokens?: number;
  temperature?: number;
}

interface FoundryChatResult {
  text: string;
  toolCalls: string[];
}

interface FoundryResponsesOutputTextChunk {
  type?: string;
  text?: string;
}

interface FoundryResponsesOutputItem {
  content?: FoundryResponsesOutputTextChunk[];
}

interface FoundryResponsesPayload {
  output_text?: string;
  output?: FoundryResponsesOutputItem[];
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
}

function parseNumberEnv(value: string | undefined, fallback: number): number {
  if (!value) return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizeBaseUrl(url: string): string {
  return url.endsWith("/") ? url.slice(0, -1) : url;
}

function isOpenAiV1BaseUrl(url: string): boolean {
  return /\/openai\/v1\/?$/i.test(url.trim());
}

function appendApiVersion(url: string): string {
  const apiVersion = process.env.AZURE_FOUNDRY_API_VERSION || "2024-10-21";
  const separator = url.includes("?") ? "&" : "?";
  if (url.includes("api-version=")) return url;
  return `${url}${separator}api-version=${encodeURIComponent(apiVersion)}`;
}

export function isFoundryConfigured(): boolean {
  return Boolean(
    process.env.AZURE_FOUNDRY_OPENAI_BASE_URL &&
      process.env.AZURE_FOUNDRY_API_KEY &&
      process.env.AZURE_FOUNDRY_MODEL
  );
}

function extractTextFromResponses(payload: FoundryResponsesPayload): string {
  if (typeof payload.output_text === "string" && payload.output_text.trim()) {
    return payload.output_text.trim();
  }

  const parts: string[] = [];
  for (const item of payload.output || []) {
    for (const chunk of item.content || []) {
      if (chunk.type === "output_text" && typeof chunk.text === "string" && chunk.text.trim()) {
        parts.push(chunk.text.trim());
      }
    }
  }
  const merged = parts.join("\n").trim();
  if (merged) return merged;

  const chatContent = payload.choices?.[0]?.message?.content;
  return typeof chatContent === "string" ? chatContent.trim() : "";
}

function tryParseToolJson(text: string): FoundryChatResult {
  try {
    const parsed = JSON.parse(text) as { text?: string; toolCalls?: string[] };
    if (parsed && typeof parsed.text === "string") {
      return {
        text: parsed.text.trim(),
        toolCalls: Array.isArray(parsed.toolCalls)
          ? parsed.toolCalls.filter((tool): tool is string => typeof tool === "string")
          : [],
      };
    }
  } catch {
    // Fallback to plain text mode.
  }

  return { text, toolCalls: [] };
}

export async function generateFoundryReply(request: FoundryChatRequest): Promise<FoundryChatResult | null> {
  const baseUrl = process.env.AZURE_FOUNDRY_OPENAI_BASE_URL;
  const apiKey = process.env.AZURE_FOUNDRY_API_KEY;
  const model = process.env.AZURE_FOUNDRY_MODEL;
  if (!baseUrl || !apiKey || !model) return null;
  const normalizedBaseUrl = normalizeBaseUrl(baseUrl);
  const v1Endpoint = isOpenAiV1BaseUrl(normalizedBaseUrl);

  const controller = new AbortController();
  const timeoutMs = parseNumberEnv(process.env.AZURE_FOUNDRY_TIMEOUT_MS, 12000);
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const input: FoundryChatMessage[] = [
      { role: "system", content: request.systemPrompt },
      ...request.messages,
    ];

    const commonHeaders = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      "api-key": apiKey,
    };

    let response: Response;
    if (v1Endpoint) {
      // Foundry OpenAI-compatible v1 endpoint: do not append api-version.
      response = await fetch(`${normalizedBaseUrl}/chat/completions`, {
        method: "POST",
        headers: commonHeaders,
        body: JSON.stringify({
          model,
          messages: input,
          temperature:
            request.temperature ?? parseNumberEnv(process.env.AZURE_FOUNDRY_TEMPERATURE, 0.2),
          max_completion_tokens:
            request.maxOutputTokens ?? parseNumberEnv(process.env.AZURE_FOUNDRY_MAX_OUTPUT_TOKENS, 600),
          store: true,
        }),
        signal: controller.signal,
        cache: "no-store",
      });
    } else {
      // Legacy Azure endpoints: use API version on Responses API path.
      const responsesUrl = appendApiVersion(`${normalizedBaseUrl}/responses`);
      response = await fetch(responsesUrl, {
        method: "POST",
        headers: commonHeaders,
        body: JSON.stringify({
          model,
          input,
          temperature:
            request.temperature ?? parseNumberEnv(process.env.AZURE_FOUNDRY_TEMPERATURE, 0.2),
          max_output_tokens:
            request.maxOutputTokens ?? parseNumberEnv(process.env.AZURE_FOUNDRY_MAX_OUTPUT_TOKENS, 600),
        }),
        signal: controller.signal,
        cache: "no-store",
      });

      // Compatibility fallback: Azure deployment-style chat completions endpoint.
      if (!response.ok && (response.status === 400 || response.status === 404)) {
        const deploymentUrl = appendApiVersion(
          `${normalizedBaseUrl}/openai/deployments/${encodeURIComponent(model)}/chat/completions`
        );
        response = await fetch(deploymentUrl, {
          method: "POST",
          headers: commonHeaders,
          body: JSON.stringify({
            messages: input,
            temperature:
              request.temperature ?? parseNumberEnv(process.env.AZURE_FOUNDRY_TEMPERATURE, 0.2),
            max_completion_tokens:
              request.maxOutputTokens ?? parseNumberEnv(process.env.AZURE_FOUNDRY_MAX_OUTPUT_TOKENS, 600),
          }),
          signal: controller.signal,
          cache: "no-store",
        });
      }
    }

    if (!response.ok) {
      const body = await response.text();
      console.warn("Foundry response failed", response.status, body);
      return null;
    }

    const payload = (await response.json()) as FoundryResponsesPayload;
    const text = extractTextFromResponses(payload);
    if (!text) return null;
    return tryParseToolJson(text);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown Foundry error";
    console.warn("Foundry call error:", message);
    return null;
  } finally {
    clearTimeout(timeout);
  }
}
