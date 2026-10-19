/**
 * Tenant Advance Ledger Core Logic
 * 
 * Rules:
 * 1. The advance balance is ALWAYS computed from the append-only ledger.
 * 2. Credits: DEPOSIT_RECEIVED, TOPUP (increase advance balance).
 * 3. Debits: ADJUSTED_TO_DUE, DEDUCTION, REFUND (decrease advance balance).
 * 4. Never negative balance: Validation ensures debits do not exceed available balance.
 * 5. Accounting rule: Advance held is a liability, not income. Only ADJUSTED_TO_DUE is recognized as income.
 */

export type AdvanceTransactionType =
  | "DEPOSIT_RECEIVED"
  | "ADJUSTED_TO_DUE"
  | "DEDUCTION"
  | "REFUND"
  | "TOPUP";

export interface AdvanceTransactionLike {
  id?: string;
  type: string;
  amount: number; // in paisa, always positive
  createdAt?: Date | string;
  reason?: string;
  relatedBillId?: string | null;
  relatedSettlementId?: string | null;
  createdBy?: string;
}

/**
 * Returns whether a transaction type adds to or subtracts from the tenant's advance balance.
 */
export function isCreditTransaction(type: string): boolean {
  return type === "DEPOSIT_RECEIVED" || type === "TOPUP";
}

export function isDebitTransaction(type: string): boolean {
  return (
    type === "ADJUSTED_TO_DUE" ||
    type === "DEDUCTION" ||
    type === "REFUND"
  );
}

/**
 * Computes the total available advance balance (in paisa) from an array of transactions.
 */
export function computeAdvanceBalance(transactions: AdvanceTransactionLike[]): number {
  if (!transactions || transactions.length === 0) return 0;

  let balance = 0;
  for (const tx of transactions) {
    if (isCreditTransaction(tx.type)) {
      balance += Math.round(tx.amount || 0);
    } else if (isDebitTransaction(tx.type)) {
      balance -= Math.round(tx.amount || 0);
    }
  }

  // Balance cannot be less than 0 under correct operations
  return Math.max(0, balance);
}

/**
 * Calculates running balance for each transaction chronologically (oldest to newest).
 */
export function calculateRunningBalances<T extends AdvanceTransactionLike>(
  transactions: T[]
): (T & { runningBalance: number; signedAmount: number })[] {
  // Sort ascending by createdAt
  const sorted = [...transactions].sort((a, b) => {
    const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return timeA - timeB;
  });

  let running = 0;
  return sorted.map((tx) => {
    const isCredit = isCreditTransaction(tx.type);
    const signedAmount = isCredit ? tx.amount : -tx.amount;
    running += signedAmount;
    return {
      ...tx,
      signedAmount,
      runningBalance: Math.max(0, running),
    };
  });
}

/**
 * Validates an adjustment from advance against dues.
 */
export function validateAdvanceAdjustment(
  currentAdvance: number,
  totalDue: number,
  adjustAmount: number
): { valid: boolean; error?: string } {
  if (adjustAmount <= 0) {
    return { valid: false, error: "Adjustment amount must be greater than zero" };
  }
  if (adjustAmount > currentAdvance) {
    return {
      valid: false,
      error: `Adjustment amount (৳${Math.round(adjustAmount / 100)}) exceeds available advance (৳${Math.round(currentAdvance / 100)})`,
    };
  }
  if (adjustAmount > totalDue) {
    return {
      valid: false,
      error: `Adjustment amount (৳${Math.round(adjustAmount / 100)}) exceeds total due (৳${Math.round(totalDue / 100)})`,
    };
  }

  return { valid: true };
}
