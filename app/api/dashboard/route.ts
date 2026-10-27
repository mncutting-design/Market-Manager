import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { calculateFinancialStatement, getDhakaMonthRange } from "@/lib/accounting";
import { computeDepositBalance } from "@/lib/deposit-ledger";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const marketId = searchParams.get("marketId") || "ALL";
    const month = searchParams.get("month") ? parseInt(searchParams.get("month")!, 10) : 10;
    const year = searchParams.get("year") ? parseInt(searchParams.get("year")!, 10) : 2026;

    const { startDate: periodStart, endDate: periodEnd } = getDhakaMonthRange(year, month);

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

    const paymentDateStart = new Date(year, month - 1, 1);
    const paymentDateEnd = new Date(year, month, 0, 23, 59, 59);

    const paymentWhere: any = {
      createdAt: { gte: paymentDateStart, lte: paymentDateEnd },
    };
    if (marketId !== "ALL") {
      paymentWhere.bill = { shop: { marketId } };
    }

    const depositWhere: any = {
      status: "POSTED",
      transactionDate: { lte: periodEnd },
    };
    if (marketId !== "ALL") {
      depositWhere.marketId = marketId;
    }

    // Execute database queries concurrently via Promise.all for maximum speed
    const [
      currentBills,
      currentExpenses,
      yearlyBills,
      yearlyExpenses,
      allMarkets,
      activeTenants,
      currentPayments,
      pendingChangeRequests,
      pendingTopUps,
      pendingDepositRefunds,
      historicalDepositTxs,
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
          depositTransactions: {
            where: { status: "POSTED" },
            include: { reversesTransaction: true },
          },
          bills: {
            where: { status: { in: ["DUE", "PARTIAL"] } },
            orderBy: [{ year: "asc" }, { month: "asc" }],
          },
        },
      }),
      // 7. Current month payments for channels & collectors
      prisma.payment.findMany({
        where: paymentWhere,
        include: {
          receivedByUser: { select: { id: true, name: true } },
          paymentAccount: { select: { id: true, name_en: true, name_bn: true, number: true, accountType: true } },
        },
      }),
      // 8. Pending change requests
      prisma.changeRequest.count({
        where: { status: "PENDING" },
      }),
      // 9. Pending top-up requests
      prisma.advanceTopUpRequest.count({
        where: { status: "PENDING" },
      }),
      // 10. Pending deposit refund requests
      prisma.depositTransaction.count({
        where: { status: "PENDING_APPROVAL" },
      }),
      // 11. Historical deposit transactions up to periodEnd
      prisma.depositTransaction.findMany({
        where: depositWhere,
        include: { reversesTransaction: true },
      }),
    ]);

    const expectedRent = currentBills.reduce((sum, b) => sum + b.totalAmount, 0);
    const collectedRent = currentBills.reduce((sum, b) => sum + b.paidAmount, 0);
    const currentMonthDue = currentBills.reduce((sum, b) => sum + b.dueAmount, 0);

    // Calculate prior unpaid arrears for active shops up to the selected month/year
    const priorBillsWhere: any = {
      OR: [
        { year: { lt: year } },
        { year, month: { lt: month } },
      ],
    };
    if (marketId !== "ALL") {
      priorBillsWhere.shop = { marketId, isActive: true };
    } else {
      priorBillsWhere.shop = { isActive: true };
    }

    const priorBills = await prisma.bill.findMany({
      where: priorBillsWhere,
      select: {
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
    });

    const unpaidByShop = new Map<string, number>();
    for (const b of priorBills) {
      const bItems = b.billItems.reduce((acc, i) => acc + i.amount, 0);
      const bBilled = Math.max(b.totalAmount, b.rentAmount + bItems);
      const bPaid = Math.max(b.paidAmount, b.payments.reduce((acc, pay) => acc + pay.amount, 0));
      const bDue = Math.max(0, bBilled - bPaid);
      unpaidByShop.set(b.shopId, (unpaidByShop.get(b.shopId) || 0) + bDue);
    }

    let priorArrears = 0;
    for (const due of unpaidByShop.values()) {
      priorArrears += due;
    }
    const totalDue = currentMonthDue + priorArrears; // Total outstanding portfolio due (Current + Prior Arrears)

    const paidShopsCount = currentBills.filter((b) => b.status === "PAID").length;
    const partialShopsCount = currentBills.filter((b) => b.status === "PARTIAL").length;
    const dueShopsCount = currentBills.filter((b) => b.status === "DUE").length;
    const totalBillsCount = currentBills.length;

    const collectionRate = expectedRent > 0 ? (collectedRent / expectedRent) * 100 : 0;

    const totalExpense = currentExpenses.reduce((sum, e) => sum + e.amount, 0);
    const netProfit = collectedRent - totalExpense;

    // 3. Due shops list for quick action (including prior arrears)
    const dueShops = currentBills
      .map((b) => {
        const carryForwardDue = unpaidByShop.get(b.shop.id) || 0;
        const totalDueWithArrears = b.dueAmount + carryForwardDue;
        return {
          billId: b.id,
          shopId: b.shop.id,
          shopNumber: b.shop.shopNumber,
          floor: b.shop.floor,
          marketId: b.shop.marketId || b.shop.market?.id,
          marketName: b.shop.market.name,
          tenantName: b.tenant.name,
          phone: b.tenant.phone,
          totalAmount: b.totalAmount,
          paidAmount: b.paidAmount,
          currentMonthDue: b.dueAmount,
          carryForwardDue,
          dueAmount: totalDueWithArrears, // full payable amount with arrears
          totalDueWithArrears,
          status: totalDueWithArrears === 0 ? "PAID" : b.paidAmount > 0 ? "PARTIAL" : "DUE",
        };
      })
      .filter((s) => s.dueAmount > 0)
      .sort((a, b) => b.dueAmount - a.dueAmount)
      .slice(0, 10);

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

    // Financial statement from single source of truth (lib/accounting.ts)
    const currentMonthDepositTxs = historicalDepositTxs.filter((tx) => {
      const dt = tx.transactionDate || tx.createdAt;
      return dt >= periodStart && dt <= periodEnd;
    });

    const financialStatement = calculateFinancialStatement({
      period: { startDate: periodStart, endDate: periodEnd, year, month },
      payments: currentPayments.map((p) => ({
        amount: p.amount,
        paidOn: p.createdAt,
        method: p.method,
      })),
      expenses: currentExpenses.map((e) => ({
        amount: e.amount,
        date: e.date,
        marketId: e.marketId,
      })),
      depositTransactions: currentMonthDepositTxs,
      allHistoricalDepositTransactions: historicalDepositTxs,
    });

    const depositReceived = financialStatement.collection.depositReceived;
    const depositRefunded = financialStatement.outflow.depositRefunded;
    const depositUsed = financialStatement.outflow.depositUsed;
    const depositNetMovement = depositReceived - depositRefunded - depositUsed;
    const depositHeld = financialStatement.summary.depositHeldAtPeriodEnd;

    // 6. Market Profitability Comparison (Ranked by Operating Profit, secondary Net Cash Flow)
    const marketRankings = allMarkets.map((m) => {
      const mBills = m.shops.flatMap((s) => s.bills);
      const mCollected = mBills.reduce((sum, b) => sum + b.paidAmount, 0);
      const mExpected = mBills.reduce((sum, b) => sum + b.totalAmount, 0);
      const mExpenses = m.expenses.reduce((sum, e) => sum + e.amount, 0);

      // Deposit activity for this market
      const mDepositTxs = currentMonthDepositTxs.filter((tx) => tx.marketId === m.id);
      let mDepositReceived = 0;
      let mDepositRefunded = 0;
      let mRentFromDeposit = 0;
      let mOtherIncomeFromDeposit = 0;

      for (const d of mDepositTxs) {
        const amt = d.amount || 0;
        if (d.type === "RECEIVED" || d.type === "TOPUP" || d.type === "DEPOSIT_RECEIVED") {
          mDepositReceived += amt;
        } else if (d.type === "REFUND") {
          mDepositRefunded += amt;
        } else if (d.type === "ADJUSTED_TO_DUE") {
          mRentFromDeposit += amt;
        } else if (d.type === "DEDUCTION") {
          mOtherIncomeFromDeposit += amt;
        }
      }

      // Operating Profit excludes deposit received and refunded
      const mOperatingProfit = (mCollected + mRentFromDeposit + mOtherIncomeFromDeposit) - mExpenses;
      // Net Cash Flow = Total Inflow - Total Outflow
      const mNetCashFlow = (mCollected + mDepositReceived) - (mExpenses + mDepositRefunded);

      return {
        id: m.id,
        name: m.name,
        expected: Math.round(mExpected / 100),
        collected: Math.round(mCollected / 100),
        expense: Math.round(mExpenses / 100),
        operatingProfit: Math.round(mOperatingProfit / 100),
        rawOperatingProfit: mOperatingProfit,
        netCashFlow: Math.round(mNetCashFlow / 100),
        rawNetCashFlow: mNetCashFlow,
        netProfit: Math.round(mOperatingProfit / 100), // backward compatibility
        rawNetProfit: mOperatingProfit,
        collectionRate: mExpected > 0 ? Math.round((mCollected / mExpected) * 100) : 0,
      };
    });

    marketRankings.sort((a, b) => {
      if (b.rawOperatingProfit !== a.rawOperatingProfit) {
        return b.rawOperatingProfit - a.rawOperatingProfit;
      }
      return b.rawNetCashFlow - a.rawNetCashFlow;
    });
    const mostProfitableMarket = marketRankings[0] || null;

    let totalAdvanceHeld = depositHeld;
    const atRiskTenants: any[] = [];

    for (const t of activeTenants) {
      // Use new depositTransactions ledger, fallback to advanceDeposit if empty
      let advanceBal = 0;
      if (t.depositTransactions && t.depositTransactions.length > 0) {
        advanceBal = computeDepositBalance(t.depositTransactions);
      } else if (t.advanceTransactions && t.advanceTransactions.length > 0) {
        for (const tx of t.advanceTransactions) {
          if (tx.type === "DEPOSIT_RECEIVED" || tx.type === "TOPUP") {
            advanceBal += tx.amount;
          } else if (tx.type === "ADJUSTED_TO_DUE" || tx.type === "DEDUCTION" || tx.type === "REFUND") {
            advanceBal -= tx.amount;
          }
        }
      } else {
        advanceBal = t.advanceDeposit || 0;
      }
      advanceBal = Math.max(0, advanceBal);

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

    // Aggregations for payments by method / channel
    const channelTotals: Record<string, { count: number; amount: number }> = {
      CASH: { count: 0, amount: 0 },
      BKASH: { count: 0, amount: 0 },
      NAGAD: { count: 0, amount: 0 },
      BANK: { count: 0, amount: 0 },
      CHEQUE: { count: 0, amount: 0 },
    };
    for (const p of currentPayments) {
      const m = p.method || "CASH";
      if (!channelTotals[m]) channelTotals[m] = { count: 0, amount: 0 };
      channelTotals[m].count++;
      channelTotals[m].amount += p.amount;
    }

    // Aggregations for payments by collector
    const collectorMap = new Map<string, { id: string; name: string; amount: number; count: number }>();
    for (const p of currentPayments) {
      const colId = p.receivedById || "unassigned";
      const colName = p.receivedByUser?.name || p.receivedBy || "Direct / Admin";
      if (!collectorMap.has(colId)) {
        collectorMap.set(colId, { id: colId, name: colName, amount: 0, count: 0 });
      }
      const item = collectorMap.get(colId)!;
      item.amount += p.amount;
      item.count++;
    }
    const collectorBreakdown = Array.from(collectorMap.values()).sort((a, b) => b.amount - a.amount);

    const pendingApprovalsCount = pendingChangeRequests + pendingTopUps + pendingDepositRefunds;

    return NextResponse.json(
      {
        kpis: {
          expectedRent, // in paisa
          collectedRent,
          currentMonthDue,
          priorArrears,
          totalDue, // Total portfolio due including prior arrears
          totalExpense,
          netProfit: financialStatement.summary.operatingProfit,
          operatingProfit: financialStatement.summary.operatingProfit,
          netCashFlow: financialStatement.summary.netCashFlow,
          collectionRate,
          paidShopsCount,
          partialShopsCount,
          dueShopsCount,
          totalBillsCount,
          totalAdvanceHeld: depositHeld, // in paisa (Liability)
          depositHeld,
          depositMovement: {
            received: depositReceived,
            refunded: depositRefunded,
            used: depositUsed,
            net: depositNetMovement,
          },
          atRiskTenantsCount: atRiskTenants.length,
          pendingApprovalsCount,
          pendingDepositRefundsCount: pendingDepositRefunds,
        },
        collectionsByChannel: channelTotals,
        collectionsByCollector: collectorBreakdown,
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
