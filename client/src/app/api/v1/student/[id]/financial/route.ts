import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser, verifyStudentAccess, unauthorizedResponse, forbiddenResponse } from "@/lib/auth-helper";
import { cosmosDbService } from "@/lib/db/cosmos";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authUser = await getAuthenticatedUser();
  if (!authUser) return unauthorizedResponse();

  const { id: studentOid } = await params;
  if (!verifyStudentAccess(authUser, studentOid)) {
    return forbiddenResponse("Forbidden: You cannot access this student's financial records.");
  }

  const cacheKey = `financial:${studentOid}`;
  let financialData = await cosmosDbService.getCacheData(cacheKey, authUser.institution_id);

  if (!financialData) {
    financialData = {
      student_id: "2024-10025",
      currency: "PHP",
      total_charges: 24500.0,
      payments_made: 12000.0,
      balance_due: 12500.0,
      pending_financial_aid: 15000.0, // UniFAST Scholarship
      net_balance: -2500.0,
      status: "Hold Active",
      payment_deadline: "2026-06-30",
      scholarship_renewal_deadline: "2026-07-15",
      scholarship_renewal_status: "not_started",
      scholarship_renewal_submitted: false,
      itemized_charges: [
        { item: "Tuition Fee (18 units)", amount: 18000.0 },
        { item: "Laboratory Fees (IT Lab)", amount: 3500.0 },
        { item: "Miscellaneous & Registration", amount: 3000.0 },
      ],
      pending_disbursements: [
        {
          source: "CHED UniFAST Grant",
          amount: 15000.0,
          status: "Pending Verification",
          expected_release: "3 business days",
        },
      ],
    };

    await cosmosDbService.setCacheData(cacheKey, financialData, authUser.institution_id);
  }

  return NextResponse.json({
    success: true,
    data: financialData,
  });
}
