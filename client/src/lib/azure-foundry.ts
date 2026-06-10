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

// ---------------------------------------------------------------------------
// Real function/tool calling (OpenAI-compatible chat completions)
// ---------------------------------------------------------------------------

export interface FoundryTool {
  /** Function name the model will call (snake_case). */
  name: string;
  description: string;
  /** JSON Schema for the function arguments. */
  parameters: Record<string, unknown>;
}

export interface FoundryToolCallingRequest {
  systemPrompt: string;
  messages: FoundryChatMessage[];
  tools: FoundryTool[];
  /** Executes a tool and returns a JSON-serializable string result. */
  executeTool: (name: string, args: Record<string, unknown>) => Promise<string>;
  /** Max model<->tool round trips before forcing a final answer. */
  maxRounds?: number;
  maxOutputTokens?: number;
  temperature?: number;
}

export interface FoundryToolCallingResult {
  text: string;
  /** Tool names the model actually invoked, in order. */
  toolCalls: string[];
}

interface ChatCompletionToolCall {
  id: string;
  type: "function";
  function: { name: string; arguments: string };
}

interface ChatCompletionMessage {
  role: "assistant";
  content: string | null;
  tool_calls?: ChatCompletionToolCall[];
}

interface ChatCompletionPayload {
  choices?: Array<{ message?: ChatCompletionMessage; finish_reason?: string }>;
}

/** Wire-format message for chat completions (supports tool roles). */
type WireMessage =
  | { role: "system" | "user" | "assistant"; content: string }
  | { role: "assistant"; content: string | null; tool_calls: ChatCompletionToolCall[] }
  | { role: "tool"; tool_call_id: string; content: string };

function buildChatCompletionsUrl(normalizedBaseUrl: string, model: string): string {
  if (isOpenAiV1BaseUrl(normalizedBaseUrl)) {
    return `${normalizedBaseUrl}/chat/completions`;
  }
  return appendApiVersion(
    `${normalizedBaseUrl}/openai/deployments/${encodeURIComponent(model)}/chat/completions`
  );
}

function parseToolArguments(raw: string): Record<string, unknown> {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as unknown;
    return parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

/**
 * Run an agentic tool-calling loop against the Foundry chat-completions API.
 * The model selects tools, the server executes them and feeds results back,
 * repeating until the model produces a final text answer or the round budget
 * is exhausted. Returns null on any transport failure so callers can fall back.
 */
export async function generateFoundryReplyWithTools(
  request: FoundryToolCallingRequest
): Promise<FoundryToolCallingResult | null> {
  const baseUrl = process.env.AZURE_FOUNDRY_OPENAI_BASE_URL;
  const apiKey = process.env.AZURE_FOUNDRY_API_KEY;
  const model = process.env.AZURE_FOUNDRY_MODEL;
  if (!baseUrl || !apiKey || !model) return null;

  const normalizedBaseUrl = normalizeBaseUrl(baseUrl);
  const url = buildChatCompletionsUrl(normalizedBaseUrl, model);
  const maxRounds = Math.max(1, request.maxRounds ?? 4);

  const controller = new AbortController();
  const timeoutMs = parseNumberEnv(process.env.AZURE_FOUNDRY_TIMEOUT_MS, 12000);
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${apiKey}`,
    "api-key": apiKey,
  };

  const toolSpecs = request.tools.map((tool) => ({
    type: "function" as const,
    function: {
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters,
    },
  }));

  const wireMessages: WireMessage[] = [
    { role: "system", content: request.systemPrompt },
    ...request.messages,
  ];
  const invokedTools: string[] = [];

  try {
    for (let round = 0; round < maxRounds; round++) {
      const response = await fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify({
          model,
          messages: wireMessages,
          tools: toolSpecs,
          tool_choice: "auto",
          temperature:
            request.temperature ?? parseNumberEnv(process.env.AZURE_FOUNDRY_TEMPERATURE, 0.2),
          max_completion_tokens:
            request.maxOutputTokens ?? parseNumberEnv(process.env.AZURE_FOUNDRY_MAX_OUTPUT_TOKENS, 600),
        }),
        signal: controller.signal,
        cache: "no-store",
      });

      if (!response.ok) {
        const body = await response.text();
        console.warn("Foundry tool-calling failed", response.status, body);
        return null;
      }

      const payload = (await response.json()) as ChatCompletionPayload;
      const message = payload.choices?.[0]?.message;
      const toolCalls = message?.tool_calls ?? [];

      if (toolCalls.length === 0) {
        const text = (message?.content ?? "").trim();
        if (!text) return null;
        return { text, toolCalls: invokedTools };
      }

      // Record the assistant turn that requested the tools, then execute each.
      wireMessages.push({
        role: "assistant",
        content: message?.content ?? null,
        tool_calls: toolCalls,
      });

      for (const call of toolCalls) {
        const name = call.function?.name ?? "";
        invokedTools.push(name);
        let result: string;
        try {
          result = await request.executeTool(name, parseToolArguments(call.function?.arguments ?? ""));
        } catch (error) {
          result = JSON.stringify({
            error: error instanceof Error ? error.message : "tool execution failed",
          });
        }
        wireMessages.push({ role: "tool", tool_call_id: call.id, content: result });
      }
    }

    // Round budget exhausted: ask once more for a final answer with no tools.
    const finalResponse = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify({
        model,
        messages: wireMessages,
        temperature:
          request.temperature ?? parseNumberEnv(process.env.AZURE_FOUNDRY_TEMPERATURE, 0.2),
        max_completion_tokens:
          request.maxOutputTokens ?? parseNumberEnv(process.env.AZURE_FOUNDRY_MAX_OUTPUT_TOKENS, 600),
      }),
      signal: controller.signal,
      cache: "no-store",
    });

    if (!finalResponse.ok) return null;
    const finalPayload = (await finalResponse.json()) as ChatCompletionPayload;
    const finalText = (finalPayload.choices?.[0]?.message?.content ?? "").trim();
    if (!finalText) return null;
    return { text: finalText, toolCalls: invokedTools };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown Foundry error";
    console.warn("Foundry tool-calling error:", message);
    return null;
  } finally {
    clearTimeout(timeout);
  }
}
