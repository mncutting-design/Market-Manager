import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { matchesSearchWithDigits } from "@/lib/format";


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
          matchesSearchWithDigits(e.description || "", q)
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
      },
      include: {
        market: true,
        category: true,
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
    const body = await req.json();
    const { id, marketId, categoryId, amount, date, description, attachmentUrl, paymentMethod } = body;

    if (!id) {
      return NextResponse.json({ error: "Expense ID is required" }, { status: 400 });
    }

    const updated = await prisma.expense.update({
      where: { id },
      data: {
        ...(marketId && { marketId }),
        ...(categoryId && { categoryId }),
        ...(amount !== undefined && { amount: Math.round(Number(amount)) }),
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
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Expense ID required" }, { status: 400 });

    await prisma.expense.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete expense" }, { status: 500 });
  }
}
