import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET(req: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const accountType = searchParams.get("accountType") || searchParams.get("type"); // BKASH, NAGAD, BANK
    const includeInactive = searchParams.get("all") === "true";

    const where: any = {};
    if (!includeInactive) {
      where.isActive = true;
    }
    if (accountType) {
      where.accountType = accountType.toUpperCase();
    }

    const accounts = await prisma.paymentAccount.findMany({
      where,
      orderBy: [{ accountType: "asc" }, { name_bn: "asc" }],
    });

    return NextResponse.json({ accounts });
  } catch (error) {
    console.error("Failed to fetch payment accounts:", error);
    return NextResponse.json({ error: "Failed to fetch payment accounts" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only Admin can configure receiving accounts
    if (session.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Only administrators can configure payment receiving accounts" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { accountType, name_en, name_bn, number, bankName, branch } = body;

    if (!accountType || !number) {
      return NextResponse.json(
        { error: "Account type and number are required" },
        { status: 400 }
      );
    }

    const upperType = accountType.toUpperCase();
    const cleanNumber = number.trim();
    const titleEn = name_en?.trim() || `${upperType} (${cleanNumber})`;
    const titleBn = name_bn?.trim() || `${upperType} (${cleanNumber})`;

    const account = await prisma.paymentAccount.create({
      data: {
        accountType: upperType,
        name_en: titleEn,
        name_bn: titleBn,
        number: cleanNumber,
        bankName: bankName?.trim() || null,
        branch: branch?.trim() || null,
        isActive: true,
      },
    });

    return NextResponse.json({ success: true, account }, { status: 201 });
  } catch (error) {
    console.error("Failed to create payment account:", error);
    return NextResponse.json({ error: "Failed to create payment account" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const session = await getSession();
    if (!session || session.role !== "ADMIN") {
      return NextResponse.json({ error: "Only admins can edit payment accounts" }, { status: 403 });
    }

    const body = await req.json();
    const { id, name_en, name_bn, number, bankName, branch, isActive } = body;

    if (!id) {
      return NextResponse.json({ error: "Account ID is required" }, { status: 400 });
    }

    const updateData: any = {};
    if (name_en !== undefined) updateData.name_en = name_en.trim();
    if (name_bn !== undefined) updateData.name_bn = name_bn.trim();
    if (number !== undefined) updateData.number = number.trim();
    if (bankName !== undefined) updateData.bankName = bankName?.trim() || null;
    if (branch !== undefined) updateData.branch = branch?.trim() || null;
    if (typeof isActive === "boolean") updateData.isActive = isActive;

    const account = await prisma.paymentAccount.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({ success: true, account });
  } catch (error) {
    console.error("Failed to update payment account:", error);
    return NextResponse.json({ error: "Failed to update payment account" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await getSession();
    if (!session || session.role !== "ADMIN") {
      return NextResponse.json({ error: "Only admins can delete payment accounts" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "ID is required" }, { status: 400 });
    }

    // Soft delete
    await prisma.paymentAccount.update({
      where: { id },
      data: { isActive: false },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete payment account:", error);
    return NextResponse.json({ error: "Failed to delete payment account" }, { status: 500 });
  }
}
