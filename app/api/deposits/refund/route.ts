import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { computeDepositBalance, validateDepositDebit } from "@/lib/deposit-ledger";
import { logAudit } from "@/lib/audit";

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const {
      tenantId,
      amount,
      transactionDate,
      method = "CASH",
      paymentAccountId,
      bankName,
      transactionRef,
      counterpartyUserId,
      reason,
    } = body;

    if (!tenantId) {
      return NextResponse.json({ error: "Tenant ID is required" }, { status: 400 });
    }

    const refundAmount = Math.round(Number(amount));
    if (!refundAmount || refundAmount <= 0) {
      return NextResponse.json(
        { error: "Refund amount must be a positive number greater than zero" },
        { status: 400 }
      );
    }

    const isAdmin = session.role === "ADMIN";
    const status = isAdmin ? "POSTED" : "PENDING_APPROVAL";

    const result = await prisma.$transaction(async (tx) => {
      // Row locking / fresh query inside transaction to prevent concurrent overspending
      const tenant = await tx.tenant.findUnique({
        where: { id: tenantId },
        include: {
          shop: { include: { market: true } },
          depositTransactions: {
            where: { status: "POSTED" },
          },
        },
      });

      if (!tenant) {
        throw new Error("Tenant not found");
      }

      // If tenant has no depositTransactions yet, auto-bootstrap from advanceDeposit
      if (tenant.depositTransactions.length === 0 && tenant.advanceDeposit > 0) {
        const initialTx = await tx.depositTransaction.create({
          data: {
            tenantId: tenant.id,
            marketId: tenant.shop.marketId,
            shopId: tenant.shop.id,
            type: "RECEIVED",
            amount: tenant.advanceDeposit,
            transactionDate: tenant.startDate || tenant.createdAt,
            method: "CASH",
            reason: "Initial lease security deposit",
            status: "POSTED",
          },
        });
        tenant.depositTransactions = [initialTx];
      }

      // Compute current available balance
      const currentBalance = computeDepositBalance(tenant.depositTransactions);
      const validation = validateDepositDebit(currentBalance, refundAmount, "REFUND");
      if (!validation.valid) {
        throw new Error(validation.error || "Refund amount exceeds available deposit balance");
      }

      const txDate = transactionDate ? new Date(transactionDate) : new Date();

      const depositTx = await tx.depositTransaction.create({
        data: {
          tenantId: tenant.id,
          marketId: tenant.shop.marketId,
          shopId: tenant.shop.id,
          type: "REFUND",
          amount: refundAmount,
          transactionDate: txDate,
          method: (method || "CASH").toUpperCase(),
          paymentAccountId: paymentAccountId || null,
          bankName: bankName?.trim() || null,
          transactionRef: transactionRef?.trim() || null,
          counterpartyUserId: counterpartyUserId || session.id, // Paid by
          enteredById: session.id,
          approvedById: isAdmin ? session.id : null,
          approvedAt: isAdmin ? new Date() : null,
          reason: reason?.trim() || "জামানত ফেরত (Security Deposit Refund)",
          status,
        },
        include: {
          tenant: { select: { id: true, name: true, phone: true } },
          shop: { select: { id: true, shopNumber: true } },
          market: { select: { id: true, name: true } },
          paymentAccount: true,
          counterpartyUser: { select: { id: true, name: true } },
          enteredByUser: { select: { id: true, name: true } },
        },
      });

      if (isAdmin) {
        // Decrement legacy advanceDeposit if posted directly
        await tx.tenant.update({
          where: { id: tenant.id },
          data: {
            advanceDeposit: { decrement: refundAmount },
          },
        });

        await tx.advanceTransaction.create({
          data: {
            tenantId: tenant.id,
            type: "REFUND",
            amount: refundAmount,
            reason: depositTx.reason,
            createdBy: session.name,
            enteredById: session.id,
            createdAt: txDate,
          },
        });
      } else {
        // Manager or Collector requested refund - notify Admin
        await tx.notification.create({
          data: {
            role: "ADMIN",
            type: "APPROVAL",
            title: "নতুন জামানত রিফান্ড আবেদন",
            message: `${session.name} (${session.role}) ভাড়াটিয়া "${tenant.name}" এর জন্য ৳${(refundAmount / 100).toLocaleString()} জামানত ফেরতের আবেদন করেছেন।`,
            link: `/deposits`,
          },
        });
      }

      await logAudit({
        userId: session.id,
        userName: session.name,
        action: "ADVANCE_REFUND",
        entityType: "DepositTransaction",
        entityId: depositTx.id,
        details: {
          tenantName: tenant.name,
          shopNumber: tenant.shop.shopNumber,
          marketName: tenant.shop.market.name,
          amount: refundAmount,
          status,
          method: depositTx.method,
          reason: depositTx.reason,
          paidBy: depositTx.counterpartyUser?.name || session.name,
        },
        tx,
      });

      return { depositTx, currentBalance, newBalance: isAdmin ? currentBalance - refundAmount : currentBalance };
    });

    return NextResponse.json({
      success: true,
      status: result.depositTx.status,
      transaction: result.depositTx,
      balanceBefore: result.currentBalance,
      balanceAfter: result.newBalance,
      receipt: {
        receiptNo: `REF-${result.depositTx.id.slice(-6).toUpperCase()}`,
        tenantName: result.depositTx.tenant.name,
        phone: result.depositTx.tenant.phone,
        shopNumber: result.depositTx.shop.shopNumber,
        marketName: result.depositTx.market.name,
        amount: result.depositTx.amount,
        method: result.depositTx.method,
        transactionDate: result.depositTx.transactionDate,
        transactionRef: result.depositTx.transactionRef,
        bankName: result.depositTx.bankName,
        paidBy: result.depositTx.counterpartyUser?.name || session.name,
        enteredBy: session.name,
        reason: result.depositTx.reason,
        status: result.depositTx.status,
      },
    }, { status: 201 });
  } catch (error: any) {
    console.error("Failed to process refund:", error);
    return NextResponse.json(
      { error: error.message || "Failed to process refund" },
      { status: 400 }
    );
  }
}
