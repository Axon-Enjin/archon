import type { FoundryTool } from "@/lib/azure-foundry";

/**
 * Archon tool registry for Foundry function-calling (PRD-F3).
 *
 * These are the *schemas* the model sees. Execution is wired in the chat route,
 * which closes over the authenticated student's adapter context and performs the
 * actual data reads / server actions. Tool functions operate implicitly on the
 * authenticated student — the model never passes a student identifier, which
 * keeps cross-tenant access impossible at the tool boundary.
 */

const NO_ARGS_SCHEMA: Record<string, unknown> = {
  type: "object",
  properties: {},
  additionalProperties: false,
};

export const ARCHON_TOOLS: FoundryTool[] = [
  {
    name: "check_tuition_balance",
    description:
      "Get the authenticated student's tuition account: total charges, payments made, balance due, itemized charges, and payment deadline.",
    parameters: NO_ARGS_SCHEMA,
  },
  {
    name: "check_financial_aid",
    description:
      "Get the authenticated student's financial aid: pending disbursements (scholarship/grant source, amount, status, expected release) and pending aid total.",
    parameters: NO_ARGS_SCHEMA,
  },
  {
    name: "check_student_holds",
    description:
      "List the authenticated student's active account holds (financial, academic/SAP, administrative) with reasons and resolution steps.",
    parameters: NO_ARGS_SCHEMA,
  },
  {
    name: "get_account_diagnosis",
    description:
      "Get a synthesized cross-department diagnosis spanning Registrar, Bursar, and Financial Aid. Use for broad questions like 'why can't I enroll?' or 'what's wrong with my account?'.",
    parameters: NO_ARGS_SCHEMA,
  },
  {
    name: "get_calendar_events",
    description:
      "Get the authenticated student's upcoming Microsoft 365 calendar events (deadlines, exams, disbursement dates) for the next several weeks.",
    parameters: NO_ARGS_SCHEMA,
  },
  {
    name: "get_course_schedule",
    description:
      "Get the authenticated student's enrolled courses this term: subject code, title, units, section, room, meeting days/times, and instructor. Use for questions about classes, schedule, units, or rooms.",
    parameters: NO_ARGS_SCHEMA,
  },
  {
    name: "get_transaction_history",
    description:
      "Get the authenticated student's recent account activity (past payments, tuition charges, scholarship disbursements/credits, previously lifted holds). Use for questions like 'what happened last month?' or 'show my payment history'.",
    parameters: NO_ARGS_SCHEMA,
  },
  {
    name: "request_hold_lift",
    description:
      "Request a temporary lift of the student's financial hold. Only succeeds when pending financial aid covers the outstanding balance; otherwise it escalates to a human agent. Use only after confirming the student wants the hold lifted.",
    parameters: {
      type: "object",
      properties: {
        reason: {
          type: "string",
          description: "Short justification for the lift request (optional).",
        },
      },
      additionalProperties: false,
    },
  },
  {
    name: "query_policies",
    description:
      "Look up university policy guidance (e.g., SAP appeals, enrollment, financial aid rules) to explain processes to the student.",
    parameters: {
      type: "object",
      properties: {
        topic: {
          type: "string",
          description: "The policy topic to explain, e.g. 'SAP appeal' or 'enrollment hold'.",
        },
      },
      additionalProperties: false,
    },
  },
  {
    name: "escalate_to_human",
    description:
      "Escalate the conversation to a human support agent with full context. Use when the student explicitly asks for a human, or when the issue requires judgment Archon cannot provide.",
    parameters: {
      type: "object",
      properties: {
        reason: {
          type: "string",
          description: "Why the case needs a human agent (optional).",
        },
      },
      additionalProperties: false,
    },
  },
];

/**
 * Maps a tool's snake_case function name to the canonical display tool-call name
 * used by the UI and the guardrail allowlist (`ALLOWED_AI_TOOL_CALLS`).
 */
export const TOOL_DISPLAY_NAMES: Record<string, string> = {
  check_tuition_balance: "CheckTuitionBalance",
  check_financial_aid: "CheckFinancialAidStatus",
  check_student_holds: "CheckStudentHolds",
  get_account_diagnosis: "CheckStudentHolds",
  get_calendar_events: "GetCalendarEvents",
  get_course_schedule: "GetCourseSchedule",
  get_transaction_history: "GetTransactionHistory",
  request_hold_lift: "requestHoldLift",
  query_policies: "queryPolicies",
  escalate_to_human: "EscalateToHuman",
};

export function toDisplayToolName(functionName: string): string | null {
  return TOOL_DISPLAY_NAMES[functionName] ?? null;
}
