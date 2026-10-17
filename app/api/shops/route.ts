import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { matchesSearchWithDigits } from "@/lib/format";


export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const marketId = searchParams.get("marketId");
    const status = searchParams.get("status");
    const search = searchParams.get("search");

    const where: any = { isActive: true };
    if (marketId && marketId !== "ALL") {
      where.marketId = marketId;
    }
    if (status && status !== "ALL") {
      where.status = status;
    }

    const shops = await prisma.shop.findMany({
      where,
      include: {
        market: {
          select: { id: true, name: true },
        },
        tenants: {
          where: { isActive: true },
          orderBy: { createdAt: "desc" },
          take: 1,
        },
        rentHistory: {
          orderBy: { effectiveFrom: "desc" },
          take: 5,
        },
      },
      orderBy: [{ marketId: "asc" }, { shopNumber: "asc" }],
    });

    let filtered = shops.map((s) => ({
      id: s.id,
      marketId: s.marketId,
      marketName: s.market.name,
      shopNumber: s.shopNumber,
      floor: s.floor,
      size: s.size,
      defaultRent: s.defaultRent,
      status: s.status,
      tenant: s.tenants[0] || null,
      currentRent: s.tenants[0]?.rentAmount || s.defaultRent,
      rentHistory: s.rentHistory,
    }));

    if (search && search.trim() !== "") {
      const q = search.trim();
      filtered = filtered.filter(
        (s) =>
          matchesSearchWithDigits(s.shopNumber, q) ||
          matchesSearchWithDigits(s.marketName, q) ||
          (s.tenant && matchesSearchWithDigits(s.tenant.name, q)) ||
          (s.tenant && matchesSearchWithDigits(s.tenant.phone, q))
      );
    }

    return NextResponse.json({ shops: filtered });
  } catch (error) {
    console.error("Failed to fetch shops:", error);
    return NextResponse.json({ error: "Failed to fetch shops" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { marketId, shopNumber, floor, size, defaultRent } = body;

    if (!marketId || !shopNumber) {
      return NextResponse.json({ error: "Market and Shop Number are required" }, { status: 400 });
    }

    // Check unique shop number in market
    const existing = await prisma.shop.findUnique({
      where: {
        marketId_shopNumber: {
          marketId,
          shopNumber: shopNumber.trim(),
        },
      },
    });

    if (existing && existing.isActive) {
      return NextResponse.json(
        { error: "A shop with this number already exists in this market" },
        { status: 400 }
      );
    }

    const rentPaisa = Math.round(Number(defaultRent) || 0);

    const shop = await prisma.shop.create({
      data: {
        marketId,
        shopNumber: shopNumber.trim(),
        floor: floor?.trim() || "Ground",
        size: size?.trim() || null,
        defaultRent: rentPaisa,
        status: "VACANT",
      },
      include: { market: true },
    });

    return NextResponse.json({ shop }, { status: 201 });
  } catch (error) {
    console.error("Failed to create shop:", error);
    return NextResponse.json({ error: "Failed to create shop" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const { id, shopNumber, floor, size, defaultRent, newRent, effectiveFrom, note } = body;

    if (!id) {
      return NextResponse.json({ error: "Shop ID is required" }, { status: 400 });
    }

    const currentShop = await prisma.shop.findUnique({
      where: { id },
      include: { tenants: { where: { isActive: true } } },
    });

    if (!currentShop) {
      return NextResponse.json({ error: "Shop not found" }, { status: 404 });
    }

    // Handle Rent Revision with Effective Month
    if (newRent !== undefined && newRent !== null) {
      const newRentPaisa = Math.round(Number(newRent));
      const activeTenant = currentShop.tenants[0];

      // Record in rentHistory
      await prisma.rentHistory.create({
        data: {
          shopId: id,
          tenantId: activeTenant ? activeTenant.id : null,
          rentAmount: newRentPaisa,
          effectiveFrom: effectiveFrom ? new Date(effectiveFrom) : new Date(),
          note: note?.trim() || "Rent revision",
        },
      });

      // Update active tenant's rentAmount if assigned
      if (activeTenant) {
        await prisma.tenant.update({
          where: { id: activeTenant.id },
          data: { rentAmount: newRentPaisa },
        });
      }

      // Update shop defaultRent
      await prisma.shop.update({
        where: { id },
        data: { defaultRent: newRentPaisa },
      });
    }

    // Update other details
    const updated = await prisma.shop.update({
      where: { id },
      data: {
        ...(shopNumber && { shopNumber: shopNumber.trim() }),
        ...(floor && { floor: floor.trim() }),
        ...(size !== undefined && { size: size?.trim() || null }),
        ...(defaultRent !== undefined && newRent === undefined && {
          defaultRent: Math.round(Number(defaultRent)),
        }),
      },
      include: { market: true, tenants: { where: { isActive: true } } },
    });

    return NextResponse.json({ shop: updated });
  } catch (error) {
    console.error("Failed to update shop:", error);
    return NextResponse.json({ error: "Failed to update shop" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Shop ID required" }, { status: 400 });

    await prisma.shop.update({
      where: { id },
      data: { isActive: false },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete shop" }, { status: 500 });
  }
}
