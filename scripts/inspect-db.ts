import prisma from "../lib/prisma";

async function main() {
  const tCount = await prisma.tenant.count();
  const advCount = await prisma.advanceTransaction.count();
  const payCount = await prisma.payment.count();
  const billCount = await prisma.bill.count();
  const marketCount = await prisma.market.count();
  const shopCount = await prisma.shop.count();

  console.log("DATABASE COUNTS:", {
    marketCount,
    shopCount,
    tenantCount: tCount,
    billCount,
    paymentCount: payCount,
    advanceTransactionCount: advCount,
  });

  const tenantsWithDeposit = await prisma.tenant.findMany({
    where: { advanceDeposit: { gt: 0 } },
    select: { id: true, name: true, advanceDeposit: true, startDate: true, shopId: true },
  });

  console.log(`Tenants with advanceDeposit > 0: ${tenantsWithDeposit.length}`);
  for (const t of tenantsWithDeposit) {
    console.log(`  Tenant: ${t.name} (id: ${t.id}), advanceDeposit: ${t.advanceDeposit} paisa (৳${t.advanceDeposit / 100}), shopId: ${t.shopId}`);
  }

  const existingAdvTxs = await prisma.advanceTransaction.findMany({
    select: { id: true, tenantId: true, type: true, amount: true, reason: true, createdAt: true },
    take: 10,
  });
  console.log(`Existing advance transactions (sample of ${existingAdvTxs.length}):`);
  console.log(JSON.stringify(existingAdvTxs, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
