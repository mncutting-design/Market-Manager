import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";


export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const reportType = searchParams.get("type") || "monthly_collection";
    const marketId = searchParams.get("marketId") || "ALL";
    const month = searchParams.get("month") ? parseInt(searchParams.get("month")!, 10) : 10;
    const year = searchParams.get("year") ? parseInt(searchParams.get("year")!, 10) : 2026;
    const tenantId = searchParams.get("tenantId");

    // 1. Monthly Collection Report
    if (reportType === "monthly_collection") {
      const where: any = { month, year };
      if (marketId !== "ALL") {
        where.shop = { marketId, isActive: true };
      } else {
        where.shop = { isActive: true };
      }

      const bills = await prisma.bill.findMany({
        where,
        include: {
          shop: { include: { market: true } },
          tenant: true,
          payments: true,
        },
        orderBy: [{ shop: { marketId: "asc" } }, { shop: { shopNumber: "asc" } }],
      });

      const rows = bills.map((b) => ({
        marketName: b.shop.market.name,
        shopNumber: b.shop.shopNumber,
        floor: b.shop.floor,
        tenantName: b.tenant.name,
        phone: b.tenant.phone,
        rentAmount: b.rentAmount,
        totalAmount: b.totalAmount,
        paidAmount: b.paidAmount,
        dueAmount: b.dueAmount,
        status: b.status,
        lastPaymentDate: b.payments[0]?.paidOn || null,
      }));

      return NextResponse.json({ reportType, rows });
    }

    // 2. Market Profit & Loss Statement
    if (reportType === "market_pnl") {
      const markets = await prisma.market.findMany({
        where: marketId !== "ALL" ? { id: marketId, isActive: true } : { isActive: true },
        include: {
          shops: {
            where: { isActive: true },
            include: {
              bills: {
                where: { year },
              },
              tenants: {
                where: { isActive: true },
                include: { advanceTransactions: true },
              },
            },
          },
          expenses: {
            where: {
              date: {
                gte: new Date(year, 0, 1),
                lte: new Date(year, 11, 31, 23, 59, 59),
              },
            },
          },
        },
      });

      const rows = markets.map((m) => {
        const bills = m.shops.flatMap((s) => s.bills);
        const totalBilled = bills.reduce((sum, b) => sum + b.totalAmount, 0);
        const totalCollected = bills.reduce((sum, b) => sum + b.paidAmount, 0);
        const totalDue = bills.reduce((sum, b) => sum + b.dueAmount, 0);
        const totalExpenses = m.expenses.reduce((sum, e) => sum + e.amount, 0);
        const netProfit = totalCollected - totalExpenses;
        const collectionRate = totalBilled > 0 ? (totalCollected / totalBilled) * 100 : 0;

        // Advance held is a LIABILITY, never recognized as revenue or profit
        let advanceLiability = 0;
        for (const shop of m.shops) {
          for (const t of (shop as any).tenants || []) {
            let bal = 0;
            for (const tx of t.advanceTransactions || []) {
              if (tx.type === "DEPOSIT_RECEIVED" || tx.type === "TOPUP") bal += tx.amount;
              else if (tx.type === "ADJUSTED_TO_DUE" || tx.type === "DEDUCTION" || tx.type === "REFUND") bal -= tx.amount;
            }
            advanceLiability += Math.max(0, bal);
          }
        }

        return {
          marketId: m.id,
          marketName: m.name,
          totalShops: m.shops.length,
          totalBilled,
          totalCollected,
          totalDue,
          totalExpenses,
          netProfit,
          collectionRate,
          advanceLiability, // Liability line item!
        };
      });

      return NextResponse.json({ reportType, rows });
    }

    // 2b. Settlements Report
    if (reportType === "settlements") {
      const settlementWhere: any = {};
      if (marketId !== "ALL") {
        settlementWhere.shop = { marketId };
      }

      const settlements = await prisma.settlement.findMany({
        where: settlementWhere,
        include: {
          tenant: true,
          shop: { include: { market: true } },
        },
        orderBy: { settledAt: "desc" },
      });

      const rows = settlements.map((s) => ({
        id: s.id,
        settledAt: s.settledAt,
        marketName: s.shop.market.name,
        shopNumber: s.shop.shopNumber,
        floor: s.shop.floor,
        tenantName: s.tenant.name,
        phone: s.tenant.phone,
        totalDue: s.totalDue,
        advanceBalance: s.advanceBalance,
        totalDeductions: s.totalDeductions,
        refundAmount: s.refundAmount,
        unrecoveredAmount: s.unrecoveredAmount,
        status: s.status,
        confirmedBy: s.confirmedBy,
        notes: s.notes,
      }));

      const totalRefunded = rows.reduce((acc, r) => acc + r.refundAmount, 0);
      const totalUnrecovered = rows.reduce((acc, r) => acc + r.unrecoveredAmount, 0);

      return NextResponse.json({
        reportType,
        totalRefunded,
        totalUnrecovered,
        rows,
      });
    }

    // 2c. Unrecovered Receivables Report
    if (reportType === "unrecovered_receivables") {
      const settlementWhere: any = {
        unrecoveredAmount: { gt: 0 },
      };
      if (marketId !== "ALL") {
        settlementWhere.shop = { marketId };
      }

      const settlements = await prisma.settlement.findMany({
        where: settlementWhere,
        include: {
          tenant: true,
          shop: { include: { market: true } },
        },
        orderBy: { unrecoveredAmount: "desc" },
      });

      const rows = settlements.map((s) => ({
        id: s.id,
        settledAt: s.settledAt,
        marketName: s.shop.market.name,
        shopNumber: s.shop.shopNumber,
        floor: s.shop.floor,
        tenantName: s.tenant.name,
        phone: s.tenant.phone,
        totalDue: s.totalDue,
        advanceBalance: s.advanceBalance,
        totalDeductions: s.totalDeductions,
        unrecoveredAmount: s.unrecoveredAmount,
        notes: s.notes,
        confirmedBy: s.confirmedBy,
      }));

      const totalUnrecovered = rows.reduce((acc, r) => acc + r.unrecoveredAmount, 0);

      return NextResponse.json({
        reportType,
        totalUnrecovered,
        rows,
      });
    }

    // 3. Category-wise Expense Report
    if (reportType === "expense_by_category") {
      const startDate = new Date(year, 0, 1);
      const endDate = new Date(year, 11, 31, 23, 59, 59);

      const expenses = await prisma.expense.findMany({
        where: {
          date: { gte: startDate, lte: endDate },
          ...(marketId !== "ALL" ? { marketId } : {}),
        },
        include: {
          category: true,
          market: true,
        },
        orderBy: { date: "desc" },
      });

      const catMap = new Map<string, any>();
      let totalAllExpenses = 0;

      for (const exp of expenses) {
        totalAllExpenses += exp.amount;
        if (!catMap.has(exp.categoryId)) {
          catMap.set(exp.categoryId, {
            categoryId: exp.categoryId,
            name_en: exp.category.name_en,
            name_bn: exp.category.name_bn,
            color: exp.category.color,
            totalAmount: 0,
            count: 0,
            items: [],
          });
        }
        const catObj = catMap.get(exp.categoryId);
        catObj.totalAmount += exp.amount;
        catObj.count += 1;
        catObj.items.push({
          date: exp.date,
          marketName: exp.market.name,
          amount: exp.amount,
          description: exp.description,
          paymentMethod: exp.paymentMethod,
        });
      }

      const rows = Array.from(catMap.values()).map((c) => ({
        ...c,
        percentage: totalAllExpenses > 0 ? (c.totalAmount / totalAllExpenses) * 100 : 0,
      }));

      rows.sort((a, b) => b.totalAmount - a.totalAmount);

      return NextResponse.json({ reportType, totalAllExpenses, rows });
    }

    // 4. Tenant Ledger
    if (reportType === "tenant_ledger") {
      if (!tenantId) {
        // Return active tenants list for selection
        const tenants = await prisma.tenant.findMany({
          where: { isActive: true },
          include: {
            shop: { include: { market: true } },
          },
          orderBy: { name: "asc" },
        });

        return NextResponse.json({
          reportType,
          availableTenants: tenants.map((t) => ({
            id: t.id,
            name: t.name,
            phone: t.phone,
            shopNumber: t.shop.shopNumber,
            marketName: t.shop.market.name,
          })),
        });
      }

      const tenant = await prisma.tenant.findUnique({
        where: { id: tenantId },
        include: {
          shop: { include: { market: true } },
          bills: {
            include: {
              billItems: true,
              payments: { orderBy: { paidOn: "asc" } },
            },
            orderBy: [{ year: "asc" }, { month: "asc" }],
          },
        },
      });

      if (!tenant) {
        return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
      }

      // Build Chronological Ledger Transactions
      const transactions: any[] = [];
      let runningBalance = 0;

      for (const bill of tenant.bills) {
        // Invoice Entry
        runningBalance += bill.totalAmount;
        transactions.push({
          id: `bill-${bill.id}`,
          date: bill.createdAt,
          period: `${bill.month}/${bill.year}`,
          type: "INVOICE",
          description: `ভাড়া ও সার্ভিস চার্জ (${bill.month}/${bill.year})`,
          debit: bill.totalAmount, // Increases amount owed
          credit: 0,
          balance: runningBalance,
        });

        // Payments on this bill
        for (const payment of bill.payments) {
          runningBalance -= payment.amount;
          transactions.push({
            id: `pay-${payment.id}`,
            date: payment.paidOn,
            period: `${bill.month}/${bill.year}`,
            type: "PAYMENT",
            description: `ভাড়া জমা (${payment.method}${payment.reference ? ` - ${payment.reference}` : ""})`,
            debit: 0,
            credit: payment.amount, // Decreases amount owed
            balance: runningBalance,
          });
        }
      }

      return NextResponse.json({
        reportType,
        tenant: {
          id: tenant.id,
          name: tenant.name,
          phone: tenant.phone,
          nid: tenant.nid,
          advanceDeposit: tenant.advanceDeposit,
          rentAmount: tenant.rentAmount,
          shopNumber: tenant.shop.shopNumber,
          marketName: tenant.shop.market.name,
        },
        transactions,
        totalBilled: tenant.bills.reduce((sum, b) => sum + b.totalAmount, 0),
        totalPaid: tenant.bills.reduce((sum, b) => sum + b.paidAmount, 0),
        currentOutstandingDue: runningBalance,
      });
    }

    return NextResponse.json({ error: "Unknown report type" }, { status: 400 });
  } catch (error) {
    console.error("Reports API error:", error);
    return NextResponse.json({ error: "Failed to load report data" }, { status: 500 });
  }
}
