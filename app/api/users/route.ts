import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { hasPermission } from "@/lib/permissions";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        locale: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });

    // If database is empty, return default NAZRUL & Admin
    if (users.length === 0) {
      return NextResponse.json({
        users: [
          {
            id: "user-nazrul-admin-2026",
            name: "NAZRUL",
            email: "nazrul@marketmanager.com",
            role: "ADMIN",
            locale: "bn",
            createdAt: new Date().toISOString(),
          },
          {
            id: "admin-default-cuid-2026",
            name: "প্রশাসক (Admin)",
            email: "admin@marketmanager.com",
            role: "ADMIN",
            locale: "bn",
            createdAt: new Date().toISOString(),
          },
        ],
      });
    }

    return NextResponse.json({ users });
  } catch (error) {
    console.error("Fetch users error:", error);
    return NextResponse.json({
      users: [
        {
          id: "user-nazrul-admin-2026",
          name: "NAZRUL",
          email: "nazrul@marketmanager.com",
          role: "ADMIN",
          locale: "bn",
          createdAt: new Date().toISOString(),
        },
      ],
    });
  }
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Only ADMIN can create/assign users
  if (!hasPermission(session.role, "canManageUsers")) {
    return NextResponse.json(
      { error: "Only Admins have permission to manage users" },
      { status: 403 }
    );
  }

  try {
    const { name, email, password, role } = await req.json();

    if (!name || !email || !password) {
      return NextResponse.json(
        { error: "Name, email/username, and password are required" },
        { status: 400 }
      );
    }

    const cleanEmail = email.toLowerCase().trim();
    const existing = await prisma.user.findFirst({
      where: {
        OR: [
          { email: cleanEmail },
          { name: name.trim() },
        ],
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: "A user with this username or email already exists" },
        { status: 409 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const validRole = ["ADMIN", "MANAGER", "OPERATOR", "VIEWER"].includes(role?.toUpperCase())
      ? role.toUpperCase()
      : "MANAGER";

    const newUser = await prisma.user.create({
      data: {
        name: name.trim(),
        email: cleanEmail,
        passwordHash,
        role: validRole,
        locale: "bn",
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        locale: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ success: true, user: newUser }, { status: 201 });
  } catch (error) {
    console.error("Create user error:", error);
    return NextResponse.json({ error: "Failed to create user" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!hasPermission(session.role, "canManageUsers")) {
    return NextResponse.json(
      { error: "Only Admins have permission to update users" },
      { status: 403 }
    );
  }

  try {
    const { id, role, password, name } = await req.json();
    if (!id) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 });
    }

    const updateData: any = {};
    if (role && ["ADMIN", "MANAGER", "OPERATOR", "VIEWER"].includes(role)) {
      updateData.role = role;
    }
    if (name) {
      updateData.name = name.trim();
    }
    if (password) {
      updateData.passwordHash = await bcrypt.hash(password, 10);
    }

    const updated = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
    });

    return NextResponse.json({ success: true, user: updated });
  } catch (error) {
    console.error("Update user error:", error);
    return NextResponse.json({ error: "Failed to update user" }, { status: 500 });
  }
}
