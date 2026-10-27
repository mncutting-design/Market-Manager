import {
  computeDepositBalance,
  calculateDepositRunningBalances,
  validateDepositDebit,
  DepositTransactionLike,
} from "../lib/deposit-ledger";

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
  const match = JSON.stringify(actual) === JSON.stringify(expected);
  if (match) {
    console.log(`  ✅ PASS: ${testName}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${testName}`);
    console.error(`     Expected: ${JSON.stringify(expected)}`);
    console.error(`     Actual:   ${JSON.stringify(actual)}`);
    failed++;
  }
}

console.log("==================================================");
console.log("🧪 RUNNING UNIT TESTS: DEPOSIT LEDGER ENGINE");
console.log("==================================================");

// 1. Balance Calculation
console.log("\n[Test Suite 1: Ledger Balance]");

// 1.1 Empty ledger
assertEqual(computeDepositBalance([]), 0, "Empty ledger has 0 balance");

// 1.2 Received & Topup
const txs1: DepositTransactionLike[] = [
  { id: "1", type: "RECEIVED", amount: 5000000, status: "POSTED" }, // 50,000 BDT
  { id: "2", type: "TOPUP", amount: 1000000, status: "POSTED" },    // 10,000 BDT
];
assertEqual(computeDepositBalance(txs1), 6000000, "Received + Topup increases balance");

// 1.3 Debits: Refund, Adjust, Deduction
const txs2: DepositTransactionLike[] = [
  ...txs1,
  { id: "3", type: "ADJUSTED_TO_DUE", amount: 2000000, status: "POSTED" }, // 20,000 BDT
  { id: "4", type: "DEDUCTION", amount: 500000, status: "POSTED" },        // 5,000 BDT
  { id: "5", type: "REFUND", amount: 1500000, status: "POSTED" },           // 15,000 BDT
];
// 60,000 - 20,000 - 5,000 - 15,000 = 20,000 BDT = 2000000 paisa
assertEqual(computeDepositBalance(txs2), 2000000, "Debits correctly reduce balance");

// 1.4 Pending and Rejected rows are excluded
const txs3: DepositTransactionLike[] = [
  ...txs2,
  { id: "6", type: "REFUND", amount: 1000000, status: "PENDING_APPROVAL" },
  { id: "7", type: "TOPUP", amount: 5000000, status: "REJECTED" },
];
assertEqual(computeDepositBalance(txs3), 2000000, "Pending and Rejected rows do NOT alter posted balance");

// 1.5 Reversal of a Credit
const txs4: DepositTransactionLike[] = [
  { id: "orig-1", type: "RECEIVED", amount: 3000000, status: "POSTED" },
  {
    id: "rev-1",
    type: "REVERSAL",
    amount: 3000000,
    status: "POSTED",
    reversesTransactionId: "orig-1",
    reversesTransaction: { id: "orig-1", type: "RECEIVED", amount: 3000000 },
  },
];
assertEqual(computeDepositBalance(txs4), 0, "Reversal of credit zeroes out balance");

// 1.6 Reversal of a Debit restores balance
const txs5: DepositTransactionLike[] = [
  { id: "t1", type: "RECEIVED", amount: 5000000, status: "POSTED" },
  { id: "t2", type: "REFUND", amount: 2000000, status: "POSTED" },
  {
    id: "rev-t2",
    type: "REVERSAL",
    amount: 2000000,
    status: "POSTED",
    reversesTransactionId: "t2",
    reversesTransaction: { id: "t2", type: "REFUND", amount: 2000000 },
  },
];
assertEqual(computeDepositBalance(txs5), 5000000, "Reversal of refund debit restores balance");

// 2. Running Balances
console.log("\n[Test Suite 2: Running Balances]");
const runningList = calculateDepositRunningBalances([
  { id: "a", type: "RECEIVED", amount: 100000, status: "POSTED", transactionDate: "2026-01-01" },
  { id: "b", type: "TOPUP", amount: 50000, status: "POSTED", transactionDate: "2026-01-05" },
  { id: "c", type: "REFUND", amount: 30000, status: "POSTED", transactionDate: "2026-01-10" },
]);
assertEqual(runningList[0].runningBalance, 100000, "Step 1 running balance = 100000");
assertEqual(runningList[1].runningBalance, 150000, "Step 2 running balance = 150000");
assertEqual(runningList[2].runningBalance, 120000, "Step 3 running balance = 120000");

// 3. Validation
console.log("\n[Test Suite 3: Debit Validation]");
assert(validateDepositDebit(500000, 200000, "REFUND").valid, "Valid refund passes");
assert(!validateDepositDebit(500000, 600000, "REFUND").valid, "Refund exceeding balance rejected");
assert(!validateDepositDebit(500000, 0, "ADJUSTED_TO_DUE").valid, "Zero amount adjustment rejected");
assert(!validateDepositDebit(500000, -100, "DEDUCTION").valid, "Negative amount deduction rejected");

console.log("\n==================================================");
console.log(`TOTAL: ${passed} PASSED, ${failed} FAILED`);
console.log("==================================================");

if (failed > 0) process.exit(1);
