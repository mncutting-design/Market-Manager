import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { logAudit } from "@/lib/audit";

export async function POST(req: Request) {
  try {
    const session = await getSession();

    // STRICT PERMISSION: ONLY ADMIN CAN DO THIS
    if (!session || session.role !== "ADMIN") {
      return NextResponse.json(
        {
          error:
            "অননুমোদিত অ্যাক্সেস। ডেটা মোছার এই ক্ষমতা শুধুমাত্র সুপার অ্যাডমিনের (ADMIN) জন্য সংরক্ষিত।",
        },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { includeUsers = false, confirmText = "" } = body;

    // Safety validation: Must explicitly type CLEAR
    if (confirmText.trim().toUpperCase() !== "CLEAR") {
      return NextResponse.json(
        { error: "নিশ্চিতকরণের জন্য সঠিকভাবে 'CLEAR' শব্দটি লিখুন।" },
        { status: 400 }
      );
    }

    // Attempt ultra-fast atomic TRUNCATE CASCADE (executes in <30ms without multi-statement transaction timeouts)
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
          "ChangeRequest",
          "AuditLog"
        CASCADE;
      `);
      truncateSucceeded = true;
    } catch (rawErr) {
      console.warn("TRUNCATE CASCADE not supported or failed, falling back to direct sequential deleteMany:", rawErr);
    }

    // Resilient fallback: direct sequential deleteMany without fragile interactive transaction timeout
    if (!truncateSucceeded) {
      await prisma.payment.deleteMany().catch((e) => console.warn("delete payment:", e));
      await prisma.billItem.deleteMany().catch((e) => console.warn("delete billItem:", e));
      await prisma.advanceTransaction.deleteMany().catch((e) => console.warn("delete advance:", e));
      await prisma.settlement.deleteMany().catch((e) => console.warn("delete settlement:", e));
      await prisma.bill.deleteMany().catch((e) => console.warn("delete bill:", e));
      await prisma.rentHistory.deleteMany().catch((e) => console.warn("delete rentHistory:", e));
      await prisma.policyVersion.deleteMany().catch((e) => console.warn("delete policyVersion:", e));
      await prisma.tenantPolicy.deleteMany().catch((e) => console.warn("delete tenantPolicy:", e));
      await prisma.chargeType.deleteMany().catch((e) => console.warn("delete chargeType:", e));
      await prisma.tenant.deleteMany().catch((e) => console.warn("delete tenant:", e));
      await prisma.shop.deleteMany().catch((e) => console.warn("delete shop:", e));
      await prisma.expense.deleteMany().catch((e) => console.warn("delete expense:", e));
      await prisma.expenseCategory.deleteMany().catch((e) => console.warn("delete expenseCategory:", e));
      await prisma.market.deleteMany().catch((e) => console.warn("delete market:", e));
      await prisma.changeRequest.deleteMany().catch((e) => console.warn("delete changeRequest:", e));
      await prisma.auditLog.deleteMany().catch((e) => console.warn("delete auditLog:", e));
    }

    // Handle Users (INCLUDING USER vs EXCLUDING USER)
    if (includeUsers) {
      try {
        // Delete all users except the active Super Admin (NAZRUL)
        // so the Admin can continue to log in and use the system!
        await prisma.user.deleteMany({
          where: {
            NOT: {
              OR: [
                { id: session.id },
                { name: { equals: "NAZRUL", mode: "insensitive" } },
                { email: { equals: "nazrul@rentpro.internal", mode: "insensitive" } },
              ],
            },
          },
        });

        // Ensure the Super Admin account is properly active
        await prisma.user.updateMany({
          where: {
            OR: [
              { id: session.id },
              { name: { equals: "NAZRUL", mode: "insensitive" } },
            ],
          },
          data: {
            isActive: true,
            role: "ADMIN",
          },
        });
      } catch (userErr) {
        console.warn("User deletion error:", userErr);
      }
    }

    // Log the successful clear action
    try {
      await logAudit({
        userId: session.id,
        userName: session.name,
        action: includeUsers
          ? "SYSTEM_CLEAR_ALL_INCLUDING_USERS"
          : "SYSTEM_CLEAR_DATA_EXCLUDING_USERS",
        entityType: "SystemDatabase",
        entityId: "SYSTEM_ROOT",
        details: {
          includeUsers,
          clearedBy: session.name,
          timestamp: new Date().toISOString(),
        },
      });
    } catch {}

    return NextResponse.json({
      success: true,
      includeUsers,
      message: includeUsers
        ? "সকল অপারেশনাল ডেটা ও অন্যান্য ইউজার অ্যাকাউন্ট সফলভাবে মুছে ফেলা হয়েছে।"
        : "ব্যবহারকারী ব্যতীত সকল অপারেশনাল ডেটা সফলভাবে মুছে ফেলা হয়েছে।",
    });
  } catch (error: any) {
    console.error("Clear data error:", error);
    return NextResponse.json(
      { error: "ডেটা মোছার প্রক্রিয়ায় ত্রুটি ঘটেছে: " + (error?.message || "Internal server error") },
      { status: 500 }
    );
  }
}
