import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { logAudit } from "@/lib/audit";

export async function GET() {
  try {
    const [
      markets,
      shops,
      tenants,
      advanceTransactions,
      settlements,
      tenantPolicies,
      policyVersions,
      rentHistory,
      chargeTypes,
      bills,
      billItems,
      payments,
      expenseCategories,
      expenses,
      paymentAccounts,
      notifications,
      changeRequests,
      advanceTopUpRequests,
    ] = await Promise.all([
      prisma.market.findMany(),
      prisma.shop.findMany(),
      prisma.tenant.findMany(),
      prisma.advanceTransaction.findMany(),
      prisma.settlement.findMany(),
      prisma.tenantPolicy.findMany(),
      prisma.policyVersion.findMany(),
      prisma.rentHistory.findMany(),
      prisma.chargeType.findMany(),
      prisma.bill.findMany(),
      prisma.billItem.findMany(),
      prisma.payment.findMany(),
      prisma.expenseCategory.findMany(),
      prisma.expense.findMany(),
      prisma.paymentAccount.findMany(),
      prisma.notification.findMany(),
      prisma.changeRequest.findMany(),
      prisma.advanceTopUpRequest.findMany(),
    ]);

    const backupData = {
      appName: "Market Manager",
      version: "2.0.0",
      exportedAt: new Date().toISOString(),
      counts: {
        markets: markets.length,
        shops: shops.length,
        tenants: tenants.length,
        advanceTransactions: advanceTransactions.length,
        settlements: settlements.length,
        tenantPolicies: tenantPolicies.length,
        policyVersions: policyVersions.length,
        rentHistory: rentHistory.length,
        chargeTypes: chargeTypes.length,
        bills: bills.length,
        billItems: billItems.length,
        payments: payments.length,
        expenseCategories: expenseCategories.length,
        expenses: expenses.length,
        paymentAccounts: paymentAccounts.length,
        notifications: notifications.length,
        changeRequests: changeRequests.length,
        advanceTopUpRequests: advanceTopUpRequests.length,
      },
      data: {
        markets,
        shops,
        tenants,
        advanceTransactions,
        settlements,
        tenantPolicies,
        policyVersions,
        rentHistory,
        chargeTypes,
        bills,
        billItems,
        payments,
        expenseCategories,
        categories: expenseCategories, // backward-compat with v1.0.0
        expenses,
        paymentAccounts,
        notifications,
        changeRequests,
        advanceTopUpRequests,
      },
    };

    const dateStr = new Date().toISOString().slice(0, 10);
    return new Response(JSON.stringify(backupData, null, 2), {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="market-manager-backup-${dateStr}.json"`,
      },
    });
  } catch (error) {
    console.error("Backup export error:", error);
    return NextResponse.json({ error: "Failed to generate backup" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getSession();

    // STRICT PERMISSION: ONLY ADMIN CAN RESTORE
    if (!session || session.role !== "ADMIN") {
      return NextResponse.json(
        { error: "অননুমোদিত অ্যাক্সেস। ডেটা রিস্টোর করার ক্ষমতা শুধুমাত্র অ্যাডমিনের জন্য সংরক্ষিত।" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { backupData, mode = "clean", confirmText = "" } = body;

    if (!backupData || !backupData.data) {
      return NextResponse.json(
        { error: "অবৈধ ব্যাকআপ ফাইল। ফাইলে প্রয়োজনীয় ডেটা পাওয়া যায়নি।" },
        { status: 400 }
      );
    }

    if (confirmText.trim().toUpperCase() !== "RESTORE") {
      return NextResponse.json(
        { error: "রিস্টোর নিশ্চিত করতে সঠিকভাবে 'RESTORE' শব্দটি লিখুন।" },
        { status: 400 }
      );
    }

    const data = backupData.data;

    // Load active User IDs to sanitize nullable user foreign keys
    const existingUsers = await prisma.user.findMany({ select: { id: true } });
    const userIds = new Set(existingUsers.map((u) => u.id));

    // Helper to safely parse dates in records
    const parseDates = <T extends Record<string, any>>(record: T, dateKeys: string[]): T => {
      const copy: Record<string, any> = { ...record };
      for (const key of dateKeys) {
        if (copy[key]) {
          copy[key] = new Date(copy[key]);
        }
      }
      return copy as T;
    };

    // If Clean Restore: wipe operational tables in correct order
    if (mode === "clean") {
      let truncateSucceeded = false;
      try {
        await prisma.$executeRawUnsafe(`
          TRUNCATE TABLE
            "Payment",
            "BillItem",
            "AdvanceTransaction",
            "Settlement",
            "Bill",
            "RentHistory",
            "PolicyVersion",
            "TenantPolicy",
            "Tenant",
            "Shop",
            "Expense",
            "ExpenseCategory",
            "ChargeType",
            "Market",
            "PaymentAccount",
            "Notification",
            "AdvanceTopUpRequest",
            "ChangeRequest",
            "AuditLog"
          CASCADE;
        `);
        truncateSucceeded = true;
      } catch (rawErr) {
        console.warn("TRUNCATE CASCADE failed, falling back to deleteMany:", rawErr);
      }

      if (!truncateSucceeded) {
        await prisma.payment.deleteMany().catch(() => {});
        await prisma.billItem.deleteMany().catch(() => {});
        await prisma.advanceTransaction.deleteMany().catch(() => {});
        await prisma.settlement.deleteMany().catch(() => {});
        await prisma.bill.deleteMany().catch(() => {});
        await prisma.rentHistory.deleteMany().catch(() => {});
        await prisma.policyVersion.deleteMany().catch(() => {});
        await prisma.tenantPolicy.deleteMany().catch(() => {});
        await prisma.chargeType.deleteMany().catch(() => {});
        await prisma.tenant.deleteMany().catch(() => {});
        await prisma.shop.deleteMany().catch(() => {});
        await prisma.expense.deleteMany().catch(() => {});
        await prisma.expenseCategory.deleteMany().catch(() => {});
        await prisma.market.deleteMany().catch(() => {});
        await prisma.paymentAccount.deleteMany().catch(() => {});
        await prisma.notification.deleteMany().catch(() => {});
        await prisma.advanceTopUpRequest.deleteMany().catch(() => {});
        await prisma.changeRequest.deleteMany().catch(() => {});
        await prisma.auditLog.deleteMany().catch(() => {});
      }
    }

    const restoredCounts: Record<string, number> = {};

    // 1. Markets
    if (Array.isArray(data.markets) && data.markets.length > 0) {
      const items = data.markets.map((m: any) =>
        parseDates(m, ["createdAt", "updatedAt"])
      );
      await prisma.market.createMany({ data: items, skipDuplicates: true });
      restoredCounts.markets = items.length;
    }

    // 2. Expense Categories (support both expenseCategories and legacy categories)
    const expCategories = data.expenseCategories || data.categories;
    if (Array.isArray(expCategories) && expCategories.length > 0) {
      const items = expCategories.map((c: any) =>
        parseDates(c, ["createdAt", "updatedAt"])
      );
      await prisma.expenseCategory.createMany({ data: items, skipDuplicates: true });
      restoredCounts.expenseCategories = items.length;
    }

    // 3. Charge Types
    if (Array.isArray(data.chargeTypes) && data.chargeTypes.length > 0) {
      const items = data.chargeTypes.map((ct: any) =>
        parseDates(ct, ["createdAt", "updatedAt"])
      );
      await prisma.chargeType.createMany({ data: items, skipDuplicates: true });
      restoredCounts.chargeTypes = items.length;
    }

    // 4. Payment Accounts
    if (Array.isArray(data.paymentAccounts) && data.paymentAccounts.length > 0) {
      const items = data.paymentAccounts.map((pa: any) =>
        parseDates(pa, ["createdAt", "updatedAt"])
      );
      await prisma.paymentAccount.createMany({ data: items, skipDuplicates: true });
      restoredCounts.paymentAccounts = items.length;
    }

    // 5. Shops
    if (Array.isArray(data.shops) && data.shops.length > 0) {
      const items = data.shops.map((s: any) =>
        parseDates(s, ["createdAt", "updatedAt"])
      );
      await prisma.shop.createMany({ data: items, skipDuplicates: true });
      restoredCounts.shops = items.length;
    }

    // 6. Tenants
    if (Array.isArray(data.tenants) && data.tenants.length > 0) {
      const items = data.tenants.map((t: any) =>
        parseDates(t, ["createdAt", "updatedAt", "startDate", "endDate"])
      );
      await prisma.tenant.createMany({ data: items, skipDuplicates: true });
      restoredCounts.tenants = items.length;
    }

    // 7. Tenant Policies & Policy Versions
    if (Array.isArray(data.tenantPolicies) && data.tenantPolicies.length > 0) {
      const items = data.tenantPolicies.map((tp: any) =>
        parseDates(tp, ["createdAt", "updatedAt"])
      );
      await prisma.tenantPolicy.createMany({ data: items, skipDuplicates: true });
      restoredCounts.tenantPolicies = items.length;
    }
    if (Array.isArray(data.policyVersions) && data.policyVersions.length > 0) {
      const items = data.policyVersions.map((pv: any) => {
        const parsed = parseDates(pv, ["createdAt", "effectiveFrom"]);
        if (parsed.createdById && !userIds.has(parsed.createdById)) {
          parsed.createdById = null;
        }
        return parsed;
      });
      await prisma.policyVersion.createMany({ data: items, skipDuplicates: true });
      restoredCounts.policyVersions = items.length;
    }

    // 8. Rent History
    if (Array.isArray(data.rentHistory) && data.rentHistory.length > 0) {
      const items = data.rentHistory.map((rh: any) =>
        parseDates(rh, ["createdAt", "effectiveFrom"])
      );
      await prisma.rentHistory.createMany({ data: items, skipDuplicates: true });
      restoredCounts.rentHistory = items.length;
    }

    // 9. Bills
    if (Array.isArray(data.bills) && data.bills.length > 0) {
      const items = data.bills.map((b: any) =>
        parseDates(b, ["createdAt", "updatedAt", "dueDate"])
      );
      await prisma.bill.createMany({ data: items, skipDuplicates: true });
      restoredCounts.bills = items.length;
    }

    // 10. Bill Items
    if (Array.isArray(data.billItems) && data.billItems.length > 0) {
      const items = data.billItems.map((bi: any) =>
        parseDates(bi, ["createdAt"])
      );
      await prisma.billItem.createMany({ data: items, skipDuplicates: true });
      restoredCounts.billItems = items.length;
    }

    // 11. Payments
    if (Array.isArray(data.payments) && data.payments.length > 0) {
      const items = data.payments.map((p: any) => {
        const parsed = parseDates(p, ["createdAt", "paidOn"]);
        if (parsed.receivedById && !userIds.has(parsed.receivedById)) {
          parsed.receivedById = null;
        }
        if (parsed.enteredById && !userIds.has(parsed.enteredById)) {
          parsed.enteredById = null;
        }
        return parsed;
      });
      await prisma.payment.createMany({ data: items, skipDuplicates: true });
      restoredCounts.payments = items.length;
    }

    // 12. Settlements
    if (Array.isArray(data.settlements) && data.settlements.length > 0) {
      const items = data.settlements.map((s: any) =>
        parseDates(s, ["createdAt", "settledAt"])
      );
      await prisma.settlement.createMany({ data: items, skipDuplicates: true });
      restoredCounts.settlements = items.length;
    }

    // 13. Advance Transactions
    if (Array.isArray(data.advanceTransactions) && data.advanceTransactions.length > 0) {
      const items = data.advanceTransactions.map((at: any) => {
        const parsed = parseDates(at, ["createdAt"]);
        if (parsed.enteredById && !userIds.has(parsed.enteredById)) {
          parsed.enteredById = null;
        }
        return parsed;
      });
      await prisma.advanceTransaction.createMany({ data: items, skipDuplicates: true });
      restoredCounts.advanceTransactions = items.length;
    }

    // 14. Expenses
    if (Array.isArray(data.expenses) && data.expenses.length > 0) {
      const items = data.expenses.map((e: any) => {
        const parsed = parseDates(e, ["createdAt", "updatedAt", "date"]);
        if (parsed.enteredById && !userIds.has(parsed.enteredById)) {
          parsed.enteredById = null;
        }
        return parsed;
      });
      await prisma.expense.createMany({ data: items, skipDuplicates: true });
      restoredCounts.expenses = items.length;
    }

    // 15. Notifications
    if (Array.isArray(data.notifications) && data.notifications.length > 0) {
      const items = data.notifications.map((n: any) => {
        const parsed = parseDates(n, ["createdAt"]);
        if (parsed.userId && !userIds.has(parsed.userId)) {
          parsed.userId = null;
        }
        return parsed;
      });
      await prisma.notification.createMany({ data: items, skipDuplicates: true });
      restoredCounts.notifications = items.length;
    }

    // 16. Advance Top-up Requests
    if (Array.isArray(data.advanceTopUpRequests) && data.advanceTopUpRequests.length > 0) {
      const items = data.advanceTopUpRequests.map((tr: any) => {
        const parsed = parseDates(tr, ["createdAt", "decidedAt"]);
        if (parsed.requestedById && !userIds.has(parsed.requestedById)) {
          parsed.requestedById = null;
        }
        return parsed;
      });
      await prisma.advanceTopUpRequest.createMany({ data: items, skipDuplicates: true });
      restoredCounts.advanceTopUpRequests = items.length;
    }

    // 17. Change Requests
    if (Array.isArray(data.changeRequests) && data.changeRequests.length > 0) {
      const items = data.changeRequests.map((cr: any) =>
        parseDates(cr, ["createdAt", "reviewedAt"])
      );
      await prisma.changeRequest.createMany({ data: items, skipDuplicates: true });
      restoredCounts.changeRequests = items.length;
    }

    // Log the successful restore action
    await logAudit({
      userId: session.id,
      userName: session.name,
      action: "DATA_RESTORED",
      entityType: "SystemBackup",
      entityId: "backup-restore",
      details: {
        restoredCounts,
        mode,
        exportedAt: backupData.exportedAt,
        backupVersion: backupData.version,
      },
    });

    return NextResponse.json({
      success: true,
      message: "ডেটা সফলভাবে রিস্টোর করা হয়েছে!",
      restoredCounts,
    });
  } catch (error) {
    console.error("Backup restore error:", error);
    return NextResponse.json(
      { error: "ডেটা রিস্টোর প্রক্রিয়াটি ব্যর্থ হয়েছে। ব্যাকআপ ফাইলটি সঠিক কিনা যাচাই করুন।" },
      { status: 500 }
    );
  }
}
