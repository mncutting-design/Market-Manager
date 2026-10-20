import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { matchesSearchWithDigits } from "@/lib/format";
import { getSession } from "@/lib/auth";


export async function GET(req: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const marketId = searchParams.get("marketId");
    const shopId = searchParams.get("shopId");
    const search = searchParams.get("search");
    const collectorId = searchParams.get("collectorId") || searchParams.get("receivedById");
    const paymentAccountId = searchParams.get("paymentAccountId");
    const method = searchParams.get("method");

    const where: any = {};
    if (shopId) {
      where.bill = { shopId };
    } else if (marketId && marketId !== "ALL") {
      where.bill = { shop: { marketId } };
    }
    if (collectorId && collectorId !== "ALL") {
      where.receivedById = collectorId;
    }
    if (paymentAccountId && paymentAccountId !== "ALL") {
      where.paymentAccountId = paymentAccountId;
    }
    if (method && method !== "ALL") {
      where.method = method;
    }

    const payments = await prisma.payment.findMany({
      where,
      include: {
        bill: {
          include: {
            shop: {
              include: {
                market: { select: { id: true, name: true, address: true } },
              },
            },
            tenant: true,
            billItems: true,
          },
        },
        receivedByUser: { select: { id: true, name: true, role: true } },
        enteredByUser: { select: { id: true, name: true, role: true } },
        paymentAccount: true,
      },
      orderBy: { paidOn: "desc" },
      take: 150,
    });

    let filtered = payments;
    if (search && search.trim() !== "") {
      const q = search.trim();
      filtered = filtered.filter(
        (p) =>
          matchesSearchWithDigits(p.bill.shop.shopNumber, q) ||
          matchesSearchWithDigits(p.bill.shop.market.name, q) ||
          matchesSearchWithDigits(p.bill.tenant.name, q) ||
          matchesSearchWithDigits(p.reference || "", q) ||
          matchesSearchWithDigits(p.transactionRef || "", q) ||
          matchesSearchWithDigits(p.receivedBy || "", q) ||
          matchesSearchWithDigits(p.receivedByUser?.name || "", q)
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
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const {
      billId,
      amount,
      paidOn,
      method = "CASH",
      reference,
      note,
      receivedById: clientReceivedById,
      paymentAccountId,
      transactionRef,
      senderNumber,
      bankName,
    } = body;

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
        billItems: true,
      },
    });

    if (!bill) {
      return NextResponse.json({ error: "Bill not found" }, { status: 404 });
    }

    // Role enforcement for Received By collector tracking:
    // COLLECTOR / OPERATOR can only pick themselves
    const isCollectorStaff = session.role === "COLLECTOR" || session.role === "OPERATOR";
    let finalReceivedById = session.id;

    if (!isCollectorStaff && clientReceivedById) {
      // ADMIN & MANAGER can select any active staff member
      finalReceivedById = clientReceivedById;
    }

    // Resolve staff name for receipt display
    let collectorName = session.name || "Staff";
    if (finalReceivedById) {
      const staffUser = await prisma.user.findUnique({
        where: { id: finalReceivedById },
        select: { id: true, name: true, role: true },
      });
      if (staffUser) {
        collectorName = staffUser.name;
      }
    }

    // Payment Channel validation
    const upperMethod = method.toUpperCase();
    if ((upperMethod === "BKASH" || upperMethod === "NAGAD") && !paymentAccountId) {
      // Check if any payment account exists for this type
      const defaultAcc = await prisma.paymentAccount.findFirst({
        where: { accountType: upperMethod, isActive: true },
      });
      if (!defaultAcc) {
        return NextResponse.json(
          { error: `অনুগ্রহ করে সেটিংস থেকে ${upperMethod} অ্যাকাউন্ট যোগ করুন (Please configure ${upperMethod} account in Settings)` },
          { status: 400 }
        );
      }
    }

    const paymentDate = paidOn ? new Date(paidOn) : new Date();

    const result = await prisma.$transaction(async (tx) => {
      // 1. Create Payment record with full tracking
      const payment = await tx.payment.create({
        data: {
          billId,
          amount: paymentPaisa,
          paidOn: paymentDate,
          method: upperMethod,
          reference: reference?.trim() || transactionRef?.trim() || null,
          note: note?.trim() || null,
          receivedBy: collectorName,
          receivedById: finalReceivedById,
          enteredById: session.id, // Strictly set from server session
          paymentAccountId: paymentAccountId || null,
          transactionRef: transactionRef?.trim() || reference?.trim() || null,
          senderNumber: senderNumber?.trim() || null,
          bankName: bankName?.trim() || null,
        },
        include: {
          receivedByUser: { select: { id: true, name: true, role: true } },
          enteredByUser: { select: { id: true, name: true, role: true } },
          paymentAccount: true,
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

    // Generate formatted receipt object with complete channel & staff details
    const receipt = {
      receiptNo: `REC-${bill.year}${String(bill.month).padStart(2, "0")}-${result.payment.id.slice(-6).toUpperCase()}`,
      date: result.payment.paidOn,
      marketName: bill.shop.market.name,
      marketAddress: bill.shop.market.address,
      shopNumber: bill.shop.shopNumber,
      floor: bill.shop.floor,
      size: bill.shop.size || "180 sqft",
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
      receivedBy: result.payment.receivedByUser?.name || result.payment.receivedBy,
      enteredBy: result.payment.enteredByUser?.name || session.name,
      note: result.payment.note,
      transactionRef: result.payment.transactionRef,
      senderNumber: result.payment.senderNumber,
      bankName: result.payment.bankName,
      paymentAccount: result.payment.paymentAccount,
      billItems: bill.billItems,
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

// Edit payment / transaction amount or details
export async function PUT(req: Request) {
  try {
    const session = await getSession();
    if (session?.role === "OPERATOR") {
      return NextResponse.json(
        { error: "অপারেটর কেবল নির্ধারিত কাজ করতে পারবেন, কোনো ট্রানজেকশন পরিবর্তন বা আবেদন করতে পারবেন না।" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { id, amount, method, reference, note, submitForApproval } = body;

    if (!id) {
      return NextResponse.json({ error: "Payment ID is required" }, { status: 400 });
    }

    const payment = await prisma.payment.findUnique({
      where: { id },
      include: {
        bill: {
          include: {
            shop: { include: { market: true } },
            tenant: true,
          },
        },
      },
    });

    if (!payment) {
      return NextResponse.json({ error: "Payment record not found" }, { status: 404 });
    }

    const newAmountPaisa = amount !== undefined ? Math.round(Number(amount)) : payment.amount;
    const isAdmin = session?.role === "ADMIN";

    // If manager, create change request for Admin approval
    if (!isAdmin || submitForApproval) {
      const cr = await prisma.changeRequest.create({
        data: {
          entityType: "TRANSACTION",
          entityId: id,
          entityTitle: `ভাড়া আদায় (${payment.bill.shop.shopNumber} - ${payment.bill.tenant.name})`,
          actionType: "EDIT",
          status: "PENDING",
          currentData: JSON.stringify({
            amount: payment.amount,
            method: payment.method,
            reference: payment.reference,
          }),
          proposedData: JSON.stringify({
            amount: newAmountPaisa,
            method: method || payment.method,
            reference: reference?.trim() || null,
            note: note?.trim() || null,
          }),
          requestedBy: session?.name || "Manager",
          requesterRole: session?.role || "MANAGER",
        },
      });

      return NextResponse.json({
        success: true,
        requiresApproval: true,
        message: "ট্রানজেকশন পরিবর্তনের আবেদন অ্যাডমিন অনুমোদনের জন্য পাঠানো হয়েছে",
        changeRequest: cr,
      });
    }

    // Direct Admin execution
    const updatedPayment = await prisma.$transaction(async (tx) => {
      const p = await tx.payment.update({
        where: { id },
        data: {
          amount: newAmountPaisa,
          ...(method && { method }),
          ...(reference !== undefined && { reference: reference?.trim() || null }),
          ...(note !== undefined && { note: note?.trim() || null }),
        },
      });

      // Recalculate bill
      const allPayments = await tx.payment.findMany({ where: { billId: payment.billId } });
      const totalPaid = allPayments.reduce((sum, item) => sum + item.amount, 0);
      const newDue = Math.max(0, payment.bill.totalAmount - totalPaid);
      const newStatus = newDue <= 0 ? "PAID" : totalPaid > 0 ? "PARTIAL" : "DUE";

      await tx.bill.update({
        where: { id: payment.billId },
        data: {
          paidAmount: totalPaid,
          dueAmount: newDue,
          status: newStatus,
        },
      });

      return p;
    });

    return NextResponse.json({ success: true, payment: updatedPayment });
  } catch (error) {
    console.error("Failed to update payment:", error);
    return NextResponse.json({ error: "Failed to update payment" }, { status: 500 });
  }
}

// Void or delete payment / transaction
export async function DELETE(req: Request) {
  try {
    const session = await getSession();
    if (session?.role === "OPERATOR") {
      return NextResponse.json(
        { error: "অপারেটর কেবল নির্ধারিত কাজ করতে পারবেন, কোনো ট্রানজেকশন ডিলিট বা আবেদন করতে পারবেন না।" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Payment ID is required" }, { status: 400 });
    }

    const payment = await prisma.payment.findUnique({
      where: { id },
      include: {
        bill: {
          include: {
            shop: { include: { market: true } },
            tenant: true,
          },
        },
      },
    });

    if (!payment) {
      return NextResponse.json({ error: "Payment record not found" }, { status: 404 });
    }

    const isAdmin = session?.role === "ADMIN";
    if (!isAdmin) {
      const cr = await prisma.changeRequest.create({
        data: {
          entityType: "TRANSACTION",
          entityId: id,
          entityTitle: `ভাড়া আদায় বাতিল (${payment.bill.shop.shopNumber} - ${payment.bill.tenant.name})`,
          actionType: "DELETE",
          status: "PENDING",
          currentData: JSON.stringify({
            amount: payment.amount,
            method: payment.method,
            paidOn: payment.paidOn,
          }),
          proposedData: JSON.stringify({ action: "DELETE" }),
          requestedBy: session?.name || "Manager",
          requesterRole: session?.role || "MANAGER",
        },
      });

      return NextResponse.json({
        success: true,
        requiresApproval: true,
        message: "ট্রানজেকশন বাতিলের আবেদন অ্যাডমিন অনুমোদনের জন্য পাঠানো হয়েছে",
        changeRequest: cr,
      });
    }

    // Direct Admin execution
    await prisma.$transaction(async (tx) => {
      await tx.payment.delete({ where: { id } });

      const allPayments = await tx.payment.findMany({ where: { billId: payment.billId } });
      const totalPaid = allPayments.reduce((sum, item) => sum + item.amount, 0);
      const newDue = Math.max(0, payment.bill.totalAmount - totalPaid);
      const newStatus = newDue <= 0 ? "PAID" : totalPaid > 0 ? "PARTIAL" : "DUE";

      await tx.bill.update({
        where: { id: payment.billId },
        data: {
          paidAmount: totalPaid,
          dueAmount: newDue,
          status: newStatus,
        },
      });
    });

    return NextResponse.json({ success: true, message: "Payment voided successfully" });
  } catch (error) {
    console.error("Failed to delete payment:", error);
    return NextResponse.json({ error: "Failed to delete payment" }, { status: 500 });
  }
}

