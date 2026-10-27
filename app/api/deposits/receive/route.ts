import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { logAudit } from "@/lib/audit";

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Role check: ADMIN, MANAGER, COLLECTOR can receive deposits
    const allowedRoles = ["ADMIN", "MANAGER", "COLLECTOR"];
    if (!allowedRoles.includes(session.role)) {
      return NextResponse.json(
        { error: "Permission denied. Only Admins, Managers, and Collectors can record deposits." },
        { status: 403 }
      );
    }

    const body = await req.json();
    const {
      tenantId,
      amount,
      type = "RECEIVED",
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

    const paisaAmount = Math.round(Number(amount));
    if (!paisaAmount || paisaAmount <= 0) {
      return NextResponse.json(
        { error: "Amount must be a positive number greater than zero" },
        { status: 400 }
      );
    }

    if (!["RECEIVED", "TOPUP"].includes(type)) {
      return NextResponse.json(
        { error: "Invalid transaction type. Must be RECEIVED or TOPUP" },
        { status: 400 }
      );
    }

    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      include: {
        shop: { include: { market: true } },
      },
    });

    if (!tenant) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }

    // Collector rule: COLLECTOR can only pick self as receivedBy / counterparty
    let effectiveCounterparty = counterpartyUserId || session.id;
    if (session.role === "COLLECTOR") {
      effectiveCounterparty = session.id;
    }

    const txDate = transactionDate ? new Date(transactionDate) : new Date();

    const result = await prisma.$transaction(async (tx) => {
      const depositTx = await tx.depositTransaction.create({
        data: {
          tenantId: tenant.id,
          marketId: tenant.shop.marketId,
          shopId: tenant.shop.id,
          type,
          amount: paisaAmount,
          transactionDate: txDate,
          method: (method || "CASH").toUpperCase(),
          paymentAccountId: paymentAccountId || null,
          bankName: bankName?.trim() || null,
          transactionRef: transactionRef?.trim() || null,
          counterpartyUserId: effectiveCounterparty || null,
          enteredById: session.id, // Set strictly from server session
          reason: reason?.trim() || (type === "TOPUP" ? "সিকিউরিটি জামানত টপ-আপ" : "সিকিউরিটি জামানত জমা"),
          status: "POSTED",
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

      // Keep legacy advanceTransaction and advanceDeposit in sync for zero backwards compatibility issues
      await tx.advanceTransaction.create({
        data: {
          tenantId: tenant.id,
          type: type === "TOPUP" ? "TOPUP" : "DEPOSIT_RECEIVED",
          amount: paisaAmount,
          reason: depositTx.reason,
          createdBy: session.name,
          enteredById: session.id,
          createdAt: txDate,
        },
      });

      await tx.tenant.update({
        where: { id: tenant.id },
        data: {
          advanceDeposit: { increment: paisaAmount },
        },
      });

      // Log to audit
      await logAudit({
        userId: session.id,
        userName: session.name,
        action: type === "TOPUP" ? "ADVANCE_TOPUP" : "ADVANCE_DEPOSIT",
        entityType: "DepositTransaction",
        entityId: depositTx.id,
        details: {
          tenantName: tenant.name,
          shopNumber: tenant.shop.shopNumber,
          marketName: tenant.shop.market.name,
          type,
          amount: paisaAmount,
          method: depositTx.method,
          transactionDate: depositTx.transactionDate,
          enteredBy: session.name,
        },
        tx,
      });

      return depositTx;
    });

    return NextResponse.json({
      success: true,
      transaction: result,
      receipt: {
        receiptNo: `DEP-${result.id.slice(-6).toUpperCase()}`,
        tenantName: tenant.name,
        phone: tenant.phone,
        shopNumber: tenant.shop.shopNumber,
        marketName: tenant.shop.market.name,
        type: result.type,
        amount: result.amount,
        method: result.method,
        transactionDate: result.transactionDate,
        transactionRef: result.transactionRef,
        bankName: result.bankName,
        receivedBy: result.counterpartyUser?.name || session.name,
        enteredBy: session.name,
        reason: result.reason,
      },
    }, { status: 201 });
  } catch (error: any) {
    console.error("Failed to receive deposit:", error);
    return NextResponse.json(
      { error: "Failed to record deposit: " + error.message },
      { status: 500 }
    );
  }
}
