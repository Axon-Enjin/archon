import { cosmosDbService } from "@/lib/db/cosmos";
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

function getDefaultHolds(): HoldItem[] {
  return [
    {
      id: "hold-financial",
      type: "Financial",
      reason: "Pending tuition balance of PHP 12,500.00",
      status: "Active",
      resolution_steps:
        "Pay the remaining balance at the Bursar counter, or submit your CHED UniFAST clearance.",
    },
    {
      id: "hold-academic",
      type: "Academic",
      reason: "Satisfactory Academic Progress (SAP) GPA deficiency (GWA is 2.65, required is 2.50)",
      status: "Active",
      resolution_steps: "Submit an SAP Appeal narrative and study plan to the Academic Advisory Panel.",
    },
  ];
}

function getDefaultFinancialStatus(studentOid: string): FinancialStatus {
  return {
    student_id: studentOid,
    currency: "PHP",
    total_charges: 24500,
    payments_made: 12000,
    balance_due: 12500,
    pending_financial_aid: 15000,
    net_balance: -2500,
    status: "Hold Active",
    payment_deadline: "2026-06-30",
    scholarship_renewal_deadline: "2026-07-15",
    scholarship_renewal_status: "not_started",
    scholarship_renewal_submitted: false,
    itemized_charges: [
      { item: "Tuition Fee (18 units)", amount: 18000 },
      { item: "Laboratory Fees (IT Lab)", amount: 3500 },
      { item: "Miscellaneous & Registration", amount: 3000 },
    ],
    pending_disbursements: [
      {
        source: "CHED UniFAST Grant",
        amount: 15000,
        status: "Pending Verification",
        expected_release: "3 business days",
      },
    ],
  };
}

function normalizeGwa(gwa: string | number | undefined): string {
  if (typeof gwa === "number") return gwa.toFixed(2);
  if (typeof gwa === "string" && gwa.trim()) return gwa;
  return "Not available";
}

export class MockUniversityAdapter implements IUniversityAdapter {
  private async getAcademicSnapshot(context: AdapterContext): Promise<AcademicSnapshot | null> {
    return cosmosDbService.getCacheData<AcademicSnapshot>(`academic:${context.studentOid}`, context.institutionId);
  }

  async getHolds(context: AdapterContext): Promise<HoldItem[]> {
    const cacheKey = `holds:${context.studentOid}`;
    let holds = await cosmosDbService.getCacheData<HoldItem[]>(cacheKey, context.institutionId);

    if (!holds || holds.length === 0) {
      holds = getDefaultHolds();
      await cosmosDbService.setCacheData(cacheKey, holds, context.institutionId);
    }

    return holds;
  }

  async getFinancialStatus(context: AdapterContext): Promise<FinancialStatus> {
    const cacheKey = `financial:${context.studentOid}`;
    let financial = await cosmosDbService.getCacheData<FinancialStatus>(cacheKey, context.institutionId);

    if (!financial) {
      financial = getDefaultFinancialStatus(context.studentOid);
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
