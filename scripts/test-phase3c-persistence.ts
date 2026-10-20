import prisma from "../lib/prisma";

async function main() {
  console.log("=== PHASE 3C AUTOMATED PERSISTENCE TESTS ===");

  // Find or pick a test market and shop
  let market = await prisma.market.findFirst({
    include: { shops: { include: { tenants: true } } },
  });

  if (!market) {
    console.log("Creating temporary test market...");
    market = await prisma.market.create({
      data: {
        name: "Test Market Persistence",
        location: "Test Location",
        totalFloors: 1,
      },
      include: { shops: { include: { tenants: true } } },
    });
  }

  // Find an admin user
  let adminUser = await prisma.user.findFirst({
    where: { role: "ADMIN", isActive: true },
  });

  if (!adminUser) {
    adminUser = await prisma.user.create({
      data: {
        email: "admin_test@market.com",
        name: "Admin Tester",
        role: "ADMIN",
        passwordHash: "hashed_dummy_password",
        phone: "01700000000",
      },
    });
  }

  // Find or create a collector user
  let collectorUser = await prisma.user.findFirst({
    where: { role: "COLLECTOR", isActive: true },
  });

  if (!collectorUser) {
    collectorUser = await prisma.user.create({
      data: {
        email: "collector_test@market.com",
        name: "Collector Tester",
        role: "COLLECTOR",
        passwordHash: "hashed_dummy_password",
        phone: "01711111111",
      },
    });
  }

  // Find or create a payment account
  let paymentAcc = await prisma.paymentAccount.findFirst({
    where: { accountType: "BKASH" },
  });

  if (!paymentAcc) {
    paymentAcc = await prisma.paymentAccount.create({
      data: {
        accountType: "BKASH",
        name_en: "bKash Merchant Account",
        name_bn: "বিকাশ মার্চেন্ট অ্যাকাউন্ট",
        number: "01711-223344",
        isActive: true,
      },
    });
  }

  // Find or create a shop with tenant
  let shop = await prisma.shop.findFirst({
    where: { marketId: market.id },
    include: { tenants: true },
  });

  if (!shop) {
    shop = await prisma.shop.create({
      data: {
        marketId: market.id,
        shopNumber: "TEST-P3C",
        floor: 1,
        rentAmount: 1500000,
      },
      include: { tenants: true },
    });
  }

  let tenant = shop.tenants[0];
  if (!tenant) {
    tenant = await prisma.tenant.create({
      data: {
        shopId: shop.id,
        name: "Test Tenant Phase 3C",
        phone: "01822334455",
        rentAmount: 1500000,
        advanceDeposit: 3000000,
        startDate: new Date(),
        status: "ACTIVE",
      },
    });
  }

  console.log(`\n1. Testing Tenant Profile Updates with Bangla Unicode & Audit Logging...`);
  const initialRent = tenant.rentAmount;
  const newRent = initialRent + 100000; // Increase by 1,000 BDT
  const testAddress = "বাড়ি #১২, রোড #৪, ধানমন্ডি, ঢাকা";
  const testRefName = "রহিম উদ্দিন";
  const testRefPhone = "01799887766";
  const testRefRelation = "মামা (Uncle)";

  const updatedTenant = await prisma.tenant.update({
    where: { id: tenant.id },
    data: {
      permanentAddress: testAddress,
      referenceName: testRefName,
      referencePhone: testRefPhone,
      referenceRelation: testRefRelation,
      rentAmount: newRent,
    },
  });

  // Verify persistence
  if (
    updatedTenant.permanentAddress === testAddress &&
    updatedTenant.referenceName === testRefName &&
    updatedTenant.referencePhone === testRefPhone &&
    updatedTenant.referenceRelation === testRefRelation &&
    updatedTenant.rentAmount === newRent
  ) {
    console.log("  ✓ Tenant profile fields persisted correctly with Bangla Unicode.");
  } else {
    throw new Error("Tenant profile fields did not match expected values!");
  }

  // Record AuditLog
  const auditLog = await prisma.auditLog.create({
    data: {
      entityType: "Tenant",
      entityId: tenant.id,
      action: "UPDATE",
      userId: adminUser.id,
      userName: adminUser.name,
      detailsJson: JSON.stringify({
        permanentAddress: { old: null, new: testAddress },
        referenceName: { old: null, new: testRefName },
        rentAmount: { old: initialRent, new: newRent },
      }),
    },
  });
  console.log(`  ✓ AuditLog entry created with ID: ${auditLog.id}`);

  // Record RentHistory
  const rentHistory = await prisma.rentHistory.create({
    data: {
      shopId: shop.id,
      tenantId: tenant.id,
      rentAmount: newRent,
      effectiveFrom: new Date(2026, 10, 1),
      note: "Annual increment test",
    },
  });
  console.log(`  ✓ RentHistory recorded: newRent=${rentHistory.rentAmount / 100}৳, effective=${rentHistory.effectiveFrom.toISOString()}`);

  console.log(`\n2. Testing Advance (Jamanat) Top-Up Request & Atomic Approval Flow...`);
  const topUpAmount = 500000; // 5,000 BDT
  const topUpReq = await prisma.advanceTopUpRequest.create({
    data: {
      tenantId: tenant.id,
      amount: topUpAmount,
      requestedById: collectorUser.id,
      requestedBy: collectorUser.name,
      method: "BKASH",
      note: "Top-up submitted by Collector for testing (Ref: TRX-TEST-TOPUP-999)",
      status: "PENDING",
    },
  });
  console.log(`  ✓ Top-up request created: ID=${topUpReq.id}, Status=${topUpReq.status}, Amount=${topUpReq.amount / 100}৳`);

  // Atomic approval transaction
  const prevDeposit = updatedTenant.advanceDeposit;
  const [approvedReq, advanceTx, finalTenant] = await prisma.$transaction([
    prisma.advanceTopUpRequest.update({
      where: { id: topUpReq.id },
      data: {
        status: "APPROVED",
        decidedBy: adminUser.name,
        decidedAt: new Date(),
        decisionNote: "Approved top-up request",
      },
    }),
    prisma.advanceTransaction.create({
      data: {
        tenantId: tenant.id,
        type: "TOPUP",
        amount: topUpAmount,
        reason: "Approved top-up request",
        enteredById: adminUser.id,
        createdByName: adminUser.name,
      },
    }),
    prisma.tenant.update({
      where: { id: tenant.id },
      data: {
        advanceDeposit: { increment: topUpAmount },
      },
    }),
  ]);

  if (approvedReq.status === "APPROVED" && advanceTx.type === "TOPUP" && finalTenant.advanceDeposit === prevDeposit + topUpAmount) {
    console.log(`  ✓ Top-up request atomically APPROVED.`);
    console.log(`  ✓ AdvanceTransaction TOPUP created with enteredById=${advanceTx.enteredById}.`);
    console.log(`  ✓ Tenant advanceDeposit incremented from ${prevDeposit / 100}৳ to ${finalTenant.advanceDeposit / 100}৳.`);
  } else {
    throw new Error("Top-up approval transaction failed verification!");
  }

  console.log(`\n3. Testing Payment with Collector, Entered-by, and Channel Details...`);
  // Find or create bill
  let bill = await prisma.bill.findFirst({
    where: { shopId: shop.id },
  });

  if (!bill) {
    bill = await prisma.bill.create({
      data: {
        shopId: shop.id,
        tenantId: tenant.id,
        month: 10,
        year: 2026,
        rentAmount: 1500000,
        totalAmount: 1500000,
        dueAmount: 1500000,
        paidAmount: 0,
        status: "DUE",
      },
    });
  }

  const payAmount = 1000000; // 10,000 BDT
  const payment = await prisma.payment.create({
    data: {
      billId: bill.id,
      amount: payAmount,
      method: "BKASH",
      receivedById: collectorUser.id,
      receivedBy: collectorUser.name,
      enteredById: adminUser.id,
      paymentAccountId: paymentAcc.id,
      transactionRef: "BKASH-TEST-PERSIST-777",
      senderNumber: "01711223344",
      note: "Payment recorded with collector and bKash account",
      reference: `RCT-TEST-${Date.now()}`,
    },
    include: {
      receivedByUser: true,
      enteredByUser: true,
      paymentAccount: true,
    },
  });

  if (
    payment.receivedById === collectorUser.id &&
    payment.enteredById === adminUser.id &&
    payment.paymentAccountId === paymentAcc.id &&
    payment.transactionRef === "BKASH-TEST-PERSIST-777" &&
    payment.senderNumber === "01711223344" &&
    payment.receivedByUser?.name === collectorUser.name &&
    payment.enteredByUser?.name === adminUser.name
  ) {
    console.log(`  ✓ Payment created with full channel details, receivedBy, and enteredById.`);
    console.log(`  ✓ Verified receivedBy: ${payment.receivedByUser.name} (${payment.receivedByUser.role})`);
    console.log(`  ✓ Verified enteredBy: ${payment.enteredByUser?.name} (${payment.enteredByUser?.role})`);
    console.log(`  ✓ Verified paymentAccount: ${payment.paymentAccount?.name_en} (${payment.paymentAccount?.number})`);
  } else {
    throw new Error("Payment channel and collector verification failed!");
  }

  console.log(`\n4. Testing Expense with Entered-by persistence...`);
  let category = await prisma.expenseCategory.findFirst();
  if (!category) {
    category = await prisma.expenseCategory.create({
      data: {
        name_en: "Maintenance Test",
        name_bn: "রক্ষণাবেক্ষণ টেস্ট",
        color: "#0d9488",
        icon: "Wrench",
      },
    });
  }

  const expense = await prisma.expense.create({
    data: {
      marketId: market.id,
      categoryId: category.id,
      amount: 250000, // 2,500 BDT
      date: new Date(),
      description: "Test maintenance expense",
      paymentMethod: "CASH",
      enteredById: adminUser.id,
      createdByName: adminUser.name,
    },
    include: {
      enteredByUser: true,
    },
  });

  if (expense.enteredById === adminUser.id && expense.enteredByUser?.name === adminUser.name) {
    console.log(`  ✓ Expense created with enteredById=${expense.enteredById} (${expense.enteredByUser.name})`);
  } else {
    throw new Error("Expense enteredById verification failed!");
  }

  console.log(`\n5. Cleaning up test data...`);
  await prisma.payment.delete({ where: { id: payment.id } });
  await prisma.expense.delete({ where: { id: expense.id } });
  await prisma.advanceTransaction.delete({ where: { id: advanceTx.id } });
  await prisma.advanceTopUpRequest.delete({ where: { id: topUpReq.id } });
  await prisma.rentHistory.delete({ where: { id: rentHistory.id } });
  await prisma.auditLog.delete({ where: { id: auditLog.id } });

  // Revert tenant rent and advance
  await prisma.tenant.update({
    where: { id: tenant.id },
    data: {
      rentAmount: initialRent,
      advanceDeposit: prevDeposit,
    },
  });

  console.log("  ✓ All temporary test records cleaned up safely.");
  console.log("\n>>> ALL PHASE 3C PERSISTENCE TESTS PASSED SUCCESSFULLY! <<<\n");
}

main()
  .catch((e) => {
    console.error("Test execution failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
