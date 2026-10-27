import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { computeDepositBalance, validateDepositDebit } from "@/lib/deposit-ledger";
import { logAudit } from "@/lib/audit";

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session || session.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Only administrators can approve or reject deposit requests" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { transactionId, action, rejectionReason } = body;

    if (!transactionId) {
      return NextResponse.json({ error: "Transaction ID is required" }, { status: 400 });
    }

    if (!["APPROVE", "REJECT"].includes(action)) {
      return NextResponse.json({ error: "Action must be APPROVE or REJECT" }, { status: 400 });
    }

    if (action === "REJECT" && !rejectionReason?.trim()) {
      return NextResponse.json(
        { error: "বাতিলের কারণ (Rejection reason) উল্লেখ করা আবশ্যক।" },
        { status: 400 }
      );
    }

    const result = await prisma.$transaction(async (tx) => {
      const depositTx = await tx.depositTransaction.findUnique({
        where: { id: transactionId },
        include: {
          tenant: {
            include: {
              depositTransactions: { where: { status: "POSTED" } },
              shop: { include: { market: true } },
            },
          },
          enteredByUser: true,
        },
      });

      if (!depositTx) {
        throw new Error("Transaction request not found");
      }

      if (depositTx.status !== "PENDING_APPROVAL") {
        throw new Error(
          `This request has already been decided (Current status: ${depositTx.status}) and cannot be decided again.`
        );
      }

      if (action === "APPROVE") {
        // Re-validate that available balance is still sufficient
        const currentBalance = computeDepositBalance(depositTx.tenant.depositTransactions);
        const validation = validateDepositDebit(currentBalance, depositTx.amount, "REFUND");
        if (!validation.valid) {
          throw new Error(
            `অনুমোদন ব্যর্থ: ভাড়াটিয়ার বর্তমান জামানত ব্যালেন্স (৳${currentBalance / 100}) রিফান্ড পরিমাণের চেয়ে কম।`
          );
        }

        const updatedTx = await tx.depositTransaction.update({
          where: { id: depositTx.id },
          data: {
            status: "POSTED",
            approvedById: session.id,
            approvedAt: new Date(),
          },
        });

        // Update legacy advance fields
        await tx.tenant.update({
          where: { id: depositTx.tenantId },
          data: { advanceDeposit: { decrement: depositTx.amount } },
        });

        await tx.advanceTransaction.create({
          data: {
            tenantId: depositTx.tenantId,
            type: "REFUND",
            amount: depositTx.amount,
            reason: depositTx.reason,
            createdBy: session.name,
            enteredById: depositTx.enteredById,
            createdAt: new Date(),
          },
        });

        // Notify the requester in-app
        if (depositTx.enteredById) {
          await tx.notification.create({
            data: {
              userId: depositTx.enteredById,
              role: depositTx.enteredByUser?.role || "MANAGER",
              type: "SUCCESS",
              title: "জামানত রিফান্ড আবেদন অনুমোদিত",
              message: `ভাড়াটিয়া "${depositTx.tenant.name}" এর ৳${(depositTx.amount / 100).toLocaleString()} জামানত রিফান্ড আবেদন অ্যাডমিন কর্তৃক অনুমোদিত হয়েছে।`,
              link: "/deposits",
            },
          });
        }

        await logAudit({
          userId: session.id,
          userName: session.name,
          action: "DEPOSIT_REFUND_APPROVED",
          entityType: "DepositTransaction",
          entityId: depositTx.id,
          details: {
            tenantName: depositTx.tenant.name,
            amount: depositTx.amount,
            approvedBy: session.name,
          },
          tx,
        });

        return { updatedTx, status: "POSTED" };
      } else {
        // Action === REJECT
        const updatedTx = await tx.depositTransaction.update({
          where: { id: depositTx.id },
          data: {
            status: "REJECTED",
            rejectionReason: rejectionReason.trim(),
            approvedById: session.id,
            approvedAt: new Date(),
          },
        });

        // Notify requester in-app
        if (depositTx.enteredById) {
          await tx.notification.create({
            data: {
              userId: depositTx.enteredById,
              role: depositTx.enteredByUser?.role || "MANAGER",
              type: "WARNING",
              title: "জামানত রিফান্ড আবেদন বাতিল হয়েছে",
              message: `ভাড়াটিয়া "${depositTx.tenant.name}" এর জামানত রিফান্ড আবেদন বাতিল করা হয়েছে। কারণ: ${rejectionReason.trim()}`,
              link: "/deposits",
            },
          });
        }

        await logAudit({
          userId: session.id,
          userName: session.name,
          action: "DEPOSIT_REFUND_REJECTED",
          entityType: "DepositTransaction",
          entityId: depositTx.id,
          details: {
            tenantName: depositTx.tenant.name,
            amount: depositTx.amount,
            rejectedBy: session.name,
            rejectionReason: rejectionReason.trim(),
          },
          tx,
        });

        return { updatedTx, status: "REJECTED" };
      }
    });

    return NextResponse.json({
      success: true,
      action,
      status: result.status,
      transaction: result.updatedTx,
    });
  } catch (error: any) {
    console.error("Failed to decide deposit request:", error);
    return NextResponse.json(
      { error: error.message || "Failed to process decision" },
      { status: 400 }
    );
  }
}
