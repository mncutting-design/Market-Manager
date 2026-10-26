import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { matchesSearchWithDigits } from "@/lib/format";
import { getSession } from "@/lib/auth";
import { logAudit } from "@/lib/audit";


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
    const allShopBills = shopIds.length > 0
      ? await prisma.bill.findMany({
          where: {
            shopId: { in: shopIds },
          },
          select: {
            id: true,
            shopId: true,
            year: true,
            month: true,
            rentAmount: true,
            totalAmount: true,
            paidAmount: true,
            dueAmount: true,
            billItems: { select: { amount: true } },
            payments: { select: { amount: true } },
          },
          orderBy: [{ year: "asc" }, { month: "asc" }],
        })
      : [];

    const billsByShop = new Map<string, typeof allShopBills>();
    for (const b of allShopBills) {
      if (!billsByShop.has(b.shopId)) {
        billsByShop.set(b.shopId, []);
      }
      billsByShop.get(b.shopId)!.push(b);
    }

    const billsWithCarryForward = bills.map((bill) => {
      const itemsTotal = (bill.billItems || []).reduce((acc: number, item: any) => acc + (item.amount || 0), 0);
      const computedTotal = bill.rentAmount + itemsTotal;
      const effectiveTotal = Math.max(bill.totalAmount, computedTotal);

      const shopAllBills = billsByShop.get(bill.shopId) || [];
      const priorBills = shopAllBills
        .filter((p) => p.year < bill.year || (p.year === bill.year && p.month < bill.month))
        .sort((x, y) => (x.year !== y.year ? x.year - y.year : x.month - y.month));

      let priorBilled = 0;
      let priorPaid = 0;
      const priorUnpaidList: { month: number; year: number; dueAmount: number }[] = [];

      for (const p of priorBills) {
        const pItems = p.billItems.reduce((acc, i) => acc + i.amount, 0);
        const pBilled = Math.max(p.totalAmount, p.rentAmount + pItems);
        const pPaid = Math.max(p.paidAmount, p.payments.reduce((acc, pay) => acc + pay.amount, 0));
        priorBilled += pBilled;
        priorPaid += pPaid;

        const pDue = Math.max(0, pBilled - pPaid);
        if (pDue > 0) {
          priorUnpaidList.push({ month: p.month, year: p.year, dueAmount: pDue });
        }
      }

      const carryForwardDue = Math.max(0, priorBilled - priorPaid);
      const totalBillWithArrears = effectiveTotal + carryForwardDue;

      const paymentsOnThisBill = (bill.payments || []).reduce((sum: number, pay: any) => sum + (pay.amount || 0), 0);
      const actualPaid = Math.max(bill.paidAmount, paymentsOnThisBill);
      const totalPayableWithArrears = Math.max(0, totalBillWithArrears - actualPaid);
      const effectiveDue = Math.max(0, effectiveTotal - Math.max(0, actualPaid - carryForwardDue));

      return {
        ...bill,
        totalAmount: effectiveTotal,
        paidAmount: actualPaid,
        dueAmount: totalPayableWithArrears,
        currentMonthBill: effectiveTotal,
        currentMonthDue: effectiveDue,
        carryForwardDue,
        totalBillWithArrears,
        totalPayableWithArrears,
        priorUnpaidList,
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
        market: { select: { id: true, name: true } },
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
    const createdBillIds: string[] = [];

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

      const newBill = await prisma.bill.create({
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

      createdBillIds.push(newBill.id);
      createdCount++;
    }

    // Record audit log for generated bills with full metadata and bill IDs for undo support
    if (createdCount > 0) {
      const session = await getSession();
      const targetMarketName =
        marketId && marketId !== "ALL"
          ? (occupiedShops[0]?.market?.name || "নির্দিষ্ট মার্কেট")
          : "সকল মার্কেট";

      await logAudit({
        userId: session?.id || null,
        userName: session?.name || "Admin",
        action: "BILLS_GENERATED",
        entityType: "BillBatch",
        entityId: `${targetYear}-${String(targetMonth).padStart(2, "0")}`,
        details: {
          month: targetMonth,
          year: targetYear,
          marketId: marketId || "ALL",
          marketName: targetMarketName,
          createdCount,
          billIds: createdBillIds,
          totalChecked: occupiedShops.length,
          existingCount,
        },
      });
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

    // Direct update: adding or editing utility bill does NOT require admin approval
    // per user requirement (utility bills like electricity fluctuate naturally every month)
    const updatedBill = await prisma.$transaction(async (tx) => {
      let previousItemData: any = null;
      let createdItemId: string | null = null;

      if (itemId) {
        const existingItem = await tx.billItem.findUnique({ where: { id: itemId } });
        if (existingItem) {
          previousItemData = {
            description: existingItem.description,
            amount: existingItem.amount,
          };
        }

        await tx.billItem.update({
          where: { id: itemId },
          data: {
            description: description?.trim() || "ম্যানুয়াল চার্জ / Additional Cost",
            amount: chargePaisa,
          },
        });
      } else {
        // Create new manual bill item
        const newItem = await tx.billItem.create({
          data: {
            billId,
            chargeTypeId: chargeTypeId || null,
            description: description?.trim() || "অতিরিক্ত খরচ / Additional Cost",
            amount: chargePaisa,
          },
        });
        createdItemId = newItem.id;
      }

      const allItems = await tx.billItem.findMany({ where: { billId } });
      const itemsTotal = allItems.reduce((acc, item) => acc + item.amount, 0);
      const newTotal = bill.rentAmount + itemsTotal;
      const newDue = newTotal - bill.paidAmount;
      const newStatus = newDue <= 0 ? "PAID" : bill.paidAmount > 0 ? "PARTIAL" : "DUE";

      const billRes = await tx.bill.update({
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

      // Audit Log entry
      await logAudit({
        userId: session?.id,
        userName: session?.name || "User",
        action: itemId ? "BILL_CHARGE_EDITED" : "BILL_CHARGE_ADDED",
        entityType: "Bill",
        entityId: billId,
        details: {
          billId,
          itemId: itemId || createdItemId,
          shopNumber: bill.shop.shopNumber,
          marketName: bill.shop.market?.name,
          month: bill.month,
          year: bill.year,
          description: description?.trim(),
          amount: chargePaisa,
          totalAmount: newTotal,
          dueAmount: Math.max(0, newDue),
          previousData: previousItemData,
        },
        tx,
      });

      return billRes;
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
      const existingItem = await tx.billItem.findUnique({ where: { id: itemId } });

      await tx.billItem.delete({
        where: { id: itemId },
      });

      const remainingItems = await tx.billItem.findMany({ where: { billId } });
      const itemsTotal = remainingItems.reduce((acc, item) => acc + item.amount, 0);
      const newTotal = bill.rentAmount + itemsTotal;
      const newDue = newTotal - bill.paidAmount;
      const newStatus = newDue <= 0 ? "PAID" : bill.paidAmount > 0 ? "PARTIAL" : "DUE";

      const billRes = await tx.bill.update({
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

      if (existingItem) {
        await logAudit({
          userId: session?.id,
          userName: session?.name || "Admin",
          action: "BILL_CHARGE_DELETED",
          entityType: "Bill",
          entityId: billId,
          details: {
            billId,
            deletedItem: {
              id: existingItem.id,
              description: existingItem.description,
              amount: existingItem.amount,
            },
            shopNumber: bill.shop.shopNumber,
            marketName: bill.shop.market?.name,
            month: bill.month,
            year: bill.year,
            amount: existingItem.amount,
            totalAmount: newTotal,
            dueAmount: Math.max(0, newDue),
          },
          tx,
        });
      }

      return billRes;
    });

    return NextResponse.json({ success: true, bill: updatedBill });
  } catch (error) {
    console.error("Failed to delete bill item:", error);
    return NextResponse.json({ error: "Failed to delete bill item" }, { status: 500 });
  }
}

