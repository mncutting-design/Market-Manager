/**
 * Central Accounting Logic Module (Single Source of Truth)
 * 
 * Rules:
 * 1. Single place for all financial totals across Dashboard, Monthly Statement,
 *    Yearly Report, Market Report, Combined Report, Tenant Summary, and Exports.
 * 2. Month is decided by transactionDate in Asia/Dhaka time (UTC+6).
 * 3. Event effects:
 *    - RECEIVED / TOPUP: Total Collection +amount ("Deposit received"), Net Cash +amount, Deposit Held +amount, Operating Profit unchanged.
 *    - REFUND: Total Outflow +amount ("Deposit refunded", displayed with a minus sign), Net Cash -amount, Deposit Held -amount, Operating Profit unchanged.
 *    - ADJUSTED_TO_DUE: Collection +amount ("Rent from deposit"), Outflow +amount ("Deposit used"), Net Cash unchanged, Operating Profit +amount, Deposit Held -amount.
 *    - DEDUCTION: Collection +amount ("Other income from deposit"), Outflow +amount ("Deposit used"), Net Cash unchanged, Operating Profit +amount, Deposit Held -amount.
 *    - REVERSAL: exact opposite effect of the reversed row, in the month of the reversal.
 * 4. Definitions:
 *    - Total Collection = rent and charges received (cash/wallet/bank) + Rent from deposit + Other income from deposit + Deposit received.
 *    - Total Outflow = operating expenses + Deposit used + Deposit refunded.
 *    - Net Cash Flow = Total Collection - Total Outflow.
 *    - Operating Profit = (rent and charges received + Rent from deposit + Other income from deposit) - operating expenses.
 *      (Excludes deposit received/refunded, because deposit is a tenant liability held in trust).
 *    - Deposit Held at period end = sum of all tenant ledger balances up to period end date.
 *    - Setting "Include deposit movements in Total Collection and Total Outflow" (default ON).
 *      When OFF: hides "Deposit received" and "Deposit refunded" lines from totals; Operating Profit and Deposit Held never change.
 */

import { DepositTransactionLike, isCreditDepositType, isDebitDepositType } from "./deposit-ledger";

export interface AccountingPaymentInput {
  id?: string;
  amount: number; // in paisa
  paidOn: Date | string;
  method?: string; // CASH, BKASH, NAGAD, BANK, CHEQUE, ADVANCE_ADJUSTMENT
  bill?: {
    month?: number;
    year?: number;
    shopId?: string;
    rentAmount?: number;
    totalAmount?: number;
    shop?: {
      marketId?: string;
    } | null;
  } | null;
}

export interface AccountingExpenseInput {
  id?: string;
  amount: number; // in paisa
  date: Date | string;
  marketId?: string;
  categoryId?: string;
  category?: {
    name_bn?: string;
    name_en?: string;
  } | null;
}

export interface AccountingPeriod {
  startDate: Date;
  endDate: Date;
  year?: number;
  month?: number; // 1 to 12
}

export interface AccountingOptions {
  includeDepositMovements?: boolean; // default true
}

export interface FinancialStatement {
  period: AccountingPeriod;
  options: {
    includeDepositMovements: boolean;
  };
  collection: {
    rentChargesReceived: number; // Cash, wallet, bank
    rentFromDeposit: number;     // From ADJUSTED_TO_DUE
    otherIncomeFromDeposit: number; // From DEDUCTION
    depositReceived: number;     // RECEIVED + TOPUP (net of reversals)
    totalCollection: number;     // Total collection based on includeDepositMovements setting
  };
  outflow: {
    operatingExpenses: number;   // From Expense table
    depositUsed: number;         // rentFromDeposit + otherIncomeFromDeposit
    depositRefunded: number;     // REFUND (net of reversals)
    totalOutflow: number;        // Total outflow based on includeDepositMovements setting
  };
  summary: {
    netCashFlow: number;         // Total Collection - Total Outflow
    operatingProfit: number;     // Excludes deposit received & refunded
    depositHeldAtPeriodEnd: number; // Total tenant deposit held at end of period
  };
}

/**
 * Returns date parts in Asia/Dhaka time (UTC+6)
 */
export function getDhakaDateParts(date: Date | string): {
  year: number;
  month: number; // 1 to 12
  day: number;
  hours: number;
  minutes: number;
  seconds: number;
} {
  const d = new Date(date);
  // Asia/Dhaka is fixed at UTC+6 hours with no daylight saving time
  const dhakaTime = d.getTime() + 6 * 60 * 60 * 1000;
  const dhakaDate = new Date(dhakaTime);

  return {
    year: dhakaDate.getUTCFullYear(),
    month: dhakaDate.getUTCMonth() + 1,
    day: dhakaDate.getUTCDate(),
    hours: dhakaDate.getUTCHours(),
    minutes: dhakaDate.getUTCMinutes(),
    seconds: dhakaDate.getUTCSeconds(),
  };
}

/**
 * Creates exact UTC Date objects for the start and end of a given month in Asia/Dhaka time.
 * E.g., for August 2026 (year: 2026, month: 8):
 * Start: 2026-08-01 00:00:00.000 Dhaka = 2026-07-31 18:00:00.000 UTC
 * End:   2026-08-31 23:59:59.999 Dhaka = 2026-08-31 17:59:59.999 UTC
 */
export function getDhakaMonthRange(year: number, month: number): { startDate: Date; endDate: Date } {
  // Midnight Dhaka at start of month
  const startUtc = Date.UTC(year, month - 1, 1, 0, 0, 0, 0) - 6 * 60 * 60 * 1000;

  // Last millisecond of month in Dhaka
  // Month + 1, day 0 gives last day of the month
  const lastDay = new Date(year, month, 0).getDate();
  const endUtc = Date.UTC(year, month - 1, lastDay, 23, 59, 59, 999) - 6 * 60 * 60 * 1000;

  return {
    startDate: new Date(startUtc),
    endDate: new Date(endUtc),
  };
}

/**
 * Creates exact UTC Date objects for a calendar year in Asia/Dhaka time.
 */
export function getDhakaYearRange(year: number): { startDate: Date; endDate: Date } {
  const startUtc = Date.UTC(year, 0, 1, 0, 0, 0, 0) - 6 * 60 * 60 * 1000;
  const endUtc = Date.UTC(year, 11, 31, 23, 59, 59, 999) - 6 * 60 * 60 * 1000;

  return {
    startDate: new Date(startUtc),
    endDate: new Date(endUtc),
  };
}

/**
 * Checks if a given timestamp falls within [startDate, endDate] inclusive.
 */
export function isTimestampInPeriod(date: Date | string, start: Date, end: Date): boolean {
  const t = new Date(date).getTime();
  return t >= start.getTime() && t <= end.getTime();
}

/**
 * Computes all financial totals and statements according to single-source accounting rules.
 */
export function calculateFinancialStatement({
  period,
  payments = [],
  expenses = [],
  depositTransactions = [],
  allHistoricalDepositTransactions = [],
  options = {},
}: {
  period: AccountingPeriod;
  payments?: AccountingPaymentInput[];
  expenses?: AccountingExpenseInput[];
  depositTransactions?: DepositTransactionLike[];
  allHistoricalDepositTransactions?: DepositTransactionLike[];
  options?: AccountingOptions;
}): FinancialStatement {
  const includeDepositMovements = options.includeDepositMovements ?? true;
  const { startDate, endDate } = period;

  // 1. Rent & charges received via cash / wallet / bank
  // (Filter out non-cash adjustments if present in payments table)
  let rentChargesReceived = 0;
  for (const pay of payments) {
    if (isTimestampInPeriod(pay.paidOn, startDate, endDate)) {
      if (pay.method !== "ADVANCE_ADJUSTMENT") {
        rentChargesReceived += Math.round(pay.amount || 0);
      }
    }
  }

  // 2. Operating Expenses
  let operatingExpenses = 0;
  for (const exp of expenses) {
    if (isTimestampInPeriod(exp.date, startDate, endDate)) {
      operatingExpenses += Math.round(exp.amount || 0);
    }
  }

  // 3. Deposit Transactions in Period (POSTED only)
  // Build lookup map for reversals
  const allTxs = [
    ...allHistoricalDepositTransactions,
    ...depositTransactions,
  ];
  const txMap = new Map<string, DepositTransactionLike>();
  for (const tx of allTxs) {
    if (tx.id) txMap.set(tx.id, tx);
  }

  let rentFromDeposit = 0;
  let otherIncomeFromDeposit = 0;
  let depositReceived = 0;
  let depositRefunded = 0;

  for (const dt of depositTransactions) {
    const status = dt.status || "POSTED";
    if (status !== "POSTED") continue;

    const dateVal = dt.transactionDate || dt.createdAt || new Date();
    if (!isTimestampInPeriod(dateVal, startDate, endDate)) continue;

    const amt = Math.abs(Math.round(dt.amount || 0));

    switch (dt.type) {
      case "RECEIVED":
      case "TOPUP":
      case "DEPOSIT_RECEIVED":
        depositReceived += amt;
        break;

      case "REFUND":
        depositRefunded += amt;
        break;

      case "ADJUSTED_TO_DUE":
        rentFromDeposit += amt;
        break;

      case "DEDUCTION":
        otherIncomeFromDeposit += amt;
        break;

      case "REVERSAL": {
        // Reversal applies the exact opposite effect of the reversed row in the reversal's period
        let orig = dt.reversesTransaction || (dt.reversesTransactionId ? txMap.get(dt.reversesTransactionId) : undefined);
        if (orig) {
          if (isCreditDepositType(orig.type)) {
            // Reversing a deposit inflow reduces depositReceived
            depositReceived -= amt;
          } else if (orig.type === "REFUND") {
            // Reversing a refund reduces depositRefunded
            depositRefunded -= amt;
          } else if (orig.type === "ADJUSTED_TO_DUE") {
            // Reversing an adjustment reduces rentFromDeposit
            rentFromDeposit -= amt;
          } else if (orig.type === "DEDUCTION") {
            // Reversing a deduction reduces otherIncomeFromDeposit
            otherIncomeFromDeposit -= amt;
          }
        } else {
          // If original type unknown, assume credit reversal
          depositReceived -= amt;
        }
        break;
      }
    }
  }

  // 4. Deposit used = non-cash conversion (ADJUSTED_TO_DUE + DEDUCTION)
  const depositUsed = rentFromDeposit + otherIncomeFromDeposit;

  // 5. Total Collection
  let totalCollection = rentChargesReceived + rentFromDeposit + otherIncomeFromDeposit;
  if (includeDepositMovements) {
    totalCollection += depositReceived;
  }

  // 6. Total Outflow
  let totalOutflow = operatingExpenses + depositUsed;
  if (includeDepositMovements) {
    totalOutflow += depositRefunded;
  }

  // 7. Net Cash Flow = Total Collection - Total Outflow
  // Note: Since depositUsed = rentFromDeposit + otherIncomeFromDeposit, the non-cash parts cancel out:
  // netCashFlow = (rentChargesReceived + depositReceived) - (operatingExpenses + depositRefunded)
  const netCashFlow = totalCollection - totalOutflow;

  // 8. Operating Profit:
  // Operating Profit = (rentChargesReceived + rentFromDeposit + otherIncomeFromDeposit) - operatingExpenses
  // STRICT RULE: Excludes deposit received and deposit refunded (they are tenant liability held in trust).
  // Operating Profit is identical regardless of includeDepositMovements toggle.
  const operatingProfit = (rentChargesReceived + rentFromDeposit + otherIncomeFromDeposit) - operatingExpenses;

  // 9. Deposit Held at Period End:
  // Sum of all tenant ledger balances up to endDate (POSTED only)
  const historicalTxs = allHistoricalDepositTransactions.length > 0
    ? allHistoricalDepositTransactions
    : depositTransactions;

  let depositHeldAtPeriodEnd = 0;
  for (const htx of historicalTxs) {
    const status = htx.status || "POSTED";
    if (status !== "POSTED") continue;

    const dt = new Date(htx.transactionDate || htx.createdAt || 0);
    if (dt.getTime() <= endDate.getTime()) {
      const amt = Math.abs(Math.round(htx.amount || 0));
      if (isCreditDepositType(htx.type)) {
        depositHeldAtPeriodEnd += amt;
      } else if (isDebitDepositType(htx.type)) {
        depositHeldAtPeriodEnd -= amt;
      } else if (htx.type === "REVERSAL") {
        let orig = htx.reversesTransaction || (htx.reversesTransactionId ? txMap.get(htx.reversesTransactionId) : undefined);
        if (orig && isDebitDepositType(orig.type)) {
          depositHeldAtPeriodEnd += amt;
        } else {
          depositHeldAtPeriodEnd -= amt;
        }
      }
    }
  }
  depositHeldAtPeriodEnd = Math.max(0, depositHeldAtPeriodEnd);

  return {
    period,
    options: {
      includeDepositMovements,
    },
    collection: {
      rentChargesReceived,
      rentFromDeposit,
      otherIncomeFromDeposit,
      depositReceived,
      totalCollection,
    },
    outflow: {
      operatingExpenses,
      depositUsed,
      depositRefunded,
      totalOutflow,
    },
    summary: {
      netCashFlow,
      operatingProfit,
      depositHeldAtPeriodEnd,
    },
  };
}
