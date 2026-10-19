import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET(req: Request) {
  try {
    const session = await getSession();
    const isAdmin = !session || session.role === "ADMIN";
    if (!isAdmin) {
      return NextResponse.json(
        { error: "Only administrators can view audit logs" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const action = searchParams.get("action");
    const entityType = searchParams.get("entityType");
    const limit = parseInt(searchParams.get("limit") || "50", 10);

    const where: any = {};
    if (action && action !== "ALL") where.action = action;
    if (entityType && entityType !== "ALL") where.entityType = entityType;

    const logs = await prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: Math.min(100, limit),
    });

    const parsedLogs = logs.map((log) => {
      let details: any = {};
      try {
        details = JSON.parse(log.detailsJson || "{}");
      } catch (e) {
        details = {};
      }
      return {
        ...log,
        details,
      };
    });

    return NextResponse.json({ logs: parsedLogs });
  } catch (error) {
    console.error("Failed to fetch audit logs:", error);
    return NextResponse.json(
      { error: "Failed to fetch audit logs" },
      { status: 500 }
    );
  }
}
