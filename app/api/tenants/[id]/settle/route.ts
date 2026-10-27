import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { computeAdvanceBalance } from "@/lib/advance";
import { calculateSettlement } from "@/lib/settlement";
import { getEffectivePolicy } from "@/lib/policy";
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
        advanceTransactions: true,
        bills: {
          where: {
            status: { in: ["DUE", "PARTIAL"] },
          },
          include: {
            billItems: true,
          },
          orderBy: [{ year: "asc" }, { month: "asc" }],
        },
      },
    });

    if (!tenant) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }

    if (tenant.status === "SETTLED" || tenant.status === "ARCHIVED") {
      return NextResponse.json(
        { error: "Tenant has already been settled and vacated" },
        { status: 400 }
      );
    }

    // Backfill advance if needed
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

    const advanceBalance = computeAdvanceBalance(transactions);

    // Resolve policy
    const policyResult = await getEffectivePolicy({
      tenantId: tenant.id,
      marketId: tenant.shop.marketId,
    });

    // Unpaid bills with ages
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;

    const unpaidBills = tenant.bills.map((b) => {
      const monthAge = (currentYear - b.year) * 12 + (currentMonth - b.month);
      return {
        id: b.id,
        month: b.month,
        year: b.year,
        rentAmount: b.rentAmount,
        totalAmount: b.totalAmount,
        paidAmount: b.paidAmount,
        dueAmount: b.dueAmount,
        status: b.status,
        ageInMonths: Math.max(0, monthAge),
        billItems: b.billItems.map((bi) => ({
          description: bi.description,
          amount: bi.amount,
        })),
      };
    });

    const unpaidBillsTotal = unpaidBills.reduce((acc, b) => acc + b.dueAmount, 0);

    // Default deductions from policy
    const defaultDeductions = policyResult.data.allowedDeductions.map((d, index) => ({
      id: `ded-${index}`,
      type: d.type,
      label_en: d.label_en,
      label_bn: d.label_bn,
      amount: d.defaultAmount || 0,
      note: "",
    }));

    // Initial preview
    const preview = calculateSettlement({
      advanceBalance,
      unpaidBillsTotal,
      deductions: defaultDeductions,
    });

    return NextResponse.json({
      tenant: {
        id: tenant.id,
        name: tenant.name,
        phone: tenant.phone,
        nid: tenant.nid,
        startDate: tenant.startDate,
        rentAmount: tenant.rentAmount,
        status: tenant.status,
      },
      shop: {
        id: tenant.shop.id,
        shopNumber: tenant.shop.shopNumber,
        floor: tenant.shop.floor,
        size: tenant.shop.size,
        marketId: tenant.shop.marketId,
        marketName: tenant.shop.market.name,
      },
      policyVersionId: policyResult.versionId,
      policyVersionNumber: policyResult.versionNumber,
      advanceBalance,
      unpaidBills,
      unpaidBillsTotal,
      defaultDeductions,
      preview,
    });
  } catch (error) {
    console.error("Failed to load settlement preview:", error);
    return NextResponse.json(
      { error: "Failed to load settlement preview" },
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
        { error: "Only administrators can confirm final tenant settlements" },
        { status: 403 }
      );
    }

    const { id: tenantId } = await params;
    const body = await req.json();
    const { deductions, notes, settlementDate } = body;

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

    if (tenant.status === "SETTLED" || tenant.status === "ARCHIVED") {
      return NextResponse.json(
        { error: "Tenant has already been settled" },
        { status: 400 }
      );
    }

    // Compute advance balance
    const advanceBalance = computeAdvanceBalance(tenant.advanceTransactions);
    const unpaidBillsTotal = tenant.bills.reduce((sum, b) => sum + b.dueAmount, 0);

    // Calculate final numbers
    const calc = calculateSettlement({
      advanceBalance,
      unpaidBillsTotal,
      deductions: deductions || [],
    });

    const policyResult = await getEffectivePolicy({
      tenantId: tenant.id,
      marketId: tenant.shop.marketId,
    });

    // Execute settlement in a single atomic database transaction
    const finalSettlement = await prisma.$transaction(async (tx) => {
      // 1. Create Settlement master record
      const settlement = await tx.settlement.create({
        data: {
          tenantId: tenant.id,
          shopId: tenant.shopId,
          status: "CONFIRMED",
          totalDue: calc.totalDue,
          advanceBalance: calc.advanceBalance,
          totalDeductions: calc.totalDeductions,
          refundAmount: calc.refundAmount,
          unrecoveredAmount: calc.unrecoveredAmount,
          deductionsJson: JSON.stringify(deductions || []),
          policyVersionId: policyResult.versionId,
          notes: notes?.trim() || null,
          settledAt: settlementDate ? new Date(settlementDate) : new Date(),
          confirmedBy: session.name,
        },
      });

      // 2. Clear / Close unpaid bills
      let remainingAdvanceForBills = calc.advanceAllocatedToDues;
      for (const bill of tenant.bills) {
        if (remainingAdvanceForBills > 0) {
          const pay = Math.min(remainingAdvanceForBills, bill.dueAmount);
          remainingAdvanceForBills -= pay;

          await tx.payment.create({
            data: {
              billId: bill.id,
              amount: pay,
              method: "ADVANCE_ADJUSTMENT",
              reference: `SETTLE-${settlement.id.slice(-6)}`,
              receivedBy: session.name,
              note: `Settled from advance upon vacating shop`,
            },
          });

          await tx.bill.update({
            where: { id: bill.id },
            data: {
              paidAmount: { increment: pay },
              dueAmount: { decrement: pay },
              status: "SETTLED_FROM_ADVANCE",
            },
          });
        } else {
          // Uncovered bills marked as SETTLED_FROM_ADVANCE (with remaining dueAmount tracked)
          await tx.bill.update({
            where: { id: bill.id },
            data: {
              status: "SETTLED_FROM_ADVANCE",
            },
          });
        }
      }

      // 3. Create Advance Transactions and Deposit Transactions
      // 3a. Dues adjusted from advance
      if (calc.advanceAllocatedToDues > 0) {
        await tx.advanceTransaction.create({
          data: {
            tenantId: tenant.id,
            type: "ADJUSTED_TO_DUE",
            amount: calc.advanceAllocatedToDues,
            relatedSettlementId: settlement.id,
            reason: `Final settlement: adjusted against unpaid rent dues`,
            createdBy: session.name,
          },
        });

        await tx.depositTransaction.create({
          data: {
            tenantId: tenant.id,
            marketId: tenant.shop.marketId,
            shopId: tenant.shop.id,
            type: "ADJUSTED_TO_DUE",
            amount: calc.advanceAllocatedToDues,
            transactionDate: settlementDate ? new Date(settlementDate) : new Date(),
            method: "CASH",
            relatedSettlementId: settlement.id,
            reason: `চূড়ান্ত হিসাব নিষ্পত্তি: বকেয়া ভাড়ায় জামানত সমন্বয়`,
            enteredById: session.id,
            counterpartyUserId: session.id,
            status: "POSTED",
          },
        });
      }

      // 3b. Deductions from advance
      if (deductions && Array.isArray(deductions)) {
        for (const item of deductions) {
          const itemAmount = Math.max(0, Math.round(Number(item.amount) || 0));
          if (itemAmount > 0) {
            const deductionReason = `${item.label_bn || item.label_en}: ${item.note || ""}`.trim();
            await tx.advanceTransaction.create({
              data: {
                tenantId: tenant.id,
                type: "DEDUCTION",
                amount: itemAmount,
                relatedSettlementId: settlement.id,
                reason: deductionReason,
                createdBy: session.name,
              },
            });

            await tx.depositTransaction.create({
              data: {
                tenantId: tenant.id,
                marketId: tenant.shop.marketId,
                shopId: tenant.shop.id,
                type: "DEDUCTION",
                amount: itemAmount,
                transactionDate: settlementDate ? new Date(settlementDate) : new Date(),
                method: "CASH",
                relatedSettlementId: settlement.id,
                reason: `চূড়ান্ত হিসাব নিষ্পত্তি কর্তন (${deductionReason})`,
                enteredById: session.id,
                counterpartyUserId: session.id,
                status: "POSTED",
              },
            });
          }
        }
      }

      // 3c. Refund to tenant if positive
      if (calc.refundAmount > 0) {
        await tx.advanceTransaction.create({
          data: {
            tenantId: tenant.id,
            type: "REFUND",
            amount: calc.refundAmount,
            relatedSettlementId: settlement.id,
            reason: `Final settlement: refund balance returned to tenant`,
            createdBy: session.name,
          },
        });

        await tx.depositTransaction.create({
          data: {
            tenantId: tenant.id,
            marketId: tenant.shop.marketId,
            shopId: tenant.shop.id,
            type: "REFUND",
            amount: calc.refundAmount,
            transactionDate: settlementDate ? new Date(settlementDate) : new Date(),
            method: "CASH",
            relatedSettlementId: settlement.id,
            reason: `চূড়ান্ত হিসাব নিষ্পত্তি: অবশিষ্ট জামানত ফেরত`,
            enteredById: session.id,
            counterpartyUserId: session.id,
            approvedById: session.id,
            approvedAt: new Date(),
            status: "POSTED",
          },
        });
      }

      // 4. Update Shop to VACANT
      await tx.shop.update({
        where: { id: tenant.shopId },
        data: { status: "VACANT" },
      });

      // 5. Update Tenant to SETTLED and inactive
      await tx.tenant.update({
        where: { id: tenant.id },
        data: {
          status: "SETTLED",
          isActive: false,
          endDate: settlementDate ? new Date(settlementDate) : new Date(),
        },
      });

      // 6. Write Audit Log
      await logAudit({
        userId: session.id,
        userName: session.name,
        action: "SETTLEMENT_CONFIRMED",
        entityType: "Settlement",
        entityId: settlement.id,
        details: {
          tenantId: tenant.id,
          tenantName: tenant.name,
          shopNumber: tenant.shop.shopNumber,
          totalDue: calc.totalDue,
          advanceBalance: calc.advanceBalance,
          totalDeductions: calc.totalDeductions,
          refundAmount: calc.refundAmount,
          unrecoveredAmount: calc.unrecoveredAmount,
          notes,
        },
        tx,
      });

      return settlement;
    });

    return NextResponse.json({
      success: true,
      settlement: finalSettlement,
      calculations: calc,
    });
  } catch (error) {
    console.error("Failed to confirm settlement:", error);
    return NextResponse.json(
      { error: "Failed to confirm settlement" },
      { status: 500 }
    );
  }
}
