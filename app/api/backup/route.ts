import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET() {
  try {
    const [markets, shops, tenants, rentHistory, chargeTypes, bills, billItems, payments, categories, expenses] =
      await Promise.all([
        prisma.market.findMany(),
        prisma.shop.findMany(),
        prisma.tenant.findMany(),
        prisma.rentHistory.findMany(),
        prisma.chargeType.findMany(),
        prisma.bill.findMany(),
        prisma.billItem.findMany(),
        prisma.payment.findMany(),
        prisma.expenseCategory.findMany(),
        prisma.expense.findMany(),
      ]);

    const backupData = {
      appName: "Market Manager",
      version: "1.0.0",
      exportedAt: new Date().toISOString(),
      counts: {
        markets: markets.length,
        shops: shops.length,
        tenants: tenants.length,
        bills: bills.length,
        payments: payments.length,
        expenses: expenses.length,
      },
      data: {
        markets,
        shops,
        tenants,
        rentHistory,
        chargeTypes,
        bills,
        billItems,
        payments,
        categories,
        expenses,
      },
    };

    return new Response(JSON.stringify(backupData, null, 2), {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="market-manager-backup-${new Date().toISOString().slice(0, 10)}.json"`,
      },
    });
  } catch (error) {
    console.error("Backup export error:", error);
    return NextResponse.json({ error: "Failed to generate backup" }, { status: 500 });
  }
}
