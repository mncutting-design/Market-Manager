import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import {
  computeDepositBalance,
  calculateDepositRunningBalances,
} from "@/lib/deposit-ledger";
import {
  getDhakaMonthRange,
  getDhakaDateParts,
  isTimestampInPeriod,
} from "@/lib/accounting";

export async function GET(req: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const tenantId = searchParams.get("tenantId");
    const marketId = searchParams.get("marketId");
    const shopId = searchParams.get("shopId");
    const month = searchParams.get("month") ? parseInt(searchParams.get("month")!) : undefined;
    const year = searchParams.get("year") ? parseInt(searchParams.get("year")!) : undefined;
    const startDateParam = searchParams.get("startDate");
    const endDateParam = searchParams.get("endDate");
    const status = searchParams.get("status"); // POSTED, PENDING_APPROVAL, etc.

    let periodStart: Date;
    let periodEnd: Date;

    if (startDateParam && endDateParam) {
      periodStart = new Date(startDateParam);
      periodEnd = new Date(endDateParam);
    } else if (month && year) {
      const range = getDhakaMonthRange(year, month);
      periodStart = range.startDate;
      periodEnd = range.endDate;
    } else {
      // Default to current year or all time
      const currentYear = new Date().getFullYear();
      const range = getDhakaMonthRange(currentYear, new Date().getMonth() + 1);
      periodStart = range.startDate;
      periodEnd = range.endDate;
    }

    const where: any = {};
    if (tenantId) where.tenantId = tenantId;
    if (marketId && marketId !== "ALL") where.marketId = marketId;
    if (shopId) where.shopId = shopId;
    if (status) where.status = status;

    // Fetch transactions with full relations
    const transactions = await prisma.depositTransaction.findMany({
      where,
      include: {
        tenant: {
          select: {
            id: true,
            name: true,
            phone: true,
            status: true,
            rentAmount: true,
            advanceDeposit: true,
            shop: {
              select: {
                id: true,
                shopNumber: true,
                market: { select: { id: true, name: true } },
              },
            },
          },
        },
        market: { select: { id: true, name: true } },
        shop: { select: { id: true, shopNumber: true } },
        paymentAccount: { select: { id: true, name_bn: true, name_en: true, number: true, bankName: true, accountType: true } },
        enteredByUser: { select: { id: true, name: true, role: true } },
        counterpartyUser: { select: { id: true, name: true, role: true } },
        approvedByUser: { select: { id: true, name: true, role: true } },
        reversesTransaction: {
          select: { id: true, type: true, amount: true, reason: true, transactionDate: true },
        },
        relatedBill: {
          select: { id: true, month: true, year: true, totalAmount: true, dueAmount: true },
        },
      },
      orderBy: [{ transactionDate: "asc" }, { createdAt: "asc" }],
    });

    // Compute running balances
    const timeline = calculateDepositRunningBalances(transactions);

    // Filter by period for period-specific metrics
    const inPeriodTransactions = timeline.filter((tx) =>
      isTimestampInPeriod(tx.transactionDate, periodStart, periodEnd)
    );

    // Period movement calculations
    let periodReceived = 0;
    let periodRefunded = 0;
    let periodUsed = 0; // adjusted to due + deduction

    // Channel & Account Breakdown
    const channelBreakdown: Record<
      string,
      { in: number; out: number; accountName?: string; number?: string; bankName?: string }
    > = {
      CASH: { in: 0, out: 0 },
      BKASH: { in: 0, out: 0 },
      NAGAD: { in: 0, out: 0 },
      BANK: { in: 0, out: 0 },
      CHEQUE: { in: 0, out: 0 },
    };

    const accountBreakdown: Record<
      string,
      { accountId: string; accountName: string; number: string; bankName?: string; in: number; out: number }
    > = {};

    for (const tx of inPeriodTransactions) {
      if (tx.status !== "POSTED") continue;

      const method = (tx.method || "CASH").toUpperCase();
      if (!channelBreakdown[method]) {
        channelBreakdown[method] = { in: 0, out: 0 };
      }

      const accId = tx.paymentAccountId || "default";
      const accName = tx.paymentAccount
        ? `${tx.paymentAccount.name_bn || tx.paymentAccount.name_en} (${tx.paymentAccount.number})`
        : method === "CASH"
        ? "নগদ / Cash"
        : tx.bankName || "অন্যান্য";

      if (!accountBreakdown[accId]) {
        accountBreakdown[accId] = {
          accountId: accId,
          accountName: accName,
          number: tx.paymentAccount?.number || "",
          bankName: tx.bankName || tx.paymentAccount?.bankName || "",
          in: 0,
          out: 0,
        };
      }

      if (tx.type === "RECEIVED" || tx.type === "TOPUP") {
        periodReceived += tx.amount;
        channelBreakdown[method].in += tx.amount;
        accountBreakdown[accId].in += tx.amount;
      } else if (tx.type === "REFUND") {
        periodRefunded += tx.amount;
        channelBreakdown[method].out += tx.amount;
        accountBreakdown[accId].out += tx.amount;
      } else if (tx.type === "ADJUSTED_TO_DUE" || tx.type === "DEDUCTION") {
        periodUsed += tx.amount;
      } else if (tx.type === "REVERSAL") {
        if (tx.signedAmount < 0) {
          periodReceived -= tx.amount;
          channelBreakdown[method].in -= tx.amount;
          accountBreakdown[accId].in -= tx.amount;
        } else {
          periodRefunded -= tx.amount;
          channelBreakdown[method].out -= tx.amount;
          accountBreakdown[accId].out -= tx.amount;
        }
      }
    }

    // Tenant list with balances for the market/selection
    const tenantMap = new Map<string, { tenant: any; balance: number; transactions: any[] }>();
    for (const tx of timeline) {
      if (!tenantMap.has(tx.tenantId)) {
        tenantMap.set(tx.tenantId, {
          tenant: tx.tenant,
          balance: 0,
          transactions: [],
        });
      }
      const entry = tenantMap.get(tx.tenantId)!;
      entry.transactions.push(tx);
      if (tx.status === "POSTED") {
        entry.balance = tx.runningBalance;
      }
    }

    const tenantWhere: any = { isActive: true };
    if (marketId && marketId !== "ALL") {
      tenantWhere.shop = { marketId };
    }
    const allMarketTenants = await prisma.tenant.findMany({
      where: tenantWhere,
      include: {
        shop: { include: { market: true } },
      },
    });

    for (const t of allMarketTenants) {
      if (!tenantMap.has(t.id)) {
        tenantMap.set(t.id, {
          tenant: t,
          balance: 0,
          transactions: [],
        });
      }
    }

    const tenantSummaries = Array.from(tenantMap.values()).map((entry) => ({
      tenantId: entry.tenant?.id,
      tenantName: entry.tenant?.name,
      phone: entry.tenant?.phone,
      shopNumber: entry.tenant?.shop?.shopNumber,
      marketName: entry.tenant?.shop?.market?.name,
      status: entry.tenant?.status,
      currentBalance: entry.balance,
      transactionsCount: entry.transactions.length,
    }));

    // Total held across all queried tenants as of period end
    const totalHeld = tenantSummaries.reduce((sum, t) => sum + t.currentBalance, 0);

    return NextResponse.json({
      period: {
        startDate: periodStart.toISOString(),
        endDate: periodEnd.toISOString(),
      },
      summary: {
        totalHeld,
        periodReceived,
        periodRefunded,
        periodUsed,
        netMovement: periodReceived - periodRefunded - periodUsed,
      },
      channelBreakdown,
      accountBreakdown: Object.values(accountBreakdown),
      tenantSummaries,
      transactions: timeline.reverse(), // most recent first
    });
  } catch (error: any) {
    console.error("Failed to fetch deposit transactions:", error);
    return NextResponse.json(
      { error: "Failed to fetch deposit transactions: " + error.message },
      { status: 500 }
    );
  }
}
