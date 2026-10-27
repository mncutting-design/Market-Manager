import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { computeDepositBalance, isCreditDepositType, isDebitDepositType } from "@/lib/deposit-ledger";
import { logAudit } from "@/lib/audit";

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session || session.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Only administrators can reverse deposit transactions" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { transactionId, reason } = body;

    if (!transactionId) {
      return NextResponse.json({ error: "Transaction ID is required" }, { status: 400 });
    }

    const result = await prisma.$transaction(async (tx) => {
      const targetTx = await tx.depositTransaction.findUnique({
        where: { id: transactionId },
        include: {
          reversedBy: true,
          tenant: {
            include: {
              depositTransactions: { where: { status: "POSTED" } },
              shop: { include: { market: true } },
            },
          },
        },
      });

      if (!targetTx) {
        throw new Error("Target transaction not found");
      }

      if (targetTx.status !== "POSTED") {
        throw new Error("Only POSTED transactions can be reversed");
      }

      if (targetTx.type === "REVERSAL") {
        throw new Error("Cannot reverse a reversal transaction");
      }

      if (targetTx.reversedBy && targetTx.reversedBy.length > 0) {
        throw new Error("This transaction has already been reversed and cannot be reversed twice");
      }

      // Check current balance
      const currentBalance = computeDepositBalance(targetTx.tenant.depositTransactions);

      // If target was a credit, reversing it will subtract amount. Ensure balance >= amount!
      if (isCreditDepositType(targetTx.type)) {
        if (currentBalance < targetTx.amount) {
          throw new Error(
            `Cannot reverse credit transaction: tenant's current deposit balance (৳${currentBalance / 100}) is less than the reversal amount (৳${targetTx.amount / 100}).`
          );
        }
      }

      // Create REVERSAL transaction
      const reversalTx = await tx.depositTransaction.create({
        data: {
          tenantId: targetTx.tenantId,
          marketId: targetTx.marketId,
          shopId: targetTx.shopId,
          type: "REVERSAL",
          amount: targetTx.amount,
          transactionDate: new Date(),
          method: targetTx.method,
          paymentAccountId: targetTx.paymentAccountId,
          bankName: targetTx.bankName,
          transactionRef: targetTx.transactionRef,
          counterpartyUserId: session.id,
          enteredById: session.id,
          reason: reason?.trim() || `লেনদেন রিভার্সাল / বাতিলকরণ (মূল আইডি: ${targetTx.id.slice(-6)})`,
          reversesTransactionId: targetTx.id,
          status: "POSTED",
        },
        include: {
          tenant: { select: { id: true, name: true, phone: true } },
          shop: { select: { id: true, shopNumber: true } },
          market: { select: { id: true, name: true } },
        },
      });

      // Synchronize backward-compatible advanceDeposit field
      if (isCreditDepositType(targetTx.type)) {
        await tx.tenant.update({
          where: { id: targetTx.tenantId },
          data: { advanceDeposit: { decrement: targetTx.amount } },
        });
      } else if (isDebitDepositType(targetTx.type)) {
        await tx.tenant.update({
          where: { id: targetTx.tenantId },
          data: { advanceDeposit: { increment: targetTx.amount } },
        });
      }

      await logAudit({
        userId: session.id,
        userName: session.name,
        action: "DEPOSIT_REVERSED",
        entityType: "DepositTransaction",
        entityId: reversalTx.id,
        details: {
          originalTransactionId: targetTx.id,
          originalType: targetTx.type,
          amount: targetTx.amount,
          tenantName: targetTx.tenant.name,
          reason: reversalTx.reason,
        },
        tx,
      });

      return reversalTx;
    });

    return NextResponse.json({
      success: true,
      transaction: result,
      message: "Transaction reversed successfully",
    }, { status: 201 });
  } catch (error: any) {
    console.error("Failed to reverse deposit transaction:", error);
    return NextResponse.json(
      { error: error.message || "Failed to reverse transaction" },
      { status: 400 }
    );
  }
}
