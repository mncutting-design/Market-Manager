import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { logAudit } from "@/lib/audit";

export async function POST(req: Request) {
  try {
    const session = await getSession();
    const isAdmin = session?.role === "ADMIN";

    // Strictly restricted to Admin only (Requirement 4)
    if (!isAdmin) {
      return NextResponse.json(
        { error: "শুধুমাত্র অ্যাডমিনের জন্য এই সুবিধা প্রযোজ্য (Only administrators can undo audit logs)" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { logId } = body;

    if (!logId) {
      return NextResponse.json({ error: "Log ID is required" }, { status: 400 });
    }

    const log = await prisma.auditLog.findUnique({
      where: { id: logId },
    });

    if (!log) {
      return NextResponse.json({ error: "Audit log entry not found" }, { status: 404 });
    }

    let details: any = {};
    try {
      details = JSON.parse(log.detailsJson || "{}");
    } catch {
      details = {};
    }

    if (details.isUndone) {
      return NextResponse.json(
        { error: "এই রেকর্ডটি ইতোমধ্যে পূর্বাবস্থায় ফিরিয়ে নেওয়া হয়েছে (Already undone)" },
        { status: 400 }
      );
    }

    // Perform atomic rollback based on action and entityType
    await prisma.$transaction(async (tx) => {
      const action = log.action;

      if (action === "BILLS_GENERATED" && Array.isArray(details.billIds) && details.billIds.length > 0) {
        // Check if any payment was recorded for these bills
        const paidPayment = await tx.payment.findFirst({
          where: { billId: { in: details.billIds } },
          select: { id: true, billId: true },
        });

        if (paidPayment) {
          throw new Error("এই ব্যাচের বিলে ইতোমধ্যে ভাড়া আদায় রেকর্ড করা হয়েছে, সম্পূর্ণ বিল ব্যাচ আনডো করা সম্ভব নয়।");
        }

        // Delete all bill items and bills in this batch
        await tx.billItem.deleteMany({
          where: { billId: { in: details.billIds } },
        });
        await tx.bill.deleteMany({
          where: { id: { in: details.billIds } },
        });
      } else if (action === "PAYMENT_COLLECTED" && details.paymentId) {
        const pmt = await tx.payment.findUnique({
          where: { id: details.paymentId },
          include: { bill: true },
        });
        if (pmt) {
          await tx.payment.delete({ where: { id: pmt.id } });
          const remaining = await tx.payment.findMany({ where: { billId: pmt.billId } });
          const newPaid = remaining.reduce((acc, p) => acc + p.amount, 0);
          const newDue = Math.max(0, pmt.bill.totalAmount - newPaid);
          const newStatus = newDue <= 0 ? "PAID" : newPaid > 0 ? "PARTIAL" : "DUE";
          await tx.bill.update({
            where: { id: pmt.billId },
            data: {
              paidAmount: newPaid,
              dueAmount: newDue,
              status: newStatus,
            },
          });
        }
      } else if (action === "EXPENSE_CREATED" && details.expenseId) {
        await tx.expense.delete({ where: { id: details.expenseId } }).catch(() => null);
      } else if (action === "BILL_CHARGE_ADDED" && details.itemId) {
        // Remove the added billItem and recalculate bill totals
        try {
          await tx.billItem.delete({ where: { id: details.itemId } });
        } catch (e) {
          console.warn("Item already deleted or not found:", details.itemId);
        }

        const bill = await tx.bill.findUnique({ where: { id: log.entityId } });
        if (bill) {
          const items = await tx.billItem.findMany({ where: { billId: bill.id } });
          const itemsTotal = items.reduce((acc, it) => acc + it.amount, 0);
          const newTotal = bill.rentAmount + itemsTotal;
          const newDue = Math.max(0, newTotal - bill.paidAmount);
          const newStatus = newDue <= 0 ? "PAID" : bill.paidAmount > 0 ? "PARTIAL" : "DUE";
          await tx.bill.update({
            where: { id: bill.id },
            data: {
              totalAmount: newTotal,
              dueAmount: newDue,
              status: newStatus,
            },
          });
        }
      } else if (action === "BILL_CHARGE_EDITED" && details.itemId && details.previousData) {
        // Restore previous item description and amount
        await tx.billItem.update({
          where: { id: details.itemId },
          data: {
            description: details.previousData.description,
            amount: details.previousData.amount,
          },
        });

        const bill = await tx.bill.findUnique({ where: { id: log.entityId } });
        if (bill) {
          const items = await tx.billItem.findMany({ where: { billId: bill.id } });
          const itemsTotal = items.reduce((acc, it) => acc + it.amount, 0);
          const newTotal = bill.rentAmount + itemsTotal;
          const newDue = Math.max(0, newTotal - bill.paidAmount);
          const newStatus = newDue <= 0 ? "PAID" : bill.paidAmount > 0 ? "PARTIAL" : "DUE";
          await tx.bill.update({
            where: { id: bill.id },
            data: {
              totalAmount: newTotal,
              dueAmount: newDue,
              status: newStatus,
            },
          });
        }
      } else if (action === "BILL_CHARGE_DELETED" && details.deletedItem) {
        // Re-create the deleted item
        await tx.billItem.create({
          data: {
            billId: log.entityId,
            description: details.deletedItem.description,
            amount: details.deletedItem.amount,
          },
        });

        const bill = await tx.bill.findUnique({ where: { id: log.entityId } });
        if (bill) {
          const items = await tx.billItem.findMany({ where: { billId: bill.id } });
          const itemsTotal = items.reduce((acc, it) => acc + it.amount, 0);
          const newTotal = bill.rentAmount + itemsTotal;
          const newDue = Math.max(0, newTotal - bill.paidAmount);
          const newStatus = newDue <= 0 ? "PAID" : bill.paidAmount > 0 ? "PARTIAL" : "DUE";
          await tx.bill.update({
            where: { id: bill.id },
            data: {
              totalAmount: newTotal,
              dueAmount: newDue,
              status: newStatus,
            },
          });
        }
      } else if (action === "ADVANCE_ADJUSTMENT" || action === "ADJUST_ADVANCE") {
        // Revert bills affected
        if (Array.isArray(details.billsAffected)) {
          for (const bAlloc of details.billsAffected) {
            const bill = await tx.bill.findUnique({ where: { id: bAlloc.billId } });
            if (bill) {
              const newPaid = Math.max(0, bill.paidAmount - (bAlloc.paid || 0));
              const newDue = Math.max(0, bill.totalAmount - newPaid);
              const newStatus = newDue <= 0 ? "PAID" : newPaid > 0 ? "PARTIAL" : "DUE";
              await tx.bill.update({
                where: { id: bill.id },
                data: {
                  paidAmount: newPaid,
                  dueAmount: newDue,
                  status: newStatus,
                },
              });
            }
          }
        }

        // Delete the advance transaction of type ADJUSTED_TO_DUE
        const advTx = await tx.advanceTransaction.findFirst({
          where: {
            tenantId: log.entityId,
            type: "ADJUSTED_TO_DUE",
            amount: details.adjustedAmount || details.amount,
          },
          orderBy: { createdAt: "desc" },
        });

        if (advTx) {
          await tx.advanceTransaction.delete({ where: { id: advTx.id } });
        }

        // Delete corresponding payments created with method ADVANCE_ADJUSTMENT
        if (Array.isArray(details.billsAffected)) {
          const billIds = details.billsAffected.map((b: any) => b.billId);
          await tx.payment.deleteMany({
            where: {
              billId: { in: billIds },
              method: "ADVANCE_ADJUSTMENT",
            },
          });
        }
      } else if (
        action === "ADVANCE_DEPOSIT" ||
        action === "RECORD_ADVANCE_DEPOSIT" ||
        action === "ADVANCE_TOPUP" ||
        action === "RECORD_ADVANCE_TOPUP"
      ) {
        const depositAmt = details.amount || 0;
        if (depositAmt > 0) {
          await tx.tenant.update({
            where: { id: log.entityId },
            data: {
              advanceDeposit: { decrement: depositAmt },
            },
          });

          const advTx = await tx.advanceTransaction.findFirst({
            where: {
              tenantId: log.entityId,
              amount: depositAmt,
            },
            orderBy: { createdAt: "desc" },
          });

          if (advTx) {
            await tx.advanceTransaction.delete({ where: { id: advTx.id } });
          }
        }
      } else if (action === "SHOP_CREATED") {
        await tx.shop.update({
          where: { id: log.entityId },
          data: { isActive: false },
        });
      } else if (action === "SHOP_UPDATED" && details.previousData) {
        await tx.shop.update({
          where: { id: log.entityId },
          data: {
            ...(details.previousData.shopNumber && { shopNumber: details.previousData.shopNumber }),
            ...(details.previousData.floor && { floor: details.previousData.floor }),
            ...(details.previousData.size !== undefined && { size: details.previousData.size }),
            ...(details.previousData.defaultRent !== undefined && {
              defaultRent: details.previousData.defaultRent,
            }),
          },
        });
      } else if (action === "POLICY_CREATED" || action === "CREATE_POLICY_VERSION") {
        if (details.policyVersionId) {
          await tx.policyVersion.delete({ where: { id: details.policyVersionId } }).catch(() => null);
        }
      }

      // Mark the original audit log as undone
      const updatedDetails = {
        ...details,
        isUndone: true,
        undoneAt: new Date().toISOString(),
        undoneBy: session?.name || "Admin",
      };

      await tx.auditLog.update({
        where: { id: log.id },
        data: {
          detailsJson: JSON.stringify(updatedDetails),
        },
      });

      // Append an audit log entry for the UNDO action
      await logAudit({
        userId: session?.id,
        userName: session?.name || "Admin",
        action: `UNDO_${log.action}`,
        entityType: log.entityType,
        entityId: log.entityId,
        details: {
          originalLogId: log.id,
          originalAction: log.action,
          undoneBy: session?.name || "Admin",
          timestamp: new Date().toISOString(),
        },
        tx,
      });
    });

    return NextResponse.json({
      success: true,
      message: "অডিট রেকর্ডটি সফলভাবে পূর্বাবস্থায় ফিরিয়ে আনা হয়েছে (Action undone successfully)",
    });
  } catch (error: any) {
    console.error("Failed to undo audit log:", error);
    return NextResponse.json(
      { error: error?.message || "পূর্বাবস্থায় ফেরানো ব্যর্থ হয়েছে (Failed to undo audit log)" },
      { status: 500 }
    );
  }
}
