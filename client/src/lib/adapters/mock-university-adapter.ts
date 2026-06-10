import { cosmosDbService } from "@/lib/db/cosmos";
import {
  generateScenarioOverride,
  generateStudentScenario,
  isStudentArchetype,
  type StudentScenario,
} from "@/lib/adapters/mock-data-generator";
import type {
  AdapterContext,
  CourseScheduleItem,
  FinancialStatus,
  HoldItem,
  IUniversityAdapter,
  StatusAggregate,
  StudentProfile,
  TransactionItem,
} from "@/lib/adapters/types";

interface AcademicSnapshot {
  major?: string;
  year?: string;
  sap_status?: string;
  gwa?: string | number;
  scholarship?: string;
}

function normalizeGwa(gwa: string | number | undefined): string {
  if (typeof gwa === "number") return gwa.toFixed(2);
  if (typeof gwa === "string" && gwa.trim()) return gwa;
  return "Not available";
}

export class MockUniversityAdapter implements IUniversityAdapter {
  /**
   * Dev-only scenario override (non-production). When the context carries a
   * `devSeed` or `devArchetype`, return a freshly generated scenario that
   * bypasses the per-student cache so demos can force a specific profile
   * without polluting a real student's cached data.
   */
  private overrideScenario(context: AdapterContext): StudentScenario | null {
    if (process.env.NODE_ENV === "production") return null;
    if (!context.devSeed && !context.devArchetype) return null;
    const seed = context.devSeed || context.studentOid;
    const archetype =
      context.devArchetype && isStudentArchetype(context.devArchetype)
        ? context.devArchetype
        : undefined;
    return generateScenarioOverride(seed, archetype);
  }

  private async getAcademicSnapshot(context: AdapterContext): Promise<AcademicSnapshot> {
    const override = this.overrideScenario(context);
    if (override) return override.academic;

    const cacheKey = `academic:${context.studentOid}`;
    let academic = await cosmosDbService.getCacheData<AcademicSnapshot>(cacheKey, context.institutionId);

    if (!academic) {
      academic = generateStudentScenario(context.studentOid).academic;
      await cosmosDbService.setCacheData(cacheKey, academic, context.institutionId);
    }

    return academic;
  }

  async getHolds(context: AdapterContext): Promise<HoldItem[]> {
    const override = this.overrideScenario(context);
    if (override) return override.holds;

    const cacheKey = `holds:${context.studentOid}`;
    let holds = await cosmosDbService.getCacheData<HoldItem[]>(cacheKey, context.institutionId);

    if (!holds) {
      holds = generateStudentScenario(context.studentOid).holds;
      await cosmosDbService.setCacheData(cacheKey, holds, context.institutionId);
    }

    return holds;
  }

  async getFinancialStatus(context: AdapterContext): Promise<FinancialStatus> {
    const override = this.overrideScenario(context);
    if (override) return override.financial;

    const cacheKey = `financial:${context.studentOid}`;
    let financial = await cosmosDbService.getCacheData<FinancialStatus>(cacheKey, context.institutionId);

    if (!financial) {
      financial = generateStudentScenario(context.studentOid).financial;
      await cosmosDbService.setCacheData(cacheKey, financial, context.institutionId);
    }

    return financial;
  }

  async getCourseSchedule(context: AdapterContext): Promise<CourseScheduleItem[]> {
    const override = this.overrideScenario(context);
    if (override) return override.courses;

    const cacheKey = `courses:${context.studentOid}`;
    let courses = await cosmosDbService.getCacheData<CourseScheduleItem[]>(cacheKey, context.institutionId);

    if (!courses) {
      courses = generateStudentScenario(context.studentOid).courses;
      await cosmosDbService.setCacheData(cacheKey, courses, context.institutionId);
    }

    return courses;
  }

  async getTransactionHistory(context: AdapterContext): Promise<TransactionItem[]> {
    const override = this.overrideScenario(context);
    if (override) return override.transactions;

    const cacheKey = `transactions:${context.studentOid}`;
    let transactions = await cosmosDbService.getCacheData<TransactionItem[]>(cacheKey, context.institutionId);

    if (!transactions) {
      transactions = generateStudentScenario(context.studentOid).transactions;
      await cosmosDbService.setCacheData(cacheKey, transactions, context.institutionId);
    }

    return transactions;
  }

  async getStudentProfile(context: AdapterContext): Promise<StudentProfile> {
    const [academic, financial] = await Promise.all([
      this.getAcademicSnapshot(context),
      this.getFinancialStatus(context),
    ]);

    const scholarshipFromFinancial = financial.pending_disbursements?.[0]?.source;

    return {
      student_id: context.studentOid,
      name: context.name || "Student",
      email: context.email || "",
      major: academic?.major || context.major || "Not available",
      year: academic?.year || context.year || "Not available",
      sap_status: academic?.sap_status || "Not available",
      gwa: normalizeGwa(academic?.gwa),
      scholarship: academic?.scholarship || scholarshipFromFinancial || "Not available",
    };
  }

  async requestHoldLift(context: AdapterContext, holdId: string, reason?: string): Promise<boolean> {
    const cacheKey = `holds:${context.studentOid}`;
    const holds = await this.getHolds(context);
    const index = holds.findIndex((hold) => hold.id === holdId);
    if (index === -1) return false;

    holds[index] = {
      ...holds[index],
      status: "Resolved",
      reason: reason || holds[index].reason,
    };

    // Under a dev override the holds are generated fresh (not the real student's
    // cache), so don't persist them back into the real cache key.
    if (!this.overrideScenario(context)) {
      await cosmosDbService.setCacheData(cacheKey, holds, context.institutionId);
    }
    return true;
  }

  async getStatusAggregate(context: AdapterContext): Promise<StatusAggregate> {
    const [profile, holds, financial] = await Promise.all([
      this.getStudentProfile(context),
      this.getHolds(context),
      this.getFinancialStatus(context),
    ]);

    const academicHolds = holds.filter((hold) => hold.type.toLowerCase() === "academic");
    const financialHolds = holds.filter((hold) => hold.type.toLowerCase() === "financial");

    return {
      academic: {
        profile: {
          student_id: profile.student_id,
          major: profile.major,
          year: profile.year,
          sap_status: profile.sap_status,
          gwa: profile.gwa,
          scholarship: profile.scholarship,
        },
        holds: academicHolds,
      },
      financial: {
        balance_due: financial.balance_due,
        net_balance: financial.net_balance,
        pending_financial_aid: financial.pending_financial_aid,
        payment_deadline: financial.payment_deadline,
        holds: financialHolds,
      },
      aid: {
        pending_disbursements: financial.pending_disbursements,
        scholarship_renewal_deadline: financial.scholarship_renewal_deadline,
        scholarship_renewal_status: financial.scholarship_renewal_status,
        scholarship_renewal_submitted: financial.scholarship_renewal_submitted,
        scholarship_renewal_submitted_at: financial.scholarship_renewal_submitted_at,
      },
    };
  }
}
