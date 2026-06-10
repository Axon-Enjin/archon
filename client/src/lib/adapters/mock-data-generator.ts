import type { FinancialStatus, HoldItem } from "@/lib/adapters/types";

/**
 * Deterministic mock-data generator.
 *
 * Produces varied-but-stable student scenarios seeded from the student's Entra
 * OID. The same student always resolves to the same data, while different
 * students get different (yet internally coherent) holds, balances, academic
 * standing, and scholarship status. This replaces the previous single
 * hardcoded fixture so demos show realistic variety across accounts.
 *
 * Each student is first assigned a deterministic ARCHETYPE that exercises a
 * distinct support pathway (clean account, financial-aid delay, SAP issue,
 * etc.). The archetype constrains the generated academic + financial data so
 * the resulting holds, balances, and scholarship status stay coherent with one
 * another and with the chat orchestration in
 * `src/app/api/v1/tickets/[id]/messages/route.ts`.
 */

export type StudentArchetype =
  | "good_standing"
  | "fa_delayed"
  | "fa_shortfall"
  | "sap_warning"
  | "multi_hold";

export interface GeneratedAcademic {
  major: string;
  year: string;
  sap_status: string;
  gwa: string;
  scholarship: string;
}

export interface StudentScenario {
  archetype: StudentArchetype;
  academic: GeneratedAcademic;
  financial: FinancialStatus;
  holds: HoldItem[];
}

const MAJORS = [
  "BS Information Technology",
  "BS Computer Science",
  "BS Civil Engineering",
  "BS Electronics Engineering",
  "BS Accountancy",
  "BS Nursing",
  "BS Psychology",
  "BS Business Administration",
  "BS Education",
  "BS Biology",
] as const;

const YEARS = ["1st Year", "2nd Year", "3rd Year", "4th Year"] as const;

const SCHOLARSHIPS = [
  "CHED UniFAST Grant",
  "DOST-SEI Scholarship",
  "Tertiary Education Subsidy (TES)",
  "Academic Merit Scholarship",
  "Private Foundation Grant",
] as const;

const DISBURSEMENT_STATES = [
  "Pending Verification",
  "Approved — Scheduled",
  "Processing",
] as const;

const DISBURSEMENT_RELEASE = [
  "3 business days",
  "5 business days",
  "7 business days",
] as const;

/** Archetype distribution (weights sum to 100) tuned for demo variety. */
const ARCHETYPE_WEIGHTS: Array<{ archetype: StudentArchetype; weight: number }> = [
  { archetype: "fa_delayed", weight: 30 }, // hero path: liftable financial hold
  { archetype: "multi_hold", weight: 20 }, // financial + academic (+ admin)
  { archetype: "good_standing", weight: 20 }, // paid, clear, no holds
  { archetype: "fa_shortfall", weight: 15 }, // financial hold, aid does NOT cover → escalate
  { archetype: "sap_warning", weight: 15 }, // academic SAP hold
];

const pesoFormatter = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
  maximumFractionDigits: 2,
});

const scenarioCache = new Map<string, StudentScenario>();

/** FNV-1a 32-bit string hash — stable across runs and platforms. */
function hashSeed(input: string): number {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

/** mulberry32 PRNG — deterministic pseudo-random sequence from a 32-bit seed. */
function mulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return function next(): number {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pick<T>(rng: () => number, items: readonly T[]): T {
  return items[Math.floor(rng() * items.length)];
}

function randInt(rng: () => number, min: number, max: number): number {
  return Math.floor(rng() * (max - min + 1)) + min;
}

function roundTo(value: number, step: number): number {
  return Math.round(value / step) * step;
}

function addDays(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function pickArchetype(rng: () => number): StudentArchetype {
  const total = ARCHETYPE_WEIGHTS.reduce((sum, entry) => sum + entry.weight, 0);
  let roll = rng() * total;
  for (const entry of ARCHETYPE_WEIGHTS) {
    roll -= entry.weight;
    if (roll < 0) return entry.archetype;
  }
  return ARCHETYPE_WEIGHTS[0].archetype;
}

interface AcademicPlan {
  academic: GeneratedAcademic;
  hasScholarship: boolean;
}

function buildAcademic(rng: () => number, archetype: StudentArchetype): AcademicPlan {
  const major = pick(rng, MAJORS);
  const year = pick(rng, YEARS);

  // Philippine GWA scale (1.00 best, 5.00 failing). SAP threshold is 2.50.
  let gwaNum: number;
  let sap_status: string;
  if (archetype === "sap_warning" || archetype === "multi_hold") {
    // Below the 2.50 SAP threshold: Warning (2.51–2.75) or Probation (>2.75).
    gwaNum = Math.round((2.55 + rng() * 0.65) * 100) / 100; // 2.55 .. 3.20
    sap_status = gwaNum <= 2.75 ? "Warning" : "Probation";
  } else {
    // Good standing for everyone else.
    gwaNum = Math.round((1.25 + rng() * 1.15) * 100) / 100; // 1.25 .. 2.40
    sap_status = "Good Standing";
  }

  // Financial-aid archetypes always carry a scholarship; others usually do.
  const aidArchetype =
    archetype === "fa_delayed" || archetype === "fa_shortfall" || archetype === "multi_hold";
  const hasScholarship = aidArchetype ? true : rng() > 0.3;
  const scholarship = hasScholarship ? pick(rng, SCHOLARSHIPS) : "Self-funded";

  return {
    academic: { major, year, sap_status, gwa: gwaNum.toFixed(2), scholarship },
    hasScholarship,
  };
}

function buildFinancial(
  rng: () => number,
  studentOid: string,
  archetype: StudentArchetype,
  scholarship: string,
  hasScholarship: boolean
): FinancialStatus {
  const units = pick(rng, [15, 18, 21]);
  const tuition = units * randInt(rng, 950, 1150);
  const labFees = roundTo(randInt(rng, 1500, 4000), 100);
  const misc = roundTo(randInt(rng, 2000, 3500), 100);
  const total_charges = tuition + labFees + misc;

  // Payment progress and pending aid depend on the archetype so the resulting
  // hold state is coherent with the support pathway being demonstrated.
  let payments_made: number;
  let pending_financial_aid: number;

  switch (archetype) {
    case "good_standing": {
      payments_made = total_charges; // fully settled
      pending_financial_aid = 0;
      break;
    }
    case "fa_delayed": {
      // Outstanding balance, but pending aid fully covers it → liftable hold.
      payments_made = roundTo(total_charges * pick(rng, [0, 0.25, 0.4]), 100);
      const balance = total_charges - payments_made;
      pending_financial_aid = roundTo(balance + randInt(rng, 500, 4000), 500);
      break;
    }
    case "fa_shortfall": {
      // Outstanding balance, pending aid only partially covers → not liftable.
      payments_made = roundTo(total_charges * pick(rng, [0, 0.2]), 100);
      const balance = total_charges - payments_made;
      pending_financial_aid = roundTo(balance * pick(rng, [0.3, 0.5, 0.65]), 500);
      break;
    }
    case "sap_warning": {
      // Academic issue; finances are settled.
      payments_made = total_charges;
      pending_financial_aid = 0;
      break;
    }
    case "multi_hold":
    default: {
      // Outstanding balance alongside the academic hold; aid may or may not cover.
      payments_made = roundTo(total_charges * pick(rng, [0, 0.25, 0.5]), 100);
      const balance = total_charges - payments_made;
      pending_financial_aid = hasScholarship
        ? roundTo(balance * pick(rng, [0.5, 0.8, 1.1]), 500)
        : 0;
      break;
    }
  }

  const balance_due = total_charges - payments_made;
  const net_balance = balance_due - pending_financial_aid;

  let status: string;
  if (balance_due <= 0) status = "Paid";
  else if (pending_financial_aid >= balance_due) status = "Hold Active — Aid Pending";
  else status = "Hold Active";

  const pending_disbursements =
    hasScholarship && pending_financial_aid > 0
      ? [
          {
            source: scholarship,
            amount: pending_financial_aid,
            status: pick(rng, DISBURSEMENT_STATES),
            expected_release: pick(rng, DISBURSEMENT_RELEASE),
          },
        ]
      : [];

  return {
    student_id: studentOid,
    currency: "PHP",
    total_charges,
    payments_made,
    balance_due,
    pending_financial_aid,
    net_balance,
    status,
    payment_deadline: addDays(randInt(rng, 7, 30)),
    scholarship_renewal_deadline: addDays(randInt(rng, 10, 45)),
    scholarship_renewal_status: "not_started",
    scholarship_renewal_submitted: false,
    itemized_charges: [
      { item: `Tuition Fee (${units} units)`, amount: tuition },
      { item: "Laboratory & Computer Fees", amount: labFees },
      { item: "Miscellaneous & Registration", amount: misc },
    ],
    pending_disbursements,
  };
}

function buildHolds(
  rng: () => number,
  archetype: StudentArchetype,
  academic: GeneratedAcademic,
  financial: FinancialStatus
): HoldItem[] {
  const holds: HoldItem[] = [];

  // Financial hold keys off an unpaid balance (not net balance) so a student
  // with covering pending aid still has a hold that can be auto-lifted.
  if (financial.balance_due > 0) {
    const covered = financial.pending_financial_aid >= financial.balance_due;
    holds.push({
      id: "hold-financial",
      type: "Financial",
      reason: `Pending tuition balance of ${pesoFormatter.format(financial.balance_due)}`,
      status: "Active",
      resolution_steps:
        financial.pending_disbursements.length > 0 && covered
          ? `Your ${financial.pending_disbursements[0].source} is expected to clear this balance. I can request a temporary lift while it posts.`
          : financial.pending_disbursements.length > 0
          ? `Your ${financial.pending_disbursements[0].source} covers part of this balance. Settle the remainder at the Bursar counter or set up an installment plan.`
          : "Settle the remaining balance at the Bursar counter or set up an installment plan.",
    });
  }

  if (academic.sap_status !== "Good Standing") {
    holds.push({
      id: "hold-academic",
      type: "Academic",
      reason: `Satisfactory Academic Progress (SAP) GPA deficiency (GWA is ${academic.gwa}, required is 2.50)`,
      status: "Active",
      resolution_steps:
        "Submit an SAP Appeal narrative and study plan to the Academic Advisory Panel.",
    });
  }

  // Occasional administrative hold (missing document) adds variety to multi-hold accounts.
  if (archetype === "multi_hold" && rng() < 0.5) {
    holds.push({
      id: "hold-administrative",
      type: "Administrative",
      reason: "Missing admission requirement: Form 137 / Transcript of Records not yet submitted",
      status: "Active",
      resolution_steps:
        "Submit the original Form 137 to the Registrar's Office to clear this hold.",
    });
  }

  return holds;
}

/**
 * Generate a deterministic, internally-coherent student scenario from an OID.
 * Memoized per process so repeated calls are cheap and identical.
 */
export function generateStudentScenario(studentOid: string): StudentScenario {
  const cached = scenarioCache.get(studentOid);
  if (cached) return cached;

  const rng = mulberry32(hashSeed(studentOid));

  const archetype = pickArchetype(rng);
  const { academic, hasScholarship } = buildAcademic(rng, archetype);
  const financial = buildFinancial(rng, studentOid, archetype, academic.scholarship, hasScholarship);
  const holds = buildHolds(rng, archetype, academic, financial);

  const scenario: StudentScenario = { archetype, academic, financial, holds };
  scenarioCache.set(studentOid, scenario);
  return scenario;
}

export interface GeneratedCalendarEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  isAllDay: boolean;
  source: "M365";
}

const COURSE_EVENTS = [
  "Midterm Exam",
  "Project Defense",
  "Laboratory Practical",
  "Group Consultation",
  "Departmental Seminar",
] as const;

function isoAt(daysFromNow: number, hour: number, durationHours = 1): { start: string; end: string } {
  const start = new Date();
  start.setHours(hour, 0, 0, 0);
  start.setDate(start.getDate() + daysFromNow);
  const end = new Date(start);
  end.setHours(start.getHours() + durationHours);
  return { start: start.toISOString(), end: end.toISOString() };
}

function isoAllDay(deadline: string): { start: string; end: string } {
  // `deadline` is a YYYY-MM-DD string; render as an all-day event on that date.
  const start = new Date(`${deadline}T00:00:00.000Z`);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 1);
  return { start: start.toISOString(), end: end.toISOString() };
}

/**
 * Generate a deterministic M365 calendar for a student, anchored to "today" and
 * tied to their own scenario (payment deadline, scholarship renewal, SAP appeal,
 * disbursement) plus a couple of course events. Keeps the dashboard calendar
 * coherent with the student's holds and financial data (US-08, PRD-F11).
 */
export function generateCalendarEvents(studentOid: string): GeneratedCalendarEvent[] {
  const scenario = generateStudentScenario(studentOid);
  // Separate RNG stream so calendar variety doesn't disturb scenario generation.
  const rng = mulberry32(hashSeed(`${studentOid}:calendar`));
  const events: GeneratedCalendarEvent[] = [];

  const { financial, academic, holds } = scenario;

  // Tuition payment deadline (only meaningful when there's a balance).
  if (financial.balance_due > 0) {
    const slot = isoAllDay(financial.payment_deadline);
    events.push({
      id: `cal-payment-${studentOid}`,
      title: "Tuition Payment Deadline",
      start: slot.start,
      end: slot.end,
      isAllDay: true,
      source: "M365",
    });
  }

  // Pending disbursement expected-release (turn the relative text into a date).
  const disbursement = financial.pending_disbursements[0];
  if (disbursement) {
    const releaseDays = Number(disbursement.expected_release.match(/\d+/)?.[0] ?? 5);
    const slot = isoAt(Math.max(1, releaseDays), 9);
    events.push({
      id: `cal-disbursement-${studentOid}`,
      title: `${disbursement.source} Disbursement Expected`,
      start: slot.start,
      end: slot.end,
      isAllDay: false,
      source: "M365",
    });
  }

  // Scholarship renewal deadline (only when the student holds a scholarship).
  if (academic.scholarship !== "Self-funded") {
    const slot = isoAllDay(financial.scholarship_renewal_deadline);
    events.push({
      id: `cal-renewal-${studentOid}`,
      title: `${academic.scholarship} Renewal Deadline`,
      start: slot.start,
      end: slot.end,
      isAllDay: true,
      source: "M365",
    });
  }

  // SAP appeal deadline when there is an active academic hold.
  if (holds.some((hold) => hold.type === "Academic" && hold.status === "Active")) {
    const slot = isoAllDay(addDays(randInt(rng, 5, 12)));
    events.push({
      id: `cal-sap-${studentOid}`,
      title: "SAP Academic Appeal Submission Deadline",
      start: slot.start,
      end: slot.end,
      isAllDay: true,
      source: "M365",
    });
  }

  // One or two course events for texture.
  const courseCount = randInt(rng, 1, 2);
  for (let i = 0; i < courseCount; i++) {
    const day = randInt(rng, 2, 14);
    const hour = randInt(rng, 8, 15);
    const slot = isoAt(day, hour, 2);
    const subjectCode = `${academic.major.split(" ")[1] ?? "GEN"} ${randInt(rng, 101, 412)}`;
    events.push({
      id: `cal-course-${studentOid}-${i}`,
      title: `${pick(rng, COURSE_EVENTS)}: ${subjectCode}`,
      start: slot.start,
      end: slot.end,
      isAllDay: false,
      source: "M365",
    });
  }

  return events.sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
}
