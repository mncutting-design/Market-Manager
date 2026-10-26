import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { logAudit } from "@/lib/audit";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status") || "ALL";
    const entityType = searchParams.get("entityType");

    const where: any = {};
    if (status !== "ALL") {
      where.status = status;
    }
    if (entityType) {
      where.entityType = entityType;
    }

    const [requests, pendingCount, topUpRequests, pendingTopUpCount] = await Promise.all([
      prisma.changeRequest.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: 100,
      }),
      prisma.changeRequest.count({
        where: { status: "PENDING" },
      }),
      prisma.advanceTopUpRequest.findMany({
        where: status !== "ALL" ? { status } : {},
        include: { tenant: { include: { shop: { include: { market: true } } } } },
        orderBy: { createdAt: "desc" },
        take: 50,
      }),
      prisma.advanceTopUpRequest.count({
        where: { status: "PENDING" },
      }),
    ]);

    const parsedCR = requests.map((r) => ({
      ...r,
      isTopUpRequest: false,
      currentDataParsed: (() => {
        try {
          return JSON.parse(r.currentData || "{}");
        } catch {
          return {};
        }
      })(),
      proposedDataParsed: (() => {
        try {
          return JSON.parse(r.proposedData || "{}");
        } catch {
          return {};
        }
      })(),
    }));

    const parsedTopUp = topUpRequests.map((tu) => ({
      id: tu.id,
      isTopUpRequest: true,
      entityType: "ADVANCE_TOPUP",
      entityId: tu.tenantId,
      entityTitle: `${tu.tenant.name} (${tu.tenant.shop.shopNumber}) - জামানত টপ-আপ`,
      actionType: "TOPUP",
      status: tu.status,
      currentData: JSON.stringify({ currentAdvance: tu.tenant.advanceDeposit }),
      proposedData: JSON.stringify({
        topupAmount: tu.amount,
        method: tu.method,
        note: tu.note,
      }),
      currentDataParsed: { currentAdvance: tu.tenant.advanceDeposit },
      proposedDataParsed: {
        topupAmount: tu.amount,
        method: tu.method,
        note: tu.note,
      },
      requestedBy: tu.requestedBy,
      requesterRole: "COLLECTOR",
      createdAt: tu.createdAt,
      reviewedBy: tu.decidedBy,
      reviewNote: tu.decisionNote,
      reviewedAt: tu.decidedAt,
    }));

    const combined = [...parsedCR, ...parsedTopUp].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    return NextResponse.json({
      requests: combined,
      pendingCount: pendingCount + pendingTopUpCount,
    });
  } catch (error) {
    console.error("Failed to fetch change requests:", error);
    return NextResponse.json(
      { error: "Failed to fetch change requests" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const session = await getSession();
    const body = await req.json();
    const {
      entityType,
      entityId,
      entityTitle,
      actionType,
      currentData,
      proposedData,
      requestedBy,
    } = body;

    if (!entityType || !entityId || !actionType) {
      return NextResponse.json(
        { error: "Missing required fields: entityType, entityId, actionType" },
        { status: 400 }
      );
    }

    const requester = requestedBy || session?.name || "Staff / Manager";
    const requesterRole = session?.role || "MANAGER";

    // REQUIREMENT: OPERATOR ONLY OPERATE TASK NOT ANY EDIT REQUEST
    if (requesterRole === "OPERATOR" || requesterRole === "VIEWER") {
      return NextResponse.json(
        { error: "অপারেটর কেবল নির্ধারিত কাজ সম্পাদন করতে পারবেন, কোনো পরিবর্তন বা এডিট রিকোয়েস্ট করতে পারবেন না।" },
        { status: 403 }
      );
    }

    const changeRequest = await prisma.changeRequest.create({
      data: {
        entityType,
        entityId,
        entityTitle: entityTitle || `${entityType} ${entityId}`,
        actionType,
        status: "PENDING",
        currentData: typeof currentData === "string" ? currentData : JSON.stringify(currentData || {}),
        proposedData: typeof proposedData === "string" ? proposedData : JSON.stringify(proposedData || {}),
        requestedBy: requester,
        requesterRole,
      },
    });

    await logAudit({
      userId: session?.id,
      userName: requester,
      action: `CHANGE_REQUEST_CREATED_${actionType}`,
      entityType: "ChangeRequest",
      entityId: changeRequest.id,
      details: {
        targetEntity: entityType,
        targetId: entityId,
        actionType,
      },
    });

    return NextResponse.json({
      success: true,
      changeRequest,
      requiresApproval: true,
    }, { status: 201 });
  } catch (error) {
    console.error("Failed to submit change request:", error);
    return NextResponse.json(
      { error: "Failed to submit change request" },
      { status: 500 }
    );
  }
}

export async function PUT(req: Request) {
  try {
    const session = await getSession();
    if (!session || session.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Only administrators can approve or reject change requests" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { id, status, reviewNote } = body;

    if (!id || (status !== "APPROVED" && status !== "REJECTED")) {
      return NextResponse.json(
        { error: "Valid ID and status ('APPROVED' or 'REJECTED') are required" },
        { status: 400 }
      );
    }

    const cr = await prisma.changeRequest.findUnique({
      where: { id },
    });

    if (!cr) {
      const topUpReq = await prisma.advanceTopUpRequest.findUnique({
        where: { id },
        include: { tenant: { include: { shop: true } } },
      });

      if (!topUpReq) {
        return NextResponse.json({ error: "Request not found" }, { status: 404 });
      }

      if (topUpReq.status !== "PENDING") {
        return NextResponse.json({ error: `This request is already ${topUpReq.status}` }, { status: 400 });
      }

      if (status === "REJECTED") {
        const updated = await prisma.$transaction(async (tx) => {
          const res = await tx.advanceTopUpRequest.update({
            where: { id },
            data: {
              status: "REJECTED",
              decidedBy: session.name || "Admin",
              decidedAt: new Date(),
              decisionNote: reviewNote?.trim() || null,
            },
          });
          if (topUpReq.requestedById) {
            await tx.notification.create({
              data: {
                userId: topUpReq.requestedById,
                title: "জামানত টপ-আপ আবেদন প্রত্যাখ্যাত",
                message: `দোকান ${topUpReq.tenant.shop.shopNumber}-এর ${topUpReq.tenant.name}-এর জামানত টপ-আপ আবেদনটি প্রত্যাখ্যাত হয়েছে।`,
                type: "WARNING",
                link: "/dashboard",
              },
            });
          }
          await logAudit({
            userId: session.id,
            userName: session.name || "Admin",
            action: "ADVANCE_TOPUP_REJECTED",
            entityType: "AdvanceTopUpRequest",
            entityId: id,
            details: { reason: reviewNote },
            tx,
          });
          return res;
        });
        return NextResponse.json({ success: true, request: updated });
      }

      const updated = await prisma.$transaction(async (tx) => {
        const res = await tx.advanceTopUpRequest.update({
          where: { id },
          data: {
            status: "APPROVED",
            decidedBy: session.name || "Admin",
            decidedAt: new Date(),
            decisionNote: reviewNote?.trim() || null,
          },
        });
        await tx.advanceTransaction.create({
          data: {
            tenantId: topUpReq.tenantId,
            type: "TOPUP",
            amount: topUpReq.amount,
            reason: topUpReq.note || `Approved advance top-up requested by ${topUpReq.requestedBy}`,
            createdBy: "Admin",
            createdByName: session.name || "Admin",
            enteredById: session.id,
          },
        });
        await tx.tenant.update({
          where: { id: topUpReq.tenantId },
          data: { advanceDeposit: { increment: topUpReq.amount } },
        });
        if (topUpReq.requestedById) {
          await tx.notification.create({
            data: {
              userId: topUpReq.requestedById,
              title: "জামানত টপ-আপ আবেদন অনুমোদিত",
              message: `দোকান ${topUpReq.tenant.shop.shopNumber}-এর ${topUpReq.tenant.name}-এর জন্য ৳${(topUpReq.amount / 100).toLocaleString()} জামানত টপ-আপ অনুমোদিত হয়েছে।`,
              type: "SUCCESS",
              link: "/dashboard",
            },
          });
        }
        await logAudit({
          userId: session.id,
          userName: session.name || "Admin",
          action: "ADVANCE_TOPUP_APPROVED",
          entityType: "AdvanceTopUpRequest",
          entityId: id,
          details: { amount: topUpReq.amount },
          tx,
        });
        return res;
      });
      return NextResponse.json({ success: true, request: updated });
    }

    if (cr.status !== "PENDING") {
      return NextResponse.json(
        { error: `This request is already ${cr.status}` },
        { status: 400 }
      );
    }

    if (status === "REJECTED") {
      const updated = await prisma.changeRequest.update({
        where: { id },
        data: {
          status: "REJECTED",
          reviewedBy: session.name || "Admin",
          reviewNote: reviewNote?.trim() || null,
          reviewedAt: new Date(),
        },
      });

      await logAudit({
        userId: session.id,
        userName: session.name || "Admin",
        action: `CHANGE_REQUEST_REJECTED`,
        entityType: cr.entityType,
        entityId: cr.entityId,
        details: { changeRequestId: cr.id, reviewNote },
      });

      return NextResponse.json({ success: true, changeRequest: updated });
    }

    // Status is APPROVED: Apply changes atomically
    const proposed = JSON.parse(cr.proposedData || "{}");

    await prisma.$transaction(async (tx) => {
      if (cr.entityType === "MARKET") {
        if (cr.actionType === "DELETE") {
          await tx.market.update({
            where: { id: cr.entityId },
            data: { isActive: false },
          });
        } else {
          // EDIT
          await tx.market.update({
            where: { id: cr.entityId },
            data: {
              ...(proposed.name !== undefined && { name: proposed.name.trim() }),
              ...(proposed.address !== undefined && { address: proposed.address?.trim() || null }),
              ...(proposed.notes !== undefined && { notes: proposed.notes?.trim() || null }),
              ...(proposed.totalFloors !== undefined && { totalFloors: Number(proposed.totalFloors) }),
              ...(proposed.isActive !== undefined && { isActive: proposed.isActive }),
            },
          });
        }
      } else if (cr.entityType === "SHOP") {
        if (cr.actionType === "DELETE") {
          await tx.shop.update({
            where: { id: cr.entityId },
            data: { isActive: false },
          });
        } else if (cr.actionType === "RENT_REVISION") {
          const newRentPaisa = Math.round(Number(proposed.newRent || proposed.rentAmount));
          const shop = await tx.shop.findUnique({
            where: { id: cr.entityId },
            include: { tenants: { where: { isActive: true } } },
          });

          if (shop) {
            const activeTenant = shop.tenants[0];
            await tx.rentHistory.create({
              data: {
                shopId: shop.id,
                tenantId: activeTenant ? activeTenant.id : null,
                rentAmount: newRentPaisa,
                effectiveFrom: proposed.effectiveFrom ? new Date(proposed.effectiveFrom) : new Date(),
                note: proposed.note?.trim() || `Approved rent revision (CR: ${cr.id})`,
              },
            });

            if (activeTenant) {
              await tx.tenant.update({
                where: { id: activeTenant.id },
                data: { rentAmount: newRentPaisa },
              });
            }

            await tx.shop.update({
              where: { id: shop.id },
              data: { defaultRent: newRentPaisa },
            });
          }
        } else {
          // EDIT SHOP DETAILS
          await tx.shop.update({
            where: { id: cr.entityId },
            data: {
              ...(proposed.shopNumber && { shopNumber: proposed.shopNumber.trim() }),
              ...(proposed.floor && { floor: proposed.floor.trim() }),
              ...(proposed.size !== undefined && { size: proposed.size?.trim() || null }),
              ...(proposed.defaultRent !== undefined && {
                defaultRent: Math.round(Number(proposed.defaultRent)),
              }),
            },
          });
        }
      } else if (cr.entityType === "TENANT") {
        const tenantBefore = await tx.tenant.findUnique({
          where: { id: cr.entityId },
          select: { advanceDeposit: true },
        });

        await tx.tenant.update({
          where: { id: cr.entityId },
          data: {
            ...(proposed.name && { name: proposed.name.trim() }),
            ...(proposed.phone && { phone: proposed.phone.trim() }),
            ...(proposed.nid !== undefined && { nid: proposed.nid?.trim() || null }),
            ...(proposed.rentAmount !== undefined && { rentAmount: Math.round(Number(proposed.rentAmount)) }),
            ...(proposed.advanceDeposit !== undefined && { advanceDeposit: Math.round(Number(proposed.advanceDeposit)) }),
          },
        });

        if (proposed.advanceDeposit !== undefined && tenantBefore) {
          const newAdvance = Math.round(Number(proposed.advanceDeposit));
          const oldAdvance = tenantBefore.advanceDeposit;
          const delta = newAdvance - oldAdvance;
          if (delta !== 0) {
            await tx.advanceTransaction.create({
              data: {
                tenantId: cr.entityId,
                type: delta > 0 ? "TOPUP" : "DEDUCTION",
                amount: Math.abs(delta),
                reason: proposed.note?.trim() || (delta > 0
                  ? `Admin approved jamanot edit: +৳${(delta / 100).toLocaleString()}`
                  : `Admin approved jamanot deduction: -৳${(Math.abs(delta) / 100).toLocaleString()}`),
                createdBy: session.name || "Admin",
                createdByName: session.name || "Admin",
                enteredById: session.id,
              },
            });
          }
        }
      } else if (cr.entityType === "BILL") {
        if (cr.actionType === "DELETE_ITEM" && proposed.itemId) {
          try {
            await tx.billItem.delete({ where: { id: proposed.itemId } });
          } catch (e) {
            console.warn("Item already deleted or not found:", proposed.itemId);
          }
        } else if (cr.actionType === "ADD_ITEM") {
          await tx.billItem.create({
            data: {
              billId: cr.entityId,
              description: proposed.description?.trim() || "ম্যানুয়াল চার্জ",
              amount: Math.round(Number(proposed.amount)),
            },
          });
        } else {
          await tx.bill.update({
            where: { id: cr.entityId },
            data: {
              ...(proposed.rentAmount !== undefined && { rentAmount: Math.round(Number(proposed.rentAmount)) }),
              ...(proposed.totalAmount !== undefined && { totalAmount: Math.round(Number(proposed.totalAmount)) }),
              ...(proposed.dueAmount !== undefined && { dueAmount: Math.round(Number(proposed.dueAmount)) }),
              ...(proposed.status !== undefined && { status: proposed.status }),
            },
          });
        }

        // Always keep bill totalAmount and dueAmount in sync after modifying items
        const b = await tx.bill.findUnique({ where: { id: cr.entityId } });
        if (b) {
          const items = await tx.billItem.findMany({ where: { billId: cr.entityId } });
          const itemsSum = items.reduce((sum, item) => sum + item.amount, 0);
          const newTotal = b.rentAmount + itemsSum;
          const newDue = Math.max(0, newTotal - b.paidAmount);
          const newStatus = newDue <= 0 ? "PAID" : b.paidAmount > 0 ? "PARTIAL" : "DUE";
          await tx.bill.update({
            where: { id: cr.entityId },
            data: {
              totalAmount: newTotal,
              dueAmount: newDue,
              status: newStatus,
            },
          });
        }
      } else if (cr.entityType === "TRANSACTION" || cr.entityType === "PAYMENT") {
        const pmt = await tx.payment.findUnique({
          where: { id: cr.entityId },
          include: { bill: true },
        });

        if (pmt) {
          if (cr.actionType === "DELETE") {
            await tx.payment.delete({ where: { id: cr.entityId } });
            const remainingPayments = await tx.payment.findMany({ where: { billId: pmt.billId } });
            const newPaid = remainingPayments.reduce((acc, p) => acc + p.amount, 0);
            const newDue = Math.max(0, pmt.bill.totalAmount - newPaid);
            await tx.bill.update({
              where: { id: pmt.billId },
              data: {
                paidAmount: newPaid,
                dueAmount: newDue,
                status: newDue <= 0 ? "PAID" : newPaid > 0 ? "PARTIAL" : "DUE",
              },
            });
          } else {
            const newAmt = proposed.amount !== undefined ? Math.round(Number(proposed.amount)) : pmt.amount;
            await tx.payment.update({
              where: { id: cr.entityId },
              data: {
                amount: newAmt,
                ...(proposed.method && { method: proposed.method }),
                ...(proposed.reference !== undefined && { reference: proposed.reference?.trim() || null }),
                ...(proposed.transactionRef !== undefined && { transactionRef: proposed.transactionRef?.trim() || null }),
                ...(proposed.note !== undefined && { note: proposed.note?.trim() || null }),
                ...(proposed.paidOn && { paidOn: new Date(proposed.paidOn) }),
                ...(proposed.collectorId !== undefined && { collectorId: proposed.collectorId || null }),
                ...(proposed.receivedBy !== undefined && { receivedBy: proposed.receivedBy || null }),
              },
            });

            // Recalculate bill
            const remainingPayments = await tx.payment.findMany({ where: { billId: pmt.billId } });
            const recalculatedPaid = remainingPayments.reduce((acc, p) => (p.id === cr.entityId ? acc + newAmt : acc + p.amount), 0);
            const recalculatedDue = Math.max(0, pmt.bill.totalAmount - recalculatedPaid);
            await tx.bill.update({
              where: { id: pmt.billId },
              data: {
                paidAmount: recalculatedPaid,
                dueAmount: recalculatedDue,
                status: recalculatedDue <= 0 ? "PAID" : recalculatedPaid > 0 ? "PARTIAL" : "DUE",
              },
            });
          }
        }
      } else if (cr.entityType === "EXPENSE") {
        if (cr.actionType === "DELETE") {
          await tx.expense.delete({ where: { id: cr.entityId } });
        } else {
          await tx.expense.update({
            where: { id: cr.entityId },
            data: {
              ...(proposed.amount !== undefined && { amount: Math.round(Number(proposed.amount)) }),
              ...(proposed.categoryId && { categoryId: proposed.categoryId }),
              ...(proposed.marketId && { marketId: proposed.marketId }),
              ...(proposed.description !== undefined && { description: proposed.description?.trim() || null }),
              ...(proposed.paymentMethod && { paymentMethod: proposed.paymentMethod }),
              ...(proposed.date && { date: new Date(proposed.date) }),
              ...(proposed.attachmentUrl !== undefined && { attachmentUrl: proposed.attachmentUrl?.trim() || null }),
            },
          });
        }
      }

      // Mark ChangeRequest as APPROVED
      await tx.changeRequest.update({
        where: { id: cr.id },
        data: {
          status: "APPROVED",
          reviewedBy: session.name || "Admin",
          reviewNote: reviewNote?.trim() || null,
          reviewedAt: new Date(),
        },
      });
    });


    await logAudit({
      userId: session.id,
      userName: session.name || "Admin",
      action: `CHANGE_REQUEST_APPROVED_${cr.actionType}`,
      entityType: cr.entityType,
      entityId: cr.entityId,
      details: { changeRequestId: cr.id, proposed },
    });

    const finalCR = await prisma.changeRequest.findUnique({ where: { id } });
    return NextResponse.json({ success: true, changeRequest: finalCR });
  } catch (error) {
    console.error("Failed to approve change request:", error);
    return NextResponse.json(
      { error: "Failed to apply and approve change request" },
      { status: 500 }
    );
  }
}
