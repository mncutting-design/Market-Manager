import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { seedDatabase } from "@/lib/seed-db";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const includeInactive = searchParams.get("includeInactive") === "true";

    // Auto-seed if database is empty
    try {
      const count = await prisma.market.count();
      if (count === 0) {
        await seedDatabase();
      }
    } catch (e) {
      console.warn("Auto-seed check warning:", e);
    }

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

    return NextResponse.json({ markets: formatted });
  } catch (error) {
    console.error("Failed to fetch markets:", error);
    return NextResponse.json({ error: "Failed to fetch markets" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
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

    return NextResponse.json({ market }, { status: 201 });
  } catch (error) {
    console.error("Failed to create market:", error);
    return NextResponse.json({ error: "Failed to create market" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const { id, name, address, notes, totalFloors, isActive } = body;

    if (!id) {
      return NextResponse.json({ error: "Market ID is required" }, { status: 400 });
    }

    const updated = await prisma.market.update({
      where: { id },
      data: {
        ...(name !== undefined && { name: name.trim() }),
        ...(address !== undefined && { address: address?.trim() || null }),
        ...(notes !== undefined && { notes: notes?.trim() || null }),
        ...(totalFloors !== undefined && { totalFloors: Number(totalFloors) > 0 ? Number(totalFloors) : 5 }),
        ...(isActive !== undefined && { isActive }),
      },
    });

    return NextResponse.json({ market: updated });
  } catch (error) {
    console.error("Failed to update market:", error);
    return NextResponse.json({ error: "Failed to update market" }, { status: 500 });
  }
}
