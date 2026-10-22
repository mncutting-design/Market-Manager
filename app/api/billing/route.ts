import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { matchesSearchWithDigits } from "@/lib/format";


export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const marketId = searchParams.get("marketId");
    const shopId = searchParams.get("shopId");
    const month = searchParams.get("month") ? parseInt(searchParams.get("month")!, 10) : undefined;
    const year = searchParams.get("year") ? parseInt(searchParams.get("year")!, 10) : undefined;
    const status = searchParams.get("status");
    const search = searchParams.get("search");

    const where: any = {};
    if (shopId) where.shopId = shopId;
    if (month) where.month = month;
    if (year) where.year = year;
    if (status && status !== "ALL") where.status = status;

    if (marketId && marketId !== "ALL") {
      where.shop = { marketId, isActive: true };
    } else {
      where.shop = { isActive: true };
    }

    const bills = await prisma.bill.findMany({
      where,
      include: {
        shop: {
          include: {
            market: { select: { id: true, name: true } },
          },
        },
        tenant: true,
        billItems: {
          include: { chargeType: true },
        },
        payments: {
          orderBy: { paidOn: "desc" },
        },
      },
      orderBy: [{ year: "desc" }, { month: "desc" }, { shop: { shopNumber: "asc" } }],
    });

    // Calculate previous unpaid balance carry-forward for each shop in ONE single batch query
    const shopIds = Array.from(new Set(bills.map((b) => b.shopId)));
    const allUnpaidBills = shopIds.length > 0
      ? await prisma.bill.findMany({
          where: {
            shopId: { in: shopIds },
            status: { in: ["DUE", "PARTIAL"] },
          },
          select: {
            shopId: true,
            year: true,
            month: true,
            dueAmount: true,
          },
        })
      : [];

    const unpaidByShop = new Map<string, { year: number; month: number; dueAmount: number }[]>();
    for (const b of allUnpaidBills) {
      if (!unpaidByShop.has(b.shopId)) {
        unpaidByShop.set(b.shopId, []);
      }
      unpaidByShop.get(b.shopId)!.push(b);
    }

    const billsWithCarryForward = bills.map((bill) => {
      const priorBills = unpaidByShop.get(bill.shopId) || [];
      const carryForwardDue = priorBills
        .filter((b) => b.year < bill.year || (b.year === bill.year && b.month < bill.month))
        .reduce((sum, b) => sum + b.dueAmount, 0);

      const totalPayableWithArrears = bill.dueAmount + carryForwardDue;

      return {
        ...bill,
        carryForwardDue,
        totalPayableWithArrears,
      };
    });

    let filtered = billsWithCarryForward;
    if (search && search.trim() !== "") {
      const q = search.trim();
      filtered = filtered.filter(
        (b) =>
          matchesSearchWithDigits(b.shop.shopNumber, q) ||
          matchesSearchWithDigits(b.shop.market.name, q) ||
          matchesSearchWithDigits(b.tenant.name, q) ||
          matchesSearchWithDigits(b.tenant.phone, q)
      );
    }

    return NextResponse.json(
      { bills: filtered },
      {
        headers: {
          "Cache-Control": "private, no-cache, stale-while-revalidate=5",
        },
      }
    );
  } catch (error) {
    console.error("Failed to fetch bills:", error);
    return NextResponse.json({ error: "Failed to fetch bills" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { marketId, month, year, dueDay = 10 } = body;

    const targetMonth = parseInt(month, 10);
    const targetYear = parseInt(year, 10);

    if (!targetMonth || !targetYear) {
      return NextResponse.json({ error: "Month and Year are required" }, { status: 400 });
    }

    // Find occupied shops
    const shopWhere: any = {
      status: "OCCUPIED",
      isActive: true,
    };
    if (marketId && marketId !== "ALL") {
      shopWhere.marketId = marketId;
    }

    const occupiedShops = await prisma.shop.findMany({
      where: shopWhere,
      include: {
        tenants: {
          where: { isActive: true },
          take: 1,
        },
      },
    });

    if (occupiedShops.length === 0) {
      return NextResponse.json({
        message: "No occupied shops found to generate bills for",
        createdCount: 0,
        existingCount: 0,
      });
    }

    const dueDate = new Date(targetYear, targetMonth - 1, Math.min(28, Math.max(1, dueDay)));

    let createdCount = 0;
    let existingCount = 0;

    for (const shop of occupiedShops) {
      const tenant = shop.tenants[0];
      if (!tenant) continue;

      // Check for existing bill (idempotent)
      const existing = await prisma.bill.findUnique({
        where: {
          shopId_month_year: {
            shopId: shop.id,
            month: targetMonth,
            year: targetYear,
          },
        },
      });

      if (existing) {
        existingCount++;
        continue;
      }

      // Base rent - strictly manual; NO auto-calculated additional costs
      const rentAmount = tenant.rentAmount || shop.defaultRent;
      const totalAmount = rentAmount;

      await prisma.bill.create({
        data: {
          shopId: shop.id,
          tenantId: tenant.id,
          month: targetMonth,
          year: targetYear,
          rentAmount,
          totalAmount,
          paidAmount: 0,
          dueAmount: totalAmount,
          status: "DUE",
          dueDate,
        },
      });

      createdCount++;
    }

    return NextResponse.json({
      success: true,
      createdCount,
      existingCount,
      totalChecked: occupiedShops.length,
    });
  } catch (error) {
    console.error("Failed to generate bills:", error);
    return NextResponse.json({ error: "Failed to generate bills" }, { status: 500 });
  }
}

import { getSession } from "@/lib/auth";

// Add or edit manual charge item on an existing bill
export async function PUT(req: Request) {
  try {
    const session = await getSession();
    if (session?.role === "OPERATOR") {
      return NextResponse.json(
        { error: "অপারেটর কেবল নির্ধারিত কাজ করতে পারবেন, কোনো বিল বা চার্জ পরিবর্তন বা আবেদন করতে পারবেন না।" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { billId, itemId, chargeTypeId, description, amount, submitForApproval } = body;

    if (!billId || amount === undefined) {
      return NextResponse.json({ error: "Bill ID and Amount are required" }, { status: 400 });
    }

    const bill = await prisma.bill.findUnique({
      where: { id: billId },
      include: { billItems: true, shop: { include: { market: true } } },
    });

    if (!bill) {
      return NextResponse.json({ error: "Bill not found" }, { status: 404 });
    }

    const chargePaisa = Math.round(Number(amount));
    const isAdmin = session?.role === "ADMIN";

    // If manager, generate change request for admin approval
    if (!isAdmin || submitForApproval) {
      const cr = await prisma.changeRequest.create({
        data: {
          entityType: "BILL",
          entityId: billId,
          entityTitle: `বিল চার্জ (${bill.shop.shopNumber} - ${bill.shop.market.name})`,
          actionType: itemId ? "EDIT_ITEM" : "ADD_ITEM",
          status: "PENDING",
          currentData: JSON.stringify({ billId, itemId }),
          proposedData: JSON.stringify({ itemId, chargeTypeId, description, amount: chargePaisa }),
          requestedBy: session?.name || "Manager",
          requesterRole: session?.role || "MANAGER",
        },
      });

      return NextResponse.json({
        success: true,
        requiresApproval: true,
        message: "বিলের চার্জ পরিবর্তনের আবেদন অ্যাডমিন অনুমোদনের জন্য পাঠানো হয়েছে",
        changeRequest: cr,
      });
    }

    // Direct Admin update
    const updatedBill = await prisma.$transaction(async (tx) => {
      if (itemId) {
        await tx.billItem.update({
          where: { id: itemId },
          data: {
            description: description?.trim() || "ম্যানুয়াল চার্জ / Additional Cost",
            amount: chargePaisa,
          },
        });
      } else {
        // Create new manual bill item
        await tx.billItem.create({
          data: {
            billId,
            chargeTypeId: chargeTypeId || null,
            description: description?.trim() || "অতিরিক্ত খরচ / Additional Cost",
            amount: chargePaisa,
          },
        });
      }

      const allItems = await tx.billItem.findMany({ where: { billId } });
      const itemsTotal = allItems.reduce((acc, item) => acc + item.amount, 0);
      const newTotal = bill.rentAmount + itemsTotal;
      const newDue = newTotal - bill.paidAmount;
      const newStatus = newDue <= 0 ? "PAID" : bill.paidAmount > 0 ? "PARTIAL" : "DUE";

      return await tx.bill.update({
        where: { id: billId },
        data: {
          totalAmount: newTotal,
          dueAmount: Math.max(0, newDue),
          status: newStatus,
        },
        include: {
          shop: { include: { market: true } },
          tenant: true,
          billItems: { include: { chargeType: true } },
        },
      });
    });

    return NextResponse.json({ success: true, bill: updatedBill });
  } catch (error) {
    console.error("Failed to add charge to bill:", error);
    return NextResponse.json({ error: "Failed to add charge to bill" }, { status: 500 });
  }
}

// Delete a manual charge item from a bill
export async function DELETE(req: Request) {
  try {
    const session = await getSession();
    if (session?.role === "OPERATOR") {
      return NextResponse.json(
        { error: "অপারেটর কেবল নির্ধারিত কাজ করতে পারবেন, কোনো বিল বা চার্জ পরিবর্তন বা আবেদন করতে পারবেন না।" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const billId = searchParams.get("billId");
    const itemId = searchParams.get("itemId");

    if (!billId || !itemId) {
      return NextResponse.json({ error: "billId and itemId are required" }, { status: 400 });
    }

    const bill = await prisma.bill.findUnique({
      where: { id: billId },
      include: { billItems: true, shop: { include: { market: true } } },
    });

    if (!bill) {
      return NextResponse.json({ error: "Bill not found" }, { status: 404 });
    }

    const isAdmin = session?.role === "ADMIN";
    if (!isAdmin) {
      const cr = await prisma.changeRequest.create({
        data: {
          entityType: "BILL",
          entityId: billId,
          entityTitle: `বিল চার্জ মুছে ফেলা (${bill.shop.shopNumber} - ${bill.shop.market.name})`,
          actionType: "DELETE_ITEM",
          status: "PENDING",
          currentData: JSON.stringify({ billId, itemId }),
          proposedData: JSON.stringify({ itemId }),
          requestedBy: session?.name || "Manager",
          requesterRole: session?.role || "MANAGER",
        },
      });

      return NextResponse.json({
        success: true,
        requiresApproval: true,
        message: "বিল চার্জ অপসারণের আবেদন অ্যাডমিন অনুমোদনের জন্য পাঠানো হয়েছে",
        changeRequest: cr,
      });
    }

    // Direct Admin execution - single round-trip returning updated bill
    const updatedBill = await prisma.$transaction(async (tx) => {
      await tx.billItem.delete({
        where: { id: itemId },
      });

      const remainingItems = await tx.billItem.findMany({ where: { billId } });
      const itemsTotal = remainingItems.reduce((acc, item) => acc + item.amount, 0);
      const newTotal = bill.rentAmount + itemsTotal;
      const newDue = newTotal - bill.paidAmount;
      const newStatus = newDue <= 0 ? "PAID" : bill.paidAmount > 0 ? "PARTIAL" : "DUE";

      return await tx.bill.update({
        where: { id: billId },
        data: {
          totalAmount: newTotal,
          dueAmount: Math.max(0, newDue),
          status: newStatus,
        },
        include: {
          shop: { include: { market: true } },
          tenant: true,
          billItems: { include: { chargeType: true } },
        },
      });
    });

    return NextResponse.json({ success: true, bill: updatedBill });
  } catch (error) {
    console.error("Failed to delete bill item:", error);
    return NextResponse.json({ error: "Failed to delete bill item" }, { status: 500 });
  }
}

