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

    const [requests, pendingCount] = await Promise.all([
      prisma.changeRequest.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: 100,
      }),
      prisma.changeRequest.count({
        where: { status: "PENDING" },
      }),
    ]);

    const parsed = requests.map((r) => ({
      ...r,
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

    return NextResponse.json({
      requests: parsed,
      pendingCount,
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
      return NextResponse.json({ error: "Change request not found" }, { status: 404 });
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
