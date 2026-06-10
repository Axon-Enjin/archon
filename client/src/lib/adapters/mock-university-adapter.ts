import { cosmosDbService } from "@/lib/db/cosmos";
import { generateStudentScenario } from "@/lib/adapters/mock-data-generator";
import type {
  AdapterContext,
  FinancialStatus,
  HoldItem,
  IUniversityAdapter,
  StatusAggregate,
  StudentProfile,
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
  private async getAcademicSnapshot(context: AdapterContext): Promise<AcademicSnapshot> {
    const cacheKey = `academic:${context.studentOid}`;
    let academic = await cosmosDbService.getCacheData<AcademicSnapshot>(cacheKey, context.institutionId);

    if (!academic) {
      academic = generateStudentScenario(context.studentOid).academic;
      await cosmosDbService.setCacheData(cacheKey, academic, context.institutionId);
    }

    return academic;
  }

  async getHolds(context: AdapterContext): Promise<HoldItem[]> {
    const cacheKey = `holds:${context.studentOid}`;
    let holds = await cosmosDbService.getCacheData<HoldItem[]>(cacheKey, context.institutionId);

    if (!holds) {
      holds = generateStudentScenario(context.studentOid).holds;
      await cosmosDbService.setCacheData(cacheKey, holds, context.institutionId);
    }

    return holds;
  }

  async getFinancialStatus(context: AdapterContext): Promise<FinancialStatus> {
    const cacheKey = `financial:${context.studentOid}`;
    let financial = await cosmosDbService.getCacheData<FinancialStatus>(cacheKey, context.institutionId);

    if (!financial) {
      financial = generateStudentScenario(context.studentOid).financial;
      await cosmosDbService.setCacheData(cacheKey, financial, context.institutionId);
    }

    return financial;
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

    await cosmosDbService.setCacheData(cacheKey, holds, context.institutionId);
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
