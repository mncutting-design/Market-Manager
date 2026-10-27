/**
 * Deposit Ledger Core Calculation & Validation Engine
 * 
 * Rules:
 * 1. Single source of truth: Tenant deposit balance is ALWAYS computed from POSTED ledger entries, never stored.
 * 2. Credits: RECEIVED, TOPUP (increase balance).
 * 3. Debits: REFUND, ADJUSTED_TO_DUE, DEDUCTION (decrease balance).
 * 4. REVERSAL: Applies the exact opposite effect of the row it reverses.
 *    - Reversing a credit (RECEIVED/TOPUP) reduces balance (-amount).
 *    - Reversing a debit (REFUND/ADJUSTED_TO_DUE/DEDUCTION) restores balance (+amount).
 * 5. Only POSTED rows count in balances and reports. PENDING_APPROVAL and REJECTED rows are excluded.
 * 6. Non-negative constraint: Server-side validation prevents any debit or reversal from resulting in negative balance.
 */

export type DepositTransactionType =
  | "RECEIVED"
  | "TOPUP"
  | "REFUND"
  | "ADJUSTED_TO_DUE"
  | "DEDUCTION"
  | "REVERSAL";

export type DepositTransactionStatus = "POSTED" | "PENDING_APPROVAL" | "REJECTED";

export interface DepositTransactionLike {
  id?: string;
  type: string;
  amount: number; // positive integer in paisa
  status?: string;
  transactionDate?: Date | string;
  createdAt?: Date | string;
  reason?: string;
  reversesTransactionId?: string | null;
  reversesTransaction?: {
    id?: string;
    type: string;
    amount: number;
  } | null;
  relatedBillId?: string | null;
  relatedSettlementId?: string | null;
  method?: string;
  bankName?: string | null;
  transactionRef?: string | null;
  paymentAccountId?: string | null;
  counterpartyUserId?: string | null;
  enteredById?: string | null;
  approvedById?: string | null;
  approvedAt?: Date | string | null;
  rejectionReason?: string | null;
}

export function isCreditDepositType(type: string): boolean {
  return type === "RECEIVED" || type === "TOPUP" || type === "DEPOSIT_RECEIVED";
}

export function isDebitDepositType(type: string): boolean {
  return type === "REFUND" || type === "ADJUSTED_TO_DUE" || type === "DEDUCTION";
}

/**
 * Computes the signed impact of a single POSTED deposit transaction.
 * Returns positive for balance increase, negative for balance decrease.
 */
export function getTransactionSignedAmount(
  tx: DepositTransactionLike,
  txMap?: Map<string, DepositTransactionLike>
): number {
  const amount = Math.abs(Math.round(tx.amount || 0));

  if (isCreditDepositType(tx.type)) {
    return amount;
  }

  if (isDebitDepositType(tx.type)) {
    return -amount;
  }

  if (tx.type === "REVERSAL") {
    // Find the original reversed transaction
    let original: DepositTransactionLike | undefined = tx.reversesTransaction || undefined;
    if (!original && tx.reversesTransactionId && txMap) {
      original = txMap.get(tx.reversesTransactionId);
    }

    if (original) {
      if (isCreditDepositType(original.type)) {
        // Reversing a credit reduces balance
        return -amount;
      }
      if (isDebitDepositType(original.type)) {
        // Reversing a debit increases balance
        return amount;
      }
    }

    // Default heuristic if original relation isn't loaded:
    // If reason or convention says reversing credit, negative; otherwise negative
    return -amount;
  }

  return 0;
}

/**
 * Computes the active deposit balance from an array of transactions.
 * Only POSTED transactions are counted.
 */
export function computeDepositBalance(transactions: DepositTransactionLike[]): number {
  if (!transactions || transactions.length === 0) return 0;

  // Build lookup map for reversals
  const txMap = new Map<string, DepositTransactionLike>();
  for (const tx of transactions) {
    if (tx.id) txMap.set(tx.id, tx);
  }

  let balance = 0;
  for (const tx of transactions) {
    const status = tx.status || "POSTED";
    if (status !== "POSTED") continue;

    balance += getTransactionSignedAmount(tx, txMap);
  }

  return Math.max(0, balance);
}

/**
 * Computes chronological running balance for every transaction.
 */
export function calculateDepositRunningBalances<T extends DepositTransactionLike>(
  transactions: T[]
): (T & { signedAmount: number; runningBalance: number })[] {
  if (!transactions || transactions.length === 0) return [];

  // Build lookup map
  const txMap = new Map<string, DepositTransactionLike>();
  for (const tx of transactions) {
    if (tx.id) txMap.set(tx.id, tx);
  }

  // Sort ascending by transactionDate / createdAt
  const sorted = [...transactions].sort((a, b) => {
    const timeA = new Date(a.transactionDate || a.createdAt || 0).getTime();
    const timeB = new Date(b.transactionDate || b.createdAt || 0).getTime();
    return timeA - timeB;
  });

  let running = 0;
  return sorted.map((tx) => {
    const isPosted = !tx.status || tx.status === "POSTED";
    const signedAmount = getTransactionSignedAmount(tx, txMap);

    if (isPosted) {
      running += signedAmount;
    }

    return {
      ...tx,
      signedAmount,
      runningBalance: Math.max(0, running),
    };
  });
}

/**
 * Validates whether a debit transaction (refund, adjustment, deduction) is permissible.
 */
export function validateDepositDebit(
  currentBalance: number,
  debitAmount: number,
  operationType: "REFUND" | "ADJUSTED_TO_DUE" | "DEDUCTION"
): { valid: boolean; error?: string } {
  if (debitAmount <= 0) {
    return {
      valid: false,
      error: "Amount must be a positive integer greater than zero.",
    };
  }

  if (debitAmount > currentBalance) {
    const bdtAmount = (debitAmount / 100).toLocaleString();
    const bdtBalance = (currentBalance / 100).toLocaleString();
    return {
      valid: false,
      error: `Requested ${operationType} amount (৳${bdtAmount}) exceeds current deposit balance (৳${bdtBalance}).`,
    };
  }

  return { valid: true };
}
