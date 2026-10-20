import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { matchesSearchWithDigits } from "@/lib/format";
import { getSession } from "@/lib/auth";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const marketId = searchParams.get("marketId");
    const categoryId = searchParams.get("categoryId");
    const month = searchParams.get("month") ? parseInt(searchParams.get("month")!, 10) : undefined;
    const year = searchParams.get("year") ? parseInt(searchParams.get("year")!, 10) : undefined;
    const search = searchParams.get("search");

    const where: any = {};
    if (marketId && marketId !== "ALL") where.marketId = marketId;
    if (categoryId && categoryId !== "ALL") where.categoryId = categoryId;

    if (month && year) {
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0, 23, 59, 59);
      where.date = {
        gte: startDate,
        lte: endDate,
      };
    } else if (year) {
      const startDate = new Date(year, 0, 1);
      const endDate = new Date(year, 11, 31, 23, 59, 59);
      where.date = {
        gte: startDate,
        lte: endDate,
      };
    }

    const expenses = await prisma.expense.findMany({
      where,
      include: {
        market: { select: { id: true, name: true } },
        category: true,
        enteredByUser: { select: { id: true, name: true, role: true } },
      },
      orderBy: { date: "desc" },
    });

    let filtered = expenses;
    if (search && search.trim() !== "") {
      const q = search.trim();
      filtered = filtered.filter(
        (e) =>
          matchesSearchWithDigits(e.market.name, q) ||
          matchesSearchWithDigits(e.category.name_bn, q) ||
          matchesSearchWithDigits(e.category.name_en, q) ||
          matchesSearchWithDigits(e.description || "", q) ||
          matchesSearchWithDigits(e.createdByName || "", q) ||
          matchesSearchWithDigits(e.enteredByUser?.name || "", q)
      );
    }

    const totalAmount = filtered.reduce((sum, e) => sum + e.amount, 0);

    return NextResponse.json({ expenses: filtered, totalAmount });
  } catch (error) {
    console.error("Failed to fetch expenses:", error);
    return NextResponse.json({ error: "Failed to fetch expenses" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getSession();
    const body = await req.json();
    const { marketId, categoryId, amount, date, description, attachmentUrl, paymentMethod = "CASH" } = body;

    if (!marketId || !categoryId || !amount) {
      return NextResponse.json(
        { error: "Market, Category, and Amount are required" },
        { status: 400 }
      );
    }

    const expensePaisa = Math.round(Number(amount));
    if (expensePaisa <= 0) {
      return NextResponse.json({ error: "Amount must be greater than zero" }, { status: 400 });
    }

    const expense = await prisma.expense.create({
      data: {
        marketId,
        categoryId,
        amount: expensePaisa,
        date: date ? new Date(date) : new Date(),
        description: description?.trim() || null,
        attachmentUrl: attachmentUrl?.trim() || null,
        paymentMethod,
        enteredById: session?.id || null,
        createdByName: session?.name || "Staff",
      },
      include: {
        market: true,
        category: true,
        enteredByUser: { select: { id: true, name: true, role: true } },
      },
    });

    return NextResponse.json({ expense }, { status: 201 });
  } catch (error) {
    console.error("Failed to create expense:", error);
    return NextResponse.json({ error: "Failed to create expense" }, { status: 500 });
  }
}


export async function PUT(req: Request) {
  try {
    const session = await getSession();
    if (session?.role === "OPERATOR") {
      return NextResponse.json(
        { error: "অপারেটর কেবল নির্ধারিত কাজ করতে পারবেন, কোনো খরচ পরিবর্তন বা আবেদন করতে পারবেন না।" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { id, marketId, categoryId, amount, date, description, attachmentUrl, paymentMethod, submitForApproval } = body;

    if (!id) {
      return NextResponse.json({ error: "Expense ID is required" }, { status: 400 });
    }

    const currentExpense = await prisma.expense.findUnique({
      where: { id },
      include: { market: true, category: true },
    });

    if (!currentExpense) {
      return NextResponse.json({ error: "Expense not found" }, { status: 404 });
    }

    const isAdmin = session?.role === "ADMIN";
    const expensePaisa = amount !== undefined ? Math.round(Number(amount)) : currentExpense.amount;

    if (!isAdmin || submitForApproval) {
      const cr = await prisma.changeRequest.create({
        data: {
          entityType: "EXPENSE",
          entityId: id,
          entityTitle: `খরচ (${currentExpense.category.name_bn || currentExpense.category.name_en} - ${currentExpense.market.name})`,
          actionType: "EDIT",
          status: "PENDING",
          currentData: JSON.stringify({
            amount: currentExpense.amount,
            description: currentExpense.description,
            categoryId: currentExpense.categoryId,
          }),
          proposedData: JSON.stringify({
            amount: expensePaisa,
            categoryId: categoryId || currentExpense.categoryId,
            description: description?.trim() || null,
            paymentMethod: paymentMethod || currentExpense.paymentMethod,
          }),
          requestedBy: session?.name || "Manager",
          requesterRole: session?.role || "MANAGER",
        },
      });

      return NextResponse.json({
        success: true,
        requiresApproval: true,
        message: "খরচ পরিবর্তনের আবেদন অ্যাডমিন অনুমোদনের জন্য পাঠানো হয়েছে",
        changeRequest: cr,
      });
    }

    const updated = await prisma.expense.update({
      where: { id },
      data: {
        ...(marketId && { marketId }),
        ...(categoryId && { categoryId }),
        ...(amount !== undefined && { amount: expensePaisa }),
        ...(date && { date: new Date(date) }),
        ...(description !== undefined && { description: description?.trim() || null }),
        ...(attachmentUrl !== undefined && { attachmentUrl: attachmentUrl?.trim() || null }),
        ...(paymentMethod && { paymentMethod }),
      },
      include: {
        market: true,
        category: true,
      },
    });

    return NextResponse.json({ expense: updated });
  } catch (error) {
    console.error("Failed to update expense:", error);
    return NextResponse.json({ error: "Failed to update expense" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await getSession();
    if (session?.role === "OPERATOR") {
      return NextResponse.json(
        { error: "অপারেটর কেবল নির্ধারিত কাজ করতে পারবেন, কোনো খরচ ডিলিট বা আবেদন করতে পারবেন না।" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Expense ID required" }, { status: 400 });

    const currentExpense = await prisma.expense.findUnique({
      where: { id },
      include: { market: true, category: true },
    });

    if (!currentExpense) {
      return NextResponse.json({ error: "Expense not found" }, { status: 404 });
    }

    const isAdmin = session?.role === "ADMIN";
    if (!isAdmin) {
      const cr = await prisma.changeRequest.create({
        data: {
          entityType: "EXPENSE",
          entityId: id,
          entityTitle: `খরচ অপসারণ (${currentExpense.category.name_bn || currentExpense.category.name_en} - ${currentExpense.market.name})`,
          actionType: "DELETE",
          status: "PENDING",
          currentData: JSON.stringify({
            amount: currentExpense.amount,
            description: currentExpense.description,
          }),
          proposedData: JSON.stringify({ action: "DELETE" }),
          requestedBy: session?.name || "Manager",
          requesterRole: session?.role || "MANAGER",
        },
      });

      return NextResponse.json({
        success: true,
        requiresApproval: true,
        message: "খরচ অপসারণের আবেদন অ্যাডমিন অনুমোদনের জন্য পাঠানো হয়েছে",
        changeRequest: cr,
      });
    }

    await prisma.expense.delete({
      where: { id },
    });

    return NextResponse.json({ success: true, message: "Expense deleted successfully" });
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete expense" }, { status: 500 });
  }
}

