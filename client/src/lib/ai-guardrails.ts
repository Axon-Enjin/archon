export type GuardrailDecision = {
  action: "allow" | "refuse";
  reason: "prompt_injection" | "prompt_leakage" | "jailbreak" | "out_of_scope" | "unsafe_output";
  responseText: string;
};

export interface AiResponsePayload {
  text: string;
  toolCalls: string[];
  calendarEvents?: Array<{
    id: string;
    title: string;
    start: string;
    end: string;
    isAllDay: boolean;
    source: string;
  }>;
  calendarState?:
    | "ready"
    | "empty"
    | "consent_required"
    | "token_missing"
    | "disabled"
    | "unavailable";
}

export const ARCHON_SCOPE_REFUSAL_TEXT =
  "I'm Archon, your student support assistant at State University. I can only help you with registration holds, tuition balances, financial aid, and academic support. Is there something I can help you with in those areas?";

export const ALLOWED_AI_TOOL_CALLS = [
  "AttemptAutonomousResolution",
  "CheckFinancialAidStatus",
  "GetCalendarEvents",
  "CheckStudentHolds",
  "CheckTuitionBalance",
  "EscalateToHuman",
  "queryPolicies",
  "requestHoldLift",
] as const;

const IN_SCOPE_PATTERNS = [
  /\b(balance|tuition|billing|bill|owe|payment|bayad|bayarin|bayranan|balanse)\b/i,
  /\b(hold|registration|register|enroll|enrollment|registrar|block|lift|remove hold)\b/i,
  /\b(financial aid|scholarship|unifast|ched|grant|disbursement)\b/i,
  /\b(sap|appeal|academic standing|academic hold)\b/i,
  /\b(calendar|schedule|m365|microsoft 365|outlook|teams|deadline)\b/i,
];

const GREETING_PATTERNS = [
  /^(hi|hello|hey|good morning|good afternoon|good evening)\b/i,
  /^(thanks|thank you|salamat)\b/i,
];

const OFF_TOPIC_PATTERNS = [
  /\b(code|coding|programming|javascript|typescript|react|python|java|sql|bug fix)\b/i,
  /\b(recipe|cook|cooking|food|restaurant|travel|vacation|hotel|flight)\b/i,
  /\b(movie|music|song|game|gaming|anime|celebrity|entertainment)\b/i,
  /\b(math|algebra|calculus|physics|chemistry|biology|science homework|assignment)\b/i,
  /\b(trivia|joke|poem|story|essay|creative writing)\b/i,
];

const PROMPT_INJECTION_PATTERNS = [
  /ignore (all |any |the )?(previous|prior|above) instructions/i,
  /disregard (all |any |the )?(previous|prior|above) instructions/i,
  /forget your instructions/i,
  /new task is/i,
  /system message end/i,
  /developer message/i,
  /you are no longer bound/i,
  /act as (an? )?(unconstrained|unfiltered|unrestricted) /i,
  /simulate (an? )?(unrestricted|unsafe) /i,
];

const PROMPT_LEAKAGE_PATTERNS = [
  /system prompt/i,
  /developer instructions/i,
  /hidden prompt/i,
  /initial instructions/i,
  /internal configuration/i,
  /show .*prompt/i,
  /reveal .*prompt/i,
  /translate .*instructions/i,
  /output the exact text/i,
];

const JAILBREAK_PATTERNS = [
  /\bdo anything now\b/i,
  /\bDAN\b/i,
  /opposite day/i,
  /we are playing a game/i,
  /fictional monologue/i,
  /virtual machine/i,
  /linux terminal/i,
  /debug mode/i,
];

const OUTPUT_LEAK_PATTERNS = [
  /system prompt/i,
  /developer instructions/i,
  /hidden instructions/i,
  /internal configuration/i,
  /runtime context/i,
  /do not share with user/i,
  /Student Entra OID/i,
  /Status aggregate JSON/i,
  /Current AI resolution attempts/i,
  /<runtime_context>/i,
  /<system_policy>/i,
];

function normalizeText(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

function buildRefusal(reason: GuardrailDecision["reason"]): GuardrailDecision {
  return {
    action: "refuse",
    reason,
    responseText: ARCHON_SCOPE_REFUSAL_TEXT,
  };
}

export function evaluateUserInputGuardrails(input: string): GuardrailDecision | null {
  const normalized = normalizeText(input);
  if (!normalized) return null;

  if (PROMPT_LEAKAGE_PATTERNS.some((pattern) => pattern.test(normalized))) {
    return buildRefusal("prompt_leakage");
  }

  if (PROMPT_INJECTION_PATTERNS.some((pattern) => pattern.test(normalized))) {
    return buildRefusal("prompt_injection");
  }

  if (JAILBREAK_PATTERNS.some((pattern) => pattern.test(normalized))) {
    return buildRefusal("jailbreak");
  }

  if (GREETING_PATTERNS.some((pattern) => pattern.test(normalized))) {
    return null;
  }

  const isInScope = IN_SCOPE_PATTERNS.some((pattern) => pattern.test(normalized));
  const isClearlyOffTopic = OFF_TOPIC_PATTERNS.some((pattern) => pattern.test(normalized));

  if (!isInScope && isClearlyOffTopic) {
    return buildRefusal("out_of_scope");
  }

  return null;
}

export function buildRefusalPayload(reason: GuardrailDecision["reason"] = "out_of_scope"): AiResponsePayload {
  return {
    text: buildRefusal(reason).responseText,
    toolCalls: [],
  };
}

function escapeTagContent(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export function wrapConversationTurnForModel(
  role: "user" | "assistant",
  content: string
): { role: "user" | "assistant"; content: string } {
  if (role === "user") {
    return {
      role,
      content: `<user_input trusted="false">${escapeTagContent(content)}</user_input>`,
    };
  }

  return {
    role,
    content: `<assistant_response>${escapeTagContent(content)}</assistant_response>`,
  };
}

export function guardModelOutput(payload: AiResponsePayload): GuardrailDecision | null {
  if (OUTPUT_LEAK_PATTERNS.some((pattern) => pattern.test(payload.text))) {
    return buildRefusal("unsafe_output");
  }

  const hasDisallowedTool = payload.toolCalls.some(
    (tool) => !ALLOWED_AI_TOOL_CALLS.includes(tool as (typeof ALLOWED_AI_TOOL_CALLS)[number])
  );
  if (hasDisallowedTool) {
    return buildRefusal("unsafe_output");
  }

  return null;
}
