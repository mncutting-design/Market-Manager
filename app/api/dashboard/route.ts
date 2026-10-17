import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";


export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const marketId = searchParams.get("marketId") || "ALL";
    const month = searchParams.get("month") ? parseInt(searchParams.get("month")!, 10) : 10;
    const year = searchParams.get("year") ? parseInt(searchParams.get("year")!, 10) : 2026;

    // Filter conditions
    const billWhere: any = { month, year };
    const expenseDateStart = new Date(year, month - 1, 1);
    const expenseDateEnd = new Date(year, month, 0, 23, 59, 59);

    const expenseWhere: any = {
      date: {
        gte: expenseDateStart,
        lte: expenseDateEnd,
      },
    };

    if (marketId !== "ALL") {
      billWhere.shop = { marketId, isActive: true };
      expenseWhere.marketId = marketId;
    } else {
      billWhere.shop = { isActive: true };
    }

    // 1. Fetch current month bills
    const currentBills = await prisma.bill.findMany({
      where: billWhere,
      include: {
        shop: { include: { market: true } },
        tenant: true,
      },
      orderBy: { dueAmount: "desc" },
    });

    const expectedRent = currentBills.reduce((sum, b) => sum + b.totalAmount, 0);
    const collectedRent = currentBills.reduce((sum, b) => sum + b.paidAmount, 0);
    const totalDue = currentBills.reduce((sum, b) => sum + b.dueAmount, 0);

    const paidShopsCount = currentBills.filter((b) => b.status === "PAID").length;
    const partialShopsCount = currentBills.filter((b) => b.status === "PARTIAL").length;
    const dueShopsCount = currentBills.filter((b) => b.status === "DUE").length;
    const totalBillsCount = currentBills.length;

    const collectionRate = expectedRent > 0 ? (collectedRent / expectedRent) * 100 : 0;

    // 2. Fetch current month expenses
    const currentExpenses = await prisma.expense.findMany({
      where: expenseWhere,
      include: {
        category: true,
        market: true,
      },
    });

    const totalExpense = currentExpenses.reduce((sum, e) => sum + e.amount, 0);
    const netProfit = collectedRent - totalExpense;

    // 3. Due shops list for quick action
    const dueShops = currentBills
      .filter((b) => b.dueAmount > 0)
      .slice(0, 10)
      .map((b) => ({
        billId: b.id,
        shopId: b.shop.id,
        shopNumber: b.shop.shopNumber,
        floor: b.shop.floor,
        marketName: b.shop.market.name,
        tenantName: b.tenant.name,
        phone: b.tenant.phone,
        totalAmount: b.totalAmount,
        paidAmount: b.paidAmount,
        dueAmount: b.dueAmount,
        status: b.status,
      }));

    // 4. Expenses by category (donut chart + ranked list)
    const categoryMap = new Map<string, { id: string; name_en: string; name_bn: string; color: string; icon: string; amount: number }>();

    for (const exp of currentExpenses) {
      const cat = exp.category;
      if (!categoryMap.has(cat.id)) {
        categoryMap.set(cat.id, {
          id: cat.id,
          name_en: cat.name_en,
          name_bn: cat.name_bn,
          color: cat.color,
          icon: cat.icon,
          amount: 0,
        });
      }
      categoryMap.get(cat.id)!.amount += exp.amount;
    }

    const expensesByCategory = Array.from(categoryMap.values()).map((c) => ({
      ...c,
      percentage: totalExpense > 0 ? (c.amount / totalExpense) * 100 : 0,
    }));
    expensesByCategory.sort((a, b) => b.amount - a.amount);

    // 5. 12-Month Financial Performance for Yearly Charts
    const yearlyBills = await prisma.bill.findMany({
      where: {
        year,
        ...(marketId !== "ALL" ? { shop: { marketId, isActive: true } } : { shop: { isActive: true } }),
      },
      select: {
        month: true,
        totalAmount: true,
        paidAmount: true,
      },
    });

    const yearlyExpenseStart = new Date(year, 0, 1);
    const yearlyExpenseEnd = new Date(year, 11, 31, 23, 59, 59);

    const yearlyExpenses = await prisma.expense.findMany({
      where: {
        date: { gte: yearlyExpenseStart, lte: yearlyExpenseEnd },
        ...(marketId !== "ALL" ? { marketId } : {}),
      },
      select: {
        date: true,
        amount: true,
      },
    });

    const monthlyTrends = Array.from({ length: 12 }, (_, i) => {
      const m = i + 1;
      const mBills = yearlyBills.filter((b) => b.month === m);
      const mExp = yearlyExpenses.filter((e) => new Date(e.date).getMonth() + 1 === m);

      const mExpected = mBills.reduce((sum, b) => sum + b.totalAmount, 0);
      const mCollected = mBills.reduce((sum, b) => sum + b.paidAmount, 0);
      const mExpense = mExp.reduce((sum, e) => sum + e.amount, 0);
      const mProfit = mCollected - mExpense;
      const mRate = mExpected > 0 ? Math.round((mCollected / mExpected) * 100) : 0;

      return {
        month: m,
        expected: Math.round(mExpected / 100), // in BDT for Recharts
        collected: Math.round(mCollected / 100),
        expense: Math.round(mExpense / 100),
        profit: Math.round(mProfit / 100),
        collectionRate: mRate,
      };
    });

    // 6. Market Profitability Comparison
    const allMarkets = await prisma.market.findMany({
      where: { isActive: true },
      include: {
        shops: {
          where: { isActive: true },
          include: {
            bills: {
              where: { month, year },
            },
          },
        },
        expenses: {
          where: {
            date: { gte: expenseDateStart, lte: expenseDateEnd },
          },
        },
      },
    });

    const marketRankings = allMarkets.map((m) => {
      const mBills = m.shops.flatMap((s) => s.bills);
      const mCollected = mBills.reduce((sum, b) => sum + b.paidAmount, 0);
      const mExpected = mBills.reduce((sum, b) => sum + b.totalAmount, 0);
      const mExpenses = m.expenses.reduce((sum, e) => sum + e.amount, 0);
      const mProfit = mCollected - mExpenses;

      return {
        id: m.id,
        name: m.name,
        expected: Math.round(mExpected / 100),
        collected: Math.round(mCollected / 100),
        expense: Math.round(mExpenses / 100),
        netProfit: Math.round(mProfit / 100),
        rawNetProfit: mProfit, // in paisa
        collectionRate: mExpected > 0 ? Math.round((mCollected / mExpected) * 100) : 0,
      };
    });

    // Sort by net profit descending
    marketRankings.sort((a, b) => b.rawNetProfit - a.rawNetProfit);
    const mostProfitableMarket = marketRankings[0] || null;

    return NextResponse.json({
      kpis: {
        expectedRent, // in paisa
        collectedRent,
        totalDue,
        totalExpense,
        netProfit,
        collectionRate,
        paidShopsCount,
        partialShopsCount,
        dueShopsCount,
        totalBillsCount,
      },
      dueShops,
      expensesByCategory,
      monthlyTrends,
      marketRankings,
      mostProfitableMarket,
    });
  } catch (error) {
    console.error("Dashboard API error:", error);
    return NextResponse.json({ error: "Failed to load dashboard data" }, { status: 500 });
  }
}
