import prisma from "../lib/prisma";

async function migrate() {
  console.log("🚀 Starting idempotent tenant deposit opening balance migration...");

  const tenants = await prisma.tenant.findMany({
    include: {
      shop: { select: { id: true, marketId: true } },
      advanceTransactions: { orderBy: { createdAt: "asc" } },
      depositTransactions: { orderBy: { createdAt: "asc" } },
    },
  });

  console.log(`Found ${tenants.length} tenants in total.`);

  let totalRowsCreated = 0;
  let tenantsMigratedCount = 0;
  let alreadyUpToDateCount = 0;

  await prisma.$transaction(
    async (tx) => {
      // First gather all existing deposit tx tenant IDs
      const existingDepositTxs = await tx.depositTransaction.findMany({
        select: { tenantId: true },
      });
      const handledTenantIds = new Set(existingDepositTxs.map((d) => d.tenantId));

      const newRecords: any[] = [];

      for (const tenant of tenants) {
        if (handledTenantIds.has(tenant.id)) {
          alreadyUpToDateCount++;
          continue;
        }

        let tenantRecordsCount = 0;

        if (tenant.advanceTransactions.length > 0) {
          for (const advTx of tenant.advanceTransactions) {
            let convertedType = advTx.type;
            if (advTx.type === "DEPOSIT_RECEIVED") convertedType = "RECEIVED";

            newRecords.push({
              tenantId: tenant.id,
              marketId: tenant.shop.marketId,
              shopId: tenant.shop.id,
              type: convertedType,
              amount: advTx.amount,
              transactionDate: advTx.createdAt,
              method: "CASH",
              enteredById: advTx.enteredById || null,
              reason: advTx.reason || "Opening balance",
              relatedBillId: advTx.relatedBillId || null,
              relatedSettlementId: advTx.relatedSettlementId || null,
              status: "POSTED",
              createdAt: advTx.createdAt,
            });
            tenantRecordsCount++;
            totalRowsCreated++;
          }
        } else if (tenant.advanceDeposit > 0) {
          newRecords.push({
            tenantId: tenant.id,
            marketId: tenant.shop.marketId,
            shopId: tenant.shop.id,
            type: "RECEIVED",
            amount: tenant.advanceDeposit,
            transactionDate: tenant.startDate || tenant.createdAt,
            method: "CASH",
            reason: "Opening balance",
            status: "POSTED",
            createdAt: tenant.createdAt,
          });
          tenantRecordsCount++;
          totalRowsCreated++;
        }

        if (tenantRecordsCount > 0) {
          tenantsMigratedCount++;
          console.log(
            `  Tenant "${tenant.name}" (${tenant.id}): Prepared ${tenantRecordsCount} deposit ledger rows (Target balance: ৳${tenant.advanceDeposit / 100})`
          );
        }
      }

      if (newRecords.length > 0) {
        console.log(`Inserting ${newRecords.length} records in batch...`);
        await tx.depositTransaction.createMany({ data: newRecords });
      }
    },
    {
      maxWait: 20000,
      timeout: 60000,
    }
  );

  console.log("\n📊 Migration Execution Summary:");
  console.log(`  - Total rows created: ${totalRowsCreated}`);
  console.log(`  - Tenants migrated: ${tenantsMigratedCount}`);
  console.log(`  - Tenants already up-to-date: ${alreadyUpToDateCount}`);

  // Post-migration verification
  console.log("\n🔍 Verifying computed ledger balance equals old advanceDeposit for every tenant...");
  const postTenants = await prisma.tenant.findMany({
    include: {
      depositTransactions: { where: { status: "POSTED" } },
    },
  });

  let verifiedCount = 0;
  let failureCount = 0;

  for (const t of postTenants) {
    const computedBalance = t.depositTransactions.reduce((acc, dt) => {
      if (dt.type === "RECEIVED" || dt.type === "TOPUP") return acc + dt.amount;
      if (dt.type === "REFUND" || dt.type === "ADJUSTED_TO_DUE" || dt.type === "DEDUCTION") return acc - dt.amount;
      if (dt.type === "REVERSAL") {
        // Reversal reverses the original transaction's effect
        // (Handled in full ledger engine, but let's check if any exists yet)
        return acc;
      }
      return acc;
    }, 0);

    const expected = t.advanceDeposit;
    if (computedBalance !== expected) {
      console.error(
        `❌ MISMATCH on Tenant "${t.name}" (${t.id}): Computed = ৳${computedBalance / 100}, Old Field = ৳${expected / 100}`
      );
      failureCount++;
    } else {
      verifiedCount++;
    }
  }

  if (failureCount > 0) {
    throw new Error(`Migration verification FAILED! ${failureCount} tenant balances did not match!`);
  }

  console.log(`✅ VERIFICATION SUCCESSFUL! All ${verifiedCount} tenants have 100% balance parity.`);
}

migrate()
  .catch((e) => {
    console.error("Migration error:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
