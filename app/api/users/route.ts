import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { hasPermission } from "@/lib/permissions";
import { getUserActivity } from "@/lib/user-tracker";

export async function GET(req: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const activeStaffOnly = searchParams.get("staff") === "true" || searchParams.get("activeStaff") === "true";

  // Requirement: Payment form has a "Received by" dropdown listing active staff users.
  // Any authenticated user can fetch the list of active staff for collector tracking.
  if (activeStaffOnly) {
    try {
      const activeStaff = await prisma.user.findMany({
        where: {
          isActive: true,
          role: { in: ["ADMIN", "MANAGER", "COLLECTOR", "OPERATOR"] },
        },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          role: true,
        },
        orderBy: { name: "asc" },
      });

      return NextResponse.json({ staff: activeStaff });
    } catch (err) {
      console.error("Failed to fetch staff:", err);
      return NextResponse.json({
        staff: [
          {
            id: session.id,
            name: session.name,
            email: session.email,
            role: session.role,
          },
        ],
      });
    }
  }

  const isAdmin = session.role === "ADMIN";

  try {
    // REQUIREMENT: WITHOUT ADMIN ALL USER ONLY SHOW THEIR OWN NAME IN USER PAGE
    if (!isAdmin) {
      let myUser = null;
      try {
        myUser = await prisma.user.findFirst({
          where: {
            OR: [
              { id: session.id },
              { name: { equals: session.name, mode: "insensitive" } },
              { email: { equals: session.email, mode: "insensitive" } },
            ],
          },
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            role: true,
            locale: true,
            isActive: true,
            createdAt: true,
          },
        });
      } catch (err) {
        console.warn("Could not find my user:", err);
      }

      const selfAccount = myUser || {
        id: session.id,
        name: session.name,
        email: session.email,
        phone: null,
        role: session.role,
        locale: session.locale,
        isActive: true,
        createdAt: new Date().toISOString(),
      };

      return NextResponse.json({
        users: [
          {
            ...selfAccount,
            isOnline: true,
            lastActiveAgo_bn: "অনলাইন (সক্রিয়)",
            lastActiveAgo_en: "Online Now",
            lastActiveAt: new Date().toISOString(),
          },
        ],
      });
    }

    // ADMIN: CAN SEE ALL USERS, WHO ARE ONLINE, AND LAST TIME AGO THEY USED THE SYSTEM
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
        phone: true,
        role: true,
        locale: true,
        isActive: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });

    // Ensure NAZRUL is present if DB has no users
    if (users.length === 0) {
      const act = getUserActivity("NAZRUL");
      return NextResponse.json({
        users: [
          {
            id: "user-nazrul-admin-2026",
            name: "NAZRUL",
            email: "nazrul@rentpro.internal",
            role: "ADMIN",
            locale: "bn",
            isActive: true,
            isOnline: true,
            lastActiveAgo_bn: act.lastActiveAgo_bn,
            lastActiveAgo_en: act.lastActiveAgo_en,
            lastActiveAt: act.lastActiveAt,
            createdAt: new Date().toISOString(),
          },
        ],
      });
    }

    // Attach real-time online presence and relative last-active time
    const enrichedUsers = users.map((u) => {
      const activity = getUserActivity(u.name, u.createdAt);
      return {
        ...u,
        isActive: u.isActive !== false,
        isOnline: activity.isOnline,
        lastActiveAgo_bn: activity.lastActiveAgo_bn,
        lastActiveAgo_en: activity.lastActiveAgo_en,
        lastActiveAt: activity.lastActiveAt,
      };
    });

    return NextResponse.json({ users: enrichedUsers });
  } catch (error) {
    console.error("Fetch users error:", error);
    return NextResponse.json({
      users: [
        {
          id: session.id || "user-nazrul-admin-2026",
          name: session.name || "NAZRUL",
          email: session.email || "nazrul@rentpro.internal",
          role: session.role || "ADMIN",
          locale: "bn",
          isActive: true,
          isOnline: true,
          lastActiveAgo_bn: "অনলাইন (সক্রিয়)",
          lastActiveAgo_en: "Online Now",
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
    const isActive = body.isActive !== undefined ? Boolean(body.isActive) : true;

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
    const validRole = ["ADMIN", "MANAGER", "COLLECTOR", "OPERATOR", "VIEWER"].includes(role?.toUpperCase())
      ? (role.toUpperCase() === "OPERATOR" ? "COLLECTOR" : role.toUpperCase())
      : "COLLECTOR";

    const newUser = await prisma.user.create({
      data: {
        name: rawUsername,
        email: internalEmail,
        phone: body.phone?.trim() || null,
        passwordHash,
        role: validRole,
        locale: "bn",
        isActive,
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        locale: true,
        isActive: true,
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
    const body = await req.json();
    const { id, role, password, newPassword, name, phone, isActive } = body;
    if (!id) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 });
    }

    const targetUser = await prisma.user.findUnique({
      where: { id },
    });

    if (!targetUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const isNazrul =
      targetUser.name.toUpperCase() === "NAZRUL" ||
      targetUser.email.toLowerCase().includes("nazrul");

    const updateData: any = {};

    // 1. ACTIVE / INACTIVE STATUS TOGGLE
    if (typeof isActive === "boolean") {
      // Safeguard: Primary Super Admin NAZRUL can never be deactivated
      if (isNazrul && isActive === false) {
        return NextResponse.json(
          { error: "মূল সুপার এডমিন (NAZRUL) নিষ্ক্রিয় করা যাবে না (Primary Super Admin cannot be deactivated)" },
          { status: 400 }
        );
      }

      // Safeguard: User cannot deactivate their own active account
      if (session.id === id && isActive === false) {
        return NextResponse.json(
          { error: "নিজের অ্যাকাউন্ট নিষ্ক্রিয় করা যাবে না (Cannot deactivate your own account)" },
          { status: 400 }
        );
      }

      updateData.isActive = isActive;
    }

    // 2. Role update
    if (role && ["ADMIN", "MANAGER", "COLLECTOR", "OPERATOR", "VIEWER"].includes(role.toUpperCase())) {
      const normalizedRole = role.toUpperCase() === "OPERATOR" ? "COLLECTOR" : role.toUpperCase();
      if (isNazrul && normalizedRole !== "ADMIN") {
        return NextResponse.json(
          { error: "মূল সুপার এডমিন (NAZRUL)-এর রোল পরিবর্তন করা যাবে না" },
          { status: 400 }
        );
      }
      updateData.role = normalizedRole;
    }

    // 3. Name update
    if (name) {
      updateData.name = name.trim();
    }

    // 4. Phone update
    if (phone !== undefined) {
      updateData.phone = phone?.trim() || null;
    }

    // 5. Password update (Admin reset)
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
        phone: true,
        role: true,
        locale: true,
        isActive: true,
        createdAt: true,
      },
    });

    return NextResponse.json({
      success: true,
      user: updated,
      message:
        typeof isActive === "boolean"
          ? isActive
            ? "User activated successfully"
            : "User deactivated successfully"
          : finalPassword
          ? "Password reset successfully!"
          : "User updated successfully",
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

