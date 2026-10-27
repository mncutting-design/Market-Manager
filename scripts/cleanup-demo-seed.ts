import prisma from "../lib/prisma";

async function main() {
  console.log("🧹 Cleaning up DEMO_SEED transactions from database...");

  // Find all DEMO_SEED transactions
  const demoTxs = await prisma.depositTransaction.findMany({
    where: {
      reason: { contains: "DEMO_SEED" },
    },
  });

  console.log(`Found ${demoTxs.length} demo transactions to remove.`);

  // Delete them
  const deleteResult = await prisma.depositTransaction.deleteMany({
    where: {
      reason: { contains: "DEMO_SEED" },
    },
  });

  console.log(`Deleted ${deleteResult.count} demo transactions.`);

  // Find Sathi Khanam
  const sathi = await prisma.tenant.findFirst({
    where: { name: "সাথী খানম" },
    include: {
      depositTransactions: {
        orderBy: [{ transactionDate: "asc" }, { createdAt: "asc" }],
      },
    },
  });

  if (sathi) {
    // Restore advanceDeposit to 450000 (4,500 BDT)
    await prisma.tenant.update({
      where: { id: sathi.id },
      data: { advanceDeposit: 450000 },
    });
    console.log("✅ Restored Sathi Khanam advanceDeposit to ৳4,500.");
    console.log(`Remaining transactions for ${sathi.name}: ${sathi.depositTransactions.length}`);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
