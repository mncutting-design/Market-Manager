import {
  calculateFinancialStatement,
  getDhakaMonthRange,
  getDhakaDateParts,
} from "../lib/accounting";
import { validateDepositDebit } from "../lib/deposit-ledger";

let passed = 0;
let failed = 0;

function assert(condition: boolean, testName: string) {
  if (condition) {
    console.log(`  ✅ PASS: ${testName}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${testName}`);
    failed++;
  }
}

function assertEqual(actual: any, expected: any, testName: string) {
  const match = actual === expected;
  if (match) {
    console.log(`  ✅ PASS: ${testName}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${testName}`);
    console.error(`     Expected: ${expected}`);
    console.error(`     Actual:   ${actual}`);
    failed++;
  }
}

console.log("==================================================");
console.log("🧪 RUNNING UNIT TESTS: CENTRAL ACCOUNTING ENGINE");
console.log("==================================================");

// 1. Asia/Dhaka Month Range & Midnight Boundaries
console.log("\n[Test Suite 1: Asia/Dhaka Timezone & Midnight Boundary]");
const { startDate: augStart, endDate: augEnd } = getDhakaMonthRange(2026, 8);

// 2026-08-01 00:00:00 Dhaka is 2026-07-31 18:00:00 UTC
assertEqual(augStart.toISOString(), "2026-07-31T18:00:00.000Z", "Dhaka August 1st midnight UTC string matches");
// 2026-08-31 23:59:59.999 Dhaka is 2026-08-31 17:59:59.999 UTC
assertEqual(augEnd.toISOString(), "2026-08-31T17:59:59.999Z", "Dhaka August 31st end-of-month UTC string matches");

const dhakaParts1 = getDhakaDateParts("2026-07-31T18:00:00.000Z");
assertEqual(dhakaParts1.month, 8, "2026-07-31 18:00 UTC is Month 8 (August) in Dhaka");
assertEqual(dhakaParts1.day, 1, "2026-07-31 18:00 UTC is Day 1 in Dhaka");

const dhakaPartsJustBefore = getDhakaDateParts("2026-07-31T17:59:59.000Z");
assertEqual(dhakaPartsJustBefore.month, 7, "1 second before August 1st Dhaka is Month 7");
assertEqual(dhakaPartsJustBefore.day, 31, "1 second before August 1st Dhaka is Day 31 of Month 7");

// 2. Base Calculation without Deposits
console.log("\n[Test Suite 2: Base Rent Collection & Expenses]");
const baseStmt = calculateFinancialStatement({
  period: { startDate: augStart, endDate: augEnd },
  payments: [
    { amount: 10000000, paidOn: "2026-08-05T10:00:00.000Z", method: "CASH" }, // 100,000 BDT
    { amount: 5000000, paidOn: "2026-08-10T12:00:00.000Z", method: "BKASH" }, // 50,000 BDT
  ],
  expenses: [
    { amount: 3000000, date: "2026-08-15T08:00:00.000Z" }, // 30,000 BDT
  ],
});
assertEqual(baseStmt.collection.rentChargesReceived, 15000000, "Rent received = 150,000");
assertEqual(baseStmt.outflow.operatingExpenses, 3000000, "Expenses = 30,000");
assertEqual(baseStmt.summary.operatingProfit, 12000000, "Operating profit = 120,000");
assertEqual(baseStmt.summary.netCashFlow, 12000000, "Net Cash Flow = 120,000");

// 3. Deposit Received / Topup
console.log("\n[Test Suite 3: Deposit Received & Topup]");
const depStmt = calculateFinancialStatement({
  period: { startDate: augStart, endDate: augEnd },
  payments: [
    { amount: 10000000, paidOn: "2026-08-05T10:00:00.000Z", method: "CASH" },
  ],
  expenses: [
    { amount: 2000000, date: "2026-08-15T08:00:00.000Z" },
  ],
  depositTransactions: [
    { id: "d1", type: "RECEIVED", amount: 4000000, transactionDate: "2026-08-02T10:00:00.000Z", status: "POSTED" }, // 40,000 BDT
    { id: "d2", type: "TOPUP", amount: 1000000, transactionDate: "2026-08-08T10:00:00.000Z", status: "POSTED" },    // 10,000 BDT
  ],
  options: { includeDepositMovements: true },
});
assertEqual(depStmt.collection.depositReceived, 5000000, "Deposit received = 50,000");
assertEqual(depStmt.collection.totalCollection, 15000000, "Total collection = 100k rent + 50k deposit = 150,000");
assertEqual(depStmt.summary.operatingProfit, 8000000, "Operating profit excludes deposit received (100k - 20k = 80k)");
assertEqual(depStmt.summary.netCashFlow, 13000000, "Net cash flow includes deposit received (150k - 20k = 130k)");
assertEqual(depStmt.summary.depositHeldAtPeriodEnd, 5000000, "Deposit held = 50,000");

// 4. Deposit Refund
console.log("\n[Test Suite 4: Deposit Refund]");
const refundStmt = calculateFinancialStatement({
  period: { startDate: augStart, endDate: augEnd },
  payments: [
    { amount: 10000000, paidOn: "2026-08-05T10:00:00.000Z", method: "CASH" },
  ],
  expenses: [
    { amount: 2000000, date: "2026-08-15T08:00:00.000Z" },
  ],
  depositTransactions: [
    { id: "d1", type: "RECEIVED", amount: 5000000, transactionDate: "2026-08-01T10:00:00.000Z", status: "POSTED" },
    { id: "d3", type: "REFUND", amount: 2000000, transactionDate: "2026-08-20T10:00:00.000Z", status: "POSTED" },
  ],
  options: { includeDepositMovements: true },
});
assertEqual(refundStmt.outflow.depositRefunded, 2000000, "Deposit refunded = 20,000");
assertEqual(refundStmt.outflow.totalOutflow, 4000000, "Total Outflow = 20k exp + 20k refund = 40,000");
assertEqual(refundStmt.summary.operatingProfit, 8000000, "Operating profit excludes refund (100k - 20k = 80k)");
assertEqual(refundStmt.summary.netCashFlow, 11000000, "Net cash flow = 150k - 40k = 110k (Rent 100k + Dep 50k - Exp 20k - Refund 20k)");
assertEqual(refundStmt.summary.depositHeldAtPeriodEnd, 3000000, "Deposit held = 50k - 20k = 30k");

// 5. Non-Cash Adjustments: ADJUSTED_TO_DUE and DEDUCTION
console.log("\n[Test Suite 5: Non-Cash Adjustments & Operating Profit Invariant]");
const nonCashStmt = calculateFinancialStatement({
  period: { startDate: augStart, endDate: augEnd },
  payments: [
    { amount: 8000000, paidOn: "2026-08-05T10:00:00.000Z", method: "CASH" },
  ],
  expenses: [
    { amount: 2000000, date: "2026-08-15T08:00:00.000Z" },
  ],
  depositTransactions: [
    { id: "d1", type: "RECEIVED", amount: 10000000, transactionDate: "2026-08-01T10:00:00.000Z", status: "POSTED" },
    { id: "d4", type: "ADJUSTED_TO_DUE", amount: 3000000, transactionDate: "2026-08-10T10:00:00.000Z", status: "POSTED" }, // 30,000 Rent from deposit
    { id: "d5", type: "DEDUCTION", amount: 1000000, transactionDate: "2026-08-12T10:00:00.000Z", status: "POSTED" },        // 10,000 Other income
  ],
  options: { includeDepositMovements: true },
});
assertEqual(nonCashStmt.collection.rentFromDeposit, 3000000, "Rent from deposit = 30,000");
assertEqual(nonCashStmt.collection.otherIncomeFromDeposit, 1000000, "Other income from deposit = 10,000");
assertEqual(nonCashStmt.outflow.depositUsed, 4000000, "Deposit used = 40,000 (30k + 10k)");
// Operating profit includes rentFromDeposit and otherIncomeFromDeposit!
// = (80k cash rent + 30k deposit rent + 10k deduction income) - 20k expenses = 100,000 BDT
assertEqual(nonCashStmt.summary.operatingProfit, 10000000, "Operating profit = 100,000");
// Net Cash Flow = Total Collection (80k cash + 30k + 10k + 100k deposit = 220k) - Total Outflow (20k exp + 40k used = 60k) = 160k
// Notice: 80k cash rent + 100k cash deposit - 20k cash exp = 160k exactly!
assertEqual(nonCashStmt.summary.netCashFlow, 16000000, "Net Cash Flow maintains physical cash flow parity (160k)");
assertEqual(nonCashStmt.summary.depositHeldAtPeriodEnd, 6000000, "Deposit held = 100k - 30k - 10k = 60,000");

// 6. Include Deposit Movements Toggle ON vs OFF
console.log("\n[Test Suite 6: Include Deposit Movements Toggle (ON vs OFF)]");
const toggleOn = calculateFinancialStatement({
  period: { startDate: augStart, endDate: augEnd },
  payments: [{ amount: 5000000, paidOn: "2026-08-05T10:00:00.000Z", method: "CASH" }],
  expenses: [{ amount: 1000000, date: "2026-08-15T08:00:00.000Z" }],
  depositTransactions: [
    { id: "d1", type: "RECEIVED", amount: 4000000, transactionDate: "2026-08-01T10:00:00.000Z", status: "POSTED" },
    { id: "d2", type: "REFUND", amount: 1500000, transactionDate: "2026-08-20T10:00:00.000Z", status: "POSTED" },
  ],
  options: { includeDepositMovements: true },
});
const toggleOff = calculateFinancialStatement({
  period: { startDate: augStart, endDate: augEnd },
  payments: [{ amount: 5000000, paidOn: "2026-08-05T10:00:00.000Z", method: "CASH" }],
  expenses: [{ amount: 1000000, date: "2026-08-15T08:00:00.000Z" }],
  depositTransactions: [
    { id: "d1", type: "RECEIVED", amount: 4000000, transactionDate: "2026-08-01T10:00:00.000Z", status: "POSTED" },
    { id: "d2", type: "REFUND", amount: 1500000, transactionDate: "2026-08-20T10:00:00.000Z", status: "POSTED" },
  ],
  options: { includeDepositMovements: false },
});

assertEqual(toggleOn.collection.totalCollection, 9000000, "Toggle ON: Total Collection includes deposit (50k + 40k = 90k)");
assertEqual(toggleOff.collection.totalCollection, 5000000, "Toggle OFF: Total Collection excludes deposit (50k)");
assertEqual(toggleOn.outflow.totalOutflow, 2500000, "Toggle ON: Total Outflow includes refund (10k + 15k = 25k)");
assertEqual(toggleOff.outflow.totalOutflow, 1000000, "Toggle OFF: Total Outflow excludes refund (10k)");

// CRITICAL INVARIANT: Operating Profit and Deposit Held NEVER change whether toggle is ON or OFF!
assertEqual(toggleOn.summary.operatingProfit, toggleOff.summary.operatingProfit, "CRITICAL INVARIANT: Operating Profit identical ON and OFF");
assertEqual(toggleOn.summary.depositHeldAtPeriodEnd, toggleOff.summary.depositHeldAtPeriodEnd, "CRITICAL INVARIANT: Deposit Held identical ON and OFF");

// 7. Reversals
console.log("\n[Test Suite 7: Reversals in Current Period]");
const revStmt = calculateFinancialStatement({
  period: { startDate: augStart, endDate: augEnd },
  payments: [],
  expenses: [],
  depositTransactions: [
    { id: "d1", type: "RECEIVED", amount: 5000000, transactionDate: "2026-08-01T10:00:00.000Z", status: "POSTED" },
    {
      id: "rev1",
      type: "REVERSAL",
      amount: 5000000,
      transactionDate: "2026-08-05T10:00:00.000Z",
      status: "POSTED",
      reversesTransactionId: "d1",
      reversesTransaction: { id: "d1", type: "RECEIVED", amount: 5000000 },
    },
  ],
});
assertEqual(revStmt.collection.depositReceived, 0, "Reversal of received cancels depositReceived to 0");
assertEqual(revStmt.summary.depositHeldAtPeriodEnd, 0, "Reversal cancels deposit held to 0");

// 8. Financial Invariants
console.log("\n[Test Suite 8: Core Mathematical Invariants]");
assert(
  toggleOn.summary.netCashFlow === toggleOn.collection.totalCollection - toggleOn.outflow.totalOutflow,
  "Invariant: Net Cash Flow === Total Collection - Total Outflow (Toggle ON)"
);
assert(
  toggleOff.summary.netCashFlow === toggleOff.collection.totalCollection - toggleOff.outflow.totalOutflow,
  "Invariant: Net Cash Flow === Total Collection - Total Outflow (Toggle OFF)"
);

console.log("\n==================================================");
console.log(`TOTAL: ${passed} PASSED, ${failed} FAILED`);
console.log("==================================================");

if (failed > 0) process.exit(1);
