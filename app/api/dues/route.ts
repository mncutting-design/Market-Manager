import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { matchesSearchWithDigits } from "@/lib/format";


export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const marketId = searchParams.get("marketId");
    const search = searchParams.get("search");

    const where: any = {
      dueAmount: { gt: 0 },
      status: { in: ["DUE", "PARTIAL"] },
    };

    if (marketId && marketId !== "ALL") {
      where.shop = { marketId, isActive: true };
    } else {
      where.shop = { isActive: true };
    }

    const overdueBills = await prisma.bill.findMany({
      where,
      include: {
        shop: {
          include: {
            market: { select: { id: true, name: true } },
          },
        },
        tenant: true,
        payments: {
          orderBy: { paidOn: "desc" },
          take: 1,
        },
      },
      orderBy: [{ year: "asc" }, { month: "asc" }, { shop: { shopNumber: "asc" } }],
    });

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1; // 1-12

    // Aggregate by Shop & Tenant
    const shopDueMap = new Map<string, any>();

    for (const bill of overdueBills) {
      const key = `${bill.shopId}_${bill.tenantId}`;

      // Calculate age in months
      const monthsDiff = (currentYear - bill.year) * 12 + (currentMonth - bill.month);

      let agingCategory: "CURRENT" | "ONE_MONTH" | "TWO_MONTHS" | "THREE_PLUS_MONTHS" = "CURRENT";
      if (monthsDiff <= 0) {
        agingCategory = "CURRENT";
      } else if (monthsDiff === 1) {
        agingCategory = "ONE_MONTH";
      } else if (monthsDiff === 2) {
        agingCategory = "TWO_MONTHS";
      } else {
        agingCategory = "THREE_PLUS_MONTHS";
      }

      if (!shopDueMap.has(key)) {
        shopDueMap.set(key, {
          shopId: bill.shop.id,
          shopNumber: bill.shop.shopNumber,
          floor: bill.shop.floor,
          marketId: bill.shop.market.id,
          marketName: bill.shop.market.name,
          tenantId: bill.tenant.id,
          tenantName: bill.tenant.name,
          phone: bill.tenant.phone,
          bills: [],
          totalDue: 0,
          currentMonthDue: 0,
          oldestOverdueMonth: bill.month,
          oldestOverdueYear: bill.year,
          maxAgingCategory: agingCategory,
          lastPaymentDate: bill.payments[0]?.paidOn || null,
        });
      }

      const item = shopDueMap.get(key);
      item.totalDue += bill.dueAmount;
      if (monthsDiff <= 0) {
        item.currentMonthDue += bill.dueAmount;
      }
      item.bills.push({
        id: bill.id,
        month: bill.month,
        year: bill.year,
        totalAmount: bill.totalAmount,
        paidAmount: bill.paidAmount,
        dueAmount: bill.dueAmount,
        status: bill.status,
        dueDate: bill.dueDate,
        agingCategory,
      });

      // Track worst aging category
      if (
        agingCategory === "THREE_PLUS_MONTHS" ||
        (agingCategory === "TWO_MONTHS" && item.maxAgingCategory !== "THREE_PLUS_MONTHS") ||
        (agingCategory === "ONE_MONTH" && item.maxAgingCategory === "CURRENT")
      ) {
        item.maxAgingCategory = agingCategory;
      }
    }

    let duesList = Array.from(shopDueMap.values());

    // Sort by largest due amount descending
    duesList.sort((a, b) => b.totalDue - a.totalDue);

    if (search && search.trim() !== "") {
      const q = search.trim();
      duesList = duesList.filter(
        (d) =>
          matchesSearchWithDigits(d.shopNumber, q) ||
          matchesSearchWithDigits(d.marketName, q) ||
          matchesSearchWithDigits(d.tenantName, q) ||
          matchesSearchWithDigits(d.phone, q)
      );
    }

    // Summary statistics
    const totalOutstanding = duesList.reduce((acc, d) => acc + d.totalDue, 0);
    const agingBreakdown = {
      current: duesList
        .filter((d) => d.maxAgingCategory === "CURRENT")
        .reduce((sum, d) => sum + d.totalDue, 0),
      oneMonth: duesList
        .filter((d) => d.maxAgingCategory === "ONE_MONTH")
        .reduce((sum, d) => sum + d.totalDue, 0),
      twoMonths: duesList
        .filter((d) => d.maxAgingCategory === "TWO_MONTHS")
        .reduce((sum, d) => sum + d.totalDue, 0),
      threePlusMonths: duesList
        .filter((d) => d.maxAgingCategory === "THREE_PLUS_MONTHS")
        .reduce((sum, d) => sum + d.totalDue, 0),
    };

    return NextResponse.json(
      {
        dues: duesList,
        totalOutstanding,
        overdueShopsCount: duesList.length,
        agingBreakdown,
      },
      {
        headers: {
          "Cache-Control": "private, no-cache, stale-while-revalidate=5",
        },
      }
    );
  } catch (error) {
    console.error("Failed to fetch dues:", error);
    return NextResponse.json({ error: "Failed to fetch dues" }, { status: 500 });
  }
}
