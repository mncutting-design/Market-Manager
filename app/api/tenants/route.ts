import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { action, shopId, tenantId, name, phone, nid, advanceDeposit, rentAmount, startDate } = body;

    // Handle Vacate Action
    if (action === "vacate") {
      if (!shopId) {
        return NextResponse.json({ error: "Shop ID is required to vacate" }, { status: 400 });
      }

      await prisma.$transaction([
        prisma.tenant.updateMany({
          where: { shopId, isActive: true },
          data: { isActive: false, endDate: new Date() },
        }),
        prisma.shop.update({
          where: { id: shopId },
          data: { status: "VACANT" },
        }),
      ]);

      return NextResponse.json({ success: true, message: "Tenant vacated successfully" });
    }

    // Assign New Tenant
    if (!shopId || !name || !phone) {
      return NextResponse.json(
        { error: "Shop, Tenant Name, and Phone are required" },
        { status: 400 }
      );
    }

    const shop = await prisma.shop.findUnique({
      where: { id: shopId },
      include: { tenants: { where: { isActive: true } } },
    });

    if (!shop) {
      return NextResponse.json({ error: "Shop not found" }, { status: 404 });
    }

    const agreedRentPaisa = rentAmount ? Math.round(Number(rentAmount)) : shop.defaultRent;
    const advancePaisa = advanceDeposit ? Math.round(Number(advanceDeposit)) : 0;

    const result = await prisma.$transaction(async (tx) => {
      // Inactivate existing active tenants if any
      await tx.tenant.updateMany({
        where: { shopId, isActive: true },
        data: { isActive: false, endDate: new Date() },
      });

      // Create new tenant
      const newTenant = await tx.tenant.create({
        data: {
          shopId,
          name: name.trim(),
          phone: phone.trim(),
          nid: nid?.trim() || null,
          advanceDeposit: advancePaisa,
          rentAmount: agreedRentPaisa,
          startDate: startDate ? new Date(startDate) : new Date(),
        },
      });

      // Create initial advance deposit transaction if advance > 0
      if (advancePaisa > 0) {
        await tx.advanceTransaction.create({
          data: {
            tenantId: newTenant.id,
            type: "DEPOSIT_RECEIVED",
            amount: advancePaisa,
            reason: "Initial lease security deposit",
            createdBy: "Admin",
          },
        });
      }

      // Update shop status
      await tx.shop.update({
        where: { id: shopId },
        data: { status: "OCCUPIED" },
      });

      // Add rent history entry
      await tx.rentHistory.create({
        data: {
          shopId,
          tenantId: newTenant.id,
          rentAmount: agreedRentPaisa,
          effectiveFrom: startDate ? new Date(startDate) : new Date(),
          note: "New tenant lease commencement",
        },
      });

      return newTenant;
    });

    return NextResponse.json({ tenant: result }, { status: 201 });
  } catch (error) {
    console.error("Failed to process tenant:", error);
    return NextResponse.json({ error: "Failed to process tenant" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const { id, name, phone, nid, advanceDeposit, rentAmount, startDate, endDate } = body;

    if (!id) {
      return NextResponse.json({ error: "Tenant ID is required" }, { status: 400 });
    }

    const updated = await prisma.tenant.update({
      where: { id },
      data: {
        ...(name && { name: name.trim() }),
        ...(phone && { phone: phone.trim() }),
        ...(nid !== undefined && { nid: nid?.trim() || null }),
        ...(advanceDeposit !== undefined && { advanceDeposit: Math.round(Number(advanceDeposit)) }),
        ...(rentAmount !== undefined && { rentAmount: Math.round(Number(rentAmount)) }),
        ...(startDate && { startDate: new Date(startDate) }),
        ...(endDate && { endDate: new Date(endDate) }),
      },
    });

    return NextResponse.json({ tenant: updated });
  } catch (error) {
    console.error("Failed to update tenant:", error);
    return NextResponse.json({ error: "Failed to update tenant" }, { status: 500 });
  }
}
