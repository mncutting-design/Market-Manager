/**
 * Tenant Exit & Final Settlement Calculation Logic
 * 
 * Rules:
 * 1. Total liabilities = total unpaid dues (rent + charges + late fees) + total deductions (damages, penalties, etc.)
 * 2. Compared against current advance balance:
 *    Case A (Refund): advanceBalance > totalLiabilities -> refundAmount = advanceBalance - totalLiabilities
 *    Case B (Exact Match): advanceBalance == totalLiabilities -> refundAmount = 0, unrecovered = 0
 *    Case C (Unrecovered): totalLiabilities > advanceBalance -> unrecoveredAmount = totalLiabilities - advanceBalance
 * 3. In all cases, the amount of advance used is min(advanceBalance, totalLiabilities).
 */

export interface SettlementDeductionItem {
  id?: string;
  type?: "DAMAGE" | "CLEANING" | "UTILITY" | "PENALTY" | "OTHER" | string;
  label_en: string;
  label_bn: string;
  amount: number; // in paisa, always positive
  note?: string;
}

export interface SettlementCalculationInput {
  advanceBalance: number; // in paisa
  unpaidBillsTotal: number; // in paisa
  deductions: SettlementDeductionItem[];
}

export interface SettlementCalculationResult {
  totalDue: number; // in paisa
  advanceBalance: number; // in paisa
  totalDeductions: number; // in paisa
  totalLiabilities: number; // in paisa
  advanceUsed: number; // in paisa: min(advanceBalance, totalLiabilities)
  refundAmount: number; // in paisa: max(0, advanceBalance - totalLiabilities)
  unrecoveredAmount: number; // in paisa: max(0, totalLiabilities - advanceBalance)
  isRefund: boolean;
  isExactMatch: boolean;
  isUnrecovered: boolean;
  advanceAllocatedToDues: number;
  advanceAllocatedToDeductions: number;
}

/**
 * Calculates final settlement numbers accurately with paisa integer arithmetic.
 */
export function calculateSettlement(
  input: SettlementCalculationInput
): SettlementCalculationResult {
  const advance = Math.max(0, Math.round(input.advanceBalance || 0));
  const dues = Math.max(0, Math.round(input.unpaidBillsTotal || 0));

  let deductionsTotal = 0;
  if (input.deductions && Array.isArray(input.deductions)) {
    for (const d of input.deductions) {
      deductionsTotal += Math.max(0, Math.round(d.amount || 0));
    }
  }

  const totalLiabilities = dues + deductionsTotal;
  const advanceUsed = Math.min(advance, totalLiabilities);

  let refundAmount = 0;
  let unrecoveredAmount = 0;

  if (advance > totalLiabilities) {
    refundAmount = advance - totalLiabilities;
  } else if (totalLiabilities > advance) {
    unrecoveredAmount = totalLiabilities - advance;
  }

  // Priority of advance usage: First to clear unpaid rent/dues, then towards deductions
  const advanceAllocatedToDues = Math.min(advance, dues);
  const remainingAdvanceForDeductions = advance - advanceAllocatedToDues;
  const advanceAllocatedToDeductions = Math.min(
    remainingAdvanceForDeductions,
    deductionsTotal
  );

  return {
    totalDue: dues,
    advanceBalance: advance,
    totalDeductions: deductionsTotal,
    totalLiabilities,
    advanceUsed,
    refundAmount,
    unrecoveredAmount,
    isRefund: refundAmount > 0,
    isExactMatch: advance === totalLiabilities,
    isUnrecovered: unrecoveredAmount > 0,
    advanceAllocatedToDues,
    advanceAllocatedToDeductions,
  };
}

/**
 * Allocates available payment/adjustment amount across multiple bills using FIFO (oldest first).
 */
export function allocateAdvanceToBillsFIFO(
  bills: { id: string; month: number; year: number; dueAmount: number }[],
  amountToAllocate: number
): { billId: string; amountToPay: number; remainingDue: number; status: "PAID" | "PARTIAL" }[] {
  // Sort oldest first (year ascending, then month ascending)
  const sorted = [...bills].sort((a, b) => {
    if (a.year !== b.year) return a.year - b.year;
    return a.month - b.month;
  });

  let remainingBudget = amountToAllocate;
  const allocations: {
    billId: string;
    amountToPay: number;
    remainingDue: number;
    status: "PAID" | "PARTIAL";
  }[] = [];

  for (const bill of sorted) {
    if (remainingBudget <= 0) break;
    const pay = Math.min(remainingBudget, bill.dueAmount);
    const newDue = bill.dueAmount - pay;
    allocations.push({
      billId: bill.id,
      amountToPay: pay,
      remainingDue: newDue,
      status: newDue === 0 ? "PAID" : "PARTIAL",
    });
    remainingBudget -= pay;
  }

  return allocations;
}
