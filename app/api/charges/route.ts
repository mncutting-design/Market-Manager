import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET() {
  try {
    const charges = await prisma.chargeType.findMany({
      where: { isActive: true },
      orderBy: { createdAt: "asc" },
    });
    return NextResponse.json({ charges });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch charge types" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name_en, name_bn, isRecurring, defaultAmount } = body;

    if (!name_en && !name_bn) {
      return NextResponse.json({ error: "Charge name is required" }, { status: 400 });
    }

    const charge = await prisma.chargeType.create({
      data: {
        name_en: name_en?.trim() || name_bn?.trim(),
        name_bn: name_bn?.trim() || name_en?.trim(),
        isRecurring: Boolean(isRecurring),
        defaultAmount: defaultAmount ? Math.round(Number(defaultAmount)) : 0,
      },
    });

    return NextResponse.json({ charge }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: "Failed to create charge type" }, { status: 500 });
  }
}
