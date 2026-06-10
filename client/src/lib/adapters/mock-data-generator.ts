import type { FinancialStatus, HoldItem } from "@/lib/adapters/types";

/**
 * Deterministic mock-data generator.
 *
 * Produces varied-but-stable student scenarios seeded from the student's Entra
 * OID. The same student always resolves to the same data, while different
 * students get different (yet internally coherent) holds, balances, academic
 * standing, and scholarship status. This replaces the previous single
 * hardcoded fixture so demos show realistic variety across accounts.
 */

export interface GeneratedAcademic {
  major: string;
  year: string;
  sap_status: string;
  gwa: string;
  scholarship: string;
}

export interface StudentScenario {
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

function buildAcademic(rng: () => number): { academic: GeneratedAcademic; gwaNum: number; hasScholarship: boolean } {
  const major = pick(rng, MAJORS);
  const year = pick(rng, YEARS);

  // Philippine GWA scale (1.00 best, 5.00 failing). SAP threshold is 2.50.
  const gwaNum = Math.round((1.25 + rng() * 1.75) * 100) / 100; // 1.25 .. 3.00
  let sap_status: string;
  if (gwaNum <= 2.5) sap_status = "Good Standing";
  else if (gwaNum <= 2.75) sap_status = "Warning";
  else sap_status = "Probation";

  const hasScholarship = rng() > 0.25;
  const scholarship = hasScholarship ? pick(rng, SCHOLARSHIPS) : "Self-funded";

  return {
    academic: { major, year, sap_status, gwa: gwaNum.toFixed(2), scholarship },
    gwaNum,
    hasScholarship,
  };
}

function buildFinancial(
  rng: () => number,
  studentOid: string,
  scholarship: string,
  hasScholarship: boolean
): FinancialStatus {
  const units = pick(rng, [15, 18, 21]);
  const tuition = units * randInt(rng, 950, 1150);
  const labFees = roundTo(randInt(rng, 1500, 4000), 100);
  const misc = roundTo(randInt(rng, 2000, 3500), 100);
  const total_charges = tuition + labFees + misc;

  const paymentRatio = pick(rng, [0, 0.25, 0.5, 0.75, 1]);
  const payments_made = roundTo(total_charges * paymentRatio, 100);
  const balance_due = total_charges - payments_made;

  const pending_financial_aid = hasScholarship ? roundTo(randInt(rng, 8000, 20000), 500) : 0;
  const net_balance = balance_due - pending_financial_aid;

  let status: string;
  if (balance_due === 0) status = "Paid";
  else if (net_balance > 0) status = "Hold Active";
  else status = "Pending Aid Clearance";

  const pending_disbursements = hasScholarship && pending_financial_aid > 0
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
  academic: GeneratedAcademic,
  financial: FinancialStatus
): HoldItem[] {
  const holds: HoldItem[] = [];

  if (financial.net_balance > 0) {
    holds.push({
      id: "hold-financial",
      type: "Financial",
      reason: `Pending tuition balance of ${pesoFormatter.format(financial.net_balance)}`,
      status: "Active",
      resolution_steps:
        financial.pending_disbursements.length > 0
          ? `Submit your ${financial.pending_disbursements[0].source} clearance, or settle the balance at the Bursar counter.`
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

  // Occasional administrative hold (missing document) for added variety.
  if (rng() < 0.2) {
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

  const { academic, hasScholarship } = buildAcademic(rng);
  const financial = buildFinancial(rng, studentOid, academic.scholarship, hasScholarship);
  const holds = buildHolds(rng, academic, financial);

  const scenario: StudentScenario = { academic, financial, holds };
  scenarioCache.set(studentOid, scenario);
  return scenario;
}
