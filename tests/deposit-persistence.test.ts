import prisma from "../lib/prisma";
import { computeDepositBalance } from "../lib/deposit-ledger";

async function runPersistenceTest() {
  console.log("==================================================");
  console.log("🧪 RUNNING PERSISTENCE TEST: DEPOSIT, ADJUSTMENT, REFUND & REVERSAL");
  console.log("==================================================");

  const shop = await prisma.shop.findFirst({
    where: { isActive: true },
    include: { market: true },
  });

  if (!shop) throw new Error("No active shop found");

  // 1. Create test tenant and bill
  const tenant = await prisma.tenant.create({
    data: {
      name: "TEST_PERSISTENCE_TENANT",
      phone: "01888888888",
      shopId: shop.id,
      rentAmount: 1000000,
      status: "ACTIVE",
    },
  });

  const bill = await prisma.bill.create({
    data: {
      tenantId: tenant.id,
      shopId: shop.id,
      month: 12,
      year: 2099, // far future to not clash
      rentAmount: 1000000,
      totalAmount: 1000000,
      paidAmount: 0,
      dueAmount: 1000000,
      status: "DUE",
      dueDate: new Date("2099-12-10"),
    },
  });

  console.log(`Created test tenant (${tenant.id}) and test bill (${bill.id})`);

  try {
    // 2. Create deposit of ৳25,000 (2,500,000 paisa)
    await prisma.depositTransaction.create({
      data: {
        tenantId: tenant.id,
        marketId: shop.marketId,
        shopId: shop.id,
        type: "RECEIVED",
        amount: 2500000,
        reason: "Initial security deposit",
        status: "POSTED",
      },
    });

    // Reload and verify
    let reloadedTxs = await prisma.depositTransaction.findMany({
      where: { tenantId: tenant.id, status: "POSTED" },
    });
    let balance = computeDepositBalance(reloadedTxs);
    console.log(`Step 1 (Deposit ৳25,000): Balance = ৳${balance / 100}`);
    if (balance !== 2500000) throw new Error(`Expected 2500000, got ${balance}`);
    console.log("  ✅ PASS: Deposit persisted correctly.");

    // 3. Adjust ৳10,000 against bill
    const payment = await prisma.payment.create({
      data: {
        billId: bill.id,
        amount: 1000000,
        method: "ADVANCE_ADJUSTMENT",
        reference: "PERSIST-TEST-PAY",
      },
    });

    await prisma.bill.update({
      where: { id: bill.id },
      data: {
        paidAmount: 1000000,
        dueAmount: 0,
        status: "PAID",
      },
    });

    await prisma.depositTransaction.create({
      data: {
        tenantId: tenant.id,
        marketId: shop.marketId,
        shopId: shop.id,
        type: "ADJUSTED_TO_DUE",
        amount: 1000000,
        relatedBillId: bill.id,
        reason: "Adjusted against rent bill",
        status: "POSTED",
      },
    });

    // Reload and verify
    reloadedTxs = await prisma.depositTransaction.findMany({
      where: { tenantId: tenant.id, status: "POSTED" },
    });
    balance = computeDepositBalance(reloadedTxs);
    console.log(`Step 2 (Adjusted ৳10,000 to bill): Balance = ৳${balance / 100}`);
    if (balance !== 1500000) throw new Error(`Expected 1500000, got ${balance}`);
    const updatedBill = await prisma.bill.findUnique({ where: { id: bill.id } });
    if (updatedBill?.status !== "PAID" || updatedBill.dueAmount !== 0) {
      throw new Error("Bill status update failed");
    }
    console.log("  ✅ PASS: Adjustment and bill payment persisted correctly.");

    // 4. Create refund of ৳5,000
    const refundTx = await prisma.depositTransaction.create({
      data: {
        tenantId: tenant.id,
        marketId: shop.marketId,
        shopId: shop.id,
        type: "REFUND",
        amount: 500000,
        reason: "Partial refund to tenant",
        status: "POSTED",
      },
    });

    // Reload and verify
    reloadedTxs = await prisma.depositTransaction.findMany({
      where: { tenantId: tenant.id, status: "POSTED" },
    });
    balance = computeDepositBalance(reloadedTxs);
    console.log(`Step 3 (Refunded ৳5,000): Balance = ৳${balance / 100}`);
    if (balance !== 1000000) throw new Error(`Expected 1000000, got ${balance}`);
    console.log("  ✅ PASS: Refund persisted correctly.");

    // 5. Create reversal of the refund
    await prisma.depositTransaction.create({
      data: {
        tenantId: tenant.id,
        marketId: shop.marketId,
        shopId: shop.id,
        type: "REVERSAL",
        amount: 500000,
        reversesTransactionId: refundTx.id,
        reason: "Reversal of partial refund",
        status: "POSTED",
      },
    });

    // Reload and verify
    reloadedTxs = await prisma.depositTransaction.findMany({
      where: { tenantId: tenant.id, status: "POSTED" },
      include: { reversesTransaction: true },
    });
    balance = computeDepositBalance(reloadedTxs);
    console.log(`Step 4 (Reversed refund): Balance restored to = ৳${balance / 100}`);
    if (balance !== 1500000) throw new Error(`Expected 1500000, got ${balance}`);
    console.log("  ✅ PASS: Reversal persisted and restored balance correctly.");

    console.log("\n==================================================");
    console.log("✅ PERSISTENCE TEST SUITE PASSED COMPLETELY!");
    console.log("==================================================");
  } finally {
    // Cleanup
    await prisma.payment.deleteMany({ where: { billId: bill.id } });
    await prisma.bill.delete({ where: { id: bill.id } });
    await prisma.depositTransaction.deleteMany({ where: { tenantId: tenant.id } });
    await prisma.tenant.delete({ where: { id: tenant.id } });
    console.log("Cleaned up test persistence data.");
  }
}

runPersistenceTest()
  .catch((e) => {
    console.error("Test failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
