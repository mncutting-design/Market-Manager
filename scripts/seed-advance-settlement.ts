import prisma from "../lib/prisma";
import { DEFAULT_POLICY } from "../lib/policy";
import { logAudit } from "../lib/audit";

async function main() {
  console.log("🚀 Seeding Advance Ledger, Policies, Settlement & Risk Test Data...");

  // 1. Ensure Global Policy exists
  let policy = await prisma.tenantPolicy.findFirst({
    where: { scope: "GLOBAL" },
    include: { versions: { orderBy: { versionNumber: "desc" }, take: 1 } },
  });

  let policyVersionId = "";

  if (!policy) {
    policy = await prisma.tenantPolicy.create({
      data: { scope: "GLOBAL" },
      include: { versions: true },
    });

    const v1 = await prisma.policyVersion.create({
      data: {
        policyId: policy.id,
        versionNumber: 1,
        requiredAdvanceMonths: DEFAULT_POLICY.requiredAdvanceMonths,
        rentDueDay: DEFAULT_POLICY.rentDueDay,
        gracePeriodDays: DEFAULT_POLICY.gracePeriodDays,
        lateFeeType: DEFAULT_POLICY.lateFeeType,
        lateFeeAmount: DEFAULT_POLICY.lateFeeAmount,
        lateFeeCap: DEFAULT_POLICY.lateFeeCap,
        noticePeriodDays: DEFAULT_POLICY.noticePeriodDays,
        noticePenaltyAmount: DEFAULT_POLICY.noticePenaltyAmount,
        advanceRefundDeadlineDays: DEFAULT_POLICY.advanceRefundDeadlineDays,
        requireAdvanceTopup: DEFAULT_POLICY.requireAdvanceTopup,
        annualRentIncreasePercent: DEFAULT_POLICY.annualRentIncreasePercent,
        contractExpiryWarningDays: DEFAULT_POLICY.contractExpiryWarningDays,
        overdueEscalationJson: JSON.stringify(DEFAULT_POLICY.overdueEscalation),
        allowedDeductionsJson: JSON.stringify(DEFAULT_POLICY.allowedDeductions),
        rulesTextEn: DEFAULT_POLICY.rulesTextEn,
        rulesTextBn: DEFAULT_POLICY.rulesTextBn,
      },
    });
    policyVersionId = v1.id;
    console.log("✅ Created Global Policy Version 1");
  } else {
    policyVersionId = policy.versions[0]?.id || "";
    console.log("✅ Global Policy exists: Version", policy.versions[0]?.versionNumber);
  }

  // 2. Backfill Advance Transactions for all existing active tenants who have no transactions
  const tenants = await prisma.tenant.findMany({
    include: {
      advanceTransactions: true,
      shop: true,
      bills: { orderBy: [{ year: "asc" }, { month: "asc" }] },
    },
  });

  console.log(`Found ${tenants.length} tenants in database.`);

  let backfillCount = 0;
  for (const t of tenants) {
    if (t.advanceTransactions.length === 0) {
      const depositAmount = t.advanceDeposit > 0 ? t.advanceDeposit : t.rentAmount * 3;
      await prisma.advanceTransaction.create({
        data: {
          tenantId: t.id,
          type: "DEPOSIT_RECEIVED",
          amount: depositAmount,
          reason: "Initial security advance deposit",
          createdBy: "Admin",
          createdAt: t.startDate || new Date("2025-01-01"),
        },
      });
      backfillCount++;
    }
  }
  console.log(`✅ Backfilled advance transactions for ${backfillCount} tenants.`);

  // 3. Configure the 5 Specific Test Case Tenants
  // We'll configure specific tenants in Market 1 (Gulshan Plaza) to guarantee exact test scenarios:
  const gulshanMarket = await prisma.market.findFirst({
    where: { name: { contains: "Gulshan" } },
    include: {
      shops: {
        include: {
          tenants: {
            where: { isActive: true },
            include: { advanceTransactions: true, bills: true },
          },
        },
      },
    },
  });

  if (gulshanMarket && gulshanMarket.shops.length >= 10) {
    const shops = gulshanMarket.shops;

    // -------------------------------------------------------------
    // Test Case 1: Advance > Dues (1 Month Overdue)
    // Shop G-01: Advance ৳ 75,000, 1 Month Due (October 2026) ৳ 25,000
    // -------------------------------------------------------------
    const shop1 = shops[0];
    const tenant1 = shop1.tenants[0];
    if (tenant1) {
      await prisma.advanceTransaction.deleteMany({ where: { tenantId: tenant1.id } });
      await prisma.advanceTransaction.create({
        data: {
          tenantId: tenant1.id,
          type: "DEPOSIT_RECEIVED",
          amount: 7500000, // ৳ 75,000
          reason: "Security deposit (3 months)",
          createdBy: "Admin",
        },
      });
      // Ensure 1 bill in October is DUE
      const billOct = await prisma.bill.findFirst({
        where: { shopId: shop1.id, month: 10, year: 2026 },
      });
      if (billOct) {
        await prisma.bill.update({
          where: { id: billOct.id },
          data: { paidAmount: 0, dueAmount: billOct.totalAmount, status: "DUE" },
        });
      }
      console.log(`✅ Configured Test Case 1 (Advance > Dues): ${tenant1.name} in ${shop1.shopNumber}`);
    }

    // -------------------------------------------------------------
    // Test Case 2: Advance == Dues (2 Months Overdue - Warning Stage)
    // Shop G-02: Advance ৳ 50,000, 2 Months Overdue (Sep & Oct) totaling ৳ 50,000
    // -------------------------------------------------------------
    const shop2 = shops[1];
    const tenant2 = shop2.tenants[0];
    if (tenant2) {
      await prisma.advanceTransaction.deleteMany({ where: { tenantId: tenant2.id } });
      await prisma.advanceTransaction.create({
        data: {
          tenantId: tenant2.id,
          type: "DEPOSIT_RECEIVED",
          amount: 5000000, // ৳ 50,000
          reason: "Security deposit",
          createdBy: "Admin",
        },
      });

      // Upsert Sep 2026 bill (৳ 25,000 DUE)
      await prisma.bill.upsert({
        where: { shopId_month_year: { shopId: shop2.id, month: 9, year: 2026 } },
        update: { paidAmount: 0, dueAmount: 2500000, status: "DUE" },
        create: {
          shopId: shop2.id,
          tenantId: tenant2.id,
          month: 9,
          year: 2026,
          rentAmount: 2500000,
          totalAmount: 2500000,
          paidAmount: 0,
          dueAmount: 2500000,
          status: "DUE",
          dueDate: new Date(2026, 8, 10),
        },
      });

      // Upsert Oct 2026 bill (৳ 25,000 DUE)
      await prisma.bill.upsert({
        where: { shopId_month_year: { shopId: shop2.id, month: 10, year: 2026 } },
        update: { paidAmount: 0, dueAmount: 2500000, status: "DUE" },
        create: {
          shopId: shop2.id,
          tenantId: tenant2.id,
          month: 10,
          year: 2026,
          rentAmount: 2500000,
          totalAmount: 2500000,
          paidAmount: 0,
          dueAmount: 2500000,
          status: "DUE",
          dueDate: new Date(2026, 9, 10),
        },
      });
      console.log(`✅ Configured Test Case 2 (Advance == Dues, 2 mo overdue): ${tenant2.name} in ${shop2.shopNumber}`);
    }

    // -------------------------------------------------------------
    // Test Case 3: Advance < Dues (3+ Months Overdue - Critical / Eligible for Settlement)
    // Shop G-03: Advance ৳ 30,000, 3 Months Overdue (Aug, Sep, Oct) totaling ৳ 75,000
    // Unrecovered Amount potential: ৳ 45,000!
    // -------------------------------------------------------------
    const shop3 = shops[2];
    const tenant3 = shop3.tenants[0];
    if (tenant3) {
      await prisma.advanceTransaction.deleteMany({ where: { tenantId: tenant3.id } });
      await prisma.advanceTransaction.create({
        data: {
          tenantId: tenant3.id,
          type: "DEPOSIT_RECEIVED",
          amount: 3000000, // ৳ 30,000
          reason: "Security deposit",
          createdBy: "Admin",
        },
      });

      // Aug, Sep, Oct bills all DUE
      for (const m of [8, 9, 10]) {
        await prisma.bill.upsert({
          where: { shopId_month_year: { shopId: shop3.id, month: m, year: 2026 } },
          update: { paidAmount: 0, dueAmount: 2500000, status: "DUE" },
          create: {
            shopId: shop3.id,
            tenantId: tenant3.id,
            month: m,
            year: 2026,
            rentAmount: 2500000,
            totalAmount: 2500000,
            paidAmount: 0,
            dueAmount: 2500000,
            status: "DUE",
            dueDate: new Date(2026, m - 1, 10),
          },
        });
      }
      console.log(`✅ Configured Test Case 3 (Advance < Dues, 3 mo overdue / Critical): ${tenant3.name} in ${shop3.shopNumber}`);
    }

    // -------------------------------------------------------------
    // Test Case 4: A Settled & Vacated Tenant (For Reports Demonstration)
    // Shop G-04: Previously settled with unrecovered amount ৳ 15,000
    // -------------------------------------------------------------
    const existingSettlement = await prisma.settlement.findFirst();
    if (!existingSettlement && shops.length >= 5) {
      const shopVac = shops[3];
      // Create a settled tenant record
      const settledTenant = await prisma.tenant.create({
        data: {
          shopId: shopVac.id,
          name: "মো: কামাল হোসেন (প্রাক্তন ভাড়াটিয়া)",
          phone: "01799887766",
          nid: "19842691234567800",
          rentAmount: 2500000,
          advanceDeposit: 5000000,
          status: "SETTLED",
          isActive: false,
          startDate: new Date("2024-01-01"),
          endDate: new Date("2026-09-30"),
        },
      });

      // Advance Deposit
      await prisma.advanceTransaction.create({
        data: {
          tenantId: settledTenant.id,
          type: "DEPOSIT_RECEIVED",
          amount: 5000000, // ৳ 50,000
          reason: "Initial security advance deposit",
          createdBy: "Admin",
          createdAt: new Date("2024-01-01"),
        },
      });

      const sampleDeductions = [
        { label_en: "Shop Wall & Glass Damage", label_bn: "দেয়াল ও গ্লাস ক্ষতিসাধন", amount: 1000000, note: "কাঁচ প্রতিস্থাপন" },
        { label_en: "Premises Cleaning", label_bn: "পরিচ্ছন্নতা খরচ", amount: 500000, note: "ডিপ ক্লিনিং" },
      ];

      // Settlement record: Total Due 50,000 + Deductions 15,000 = 65,000 vs Advance 50,000 -> Unrecovered 15,000
      const settlement = await prisma.settlement.create({
        data: {
          tenantId: settledTenant.id,
          shopId: shopVac.id,
          status: "CONFIRMED",
          totalDue: 5000000,
          advanceBalance: 5000000,
          totalDeductions: 1500000,
          refundAmount: 0,
          unrecoveredAmount: 1500000, // ৳ 15,000 unrecovered
          deductionsJson: JSON.stringify(sampleDeductions),
          policyVersionId,
          notes: "দোকান হস্তান্তর ও চূড়ান্ত হিসাব নিষ্পত্তি সম্পন্ন।",
          settledAt: new Date("2026-09-30"),
          confirmedBy: "প্রশাসক (Admin)",
        },
      });

      // Advance Transactions for settlement
      await prisma.advanceTransaction.create({
        data: {
          tenantId: settledTenant.id,
          type: "ADJUSTED_TO_DUE",
          amount: 5000000,
          relatedSettlementId: settlement.id,
          reason: "Adjusted against unpaid rent dues during settlement",
          createdBy: "Admin",
          createdAt: new Date("2026-09-30"),
        },
      });

      await prisma.advanceTransaction.create({
        data: {
          tenantId: settledTenant.id,
          type: "DEDUCTION",
          amount: 1500000,
          relatedSettlementId: settlement.id,
          reason: "Deductions for damages and cleaning",
          createdBy: "Admin",
          createdAt: new Date("2026-09-30"),
        },
      });

      // Audit Log
      await logAudit({
        userName: "প্রশাসক (Admin)",
        action: "SETTLEMENT_CONFIRMED",
        entityType: "Settlement",
        entityId: settlement.id,
        details: {
          tenantName: settledTenant.name,
          shopNumber: shopVac.shopNumber,
          totalDue: 5000000,
          advanceBalance: 5000000,
          totalDeductions: 1500000,
          unrecoveredAmount: 1500000,
        },
      });

      console.log(`✅ Configured Test Case 4 (Settled Tenant with Unrecovered Receivable): ${settledTenant.name}`);
    }
  }

  console.log("🎉 Advance & Settlement Seeding Completed Successfully!");
}

main()
  .catch((e) => {
    console.error("Seeding error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
