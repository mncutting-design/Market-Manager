import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { matchesSearchWithDigits } from "@/lib/format";


export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const marketId = searchParams.get("marketId");
    const shopId = searchParams.get("shopId");
    const search = searchParams.get("search");

    const where: any = {};
    if (shopId) {
      where.bill = { shopId };
    } else if (marketId && marketId !== "ALL") {
      where.bill = { shop: { marketId } };
    }

    const payments = await prisma.payment.findMany({
      where,
      include: {
        bill: {
          include: {
            shop: {
              include: {
                market: { select: { id: true, name: true } },
              },
            },
            tenant: true,
          },
        },
      },
      orderBy: { paidOn: "desc" },
      take: 100,
    });

    let filtered = payments;
    if (search && search.trim() !== "") {
      const q = search.trim();
      filtered = filtered.filter(
        (p) =>
          matchesSearchWithDigits(p.bill.shop.shopNumber, q) ||
          matchesSearchWithDigits(p.bill.shop.market.name, q) ||
          matchesSearchWithDigits(p.bill.tenant.name, q) ||
          matchesSearchWithDigits(p.reference || "", q)
      );
    }

    return NextResponse.json(
      { payments: filtered },
      {
        headers: {
          "Cache-Control": "private, no-cache, stale-while-revalidate=5",
        },
      }
    );
  } catch (error) {
    console.error("Failed to fetch payments:", error);
    return NextResponse.json({ error: "Failed to fetch payments" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { billId, amount, paidOn, method = "CASH", reference, note, receivedBy } = body;

    if (!billId || amount === undefined || amount === null) {
      return NextResponse.json({ error: "Bill ID and Payment Amount are required" }, { status: 400 });
    }

    const paymentPaisa = Math.round(Number(amount));
    if (paymentPaisa <= 0) {
      return NextResponse.json({ error: "Payment amount must be greater than zero" }, { status: 400 });
    }

    const bill = await prisma.bill.findUnique({
      where: { id: billId },
      include: {
        shop: { include: { market: true } },
        tenant: true,
      },
    });

    if (!bill) {
      return NextResponse.json({ error: "Bill not found" }, { status: 404 });
    }

    const paymentDate = paidOn ? new Date(paidOn) : new Date();

    const result = await prisma.$transaction(async (tx) => {
      // 1. Create Payment record
      const payment = await tx.payment.create({
        data: {
          billId,
          amount: paymentPaisa,
          paidOn: paymentDate,
          method,
          reference: reference?.trim() || null,
          note: note?.trim() || null,
          receivedBy: receivedBy?.trim() || "ম্যানেজার / Admin",
        },
      });

      // 2. Recalculate bill amounts
      const newPaidAmount = bill.paidAmount + paymentPaisa;
      const newDueAmount = Math.max(0, bill.totalAmount - newPaidAmount);

      let newStatus = "DUE";
      if (newPaidAmount >= bill.totalAmount) {
        newStatus = "PAID";
      } else if (newPaidAmount > 0) {
        newStatus = "PARTIAL";
      }

      const updatedBill = await tx.bill.update({
        where: { id: billId },
        data: {
          paidAmount: newPaidAmount,
          dueAmount: newDueAmount,
          status: newStatus,
        },
      });

      return { payment, updatedBill };
    });

    // Generate formatted receipt object
    const receipt = {
      receiptNo: `REC-${bill.year}${String(bill.month).padStart(2, "0")}-${result.payment.id.slice(-6).toUpperCase()}`,
      date: result.payment.paidOn,
      marketName: bill.shop.market.name,
      shopNumber: bill.shop.shopNumber,
      tenantName: bill.tenant.name,
      tenantPhone: bill.tenant.phone,
      billPeriodMonth: bill.month,
      billPeriodYear: bill.year,
      rentAmount: bill.rentAmount,
      totalBillAmount: bill.totalAmount,
      paidNow: result.payment.amount,
      totalPaidSoFar: result.updatedBill.paidAmount,
      remainingDue: result.updatedBill.dueAmount,
      paymentMethod: result.payment.method,
      reference: result.payment.reference,
      receivedBy: result.payment.receivedBy,
      note: result.payment.note,
    };

    return NextResponse.json({
      success: true,
      payment: result.payment,
      updatedBill: result.updatedBill,
      receipt,
    });
  } catch (error) {
    console.error("Failed to record payment:", error);
    return NextResponse.json({ error: "Failed to record payment" }, { status: 500 });
  }
}
