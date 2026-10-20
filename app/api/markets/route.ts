import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const includeInactive = searchParams.get("includeInactive") === "true";

    const markets = await prisma.market.findMany({
      where: includeInactive ? {} : { isActive: true },
      include: {
        shops: {
          where: { isActive: true },
          select: {
            id: true,
            status: true,
            defaultRent: true,
            tenants: {
              where: { isActive: true },
              select: { rentAmount: true },
            },
          },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    const formatted = markets.map((m) => {
      const totalShops = m.shops.length;
      const occupiedShops = m.shops.filter((s) => s.status === "OCCUPIED").length;
      const vacantShops = totalShops - occupiedShops;

      // Calculate monthly expected rent (using active tenant agreed rent or shop default rent)
      const monthlyExpected = m.shops.reduce((sum, s) => {
        if (s.status === "OCCUPIED" && s.tenants.length > 0) {
          return sum + (s.tenants[0].rentAmount || s.defaultRent);
        }
        return sum;
      }, 0);

      return {
        id: m.id,
        name: m.name,
        address: m.address,
        notes: m.notes,
        totalFloors: m.totalFloors || 5,
        isActive: m.isActive,
        totalShops,
        occupiedShops,
        vacantShops,
        monthlyExpected, // in paisa
      };
    });

    return NextResponse.json(
      { markets: formatted },
      {
        headers: {
          "Cache-Control": "private, no-cache, stale-while-revalidate=5",
        },
      }
    );
  } catch (error) {
    console.error("Failed to fetch markets:", error);
    return NextResponse.json({ error: "Failed to fetch markets" }, { status: 500 });
  }
}

import { getSession } from "@/lib/auth";
import { logAudit } from "@/lib/audit";

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session || session.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Only administrators can create new markets" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { name, address, notes, totalFloors } = body;

    if (!name || name.trim() === "") {
      return NextResponse.json({ error: "Market name is required" }, { status: 400 });
    }

    const market = await prisma.market.create({
      data: {
        name: name.trim(),
        address: address?.trim() || null,
        notes: notes?.trim() || null,
        totalFloors: Number(totalFloors) > 0 ? Number(totalFloors) : 5,
      },
    });

    await logAudit({
      userId: session.id,
      userName: session.name || "Admin",
      action: "MARKET_CREATED",
      entityType: "Market",
      entityId: market.id,
      details: { name: market.name, totalFloors: market.totalFloors },
    });

    return NextResponse.json({ market }, { status: 201 });
  } catch (error) {
    console.error("Failed to create market:", error);
    return NextResponse.json({ error: "Failed to create market" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const session = await getSession();
    const body = await req.json();
    const { id, name, address, notes, totalFloors, isActive, submitForApproval } = body;

    if (!id) {
      return NextResponse.json({ error: "Market ID is required" }, { status: 400 });
    }

    const currentMarket = await prisma.market.findUnique({
      where: { id },
    });

    if (!currentMarket) {
      return NextResponse.json({ error: "Market not found" }, { status: 404 });
    }

    const currentData = {
      name: currentMarket.name,
      address: currentMarket.address,
      notes: currentMarket.notes,
      totalFloors: currentMarket.totalFloors,
      isActive: currentMarket.isActive,
    };

    const proposedData = {
      ...(name !== undefined && { name: name.trim() }),
      ...(address !== undefined && { address: address?.trim() || null }),
      ...(notes !== undefined && { notes: notes?.trim() || null }),
      ...(totalFloors !== undefined && { totalFloors: Number(totalFloors) > 0 ? Number(totalFloors) : 5 }),
      ...(isActive !== undefined && { isActive }),
    };

    // If not Admin OR explicitly submitted for approval:
    const isAdmin = session?.role === "ADMIN";
    if (session?.role === "OPERATOR") {
      return NextResponse.json(
        { error: "অপারেটর কেবল নির্ধারিত কাজ করতে পারবেন, কোনো মার্কেট পরিবর্তন বা আবেদন করতে পারবেন না।" },
        { status: 403 }
      );
    }

    if (!isAdmin || submitForApproval) {
      const cr = await prisma.changeRequest.create({
        data: {
          entityType: "MARKET",
          entityId: id,
          entityTitle: currentMarket.name,
          actionType: "EDIT",
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
        message: "Change request submitted for Admin approval",
        changeRequest: cr,
      });
    }

    // Direct Admin update
    const updated = await prisma.market.update({
      where: { id },
      data: proposedData,
    });

    await logAudit({
      userId: session?.id,
      userName: session?.name || "Admin",
      action: "MARKET_UPDATED",
      entityType: "Market",
      entityId: id,
      details: { before: currentData, after: proposedData },
    });

    return NextResponse.json({ market: updated });
  } catch (error) {
    console.error("Failed to update market:", error);
    return NextResponse.json({ error: "Failed to update market" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await getSession();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Market ID is required" }, { status: 400 });
    }

    const market = await prisma.market.findUnique({
      where: { id },
      include: {
        shops: {
          where: { isActive: true },
          select: { id: true, shopNumber: true, status: true },
        },
      },
    });

    if (!market) {
      return NextResponse.json({ error: "Market not found" }, { status: 404 });
    }

    if (session?.role === "OPERATOR") {
      return NextResponse.json(
        { error: "অপারেটর কেবল নির্ধারিত কাজ করতে পারবেন, কোনো মার্কেট ডিলিট বা আবেদন করতে পারবেন না।" },
        { status: 403 }
      );
    }

    const isAdmin = session?.role === "ADMIN";
    if (!isAdmin) {
      // Create change request for delete

      const cr = await prisma.changeRequest.create({
        data: {
          entityType: "MARKET",
          entityId: id,
          entityTitle: market.name,
          actionType: "DELETE",
          status: "PENDING",
          currentData: JSON.stringify({ name: market.name, activeShops: market.shops.length }),
          proposedData: JSON.stringify({ isActive: false }),
          requestedBy: session?.name || "Staff / Manager",
          requesterRole: session?.role || "MANAGER",
        },
      });

      return NextResponse.json({
        success: true,
        requiresApproval: true,
        message: "Deletion request submitted for Admin approval",
        changeRequest: cr,
      });
    }

    // Admin direct soft-delete (or hard delete if completely empty)
    await prisma.$transaction(async (tx) => {
      // Soft-delete market and its shops
      await tx.shop.updateMany({
        where: { marketId: id },
        data: { isActive: false },
      });

      await tx.market.update({
        where: { id },
        data: { isActive: false },
      });
    });

    await logAudit({
      userId: session?.id,
      userName: session?.name || "Admin",
      action: "MARKET_DELETED",
      entityType: "Market",
      entityId: id,
      details: { name: market.name, shopCount: market.shops.length },
    });

    return NextResponse.json({ success: true, message: "Market deleted successfully" });
  } catch (error) {
    console.error("Failed to delete market:", error);
    return NextResponse.json({ error: "Failed to delete market" }, { status: 500 });
  }
}

