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
      paidById,
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

    // Direct posting: No Admin approval needed for deposit refunds per business policy
    const status = "POSTED";

    const result = await prisma.$transaction(
      async (tx) => {
        // Query inside transaction to prevent concurrent overspending
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
            counterpartyUserId: counterpartyUserId || paidById || session.id, // Paid by
            enteredById: session.id,
            approvedById: session.id,
            approvedAt: new Date(),
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

        // Decrement advanceDeposit on tenant
        await tx.tenant.update({
          where: { id: tenant.id },
          data: {
            advanceDeposit: { decrement: refundAmount },
          },
        });

        // Also record in legacy advanceTransaction for backward parity
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

        return {
          depositTx,
          tenantName: tenant.name,
          shopNumber: tenant.shop.shopNumber,
          marketName: tenant.shop.market.name,
          currentBalance,
          newBalance: currentBalance - refundAmount,
        };
      },
      { maxWait: 15000, timeout: 30000 }
    );

    // Audit log outside transaction so it never times out the main financial transaction
    try {
      await logAudit({
        userId: session.id,
        userName: session.name,
        action: "ADVANCE_REFUND",
        entityType: "DepositTransaction",
        entityId: result.depositTx.id,
        details: {
          tenantName: result.tenantName,
          shopNumber: result.shopNumber,
          marketName: result.marketName,
          amount: refundAmount,
          status,
          method: result.depositTx.method,
          reason: result.depositTx.reason,
          paidBy: result.depositTx.counterpartyUser?.name || session.name,
        },
      });
    } catch (auditErr) {
      console.warn("Audit log warning (non-fatal):", auditErr);
    }

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
