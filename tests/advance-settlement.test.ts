import {
  computeAdvanceBalance,
  calculateRunningBalances,
  validateAdvanceAdjustment,
} from "../lib/advance";
import {
  calculateSettlement,
  allocateAdvanceToBillsFIFO,
} from "../lib/settlement";
import {
  calculateRequiredAdvance,
  calculateAdvanceShortfall,
  evaluateTenantRisk,
  DEFAULT_POLICY,
} from "../lib/policy";

let testsPassed = 0;
let testsFailed = 0;

function assert(condition: boolean, testName: string) {
  if (condition) {
    console.log(`  ✅ PASS: ${testName}`);
    testsPassed++;
  } else {
    console.error(`  ❌ FAIL: ${testName}`);
    testsFailed++;
  }
}

function assertEqual(actual: any, expected: any, testName: string) {
  const match = JSON.stringify(actual) === JSON.stringify(expected);
  if (match) {
    console.log(`  ✅ PASS: ${testName}`);
    testsPassed++;
  } else {
    console.error(`  ❌ FAIL: ${testName}`);
    console.error(`     Expected: ${JSON.stringify(expected)}`);
    console.error(`     Actual:   ${JSON.stringify(actual)}`);
    testsFailed++;
  }
}

console.log("==================================================");
console.log("🧪 RUNNING UNIT TESTS: ADVANCE & SETTLEMENT ENGINE");
console.log("==================================================");

// -----------------------------------------------------------------
// 1. Advance Ledger Balance Calculations
// -----------------------------------------------------------------
console.log("\n[Test Suite 1: Advance Ledger Balance]");

// 1.1 Zero transactions
assertEqual(computeAdvanceBalance([]), 0, "Empty ledger has 0 balance");

// 1.2 Deposit received
const txs1 = [
  { type: "DEPOSIT_RECEIVED", amount: 6000000 }, // 60,000 BDT
];
assertEqual(computeAdvanceBalance(txs1), 6000000, "Initial deposit reflected in balance");

// 1.3 Partial adjustment against due
const txs2 = [
  { type: "DEPOSIT_RECEIVED", amount: 6000000 },
  { type: "ADJUSTED_TO_DUE", amount: 2000000 }, // 20,000 BDT
];
assertEqual(computeAdvanceBalance(txs2), 4000000, "Advance decreases after adjustment against due");

// 1.4 Topup adds to balance
const txs3 = [
  { type: "DEPOSIT_RECEIVED", amount: 6000000 },
  { type: "ADJUSTED_TO_DUE", amount: 2000000 },
  { type: "TOPUP", amount: 1500000 }, // 15,000 BDT
];
assertEqual(computeAdvanceBalance(txs3), 5500000, "Top-up increases advance balance");

// 1.5 Deduction and Refund
const txs4 = [
  { type: "DEPOSIT_RECEIVED", amount: 6000000 },
  { type: "ADJUSTED_TO_DUE", amount: 2000000 },
  { type: "DEDUCTION", amount: 500000 }, // 5,000 BDT
  { type: "REFUND", amount: 3500000 }, // 35,000 BDT
];
assertEqual(computeAdvanceBalance(txs4), 0, "Full settlement and refund yields zero balance");

// 1.6 Running balance calculation
const timeline = calculateRunningBalances([
  { type: "DEPOSIT_RECEIVED", amount: 50000, createdAt: new Date("2026-01-01") },
  { type: "ADJUSTED_TO_DUE", amount: 20000, createdAt: new Date("2026-02-01") },
  { type: "TOPUP", amount: 10000, createdAt: new Date("2026-03-01") },
]);
assertEqual(timeline[0].runningBalance, 50000, "Timeline step 1 running balance 50,000");
assertEqual(timeline[1].runningBalance, 30000, "Timeline step 2 running balance 30,000");
assertEqual(timeline[2].runningBalance, 40000, "Timeline step 3 running balance 40,000");

// 1.7 Adjustment validation
assert(validateAdvanceAdjustment(40000, 30000, 20000).valid, "Valid adjustment passes");
assert(!validateAdvanceAdjustment(40000, 30000, 50000).valid, "Adjustment exceeding advance fails");
assert(!validateAdvanceAdjustment(40000, 30000, 35000).valid, "Adjustment exceeding due fails");
assert(!validateAdvanceAdjustment(40000, 30000, 0).valid, "Zero or negative adjustment fails");

// -----------------------------------------------------------------
// 2. Settlement Calculations
// -----------------------------------------------------------------
console.log("\n[Test Suite 2: Settlement Calculation Engine]");

// Case A: Refund to Tenant (Advance > Dues + Deductions)
// Advance: 60,000 BDT (6,000,000 paisa)
// Dues: 20,000 BDT (2,000,000 paisa)
// Deductions: 5,000 BDT (500,000 paisa)
// Refund should be 35,000 BDT (3,500,000 paisa)
const resA = calculateSettlement({
  advanceBalance: 6000000,
  unpaidBillsTotal: 2000000,
  deductions: [
    { label_en: "Cleaning", label_bn: "পরিচ্ছন্নতা", amount: 300000 },
    { label_en: "Damage", label_bn: "ক্ষতিসাধন", amount: 200000 },
  ],
});
assert(resA.isRefund, "Case A is detected as Refund");
assert(!resA.isUnrecovered, "Case A is not unrecovered");
assertEqual(resA.totalLiabilities, 2500000, "Total liabilities: 2,500,000");
assertEqual(resA.advanceUsed, 2500000, "Advance used: 2,500,000");
assertEqual(resA.refundAmount, 3500000, "Refund to tenant: 3,500,000 (৳ 35,000)");
assertEqual(resA.unrecoveredAmount, 0, "Unrecovered is 0");
assertEqual(resA.advanceAllocatedToDues, 2000000, "Dues fully allocated: 2,000,000");
assertEqual(resA.advanceAllocatedToDeductions, 500000, "Deductions fully allocated: 500,000");

// Case B: Exact Match (Advance == Dues + Deductions)
// Advance: 40,000 BDT
// Dues: 35,000 BDT
// Deductions: 5,000 BDT
const resB = calculateSettlement({
  advanceBalance: 4000000,
  unpaidBillsTotal: 3500000,
  deductions: [{ label_en: "Cleaning", label_bn: "পরিচ্ছন্নতা", amount: 500000 }],
});
assert(resB.isExactMatch, "Case B is detected as Exact Match");
assertEqual(resB.refundAmount, 0, "Refund is 0 for exact match");
assertEqual(resB.unrecoveredAmount, 0, "Unrecovered is 0 for exact match");
assertEqual(resB.advanceUsed, 4000000, "Full advance used");

// Case C: Unrecovered Receivable (Dues + Deductions > Advance)
// Advance: 20,000 BDT (2,000,000 paisa)
// Dues: 45,000 BDT (4,500,000 paisa)
// Deductions: 5,000 BDT (500,000 paisa)
// Total Liabilities: 50,000 BDT (5,000,000 paisa)
// Unrecovered: 30,000 BDT (3,000,000 paisa)
const resC = calculateSettlement({
  advanceBalance: 2000000,
  unpaidBillsTotal: 4500000,
  deductions: [{ label_en: "Repair", label_bn: "মেরামত", amount: 500000 }],
});
assert(resC.isUnrecovered, "Case C is detected as Unrecovered Receivable");
assert(!resC.isRefund, "Case C is not refund");
assertEqual(resC.totalLiabilities, 5000000, "Total liabilities: 5,000,000");
assertEqual(resC.advanceUsed, 2000000, "Advance used capped at available advance: 2,000,000");
assertEqual(resC.unrecoveredAmount, 3000000, "Unrecovered receivable: 3,000,000 (৳ 30,000)");
assertEqual(resC.refundAmount, 0, "Refund is 0");
assertEqual(resC.advanceAllocatedToDues, 2000000, "Advance prioritizes rent dues");
assertEqual(resC.advanceAllocatedToDeductions, 0, "No remaining advance for deductions");

// Case D: Zero Advance Balance
const resD = calculateSettlement({
  advanceBalance: 0,
  unpaidBillsTotal: 2500000,
  deductions: [{ label_en: "Utility", label_bn: "ইউটিলিটি", amount: 500000 }],
});
assertEqual(resD.advanceUsed, 0, "Zero advance results in 0 advance used");
assertEqual(resD.unrecoveredAmount, 3000000, "Full liabilities recorded as unrecovered");

// -----------------------------------------------------------------
// 3. FIFO Bill Allocation
// -----------------------------------------------------------------
console.log("\n[Test Suite 3: FIFO Bill Allocation]");

const sampleBills = [
  { id: "bill-aug", month: 8, year: 2026, dueAmount: 15000 },
  { id: "bill-sep", month: 9, year: 2026, dueAmount: 20000 },
  { id: "bill-oct", month: 10, year: 2026, dueAmount: 20000 },
];

const fifoAlloc = allocateAdvanceToBillsFIFO(sampleBills, 25000);
assertEqual(fifoAlloc.length, 2, "Allocated to 2 oldest bills");
assertEqual(fifoAlloc[0].billId, "bill-aug", "First clears oldest bill (August)");
assertEqual(fifoAlloc[0].amountToPay, 15000, "August paid full 15,000");
assertEqual(fifoAlloc[0].status, "PAID", "August status is PAID");
assertEqual(fifoAlloc[1].billId, "bill-sep", "Second clears September partially");
assertEqual(fifoAlloc[1].amountToPay, 10000, "September paid partial 10,000");
assertEqual(fifoAlloc[1].remainingDue, 10000, "September remaining due 10,000");
assertEqual(fifoAlloc[1].status, "PARTIAL", "September status is PARTIAL");

// -----------------------------------------------------------------
// 4. Policy & Risk Evaluation
// -----------------------------------------------------------------
console.log("\n[Test Suite 4: Policy & Risk Evaluation]");

// Required Advance
const reqAdv = calculateRequiredAdvance(2000000, DEFAULT_POLICY); // 20k monthly rent * 3 months
assertEqual(reqAdv, 6000000, "Required advance for ৳20,000 rent is ৳60,000");

// Shortfall
const shortfall = calculateAdvanceShortfall(3500000, reqAdv);
assertEqual(shortfall, 2500000, "Shortfall is ৳25,000 when holding ৳35,000 of ৳60,000");

// Risk Evaluation
// 1 month overdue, low due vs advance
const riskNormal = evaluateTenantRisk(6000000, [
  { month: 10, year: 2026, dueAmount: 2000000 },
]);
assertEqual(riskNormal.riskLevel, "NORMAL", "1 month overdue is NORMAL");

// 2 months overdue or >80% advance
const riskWarning = evaluateTenantRisk(6000000, [
  { month: 9, year: 2026, dueAmount: 2500000 },
  { month: 10, year: 2026, dueAmount: 2500000 },
]);
assertEqual(riskWarning.riskLevel, "WARNING", "2 months overdue is WARNING");

// 3 months overdue -> CRITICAL / Eligible for settlement
const riskCritical = evaluateTenantRisk(6000000, [
  { month: 8, year: 2026, dueAmount: 2000000 },
  { month: 9, year: 2026, dueAmount: 2000000 },
  { month: 10, year: 2026, dueAmount: 2000000 },
]);
assertEqual(riskCritical.riskLevel, "CRITICAL", "3 months overdue is CRITICAL");
assert(riskCritical.eligibleForSettlement, "Eligible for settlement flag is true");

console.log("\n==================================================");
console.log(`🏁 TEST SUMMARY: ${testsPassed} passed, ${testsFailed} failed.`);
console.log("==================================================");

if (testsFailed > 0) {
  process.exit(1);
} else {
  console.log("🎉 ALL TESTS PASSED SUCCESSFULLY!\n");
}
