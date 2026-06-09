export interface AdapterContext {
  institutionId: string;
  studentOid: string;
  major?: string;
  year?: string;
  name?: string | null;
  email?: string | null;
}

export interface HoldItem {
  id: string;
  type: string;
  reason: string;
  status: "Active" | "Lifting" | "Resolved";
  resolution_steps: string;
}

export interface FinancialDisbursement {
  source: string;
  amount: number;
  status: string;
  expected_release: string;
}

export interface FinancialStatus {
  student_id: string;
  currency: string;
  total_charges: number;
  payments_made: number;
  balance_due: number;
  pending_financial_aid: number;
  net_balance: number;
  status: string;
  payment_deadline: string;
  scholarship_renewal_deadline: string;
  scholarship_renewal_status?: "not_started" | "in_progress" | "submitted";
  scholarship_renewal_submitted?: boolean;
  scholarship_renewal_submitted_at?: string;
  itemized_charges: Array<{ item: string; amount: number }>;
  pending_disbursements: FinancialDisbursement[];
}

export interface StudentProfile {
  student_id: string;
  name: string;
  email: string;
  major: string;
  year: string;
  sap_status: string;
  gwa: string;
  scholarship: string;
}

export interface AcademicAggregate {
  profile: Pick<StudentProfile, "student_id" | "major" | "year" | "sap_status" | "gwa" | "scholarship">;
  holds: HoldItem[];
}

export interface FinancialAggregate {
  balance_due: number;
  net_balance: number;
  pending_financial_aid: number;
  payment_deadline: string;
  holds: HoldItem[];
}

export interface AidAggregate {
  pending_disbursements: FinancialDisbursement[];
  scholarship_renewal_deadline: string;
  scholarship_renewal_status?: "not_started" | "in_progress" | "submitted";
  scholarship_renewal_submitted?: boolean;
  scholarship_renewal_submitted_at?: string;
}

export interface StatusAggregate {
  academic: AcademicAggregate;
  financial: FinancialAggregate;
  aid: AidAggregate;
}

export interface IUniversityAdapter {
  getStudentProfile(context: AdapterContext): Promise<StudentProfile>;
  getHolds(context: AdapterContext): Promise<HoldItem[]>;
  getFinancialStatus(context: AdapterContext): Promise<FinancialStatus>;
  requestHoldLift(context: AdapterContext, holdId: string, reason?: string): Promise<boolean>;
  getStatusAggregate(context: AdapterContext): Promise<StatusAggregate>;
}
