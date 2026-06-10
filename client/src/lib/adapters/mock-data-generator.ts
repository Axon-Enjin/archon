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
  units: number;
  courses: GeneratedCourse[];
  transactions: GeneratedTransaction[];
}

export interface GeneratedCourse {
  code: string;
  title: string;
  units: number;
  section: string;
  room: string;
  /** Meeting-day pattern, e.g. "MWF" or "TTh". */
  days: string;
  start_time: string; // "HH:MM" (24h)
  end_time: string; // "HH:MM" (24h)
  instructor: string;
}

export type TransactionType =
  | "payment"
  | "hold_lifted"
  | "disbursement"
  | "charge"
  | "scholarship_credit";

export interface GeneratedTransaction {
  id: string;
  date: string; // ISO date (YYYY-MM-DD), in the past
  type: TransactionType;
  description: string;
  amount: number; // positive PHP magnitude; `type` conveys direction
  currency: "PHP";
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

/** Subject-code prefix per major, used to render realistic course codes. */
const MAJOR_SUBJECT_PREFIX: Record<string, string> = {
  "BS Information Technology": "IT",
  "BS Computer Science": "CS",
  "BS Civil Engineering": "CE",
  "BS Electronics Engineering": "ECE",
  "BS Accountancy": "ACCT",
  "BS Nursing": "NCM",
  "BS Psychology": "PSY",
  "BS Business Administration": "BA",
  "BS Education": "EDUC",
  "BS Biology": "BIO",
};

/** Major-specific subject titles (3 units each). */
const MAJOR_COURSE_TITLES: Record<string, readonly string[]> = {
  "BS Information Technology": ["Database Systems", "Web Systems & Technologies", "Networking 2", "Information Assurance & Security", "Systems Integration"],
  "BS Computer Science": ["Data Structures & Algorithms", "Automata Theory", "Operating Systems", "Software Engineering", "Artificial Intelligence"],
  "BS Civil Engineering": ["Structural Theory", "Geotechnical Engineering", "Hydraulics", "Reinforced Concrete Design", "Construction Methods"],
  "BS Electronics Engineering": ["Electronic Circuits", "Signals & Systems", "Microprocessors", "Communications Engineering", "Control Systems"],
  "BS Accountancy": ["Financial Accounting", "Cost Accounting", "Auditing Theory", "Taxation", "Management Advisory Services"],
  "BS Nursing": ["Maternal & Child Nursing", "Medical-Surgical Nursing", "Community Health Nursing", "Pharmacology", "Nursing Research"],
  "BS Psychology": ["Abnormal Psychology", "Psychological Assessment", "Experimental Psychology", "Industrial Psychology", "Developmental Psychology"],
  "BS Business Administration": ["Operations Management", "Marketing Management", "Financial Management", "Human Resource Management", "Strategic Management"],
  "BS Education": ["Curriculum Development", "Assessment of Learning", "Educational Technology", "Facilitating Learning", "Field Study"],
  "BS Biology": ["Cell Biology", "Genetics", "Microbiology", "Ecology", "Molecular Biology"],
};

/** General-education subjects shared across programs (3 units each). */
const GE_COURSE_TITLES = [
  "Purposive Communication",
  "Readings in Philippine History",
  "Mathematics in the Modern World",
  "Understanding the Self",
  "Science, Technology & Society",
  "The Contemporary World",
  "Ethics",
] as const;

const COURSE_DAY_PATTERNS = ["MWF", "TTh", "MWF", "TTh", "Sat"] as const;
const COURSE_START_TIMES = ["07:30", "09:00", "10:30", "13:00", "14:30", "16:00"] as const;

const INSTRUCTOR_FIRST = ["J.", "M.", "R.", "A.", "C.", "E.", "L.", "P."] as const;
const INSTRUCTOR_LAST = [
  "Santos", "Reyes", "Cruz", "Bautista", "Garcia", "Mendoza", "Torres",
  "Flores", "Ramos", "Villanueva", "Aquino", "del Rosario",
] as const;

const BUILDINGS = ["Rm", "Lab", "CL", "AVR"] as const;

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
  hasScholarship: boolean,
  units: number
): FinancialStatus {
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

function buildInstructor(rng: () => number): string {
  return `Prof. ${pick(rng, INSTRUCTOR_FIRST)} ${pick(rng, INSTRUCTOR_LAST)}`;
}

function addMinutesToTime(time: string, minutes: number): string {
  const [h, m] = time.split(":").map(Number);
  const total = h * 60 + m + minutes;
  const hh = Math.floor(total / 60) % 24;
  const mm = total % 60;
  return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
}

/**
 * Build a deterministic course load that sums to the student's enrolled `units`.
 * Mixes major-specific and general-education subjects with realistic codes,
 * sections, rooms, and meeting times so schedule questions return real-looking
 * data (PRD-F1).
 */
function buildCourseSchedule(
  rng: () => number,
  major: string,
  year: string,
  units: number
): GeneratedCourse[] {
  const prefix = MAJOR_SUBJECT_PREFIX[major] ?? "GEN";
  const majorTitles = MAJOR_COURSE_TITLES[major] ?? GE_COURSE_TITLES;
  const yearNum = Number(year.charAt(0)) || 1;
  const sectionLetter = pick(rng, ["A", "B", "C"] as const);
  const section = `${prefix}-${yearNum}${sectionLetter}`;

  // Most subjects are 3 units; fill toward the unit target.
  const courses: GeneratedCourse[] = [];
  const usedTitles = new Set<string>();
  const usedSlots = new Set<string>();
  let remaining = units;

  const nextTitle = (): { title: string; major: boolean } => {
    // ~60% chance of a major subject when available, else a GE subject.
    const useMajor = rng() < 0.6;
    const pool = useMajor ? majorTitles : GE_COURSE_TITLES;
    for (let attempt = 0; attempt < 8; attempt++) {
      const title = pick(rng, pool);
      if (!usedTitles.has(title)) {
        usedTitles.add(title);
        return { title, major: useMajor };
      }
    }
    const fallback = `Elective ${courses.length + 1}`;
    usedTitles.add(fallback);
    return { title: fallback, major: false };
  };

  const uniqueSlot = (): { days: string; start: string } => {
    for (let attempt = 0; attempt < 12; attempt++) {
      const days = pick(rng, COURSE_DAY_PATTERNS);
      const start = pick(rng, COURSE_START_TIMES);
      const key = `${days}-${start}`;
      if (!usedSlots.has(key)) {
        usedSlots.add(key);
        return { days, start };
      }
    }
    return { days: pick(rng, COURSE_DAY_PATTERNS), start: pick(rng, COURSE_START_TIMES) };
  };

  while (remaining >= 3 && courses.length < 8) {
    const { title, major: isMajor } = nextTitle();
    const slot = uniqueSlot();
    const durationMins = 90;
    const code = `${isMajor ? prefix : "GE"} ${randInt(rng, 101, 412)}`;
    const building = pick(rng, BUILDINGS);
    courses.push({
      code,
      title,
      units: 3,
      section,
      room: `${building} ${randInt(rng, 101, 610)}`,
      days: slot.days,
      start_time: slot.start,
      end_time: addMinutesToTime(slot.start, durationMins),
      instructor: buildInstructor(rng),
    });
    remaining -= 3;
  }

  // Trailing 1-2 unit subject (PE / NSTP / lab) to reconcile odd unit totals.
  if (remaining > 0) {
    const slot = uniqueSlot();
    courses.push({
      code: remaining === 2 ? "PE 2" : "NSTP 1",
      title: remaining === 2 ? "Physical Education & Health" : "National Service Training Program",
      units: remaining,
      section,
      room: pick(rng, ["Gym", "Field", "Rm 110"] as const),
      days: slot.days,
      start_time: slot.start,
      end_time: addMinutesToTime(slot.start, 60),
      instructor: buildInstructor(rng),
    });
  }

  return courses;
}

/**
 * Build a deterministic ledger of past account activity (PRD-F2): prior
 * payments that reconcile with `payments_made`, a scholarship credit/timeline
 * entry, and an occasional previously-lifted hold — so the agent can answer
 * "what happened last month?".
 */
function buildTransactionHistory(
  rng: () => number,
  studentOid: string,
  archetype: StudentArchetype,
  financial: FinancialStatus,
  scholarship: string,
  hasScholarship: boolean
): GeneratedTransaction[] {
  const transactions: GeneratedTransaction[] = [];
  const todayKey = () => new Date();

  const pastDate = (daysAgo: number): string => {
    const d = todayKey();
    d.setDate(d.getDate() - daysAgo);
    return d.toISOString().slice(0, 10);
  };

  let seq = 0;
  const push = (daysAgo: number, type: TransactionType, description: string, amount: number) => {
    transactions.push({
      id: `txn-${studentOid}-${seq++}`,
      date: pastDate(daysAgo),
      type,
      description,
      amount: Math.round(amount),
      currency: "PHP",
    });
  };

  // Initial enrollment charge for the term.
  push(randInt(rng, 70, 95), "charge", `Tuition & fees assessment (${financial.itemized_charges[0]?.item ?? "current term"})`, financial.total_charges);

  // Past payments that reconcile (roughly) with payments_made.
  if (financial.payments_made > 0) {
    const installments = pick(rng, [1, 2, 2, 3] as const);
    const per = financial.payments_made / installments;
    for (let i = 0; i < installments; i++) {
      const channel = pick(rng, ["Cashier (OR)", "GCash", "Bank Transfer", "Landbank Link.BizPortal"] as const);
      push(randInt(rng, 20 + i * 18, 35 + i * 18), "payment", `Tuition payment via ${channel}`, per);
    }
  }

  // Scholarship credit / disbursement timeline entry.
  if (hasScholarship && scholarship !== "Self-funded") {
    if (financial.pending_financial_aid > 0) {
      push(randInt(rng, 8, 16), "disbursement", `${scholarship} disbursement filed — awaiting release`, financial.pending_financial_aid);
    } else {
      push(randInt(rng, 30, 60), "scholarship_credit", `${scholarship} grant credited to account`, financial.itemized_charges[0]?.amount ?? 10000);
    }
  }

  // Occasionally, a previously lifted hold (registrar/admin) earlier in the term.
  if ((archetype === "multi_hold" || rng() < 0.25)) {
    push(randInt(rng, 40, 80), "hold_lifted", "Prior Registrar hold lifted after document submission", 0);
  }

  return transactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

/**
 * Generate a deterministic, internally-coherent student scenario from an OID.
 * Memoized per process so repeated calls are cheap and identical.
 */
export function generateStudentScenario(studentOid: string): StudentScenario {
  const cached = scenarioCache.get(studentOid);
  if (cached) return cached;

  const scenario = composeScenario(studentOid);
  scenarioCache.set(studentOid, scenario);
  return scenario;
}

function composeScenario(seed: string, forcedArchetype?: StudentArchetype): StudentScenario {
  const rng = mulberry32(hashSeed(seed));

  const archetype = forcedArchetype ?? pickArchetype(rng);
  const { academic, hasScholarship } = buildAcademic(rng, archetype);
  const units = pick(rng, [15, 18, 21]);
  const financial = buildFinancial(rng, seed, archetype, academic.scholarship, hasScholarship, units);
  const holds = buildHolds(rng, archetype, academic, financial);
  const courses = buildCourseSchedule(rng, academic.major, academic.year, units);
  const transactions = buildTransactionHistory(
    rng,
    seed,
    archetype,
    financial,
    academic.scholarship,
    hasScholarship
  );

  return {
    archetype,
    academic,
    financial,
    holds,
    units,
    courses,
    transactions,
  };
}

/**
 * Dev-only scenario override (Phase 1). Generates a fresh scenario from an
 * explicit `seed` string and/or a forced `archetype`, bypassing the per-OID
 * cache so a demo can deterministically force a specific student profile
 * without polluting a real student's cached data. Callers MUST gate this behind
 * a non-production check.
 */
export function generateScenarioOverride(
  seed: string,
  forcedArchetype?: StudentArchetype
): StudentScenario {
  const cacheKey = `dev:${seed}:${forcedArchetype ?? "auto"}`;
  const cached = scenarioCache.get(cacheKey);
  if (cached) return cached;

  const scenario = composeScenario(`${seed}:${forcedArchetype ?? "auto"}`, forcedArchetype);
  scenarioCache.set(cacheKey, scenario);
  return scenario;
}

/** Whether a string is a recognized archetype (for validating dev overrides). */
export function isStudentArchetype(value: string): value is StudentArchetype {
  return (
    value === "good_standing" ||
    value === "fa_delayed" ||
    value === "fa_shortfall" ||
    value === "sap_warning" ||
    value === "multi_hold"
  );
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

/** Map a meeting-day pattern (e.g. "MWF", "TTh", "Sat") to weekday numbers. */
function dayPatternToWeekdays(pattern: string): number[] {
  switch (pattern) {
    case "MWF":
      return [1, 3, 5];
    case "TTh":
      return [2, 4];
    case "Sat":
      return [6];
    default:
      return [1];
  }
}

/**
 * Next datetime (within the upcoming 7 days) that a class with the given
 * day-pattern and start time meets, or null if none fall in the window.
 */
function nextClassOccurrence(daysPattern: string, startTime: string): Date | null {
  const [h, m] = startTime.split(":").map(Number);
  const weekdays = dayPatternToWeekdays(daysPattern);
  for (let offset = 0; offset < 7; offset++) {
    const candidate = new Date();
    candidate.setDate(candidate.getDate() + offset);
    if (!weekdays.includes(candidate.getDay())) continue;
    candidate.setHours(h, m, 0, 0);
    if (candidate.getTime() <= Date.now()) continue; // skip already-passed today
    return candidate;
  }
  return null;
}

/**
 * Generate a deterministic M365 calendar for a student, anchored to "today" and
 * tied to their own scenario (payment deadline, scholarship renewal, SAP appeal,
 * disbursement) plus this week's class meetings. Keeps the dashboard calendar
 * coherent with the student's holds, financial data, and schedule (US-08,
 * PRD-F1, PRD-F11).
 */
export function generateCalendarEvents(studentOid: string): GeneratedCalendarEvent[] {
  return buildCalendarFromScenario(studentOid, generateStudentScenario(studentOid));
}

/**
 * Dev-only calendar override (non-production): build a calendar from an explicit
 * seed / forced archetype so the dashboard calendar stays coherent with an
 * overridden scenario.
 */
export function generateCalendarEventsOverride(
  seed: string,
  forcedArchetype?: StudentArchetype
): GeneratedCalendarEvent[] {
  const idBase = `${seed}:${forcedArchetype ?? "auto"}`;
  return buildCalendarFromScenario(idBase, generateScenarioOverride(seed, forcedArchetype));
}

function buildCalendarFromScenario(
  studentOid: string,
  scenario: StudentScenario
): GeneratedCalendarEvent[] {
  // Separate RNG stream so calendar variety doesn't disturb scenario generation.
  const rng = mulberry32(hashSeed(`${studentOid}:calendar`));
  const events: GeneratedCalendarEvent[] = [];

  const { financial, academic, holds, courses } = scenario;

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

  // This week's class meetings from the student's actual course schedule.
  for (const course of courses) {
    const occurrence = nextClassOccurrence(course.days, course.start_time);
    if (!occurrence) continue;
    const [eh, em] = course.end_time.split(":").map(Number);
    const end = new Date(occurrence);
    end.setHours(eh, em, 0, 0);
    events.push({
      id: `cal-class-${studentOid}-${course.code.replace(/\s+/g, "")}`,
      title: `${course.code} — ${course.title} (${course.room})`,
      start: occurrence.toISOString(),
      end: end.toISOString(),
      isAllDay: false,
      source: "M365",
    });
  }

  // One academic flavor event (exam/defense) for texture.
  const flavorDay = randInt(rng, 3, 14);
  const flavorHour = randInt(rng, 8, 15);
  const flavorSlot = isoAt(flavorDay, flavorHour, 2);
  const subjectCode = courses[0]?.code ?? `${academic.major.split(" ")[1] ?? "GEN"} ${randInt(rng, 101, 412)}`;
  events.push({
    id: `cal-course-${studentOid}-0`,
    title: `${pick(rng, COURSE_EVENTS)}: ${subjectCode}`,
    start: flavorSlot.start,
    end: flavorSlot.end,
    isAllDay: false,
    source: "M365",
  });

  return events.sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
}
