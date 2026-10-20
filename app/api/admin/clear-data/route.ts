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

    // Execute atomic safe cascade deletion
    await prisma.$transaction(async (tx) => {
      // 1. Delete billing & payments
      await tx.payment.deleteMany();
      await tx.billItem.deleteMany();
      await tx.advanceTransaction.deleteMany();
      await tx.settlement.deleteMany();
      await tx.bill.deleteMany();
      await tx.rentHistory.deleteMany();

      // 2. Delete policies & charges
      await tx.policyVersion.deleteMany();
      await tx.tenantPolicy.deleteMany();
      await tx.chargeType.deleteMany();

      // 3. Delete tenants & shops
      await tx.tenant.deleteMany();
      await tx.shop.deleteMany();

      // 4. Delete expenses & categories
      await tx.expense.deleteMany();
      await tx.expenseCategory.deleteMany();

      // 5. Delete markets
      await tx.market.deleteMany();

      // 6. Delete approvals & change requests
      await tx.changeRequest.deleteMany();

      // 7. Handle Users (INCLUDING USER vs EXCLUDING USER)
      if (includeUsers) {
        // Delete all users except the active Super Admin (NAZRUL)
        // so the Admin can continue to log in and use the system!
        await tx.user.deleteMany({
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
        await tx.user.updateMany({
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
      }

      // 8. Clear audit logs (except recording this final clear action)
      await tx.auditLog.deleteMany();
    });

    // Log the successful clear action
    await logAudit({
      userId: session.id,
      userName: session.name,
      action: includeUsers ? "SYSTEM_CLEAR_ALL_INCLUDING_USERS" : "SYSTEM_CLEAR_DATA_EXCLUDING_USERS",
      entityType: "SystemDatabase",
      entityId: "SYSTEM_ROOT",
      details: {
        includeUsers,
        clearedBy: session.name,
        timestamp: new Date().toISOString(),
      },
    });

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
