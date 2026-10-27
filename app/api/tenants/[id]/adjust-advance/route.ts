import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import {
  computeAdvanceBalance,
  validateAdvanceAdjustment,
} from "@/lib/advance";
import { allocateAdvanceToBillsFIFO } from "@/lib/settlement";
import {
  getEffectivePolicy,
  calculateRequiredAdvance,
  calculateAdvanceShortfall,
} from "@/lib/policy";
import { logAudit } from "@/lib/audit";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session || session.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Only administrators can execute advance adjustments" },
        { status: 403 }
      );
    }

    const { id: tenantId } = await params;
    const body = await req.json();
    const { amount, specificBillIds, note } = body;

    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      include: {
        shop: true,
        advanceTransactions: true,
        bills: {
          where: {
            status: { in: ["DUE", "PARTIAL"] },
          },
          orderBy: [{ year: "asc" }, { month: "asc" }],
        },
      },
    });

    if (!tenant) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }

    // Backfill initial deposit if needed
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

    const availableAdvance = computeAdvanceBalance(transactions);
    const candidateBills = specificBillIds && specificBillIds.length > 0
      ? tenant.bills.filter((b) => specificBillIds.includes(b.id))
      : tenant.bills;

    const totalDue = candidateBills.reduce((sum, b) => sum + b.dueAmount, 0);

    const adjustAmount = Math.round(Number(amount));
    const validation = validateAdvanceAdjustment(availableAdvance, totalDue, adjustAmount);
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    // Allocate adjustment across bills using FIFO
    const allocations = allocateAdvanceToBillsFIFO(candidateBills, adjustAmount);

    // Execute in a single atomic database transaction
    const result = await prisma.$transaction(async (tx) => {
      const updatedBills = [];
      const paymentIds = [];

      for (const alloc of allocations) {
        // 1. Create Payment with method ADVANCE_ADJUSTMENT
        const payment = await tx.payment.create({
          data: {
            billId: alloc.billId,
            amount: alloc.amountToPay,
            method: "ADVANCE_ADJUSTMENT",
            reference: `ADV-ADJ-${new Date().getTime().toString().slice(-6)}`,
            receivedBy: session.name,
            note: note || "Adjusted from tenant advance deposit",
          },
        });
        paymentIds.push(payment.id);

        // 2. Update Bill status and amounts
        const updatedBill = await tx.bill.update({
          where: { id: alloc.billId },
          data: {
            paidAmount: { increment: alloc.amountToPay },
            dueAmount: alloc.remainingDue,
            status: alloc.status,
          },
        });
        updatedBills.push(updatedBill);
      }

      // 3. Create ADJUSTED_TO_DUE AdvanceTransaction (legacy)
      const advanceTx = await tx.advanceTransaction.create({
        data: {
          tenantId: tenant.id,
          type: "ADJUSTED_TO_DUE",
          amount: adjustAmount,
          relatedBillId: allocations[0]?.billId || null,
          reason: note || `Adjusted ৳${Math.round(adjustAmount / 100)} against rent dues (${allocations.length} bills cleared/partial)`,
          createdBy: session.name,
        },
      });

      // 3b. Create DepositTransaction in the single-source append-only ledger
      await tx.depositTransaction.create({
        data: {
          tenantId: tenant.id,
          marketId: tenant.shop.marketId,
          shopId: tenant.shopId,
          type: "ADJUSTED_TO_DUE",
          amount: adjustAmount,
          method: "CASH",
          enteredById: session.id,
          counterpartyUserId: session.id,
          reason: note || `Adjusted ৳${Math.round(adjustAmount / 100)} against rent dues (${allocations.length} bills cleared/partial)`,
          relatedBillId: allocations[0]?.billId || null,
          status: "POSTED",
          approvedById: session.id,
          approvedAt: new Date(),
        },
      });

      // Keep legacy column in sync
      await tx.tenant.update({
        where: { id: tenant.id },
        data: { advanceDeposit: Math.max(0, availableAdvance - adjustAmount) },
      });

      // 4. Audit Log entry
      await logAudit({
        userId: session.id,
        userName: session.name,
        action: "ADVANCE_ADJUSTMENT",
        entityType: "Tenant",
        entityId: tenant.id,
        details: {
          tenantName: tenant.name,
          shopNumber: tenant.shop.shopNumber,
          adjustedAmount: adjustAmount,
          billsAffected: allocations.map((a) => ({
            billId: a.billId,
            paid: a.amountToPay,
            status: a.status,
          })),
          note,
        },
        tx,
      });

      return { advanceTx, updatedBills };
    });

    // Check remaining advance vs policy requirement
    const newAdvanceBalance = availableAdvance - adjustAmount;
    const policyResult = await getEffectivePolicy({
      tenantId: tenant.id,
      marketId: tenant.shop.marketId,
    });
    const requiredAdvance = calculateRequiredAdvance(tenant.rentAmount, policyResult.data);
    const shortfall = calculateAdvanceShortfall(newAdvanceBalance, requiredAdvance);

    return NextResponse.json({
      success: true,
      adjustedAmount: adjustAmount,
      newAdvanceBalance,
      remainingDue: totalDue - adjustAmount,
      requiredAdvance,
      shortfall,
      hasShortfall: shortfall > 0,
      bills: result.updatedBills,
    });
  } catch (error) {
    console.error("Failed to execute advance adjustment:", error);
    return NextResponse.json(
      { error: "Failed to execute advance adjustment" },
      { status: 500 }
    );
  }
}
