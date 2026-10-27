import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { computeDepositBalance, validateDepositDebit } from "@/lib/deposit-ledger";
import { allocateAdvanceToBillsFIFO } from "@/lib/settlement";
import { logAudit } from "@/lib/audit";

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.role !== "ADMIN" && session.role !== "MANAGER") {
      return NextResponse.json(
        { error: "Only administrators and managers can adjust deposit to dues" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { tenantId, amount, specificBillIds, reason } = body;

    if (!tenantId) {
      return NextResponse.json({ error: "Tenant ID is required" }, { status: 400 });
    }

    const adjustAmount = Math.round(Number(amount));
    if (!adjustAmount || adjustAmount <= 0) {
      return NextResponse.json(
        { error: "Adjustment amount must be a positive number greater than zero" },
        { status: 400 }
      );
    }

    const result = await prisma.$transaction(async (tx) => {
      const tenant = await tx.tenant.findUnique({
        where: { id: tenantId },
        include: {
          shop: { include: { market: true } },
          depositTransactions: { where: { status: "POSTED" } },
          bills: {
            where: {
              status: { in: ["DUE", "PARTIAL"] },
              dueAmount: { gt: 0 },
            },
            orderBy: [{ year: "asc" }, { month: "asc" }],
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

      const availableDeposit = computeDepositBalance(tenant.depositTransactions);
      const candidateBills = specificBillIds && specificBillIds.length > 0
        ? tenant.bills.filter((b) => specificBillIds.includes(b.id))
        : tenant.bills;

      const totalDue = candidateBills.reduce((sum, b) => sum + b.dueAmount, 0);

      const validation = validateDepositDebit(availableDeposit, adjustAmount, "ADJUSTED_TO_DUE");
      if (!validation.valid) {
        throw new Error(validation.error);
      }

      if (adjustAmount > totalDue) {
        throw new Error(
          `সমন্বয়ের পরিমাণ (৳${Math.round(adjustAmount / 100)}) সর্বমোট বকেয়া (৳${Math.round(totalDue / 100)}) থেকে বেশি হতে পারে না।`
        );
      }

      // Allocate across bills using FIFO
      const allocations = allocateAdvanceToBillsFIFO(candidateBills, adjustAmount);
      const updatedBills = [];
      const paymentIds: string[] = [];

      for (const alloc of allocations) {
        const payment = await tx.payment.create({
          data: {
            billId: alloc.billId,
            amount: alloc.amountToPay,
            method: "ADVANCE_ADJUSTMENT",
            reference: `DEP-ADJ-${new Date().getTime().toString().slice(-6)}`,
            receivedBy: session.name,
            enteredById: session.id,
            note: reason || "জামানত থেকে বকেয়া ভাড়া সমন্বয়",
          },
        });
        paymentIds.push(payment.id);

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

      // Create DepositTransaction
      const depositTx = await tx.depositTransaction.create({
        data: {
          tenantId: tenant.id,
          marketId: tenant.shop.marketId,
          shopId: tenant.shop.id,
          type: "ADJUSTED_TO_DUE",
          amount: adjustAmount,
          transactionDate: new Date(),
          method: "CASH",
          relatedBillId: allocations[0]?.billId || null,
          enteredById: session.id,
          counterpartyUserId: session.id,
          reason: reason?.trim() || `বকেয়া ভাড়ায় জামানত সমন্বয় (মোট ${allocations.length} টি বিল)`,
          status: "POSTED",
        },
      });

      // Backward compatibility updates
      await tx.tenant.update({
        where: { id: tenant.id },
        data: {
          advanceDeposit: { decrement: adjustAmount },
        },
      });

      await tx.advanceTransaction.create({
        data: {
          tenantId: tenant.id,
          type: "ADJUSTED_TO_DUE",
          amount: adjustAmount,
          relatedBillId: allocations[0]?.billId || null,
          reason: depositTx.reason,
          createdBy: session.name,
          enteredById: session.id,
          createdAt: new Date(),
        },
      });

      await logAudit({
        userId: session.id,
        userName: session.name,
        action: "ADVANCE_ADJUSTMENT",
        entityType: "DepositTransaction",
        entityId: depositTx.id,
        details: {
          tenantName: tenant.name,
          shopNumber: tenant.shop.shopNumber,
          adjustedAmount: adjustAmount,
          remainingDeposit: availableDeposit - adjustAmount,
          billsAffected: allocations.map((a) => ({
            billId: a.billId,
            paid: a.amountToPay,
            status: a.status,
          })),
        },
        tx,
      });

      return {
        depositTx,
        updatedBills,
        balanceBefore: availableDeposit,
        balanceAfter: availableDeposit - adjustAmount,
        allocations,
      };
    });

    return NextResponse.json({
      success: true,
      transaction: result.depositTx,
      balanceBefore: result.balanceBefore,
      balanceAfter: result.balanceAfter,
      updatedBillsCount: result.updatedBills.length,
      allocations: result.allocations,
    });
  } catch (error: any) {
    console.error("Failed to adjust deposit to due:", error);
    return NextResponse.json(
      { error: error.message || "Failed to adjust deposit to dues" },
      { status: 400 }
    );
  }
}
