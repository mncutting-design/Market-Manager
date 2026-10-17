import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ user: null });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: session.id },
      select: { id: true, name: true, email: true, role: true, locale: true },
    });
    if (user) {
      return NextResponse.json({ user });
    }
  } catch (e) {
    console.warn("DB user query failed in /api/auth/me, returning session:", e);
  }

  return NextResponse.json({ user: session });
}

export async function PUT(req: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { name, locale } = await req.json();
  const updated = await prisma.user.update({
    where: { id: session.id },
    data: {
      ...(name && { name }),
      ...(locale && { locale }),
    },
    select: { id: true, name: true, email: true, role: true, locale: true },
  });

  return NextResponse.json({ user: updated });
}
