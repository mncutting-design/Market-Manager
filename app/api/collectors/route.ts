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
    const includeInactive = searchParams.get("all") === "true";

    const where: any = {};
    if (!includeInactive) {
      where.isActive = true;
    }

    let collectors = await prisma.collector.findMany({
      where,
      orderBy: { name: "asc" },
      include: {
        _count: {
          select: { payments: true },
        },
      },
    });

    // If completely empty, auto-seed standard default collectors
    if (collectors.length === 0 && !includeInactive) {
      const defaults = [
        { name: "অফিস কাউন্টার (সরাসরি জমা)", phone: "", notes: "সরাসরি অফিসে জমা" },
        { name: "ফিল্ড কালেকশন স্টাফ ১", phone: "", notes: "মার্কেট আদায়কারী" },
      ];

      for (const d of defaults) {
        await prisma.collector.create({ data: d });
      }

      collectors = await prisma.collector.findMany({
        where: { isActive: true },
        orderBy: { name: "asc" },
        include: {
          _count: {
            select: { payments: true },
          },
        },
      });
    }

    return NextResponse.json({ collectors });
  } catch (error) {
    console.error("Failed to fetch collectors:", error);
    return NextResponse.json({ error: "Failed to fetch collectors" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { name, phone, notes } = body;

    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json(
        { error: "আদায়কারীর নাম প্রদান আবশ্যক (Collector name is required)" },
        { status: 400 }
      );
    }

    const cleanName = name.trim();

    // Check duplicate
    const existing = await prisma.collector.findFirst({
      where: {
        name: { equals: cleanName, mode: "insensitive" },
        isActive: true,
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: "এই নামের আদায়কারী ইতোমধ্যে তালিকায় রয়েছে (Collector already exists)" },
        { status: 400 }
      );
    }

    const collector = await prisma.collector.create({
      data: {
        name: cleanName,
        phone: phone ? phone.trim() : null,
        notes: notes ? notes.trim() : null,
        isActive: true,
      },
    });

    return NextResponse.json({ success: true, collector }, { status: 201 });
  } catch (error) {
    console.error("Failed to create collector:", error);
    return NextResponse.json({ error: "Failed to create collector" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { id, name, phone, notes, isActive } = body;

    if (!id) {
      return NextResponse.json({ error: "Collector ID is required" }, { status: 400 });
    }

    const updateData: any = {};
    if (name !== undefined) {
      if (!name.trim()) {
        return NextResponse.json({ error: "Name cannot be empty" }, { status: 400 });
      }
      updateData.name = name.trim();
    }
    if (phone !== undefined) updateData.phone = phone ? phone.trim() : null;
    if (notes !== undefined) updateData.notes = notes ? notes.trim() : null;
    if (isActive !== undefined) updateData.isActive = Boolean(isActive);

    const updated = await prisma.collector.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({ success: true, collector: updated });
  } catch (error) {
    console.error("Failed to update collector:", error);
    return NextResponse.json({ error: "Failed to update collector" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Collector ID is required" }, { status: 400 });
    }

    // Check if collector has any recorded payments
    const paymentsCount = await prisma.payment.count({
      where: { collectorId: id },
    });

    if (paymentsCount > 0) {
      // Soft-delete to preserve history
      await prisma.collector.update({
        where: { id },
        data: { isActive: false },
      });
      return NextResponse.json({
        success: true,
        message: "পূর্ববর্তী কালেকশন রেকর্ড থাকার কারণে আদায়কারীকে নিষ্ক্রিয় করা হয়েছে (Collector deactivated)",
      });
    }

    // Hard-delete if never used
    await prisma.collector.delete({
      where: { id },
    });

    return NextResponse.json({ success: true, message: "আদায়কারী সফলভাবে মুছে ফেলা হয়েছে (Collector deleted)" });
  } catch (error) {
    console.error("Failed to delete collector:", error);
    return NextResponse.json({ error: "Failed to delete collector" }, { status: 500 });
  }
}
