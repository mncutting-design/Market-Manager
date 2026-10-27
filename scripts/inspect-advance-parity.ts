import prisma from "../lib/prisma";

async function main() {
  const tenants = await prisma.tenant.findMany({
    include: {
      advanceTransactions: true,
      shop: { include: { market: true } },
    },
  });

  console.log(`Checking ${tenants.length} tenants for advanceDeposit vs advanceTransactions parity...`);
  let mismatchCount = 0;
  let matchingCount = 0;

  for (const t of tenants) {
    const ledgerTotal = t.advanceTransactions.reduce((acc, tx) => {
      if (tx.type === "DEPOSIT_RECEIVED" || tx.type === "TOPUP" || tx.type === "RECEIVED") return acc + tx.amount;
      if (tx.type === "ADJUSTED_TO_DUE" || tx.type === "DEDUCTION" || tx.type === "REFUND") return acc - tx.amount;
      return acc;
    }, 0);

    const diff = t.advanceDeposit - ledgerTotal;
    if (diff !== 0) {
      mismatchCount++;
      console.log(`Mismatch: Tenant "${t.name}" (${t.id}): advanceDeposit = ${t.advanceDeposit}, ledgerTotal = ${ledgerTotal}, diff = ${diff}, txCount = ${t.advanceTransactions.length}`);
    } else {
      matchingCount++;
    }
  }

  console.log({ totalTenants: tenants.length, matchingCount, mismatchCount });
}

main().catch(console.error).finally(() => prisma.$disconnect());
