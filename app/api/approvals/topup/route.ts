import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { logAudit } from "@/lib/audit";

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session || session.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Only administrators can approve or reject top-up requests" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { id, action, note } = body;

    if (!id || (action !== "APPROVE" && action !== "REJECT")) {
      return NextResponse.json(
        { error: "Valid ID and action ('APPROVE' or 'REJECT') are required" },
        { status: 400 }
      );
    }

    const topUpReq = await prisma.advanceTopUpRequest.findUnique({
      where: { id },
      include: {
        tenant: {
          include: {
            shop: {
              include: { market: true },
            },
          },
        },
      },
    });

    if (!topUpReq) {
      return NextResponse.json({ error: "Top-up request not found" }, { status: 404 });
    }

    if (topUpReq.status !== "PENDING") {
      return NextResponse.json(
        { error: `This request is already ${topUpReq.status}` },
        { status: 400 }
      );
    }

    if (action === "REJECT") {
      if (!note || note.trim() === "") {
        return NextResponse.json(
          { error: "বাতিলের কারণ (Rejection reason) উল্লেখ করা আবশ্যক" },
          { status: 400 }
        );
      }

      const updated = await prisma.$transaction(async (tx) => {
        const res = await tx.advanceTopUpRequest.update({
          where: { id },
          data: {
            status: "REJECTED",
            decidedBy: session.name || "Admin",
            decidedAt: new Date(),
            decisionNote: note.trim(),
          },
        });

        // Notify requester if known
        if (topUpReq.requestedById) {
          await tx.notification.create({
            data: {
              userId: topUpReq.requestedById,
              title: "জামানত টপ-আপ আবেদন প্রত্যাখ্যাত",
              message: `দোকান ${topUpReq.tenant.shop.shopNumber}-এর ${topUpReq.tenant.name}-এর জামানত টপ-আপ আবেদনটি প্রত্যাখ্যাত হয়েছে। কারণ: ${note.trim()}`,
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
          details: {
            tenantId: topUpReq.tenantId,
            tenantName: topUpReq.tenant.name,
            amount: topUpReq.amount,
            reason: note.trim(),
          },
          tx,
        });

        return res;
      });

      return NextResponse.json({ success: true, request: updated });
    }

    // Action is APPROVE: create TOPUP transaction atomically and update tenant advance
    const updated = await prisma.$transaction(async (tx) => {
      // 1. Mark request as APPROVED
      const res = await tx.advanceTopUpRequest.update({
        where: { id },
        data: {
          status: "APPROVED",
          decidedBy: session.name || "Admin",
          decidedAt: new Date(),
          decisionNote: note?.trim() || null,
        },
      });

      // 2. Insert TOPUP in ledger
      const advanceTx = await tx.advanceTransaction.create({
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

      // 3. Update Tenant advance balance
      await tx.tenant.update({
        where: { id: topUpReq.tenantId },
        data: {
          advanceDeposit: { increment: topUpReq.amount },
        },
      });

      // 4. Notify requester
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
        details: {
          tenantId: topUpReq.tenantId,
          tenantName: topUpReq.tenant.name,
          amount: topUpReq.amount,
          advanceTransactionId: advanceTx.id,
        },
        tx,
      });

      return res;
    });

    return NextResponse.json({ success: true, request: updated });
  } catch (error) {
    console.error("Failed to process top-up approval:", error);
    return NextResponse.json({ error: "Failed to process top-up approval" }, { status: 500 });
  }
}
