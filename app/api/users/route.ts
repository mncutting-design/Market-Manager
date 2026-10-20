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
      where: {
        NOT: [
          { email: "admin@marketmanager.com" },
          { name: "প্রশাসক (Admin)" },
        ],
      },
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

    // If database has no users, return default NAZRUL Admin
    if (users.length === 0) {
      return NextResponse.json({
        users: [
          {
            id: "user-nazrul-admin-2026",
            name: "NAZRUL",
            email: "nazrul",
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
          email: "nazrul",
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
    const body = await req.json();
    const rawUsername = (body.username || body.name || "").trim();
    const password = body.password;
    const role = body.role;

    if (!rawUsername || !password) {
      return NextResponse.json(
        { error: "Username and password are required" },
        { status: 400 }
      );
    }

    if (password.length < 4) {
      return NextResponse.json(
        { error: "Password must be at least 4 characters long" },
        { status: 400 }
      );
    }

    // Generate internal email identifier if no email was entered
    const sanitizedName = rawUsername.toLowerCase().replace(/[^a-z0-9_-]/g, "_");
    const internalEmail = body.email
      ? body.email.toLowerCase().trim()
      : `${sanitizedName}@rentpro.internal`;

    const existing = await prisma.user.findFirst({
      where: {
        OR: [
          { name: { equals: rawUsername, mode: "insensitive" } },
          { email: { equals: internalEmail, mode: "insensitive" } },
        ],
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: "এই ইউজারনেমটি ইতিমধ্যে ব্যবহৃত হয়েছে (Username is already registered)" },
        { status: 409 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const validRole = ["ADMIN", "MANAGER", "OPERATOR", "VIEWER"].includes(role?.toUpperCase())
      ? role.toUpperCase()
      : "MANAGER";

    const newUser = await prisma.user.create({
      data: {
        name: rawUsername,
        email: internalEmail,
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
    const { id, role, password, newPassword, name } = await req.json();
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
    const finalPassword = newPassword || password;
    if (finalPassword) {
      if (finalPassword.length < 4) {
        return NextResponse.json(
          { error: "Password must be at least 4 characters long" },
          { status: 400 }
        );
      }
      updateData.passwordHash = await bcrypt.hash(finalPassword, 10);
    }

    const updated = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        locale: true,
        createdAt: true,
      },
    });

    return NextResponse.json({
      success: true,
      user: updated,
      message: finalPassword ? "Password reset successfully!" : "User updated successfully",
    });
  } catch (error) {
    console.error("Update user error:", error);
    return NextResponse.json({ error: "Failed to update user" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Only ADMIN can delete users
  if (!hasPermission(session.role, "canManageUsers")) {
    return NextResponse.json(
      { error: "Only Admins have permission to delete users" },
      { status: 403 }
    );
  }

  try {
    const url = new URL(req.url);
    let id = url.searchParams.get("id");
    if (!id) {
      try {
        const body = await req.json();
        id = body.id;
      } catch {}
    }

    if (!id) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 });
    }

    // Safety checks: Cannot delete self
    if (session.id === id) {
      return NextResponse.json(
        { error: "আপনি নিজের অ্যাকাউন্ট ডিলিট করতে পারবেন না (Cannot delete your own account)" },
        { status: 400 }
      );
    }

    // Safety checks: Cannot delete primary NAZRUL
    const target = await prisma.user.findUnique({
      where: { id },
    });

    if (!target) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (
      target.name.toUpperCase() === "NAZRUL" ||
      target.email.toLowerCase().includes("nazrul")
    ) {
      return NextResponse.json(
        { error: "মূল সুপার এডমিন (NAZRUL) ডিলিট করা সম্ভব নয় (Cannot delete primary Super Admin)" },
        { status: 403 }
      );
    }

    await prisma.user.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: `User '${target.name}' deleted successfully`,
    });
  } catch (error) {
    console.error("Delete user error:", error);
    return NextResponse.json({ error: "Failed to delete user" }, { status: 500 });
  }
}
