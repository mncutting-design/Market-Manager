import fs from "fs";
import path from "path";
import prisma from "../lib/prisma";

async function runBackup() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupDir = path.join(process.cwd(), "backups");
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  const backupPath = path.join(backupDir, `db_backup_${timestamp}.json`);
  console.log(`📦 Creating complete database snapshot to ${backupPath}...`);

  const [
    users,
    markets,
    shops,
    tenants,
    rentHistories,
    chargeTypes,
    bills,
    billItems,
    payments,
    collectors,
    expenseCategories,
    expenses,
    changeRequests,
    advanceTransactions,
    advanceTopUpRequests,
    settlements,
    tenantPolicies,
    policyVersions,
    paymentAccounts,
    notifications,
    auditLogs,
  ] = await Promise.all([
    prisma.user.findMany(),
    prisma.market.findMany(),
    prisma.shop.findMany(),
    prisma.tenant.findMany(),
    prisma.rentHistory.findMany(),
    prisma.chargeType.findMany(),
    prisma.bill.findMany(),
    prisma.billItem.findMany(),
    prisma.payment.findMany(),
    prisma.collector.findMany(),
    prisma.expenseCategory.findMany(),
    prisma.expense.findMany(),
    prisma.changeRequest.findMany(),
    prisma.advanceTransaction.findMany(),
    prisma.advanceTopUpRequest.findMany(),
    prisma.settlement.findMany(),
    prisma.tenantPolicy.findMany(),
    prisma.policyVersion.findMany(),
    prisma.paymentAccount.findMany(),
    prisma.notification.findMany(),
    prisma.auditLog.findMany(),
  ]);

  const backupData = {
    metadata: {
      timestamp: new Date().toISOString(),
      version: "1.0",
      counts: {
        users: users.length,
        markets: markets.length,
        shops: shops.length,
        tenants: tenants.length,
        bills: bills.length,
        payments: payments.length,
        expenses: expenses.length,
        advanceTransactions: advanceTransactions.length,
        settlements: settlements.length,
      },
    },
    users,
    markets,
    shops,
    tenants,
    rentHistories,
    chargeTypes,
    bills,
    billItems,
    payments,
    collectors,
    expenseCategories,
    expenses,
    changeRequests,
    advanceTransactions,
    advanceTopUpRequests,
    settlements,
    tenantPolicies,
    policyVersions,
    paymentAccounts,
    notifications,
    auditLogs,
  };

  fs.writeFileSync(backupPath, JSON.stringify(backupData, null, 2), "utf-8");
  const sizeMb = (fs.statSync(backupPath).size / (1024 * 1024)).toFixed(2);
  console.log(`✅ Snapshot saved successfully! Size: ${sizeMb} MB`);
  console.log("📊 Record counts:", backupData.metadata.counts);
}

runBackup()
  .catch((e) => {
    console.error("❌ Backup failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
