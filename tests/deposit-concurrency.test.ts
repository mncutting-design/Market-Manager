import prisma from "../lib/prisma";
import { computeDepositBalance, validateDepositDebit } from "../lib/deposit-ledger";

async function runConcurrencyTest() {
  console.log("==================================================");
  console.log("🧪 RUNNING CONCURRENCY TEST: TWO SIMULTANEOUS REFUNDS");
  console.log("==================================================");

  // Find an active market and shop
  const shop = await prisma.shop.findFirst({
    where: { isActive: true },
    include: { market: true },
  });

  if (!shop) {
    throw new Error("No active shop found for test");
  }

  // 1. Create a dedicated isolated test tenant
  const testTenant = await prisma.tenant.create({
    data: {
      name: "TEST_CONCURRENCY_TENANT",
      phone: "01999999999",
      shopId: shop.id,
      rentAmount: 1000000, // 10,000 BDT
      advanceDeposit: 1000000, // 10,000 BDT
      status: "ACTIVE",
    },
  });

  console.log(`Created test tenant: ${testTenant.name} (id: ${testTenant.id})`);

  try {
    // 2. Create initial deposit transaction of ৳10,000 (1,000,000 paisa)
    await prisma.depositTransaction.create({
      data: {
        tenantId: testTenant.id,
        marketId: shop.marketId,
        shopId: shop.id,
        type: "RECEIVED",
        amount: 1000000, // 10,000 BDT
        reason: "Initial test deposit",
        status: "POSTED",
      },
    });

    console.log("Initial deposit created: ৳10,000");

    // 3. Define the atomic refund function with transaction row check
    const performRefund = async (refundAmount: number, workerName: string) => {
      return await prisma.$transaction(
        async (tx) => {
          // Row locking via raw SELECT FOR UPDATE or fresh fetch inside transaction
          await tx.$queryRaw`SELECT id FROM "Tenant" WHERE id = ${testTenant.id} FOR UPDATE`;

          const txs = await tx.depositTransaction.findMany({
            where: { tenantId: testTenant.id, status: "POSTED" },
          });

          const currentBalance = computeDepositBalance(txs);
          const validation = validateDepositDebit(currentBalance, refundAmount, "REFUND");

          if (!validation.valid) {
            throw new Error(`[${workerName}] ${validation.error}`);
          }

          const created = await tx.depositTransaction.create({
            data: {
              tenantId: testTenant.id,
              marketId: shop.marketId,
              shopId: shop.id,
              type: "REFUND",
              amount: refundAmount,
              reason: `${workerName} refund`,
              status: "POSTED",
            },
          });

          return { success: true, worker: workerName, txId: created.id };
        },
        { timeout: 15000 }
      );
    };

    console.log("Launching 2 simultaneous refunds of ৳8,000 each on a ৳10,000 balance in parallel...");

    const results = await Promise.allSettled([
      performRefund(800000, "Worker-1"), // 8,000 BDT
      performRefund(800000, "Worker-2"), // 8,000 BDT
    ]);

    const successes = results.filter((r) => r.status === "fulfilled");
    const rejections = results.filter((r) => r.status === "rejected");

    console.log(`Success count: ${successes.length}`);
    console.log(`Rejection count: ${rejections.length}`);

    if (successes.length === 1 && rejections.length === 1) {
      console.log("  ✅ PASS: Concurrency test verified! Exactly 1 refund succeeded and 1 was rejected.");
    } else {
      console.error("  ❌ FAIL: Concurrency race condition detected!", { successes, rejections });
      throw new Error("Concurrency invariant violated!");
    }

    // 4. Verify final balance is exactly 2,000 BDT (200,000 paisa)
    const finalTxs = await prisma.depositTransaction.findMany({
      where: { tenantId: testTenant.id, status: "POSTED" },
    });
    const finalBalance = computeDepositBalance(finalTxs);
    console.log(`Final computed deposit balance: ৳${finalBalance / 100}`);

    if (finalBalance === 200000) {
      console.log("  ✅ PASS: Final balance is exactly ৳2,000 (10k - 8k)");
    } else {
      console.error(`  ❌ FAIL: Expected balance 200000, got ${finalBalance}`);
      throw new Error("Balance mismatch");
    }
  } finally {
    // Cleanup test records
    await prisma.depositTransaction.deleteMany({ where: { tenantId: testTenant.id } });
    await prisma.tenant.delete({ where: { id: testTenant.id } });
    console.log("Cleaned up test tenant and transactions.");
  }
}

runConcurrencyTest()
  .catch((e) => {
    console.error("Test failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
