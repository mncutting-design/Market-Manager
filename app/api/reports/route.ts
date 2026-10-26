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
      const where: any = { year };
      if (month && month > 0 && month <= 12) {
        where.month = month;
      }
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
          billItems: { include: { chargeType: true } },
        },
        orderBy: [{ shop: { marketId: "asc" } }, { shop: { shopNumber: "asc" } }],
      });

      // Batch query all bills for the shops to calculate cumulative arrears
      const shopIds = Array.from(new Set(bills.map((b) => b.shopId)));
      const allShopBills = shopIds.length > 0
        ? await prisma.bill.findMany({
            where: {
              shopId: { in: shopIds },
            },
            select: {
              shopId: true,
              year: true,
              month: true,
              rentAmount: true,
              totalAmount: true,
              paidAmount: true,
              dueAmount: true,
              billItems: { select: { amount: true, description: true } },
              payments: { select: { amount: true, paidOn: true } },
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

      const rows = bills.map((b) => {
        const itemsTotal = (b.billItems || []).reduce((acc: number, item: any) => acc + (item.amount || 0), 0);
        const utilityAmount = itemsTotal > 0 ? itemsTotal : Math.max(0, b.totalAmount - b.rentAmount);
        const currentMonthBill = b.rentAmount + utilityAmount;

        const shopAllBills = billsByShop.get(b.shopId) || [];
        const priorBills = shopAllBills
          .filter((p) => p.year < b.year || (p.year === b.year && p.month < b.month))
          .sort((x, y) => (x.year !== y.year ? x.year - y.year : x.month - y.month));

        // Calculate prior arrears cumulatively: (Total Prior Billed - Total Prior Paid)
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
        const totalDemand = currentMonthBill + carryForwardDue; // সর্বমোট দাবি (চলতি মাসের বিল + পূর্বের বকেয়া)

        // Actual paid this month: sum of payments on this bill
        const paymentsOnThisBill = (b.payments || []).reduce((sum: number, pay: any) => sum + (pay.amount || 0), 0);
        const paidAmount = Math.max(b.paidAmount, paymentsOnThisBill);
        const totalDue = Math.max(0, totalDemand - paidAmount); // সর্বমোট অবশিষ্ট বকেয়া
        const effectiveDue = Math.max(0, currentMonthBill - Math.max(0, paidAmount - carryForwardDue));

        return {
          marketName: b.shop.market.name,
          shopNumber: b.shop.shopNumber,
          floor: b.shop.floor,
          tenantName: b.tenant.name,
          phone: b.tenant.phone,
          rentAmount: b.rentAmount,
          utilityAmount,
          currentMonthBill,
          carryForwardDue,
          totalDemand,
          totalAmount: totalDemand, // Backward compatibility
          paidAmount,
          effectiveDue,
          dueAmount: totalDue, // Total due with prior arrears
          totalDue,
          status: totalDue === 0 ? "PAID" : paidAmount > 0 ? "PARTIAL" : "DUE",
          priorUnpaidList,
          billItems: (b.billItems || []).map((item: any) => ({
            id: item.id,
            description: item.description,
            amount: item.amount,
            typeName: item.chargeType?.name || null,
          })),
          lastPaymentDate: b.payments[0]?.paidOn || null,
        };
      });

      return NextResponse.json({ reportType, rows });
    }

    // 1b. Month-Wise Summary Report (12 Months Financial Statement)
    if (reportType === "month_wise_summary") {
      const billWhere: any = { year };
      const expWhere: any = {
        date: {
          gte: new Date(year, 0, 1),
          lte: new Date(year, 11, 31, 23, 59, 59),
        },
      };

      if (marketId !== "ALL") {
        billWhere.shop = { marketId, isActive: true };
        expWhere.marketId = marketId;
      } else {
        billWhere.shop = { isActive: true };
      }

      const [allBills, allExpenses] = await Promise.all([
        prisma.bill.findMany({
          where: billWhere,
          select: {
            month: true,
            totalAmount: true,
            paidAmount: true,
            dueAmount: true,
            status: true,
          },
        }),
        prisma.expense.findMany({
          where: expWhere,
          select: {
            date: true,
            amount: true,
          },
        }),
      ]);

      const rows = Array.from({ length: 12 }, (_, i) => {
        const m = i + 1;
        const mBills = allBills.filter((b) => b.month === m);
        const mExpenses = allExpenses.filter((e) => new Date(e.date).getMonth() + 1 === m);

        const totalBilled = mBills.reduce((sum, b) => sum + b.totalAmount, 0);
        const totalCollected = mBills.reduce((sum, b) => sum + b.paidAmount, 0);
        const totalDue = mBills.reduce((sum, b) => sum + b.dueAmount, 0);
        const totalExpense = mExpenses.reduce((sum, e) => sum + e.amount, 0);
        const netProfit = totalCollected - totalExpense;
        const collectionRate = totalBilled > 0 ? (totalCollected / totalBilled) * 100 : 0;

        const paidCount = mBills.filter((b) => b.status === "PAID").length;
        const partialCount = mBills.filter((b) => b.status === "PARTIAL").length;
        const dueCount = mBills.filter((b) => b.status === "DUE").length;

        return {
          month: m,
          totalBilled,
          totalCollected,
          totalDue,
          totalExpense,
          netProfit,
          collectionRate,
          paidCount,
          partialCount,
          dueCount,
          totalBills: mBills.length,
        };
      });

      const yearlyBilled = rows.reduce((acc, r) => acc + r.totalBilled, 0);
      const yearlyCollected = rows.reduce((acc, r) => acc + r.totalCollected, 0);
      const yearlyDue = rows.reduce((acc, r) => acc + r.totalDue, 0);
      const yearlyExpense = rows.reduce((acc, r) => acc + r.totalExpense, 0);
      const yearlyNetProfit = yearlyCollected - yearlyExpense;
      const yearlyCollectionRate = yearlyBilled > 0 ? (yearlyCollected / yearlyBilled) * 100 : 0;

      return NextResponse.json({
        reportType,
        year,
        rows,
        summary: {
          yearlyBilled,
          yearlyCollected,
          yearlyDue,
          yearlyExpense,
          yearlyNetProfit,
          yearlyCollectionRate,
        },
      });
    }

    // 2. Market Profit & Loss Statement
    if (reportType === "market_pnl") {
      const billWhere: any = { year };
      const expWhere: any = {
        date: {
          gte: new Date(year, 0, 1),
          lte: new Date(year, 11, 31, 23, 59, 59),
        },
      };

      if (month && month > 0 && month <= 12) {
        billWhere.month = month;
        expWhere.date = {
          gte: new Date(year, month - 1, 1),
          lte: new Date(year, month, 0, 23, 59, 59),
        };
      }

      const markets = await prisma.market.findMany({
        where: marketId !== "ALL" ? { id: marketId, isActive: true } : { isActive: true },
        include: {
          shops: {
            where: { isActive: true },
            include: {
              bills: {
                where: billWhere,
              },
              tenants: {
                where: { isActive: true },
                include: { advanceTransactions: true },
              },
            },
          },
          expenses: {
            where: expWhere,
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
      const startDate = month && month > 0 && month <= 12 ? new Date(year, month - 1, 1) : new Date(year, 0, 1);
      const endDate = month && month > 0 && month <= 12 ? new Date(year, month, 0, 23, 59, 59) : new Date(year, 11, 31, 23, 59, 59);
      settlementWhere.settledAt = { gte: startDate, lte: endDate };

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
      const startDate = month && month > 0 && month <= 12 ? new Date(year, month - 1, 1) : new Date(year, 0, 1);
      const endDate = month && month > 0 && month <= 12 ? new Date(year, month, 0, 23, 59, 59) : new Date(year, 11, 31, 23, 59, 59);
      settlementWhere.settledAt = { gte: startDate, lte: endDate };

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
      const startDate = month && month > 0 && month <= 12 ? new Date(year, month - 1, 1) : new Date(year, 0, 1);
      const endDate = month && month > 0 && month <= 12 ? new Date(year, month, 0, 23, 59, 59) : new Date(year, 11, 31, 23, 59, 59);

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
          id: exp.id,
          categoryId: exp.categoryId,
          marketId: exp.marketId,
          date: exp.date,
          marketName: exp.market.name,
          amount: exp.amount,
          description: exp.description,
          paymentMethod: exp.paymentMethod,
          attachmentUrl: exp.attachmentUrl,
        });
      }

      const rows = Array.from(catMap.values()).map((c) => ({
        ...c,
        percentage: totalAllExpenses > 0 ? (c.totalAmount / totalAllExpenses) * 100 : 0,
      }));

      rows.sort((a, b) => b.totalAmount - a.totalAmount);

      return NextResponse.json({ reportType, totalAllExpenses, rows });
    }

    // 5. Collector & Staff Summary Report
    if (reportType === "collector_summary") {
      const startDate = month && month > 0 && month <= 12 ? new Date(year, month - 1, 1) : new Date(year, 0, 1);
      const endDate = month && month > 0 && month <= 12 ? new Date(year, month, 0, 23, 59, 59) : new Date(year, 11, 31, 23, 59, 59);

      const where: any = {
        paidOn: { gte: startDate, lte: endDate },
      };
      if (marketId !== "ALL") {
        where.bill = { shop: { marketId } };
      }

      const payments = await prisma.payment.findMany({
        where,
        include: {
          receivedByUser: { select: { id: true, name: true, role: true } },
          enteredByUser: { select: { id: true, name: true, role: true } },
          bill: { include: { shop: { include: { market: true } }, tenant: true } },
          paymentAccount: true,
        },
        orderBy: { paidOn: "desc" },
      });

      const collectorMap = new Map<string, any>();
      let totalCollected = 0;

      for (const p of payments) {
        totalCollected += p.amount;
        const colKey = p.receivedById || p.receivedBy || "Other";
        const colName = p.receivedByUser?.name || p.receivedBy || "Staff";
        const colRole = p.receivedByUser?.role || "COLLECTOR";

        if (!collectorMap.has(colKey)) {
          collectorMap.set(colKey, {
            collectorId: colKey,
            collectorName: colName,
            role: colRole,
            totalAmount: 0,
            count: 0,
            cashAmount: 0,
            bkashAmount: 0,
            nagadAmount: 0,
            bankAmount: 0,
            payments: [],
          });
        }

        const c = collectorMap.get(colKey);
        c.totalAmount += p.amount;
        c.count += 1;
        if (p.method === "CASH") c.cashAmount += p.amount;
        else if (p.method === "BKASH") c.bkashAmount += p.amount;
        else if (p.method === "NAGAD") c.nagadAmount += p.amount;
        else if (p.method === "BANK" || p.method === "CHEQUE") c.bankAmount += p.amount;

        c.payments.push({
          id: p.id,
          paidOn: p.paidOn,
          shopNumber: p.bill.shop.shopNumber,
          tenantName: p.bill.tenant.name,
          marketName: p.bill.shop.market.name,
          amount: p.amount,
          method: p.method,
          enteredBy: p.enteredByUser?.name || "Staff",
        });
      }

      const rows = Array.from(collectorMap.values()).map((c) => ({
        ...c,
        percentage: totalCollected > 0 ? (c.totalAmount / totalCollected) * 100 : 0,
      }));

      rows.sort((a, b) => b.totalAmount - a.totalAmount);
      return NextResponse.json({ reportType, totalCollected, rows });
    }

    // 6. Payment Channel & Account Breakdown
    if (reportType === "channel_summary") {
      const startDate = month && month > 0 && month <= 12 ? new Date(year, month - 1, 1) : new Date(year, 0, 1);
      const endDate = month && month > 0 && month <= 12 ? new Date(year, month, 0, 23, 59, 59) : new Date(year, 11, 31, 23, 59, 59);

      const where: any = {
        paidOn: { gte: startDate, lte: endDate },
      };
      if (marketId !== "ALL") {
        where.bill = { shop: { marketId } };
      }

      const payments = await prisma.payment.findMany({
        where,
        include: {
          paymentAccount: true,
          bill: { include: { shop: { include: { market: true } }, tenant: true } },
          receivedByUser: { select: { id: true, name: true } },
        },
        orderBy: { paidOn: "desc" },
      });

      const channelMap = new Map<string, any>();
      let totalCollected = 0;

      for (const p of payments) {
        totalCollected += p.amount;
        let channelKey = p.method;
        let channelName = p.method;

        if (p.paymentAccount) {
          channelKey = `ACC_${p.paymentAccount.id}`;
          channelName = `${p.paymentAccount.name_bn || p.paymentAccount.name_en} (${p.paymentAccount.number})`;
        } else if (p.bankName) {
          channelKey = `BANK_${p.bankName}`;
          channelName = p.bankName;
        }

        if (!channelMap.has(channelKey)) {
          channelMap.set(channelKey, {
            channelKey,
            channelName,
            method: p.method,
            totalAmount: 0,
            count: 0,
            payments: [],
          });
        }

        const ch = channelMap.get(channelKey);
        ch.totalAmount += p.amount;
        ch.count += 1;
        ch.payments.push({
          id: p.id,
          paidOn: p.paidOn,
          shopNumber: p.bill.shop.shopNumber,
          tenantName: p.bill.tenant.name,
          amount: p.amount,
          method: p.method,
          transactionRef: p.transactionRef,
          senderNumber: p.senderNumber,
          receivedBy: p.receivedByUser?.name || p.receivedBy,
        });
      }

      const rows = Array.from(channelMap.values()).map((ch) => ({
        ...ch,
        percentage: totalCollected > 0 ? (ch.totalAmount / totalCollected) * 100 : 0,
      }));

      rows.sort((a, b) => b.totalAmount - a.totalAmount);
      return NextResponse.json({ reportType, totalCollected, rows });
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
          month: bill.month,
          year: bill.year,
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
            month: bill.month,
            year: bill.year,
            type: "PAYMENT",
            description: `ভাড়া জমা (${payment.method}${payment.reference ? ` - ${payment.reference}` : ""})`,
            debit: 0,
            credit: payment.amount, // Decreases amount owed
            balance: runningBalance,
          });
        }
      }

      // If specific month/year is selected, calculate prior arrears as Opening Balance
      let finalTransactions = transactions;
      if (month && month > 0) {
        const priorTx = transactions.filter((tx) => {
          if (!tx.year || !tx.month) return false;
          return tx.year < year || (tx.year === year && tx.month < month);
        });

        const openingBalance = priorTx.reduce((bal, tx) => bal + (tx.debit || 0) - (tx.credit || 0), 0);
        const currentPeriodTx = transactions.filter((tx) => tx.year === year && tx.month === month);

        let periodRunningBal = openingBalance;
        const mappedCurrentTx = currentPeriodTx.map((tx) => {
          periodRunningBal += (tx.debit || 0) - (tx.credit || 0);
          return {
            ...tx,
            balance: periodRunningBal,
          };
        });

        if (openingBalance > 0) {
          finalTransactions = [
            {
              id: "opening-balance",
              date: new Date(year, month - 1, 1),
              period: `পূর্ববর্তী জের`,
              type: "OPENING_BALANCE",
              description: `পূর্ববর্তী মাসের অপরিশোধিত মোট বকেয়া জের (Prior Arrears Carryover)`,
              debit: openingBalance,
              credit: 0,
              balance: openingBalance,
            },
            ...mappedCurrentTx,
          ];
        } else {
          finalTransactions = mappedCurrentTx;
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
        transactions: finalTransactions,
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
