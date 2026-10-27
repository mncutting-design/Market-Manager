import prisma from "../lib/prisma";
import {
  computeDepositBalance,
  calculateDepositRunningBalances,
} from "../lib/deposit-ledger";

async function main() {
  console.log("🌱 Running Seed Deposit Demo Script...");

  // Find an admin user
  const adminUser = await prisma.user.findFirst({
    where: { role: "ADMIN" },
  });

  if (!adminUser) {
    throw new Error("No admin user found to attribute demo entries.");
  }

  // Find a payment account if available
  const paymentAccount = await prisma.paymentAccount.findFirst({
    where: { isActive: true },
  });

  // Pick an active tenant with shop and market
  const tenant = await prisma.tenant.findFirst({
    where: {
      status: "ACTIVE",
      advanceDeposit: { gt: 0 },
    },
    include: {
      shop: {
        include: { market: true },
      },
      depositTransactions: true,
    },
  });

  if (!tenant) {
    console.log("No active tenant with advance deposit found. Skipping demo seed.");
    return;
  }

  console.log(`Using tenant: ${tenant.name} (Shop: ${tenant.shop.shopNumber}, Market: ${tenant.shop.market.name})`);

  // Check if we already created demo records for this tenant
  const existingDemo = await prisma.depositTransaction.findFirst({
    where: {
      tenantId: tenant.id,
      reason: { contains: "DEMO_SEED" },
    },
  });

  if (existingDemo) {
    console.log("✨ Demo transactions already exist for this tenant. Verifying ledger balances...");
    const allTxs = await prisma.depositTransaction.findMany({
      where: { tenantId: tenant.id },
      include: {
        paymentAccount: true,
        enteredByUser: true,
      },
      orderBy: [{ transactionDate: "asc" }, { createdAt: "asc" }],
    });

    const balance = computeDepositBalance(allTxs);
    const running = calculateDepositRunningBalances(allTxs);
    console.log(`Current deposit balance: ৳${(balance / 100).toLocaleString()}`);
    console.log(`Ledger entry count: ${running.length}`);
    return;
  }

  // Add sample transactions
  const now = new Date();
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const twoDaysAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000);

  // 1. Top-up deposit via Bank
  const topupTx = await prisma.depositTransaction.create({
    data: {
      tenantId: tenant.id,
      marketId: tenant.shop.marketId,
      shopId: tenant.shop.id,
      type: "TOPUP",
      amount: 500000, // 5,000 BDT
      method: "BANK",
      paymentAccountId: paymentAccount?.id || null,
      bankName: paymentAccount?.bankName || "Sonali Bank PLC",
      transactionDate: twoDaysAgo,
      enteredById: adminUser.id,
      reason: "Security deposit top-up via bank transfer (DEMO_SEED)",
      status: "POSTED",
    },
  });
  console.log("✅ Created demo TOPUP transaction: ৳5,000");

  // 2. Pending Approval Refund Request
  const pendingRefundTx = await prisma.depositTransaction.create({
    data: {
      tenantId: tenant.id,
      marketId: tenant.shop.marketId,
      shopId: tenant.shop.id,
      type: "REFUND",
      amount: 100000, // 1,000 BDT
      method: "CASH",
      transactionDate: yesterday,
      enteredById: adminUser.id,
      reason: "Manager requested partial refund (DEMO_SEED)",
      status: "PENDING_APPROVAL",
    },
  });
  console.log("✅ Created demo PENDING_APPROVAL REFUND request: ৳1,000");

  // 3. Reversed Transaction Demo (Create a credit and reverse it)
  const erroneousTopup = await prisma.depositTransaction.create({
    data: {
      tenantId: tenant.id,
      marketId: tenant.shop.marketId,
      shopId: tenant.shop.id,
      type: "TOPUP",
      amount: 200000, // 2,000 BDT
      method: "BKASH",
      transactionDate: yesterday,
      enteredById: adminUser.id,
      reason: "Accidental duplicate entry (DEMO_SEED)",
      status: "REVERSED",
    },
  });

  const reversalTx = await prisma.depositTransaction.create({
    data: {
      tenantId: tenant.id,
      marketId: tenant.shop.marketId,
      shopId: tenant.shop.id,
      type: "REVERSAL",
      amount: 200000,
      method: "BKASH",
      transactionDate: now,
      enteredById: adminUser.id,
      reason: "Reversing accidental duplicate entry (DEMO_SEED)",
      reversesTransactionId: erroneousTopup.id,
      status: "POSTED",
    },
  });
  console.log("✅ Created demo REVERSAL transaction pairing");

  // Fetch all transactions and verify invariants
  const allTxs = await prisma.depositTransaction.findMany({
    where: { tenantId: tenant.id },
    include: {
      paymentAccount: true,
      enteredByUser: true,
      counterpartyUser: true,
      approvedByUser: true,
      reversesTransaction: true,
    },
    orderBy: [{ transactionDate: "asc" }, { createdAt: "asc" }],
  });

  const finalBalance = computeDepositBalance(allTxs);
  const timeline = calculateDepositRunningBalances(allTxs);

  console.log("\n📊 Verification Summary for Demo Tenant:");
  console.log(`- Total transactions in ledger: ${timeline.length}`);
  console.log(`- Final computeDepositBalance: ৳${(finalBalance / 100).toLocaleString()}`);
  console.log(`- Invariant check (finalBalance >= 0): ${finalBalance >= 0 ? "PASSED" : "FAILED"}`);

  // Also check that tenant.advanceDeposit matches or is updated
  await prisma.tenant.update({
    where: { id: tenant.id },
    data: { advanceDeposit: finalBalance },
  });
  console.log(`- Tenant advanceDeposit synchronized to ৳${(finalBalance / 100).toLocaleString()}`);
}

main()
  .catch((e) => {
    console.error("Demo seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
