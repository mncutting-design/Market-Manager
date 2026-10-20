import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { matchesSearchWithDigits, compareShopSerials } from "@/lib/format";


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

    // Naturally serialize shops market-wise by blocks (এ, বি, সি, ডি, ই, এফ / A, B, C...) and numbers
    filtered.sort((a, b) => {
      if (a.marketId !== b.marketId) {
        return a.marketName.localeCompare(b.marketName, "bn");
      }
      return compareShopSerials(a.shopNumber, b.shopNumber);
    });

    return NextResponse.json(
      { shops: filtered },
      {
        headers: {
          "Cache-Control": "private, no-cache, stale-while-revalidate=5",
        },
      }
    );
  } catch (error) {
    console.error("Failed to fetch shops:", error);
    return NextResponse.json({ error: "Failed to fetch shops" }, { status: 500 });
  }
}

import { getSession } from "@/lib/auth";
import { logAudit } from "@/lib/audit";

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session || (session.role !== "ADMIN" && session.role !== "MANAGER")) {
      return NextResponse.json(
        { error: "Only administrators and managers can create new shops" },
        { status: 403 }
      );
    }

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

    await logAudit({
      userId: session.id,
      userName: session.name || (session.role === "MANAGER" ? "Manager" : "Admin"),
      action: "SHOP_CREATED",
      entityType: "Shop",
      entityId: shop.id,
      details: { shopNumber: shop.shopNumber, marketId, rentPaisa },
    });

    return NextResponse.json({ shop }, { status: 201 });
  } catch (error) {
    console.error("Failed to create shop:", error);
    return NextResponse.json({ error: "Failed to create shop" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const session = await getSession();
    const body = await req.json();
    const { id, shopNumber, floor, size, defaultRent, newRent, effectiveFrom, note, submitForApproval } = body;

    if (!id) {
      return NextResponse.json({ error: "Shop ID is required" }, { status: 400 });
    }

    const currentShop = await prisma.shop.findUnique({
      where: { id },
      include: {
        market: true,
        tenants: { where: { isActive: true } },
      },
    });

    if (!currentShop) {
      return NextResponse.json({ error: "Shop not found" }, { status: 404 });
    }

    const isRentRevision = newRent !== undefined && newRent !== null;
    const currentData = {
      shopNumber: currentShop.shopNumber,
      floor: currentShop.floor,
      size: currentShop.size,
      defaultRent: currentShop.defaultRent,
      marketName: currentShop.market.name,
      ...(currentShop.tenants[0] && { currentTenantRent: currentShop.tenants[0].rentAmount }),
    };

    const proposedData = {
      ...(shopNumber && { shopNumber: shopNumber.trim() }),
      ...(floor && { floor: floor.trim() }),
      ...(size !== undefined && { size: size?.trim() || null }),
      ...(defaultRent !== undefined && !isRentRevision && {
        defaultRent: Math.round(Number(defaultRent)),
      }),
      ...(isRentRevision && {
        newRent: Math.round(Number(newRent)),
        effectiveFrom: effectiveFrom || new Date().toISOString(),
        note: note?.trim() || "Rent revision",
      }),
    };

    const isAdmin = session?.role === "ADMIN";
    if (session?.role === "OPERATOR") {
      return NextResponse.json(
        { error: "অপারেটর কেবল নির্ধারিত কাজ করতে পারবেন, কোনো দোকান পরিবর্তন বা আবেদন করতে পারবেন না।" },
        { status: 403 }
      );
    }

    if (!isAdmin || submitForApproval) {
      const cr = await prisma.changeRequest.create({
        data: {
          entityType: "SHOP",
          entityId: id,
          entityTitle: `${currentShop.shopNumber} (${currentShop.market.name})`,
          actionType: isRentRevision ? "RENT_REVISION" : "EDIT",
          status: "PENDING",
          currentData: JSON.stringify(currentData),
          proposedData: JSON.stringify(proposedData),
          requestedBy: session?.name || "Staff / Manager",
          requesterRole: session?.role || "MANAGER",
        },
      });

      return NextResponse.json({
        success: true,
        requiresApproval: true,
        message: "Shop changes submitted for Admin approval",
        changeRequest: cr,
      });
    }

    // Direct Admin update
    if (isRentRevision) {
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
        ...(defaultRent !== undefined && !isRentRevision && {
          defaultRent: Math.round(Number(defaultRent)),
        }),
      },
      include: { market: true, tenants: { where: { isActive: true } } },
    });

    await logAudit({
      userId: session?.id,
      userName: session?.name || "Admin",
      action: isRentRevision ? "SHOP_RENT_REVISED" : "SHOP_UPDATED",
      entityType: "Shop",
      entityId: id,
      details: { before: currentData, after: proposedData },
    });

    return NextResponse.json({ shop: updated });
  } catch (error) {
    console.error("Failed to update shop:", error);
    return NextResponse.json({ error: "Failed to update shop" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await getSession();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Shop ID required" }, { status: 400 });

    const shop = await prisma.shop.findUnique({
      where: { id },
      include: { market: true, tenants: { where: { isActive: true } } },
    });

    if (!shop) {
      return NextResponse.json({ error: "Shop not found" }, { status: 404 });
    }

    if (session?.role === "OPERATOR") {
      return NextResponse.json(
        { error: "অপারেটর কেবল নির্ধারিত কাজ করতে পারবেন, কোনো দোকান ডিলিট বা আবেদন করতে পারবেন না।" },
        { status: 403 }
      );
    }

    const isAdmin = session?.role === "ADMIN";
    if (!isAdmin) {
      const cr = await prisma.changeRequest.create({
        data: {
          entityType: "SHOP",
          entityId: id,
          entityTitle: `${shop.shopNumber} (${shop.market.name})`,
          actionType: "DELETE",
          status: "PENDING",
          currentData: JSON.stringify({
            shopNumber: shop.shopNumber,
            marketName: shop.market.name,
            occupied: shop.status === "OCCUPIED",
          }),
          proposedData: JSON.stringify({ isActive: false }),
          requestedBy: session?.name || "Staff / Manager",
          requesterRole: session?.role || "MANAGER",
        },
      });

      return NextResponse.json({
        success: true,
        requiresApproval: true,
        message: "Shop deletion request submitted for Admin approval",
        changeRequest: cr,
      });
    }

    // Direct Admin soft-delete
    await prisma.shop.update({
      where: { id },
      data: { isActive: false },
    });

    await logAudit({
      userId: session?.id,
      userName: session?.name || "Admin",
      action: "SHOP_DELETED",
      entityType: "Shop",
      entityId: id,
      details: { shopNumber: shop.shopNumber, marketId: shop.marketId },
    });

    return NextResponse.json({ success: true, message: "Shop deleted successfully" });
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete shop" }, { status: 500 });
  }
}
