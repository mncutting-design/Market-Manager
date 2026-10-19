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

    const yearlyExpenseStart = new Date(year, 0, 1);
    const yearlyExpenseEnd = new Date(year, 11, 31, 23, 59, 59);

    const tenantWhere: any = { isActive: true, status: { in: ["ACTIVE", "NOTICE_GIVEN"] } };
    if (marketId !== "ALL") {
      tenantWhere.shop = { marketId, isActive: true };
    }

    // Execute all 6 database queries concurrently via Promise.all for maximum speed
    const [
      currentBills,
      currentExpenses,
      yearlyBills,
      yearlyExpenses,
      allMarkets,
      activeTenants,
    ] = await Promise.all([
      // 1. Current month bills
      prisma.bill.findMany({
        where: billWhere,
        include: {
          shop: { include: { market: true } },
          tenant: true,
        },
        orderBy: { dueAmount: "desc" },
      }),
      // 2. Current month expenses
      prisma.expense.findMany({
        where: expenseWhere,
        include: {
          category: true,
          market: true,
        },
      }),
      // 3. Yearly bills for trends
      prisma.bill.findMany({
        where: {
          year,
          ...(marketId !== "ALL" ? { shop: { marketId, isActive: true } } : { shop: { isActive: true } }),
        },
        select: {
          month: true,
          totalAmount: true,
          paidAmount: true,
        },
      }),
      // 4. Yearly expenses for trends
      prisma.expense.findMany({
        where: {
          date: { gte: yearlyExpenseStart, lte: yearlyExpenseEnd },
          ...(marketId !== "ALL" ? { marketId } : {}),
        },
        select: {
          date: true,
          amount: true,
        },
      }),
      // 5. Market rankings
      prisma.market.findMany({
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
      }),
      // 6. Active tenants & advance calculations
      prisma.tenant.findMany({
        where: tenantWhere,
        include: {
          shop: { include: { market: true } },
          advanceTransactions: true,
          bills: {
            where: { status: { in: ["DUE", "PARTIAL"] } },
            orderBy: [{ year: "asc" }, { month: "asc" }],
          },
        },
      }),
    ]);

    const expectedRent = currentBills.reduce((sum, b) => sum + b.totalAmount, 0);
    const collectedRent = currentBills.reduce((sum, b) => sum + b.paidAmount, 0);
    const totalDue = currentBills.reduce((sum, b) => sum + b.dueAmount, 0);

    const paidShopsCount = currentBills.filter((b) => b.status === "PAID").length;
    const partialShopsCount = currentBills.filter((b) => b.status === "PARTIAL").length;
    const dueShopsCount = currentBills.filter((b) => b.status === "DUE").length;
    const totalBillsCount = currentBills.length;

    const collectionRate = expectedRent > 0 ? (collectedRent / expectedRent) * 100 : 0;

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

    marketRankings.sort((a, b) => b.rawNetProfit - a.rawNetProfit);
    const mostProfitableMarket = marketRankings[0] || null;

    let totalAdvanceHeld = 0;
    const atRiskTenants: any[] = [];

    for (const t of activeTenants) {
      let txs = t.advanceTransactions;
      if (txs.length === 0 && t.advanceDeposit > 0) {
        txs = [{
          type: "DEPOSIT_RECEIVED",
          amount: t.advanceDeposit,
        } as any];
      }

      // Compute advance balance
      let advanceBal = 0;
      for (const tx of txs) {
        if (tx.type === "DEPOSIT_RECEIVED" || tx.type === "TOPUP") {
          advanceBal += tx.amount;
        } else if (tx.type === "ADJUSTED_TO_DUE" || tx.type === "DEDUCTION" || tx.type === "REFUND") {
          advanceBal -= tx.amount;
        }
      }
      advanceBal = Math.max(0, advanceBal);
      totalAdvanceHeld += advanceBal;

      // Evaluate risk
      const unpaidBills = t.bills.map((b) => ({
        month: b.month,
        year: b.year,
        dueAmount: b.dueAmount,
      }));

      const tenantDue = unpaidBills.reduce((acc, b) => acc + b.dueAmount, 0);

      if (tenantDue > 0) {
        const overdueMonthsCount = unpaidBills.length;
        const ratio = advanceBal > 0 ? tenantDue / advanceBal : 9.99;

        if (overdueMonthsCount >= 2 || ratio >= 0.8) {
          const isCritical = overdueMonthsCount >= 3 || ratio >= 1.0;
          atRiskTenants.push({
            tenantId: t.id,
            tenantName: t.name,
            phone: t.phone,
            shopId: t.shop.id,
            shopNumber: t.shop.shopNumber,
            floor: t.shop.floor,
            marketId: t.shop.marketId,
            marketName: t.shop.market.name,
            rentAmount: t.rentAmount,
            advanceBalance: advanceBal,
            totalDue: tenantDue,
            overdueMonthsCount,
            dueToAdvanceRatio: Math.min(9.99, ratio),
            riskLevel: isCritical ? "CRITICAL" : "WARNING",
            eligibleForSettlement: isCritical,
            unpaidBillsCount: unpaidBills.length,
          });
        }
      }
    }

    // Sort atRiskTenants: CRITICAL first, then highest due
    atRiskTenants.sort((a, b) => {
      if (a.riskLevel !== b.riskLevel) {
        return a.riskLevel === "CRITICAL" ? -1 : 1;
      }
      return b.totalDue - a.totalDue;
    });

    return NextResponse.json(
      {
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
          totalAdvanceHeld, // in paisa (Liability)
          atRiskTenantsCount: atRiskTenants.length,
        },
        atRiskTenants,
        dueShops,
        expensesByCategory,
        monthlyTrends,
        marketRankings,
        mostProfitableMarket,
      },
      {
        headers: {
          "Cache-Control": "private, no-cache, stale-while-revalidate=5",
        },
      }
    );
  } catch (error) {
    console.error("Dashboard API error:", error);
    return NextResponse.json({ error: "Failed to load dashboard data" }, { status: 500 });
  }
}
