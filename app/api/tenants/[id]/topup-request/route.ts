import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { logAudit } from "@/lib/audit";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: tenantId } = await params;
    const requests = await prisma.advanceTopUpRequest.findMany({
      where: { tenantId },
      include: {
        requestedByUser: { select: { id: true, name: true, role: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ requests });
  } catch (error) {
    console.error("Failed to fetch topup requests:", error);
    return NextResponse.json({ error: "Failed to fetch topup requests" }, { status: 500 });
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: tenantId } = await params;
    const body = await req.json();
    const { amount, method = "CASH", note } = body;

    const paisa = Math.round(Number(amount));
    if (!paisa || paisa <= 0) {
      return NextResponse.json({ error: "Amount must be a positive number" }, { status: 400 });
    }

    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      include: { shop: { include: { market: true } } },
    });

    if (!tenant) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }

    const isAdmin = session.role === "ADMIN";

    // ADMIN adds top-up directly
    if (isAdmin) {
      const result = await prisma.$transaction(async (tx) => {
        const advanceTx = await tx.advanceTransaction.create({
          data: {
            tenantId: tenant.id,
            type: "TOPUP",
            amount: paisa,
            reason: note?.trim() || "Advance top-up deposit (Admin Direct)",
            createdBy: session.name || "Admin",
            createdByName: session.name || "Admin",
            enteredById: session.id,
          },
        });

        await tx.tenant.update({
          where: { id: tenant.id },
          data: {
            advanceDeposit: { increment: paisa },
          },
        });

        await logAudit({
          userId: session.id,
          userName: session.name,
          action: "ADVANCE_TOPUP_DIRECT",
          entityType: "Tenant",
          entityId: tenant.id,
          details: {
            tenantName: tenant.name,
            shopNumber: tenant.shop.shopNumber,
            amount: paisa,
            method,
            reason: advanceTx.reason,
          },
          tx,
        });

        return advanceTx;
      });

      return NextResponse.json({
        success: true,
        direct: true,
        message: "Advance top-up recorded successfully",
        transaction: result,
      }, { status: 201 });
    }

    // MANAGER / COLLECTOR creates a pending request
    const topUpRequest = await prisma.$transaction(async (tx) => {
      const reqRecord = await tx.advanceTopUpRequest.create({
        data: {
          tenantId: tenant.id,
          amount: paisa,
          method: method.toUpperCase(),
          note: note?.trim() || null,
          requestedBy: session.name || "Staff",
          requestedById: session.id,
          status: "PENDING",
        },
      });

      // Send in-app notification for ADMIN
      await tx.notification.create({
        data: {
          role: "ADMIN",
          title: "নতুন জামানত টপ-আপ আবেদন",
          message: `${session.name} (${session.role}) দোকান ${tenant.shop.shopNumber}-এর ${tenant.name}-এর জন্য ৳${(paisa / 100).toLocaleString()} জামানত টপ-আপের আবেদন করেছেন।`,
          type: "APPROVAL",
          link: "/dashboard",
        },
      });

      return reqRecord;
    });

    return NextResponse.json({
      success: true,
      direct: false,
      message: "জামানত টপ-আপ আবেদন অ্যাডমিন অনুমোদনের জন্য পাঠানো হয়েছে",
      topUpRequest,
    }, { status: 201 });
  } catch (error) {
    console.error("Failed to submit advance top-up request:", error);
    return NextResponse.json({ error: "Failed to submit advance top-up request" }, { status: 500 });
  }
}
