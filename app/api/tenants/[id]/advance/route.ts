import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import {
  computeAdvanceBalance,
  calculateRunningBalances,
} from "@/lib/advance";
import {
  getEffectivePolicy,
  calculateRequiredAdvance,
  calculateAdvanceShortfall,
} from "@/lib/policy";
import { logAudit } from "@/lib/audit";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: tenantId } = await params;

    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      include: {
        shop: {
          include: {
            market: true,
          },
        },
        advanceTransactions: {
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!tenant) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }

    // Backfill initial deposit if tenant has legacy advanceDeposit but no ledger entries
    let transactions = tenant.advanceTransactions;
    if (transactions.length === 0 && tenant.advanceDeposit > 0) {
      const initialTx = await prisma.advanceTransaction.create({
        data: {
          tenantId: tenant.id,
          type: "DEPOSIT_RECEIVED",
          amount: tenant.advanceDeposit,
          reason: "Initial lease advance deposit",
          createdBy: "System",
          createdAt: tenant.startDate || tenant.createdAt,
        },
      });
      transactions = [initialTx];
    }

    const currentBalance = computeAdvanceBalance(transactions);
    const timeline = calculateRunningBalances(transactions);

    // Resolve policy to determine required advance and shortfall
    const policyResult = await getEffectivePolicy({
      tenantId: tenant.id,
      marketId: tenant.shop.marketId,
    });

    const requiredAdvance = calculateRequiredAdvance(
      tenant.rentAmount,
      policyResult.data
    );
    const shortfall = calculateAdvanceShortfall(currentBalance, requiredAdvance);

    return NextResponse.json({
      tenant: {
        id: tenant.id,
        name: tenant.name,
        phone: tenant.phone,
        status: tenant.status,
        rentAmount: tenant.rentAmount,
        shopNumber: tenant.shop.shopNumber,
        marketName: tenant.shop.market.name,
        marketId: tenant.shop.marketId,
      },
      advanceBalance: currentBalance,
      requiredAdvance,
      shortfall,
      hasShortfall: shortfall > 0,
      policy: {
        versionNumber: policyResult.versionNumber,
        requiredAdvanceMonths: policyResult.data.requiredAdvanceMonths,
        requireAdvanceTopup: policyResult.data.requireAdvanceTopup,
      },
      transactions: timeline.reverse(), // most recent first for display
    });
  } catch (error) {
    console.error("Failed to fetch advance ledger:", error);
    return NextResponse.json(
      { error: "Failed to fetch advance ledger" },
      { status: 500 }
    );
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session || session.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Only administrators can record advance deposits or top-ups" },
        { status: 403 }
      );
    }

    const { id: tenantId } = await params;
    const body = await req.json();
    const { type, amount, reason } = body;

    if (!type || !["DEPOSIT_RECEIVED", "TOPUP"].includes(type)) {
      return NextResponse.json(
        { error: "Invalid transaction type. Must be DEPOSIT_RECEIVED or TOPUP" },
        { status: 400 }
      );
    }

    const paisaAmount = Math.round(Number(amount));
    if (!paisaAmount || paisaAmount <= 0) {
      return NextResponse.json(
        { error: "Amount must be a positive number" },
        { status: 400 }
      );
    }

    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
    });

    if (!tenant) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }

    const result = await prisma.$transaction(async (tx) => {
      const advanceTx = await tx.advanceTransaction.create({
        data: {
          tenantId: tenant.id,
          type,
          amount: paisaAmount,
          reason: reason?.trim() || (type === "TOPUP" ? "Advance top-up deposit" : "Security deposit received"),
          createdBy: session.name,
        },
      });

      await logAudit({
        userId: session.id,
        userName: session.name,
        action: type === "TOPUP" ? "ADVANCE_TOPUP" : "ADVANCE_DEPOSIT",
        entityType: "Tenant",
        entityId: tenant.id,
        details: {
          tenantName: tenant.name,
          amount: paisaAmount,
          type,
          reason: advanceTx.reason,
        },
        tx,
      });

      return advanceTx;
    });

    return NextResponse.json({ success: true, transaction: result }, { status: 201 });
  } catch (error) {
    console.error("Failed to record advance transaction:", error);
    return NextResponse.json(
      { error: "Failed to record advance transaction" },
      { status: 500 }
    );
  }
}
