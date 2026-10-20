import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { currentPassword, newPassword } = await req.json();
    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { error: "Current password and new password are required" },
        { status: 400 }
      );
    }

    if (newPassword.length < 4) {
      return NextResponse.json(
        { error: "New password must be at least 4 characters long" },
        { status: 400 }
      );
    }

    let user = null;
    try {
      user = await prisma.user.findFirst({
        where: {
          OR: [
            { id: session.id },
            { email: session.email },
            { name: session.name },
          ],
        },
      });
    } catch (dbErr) {
      console.warn("DB user lookup error in change-password:", dbErr);
    }

    const isNazrulInitial =
      (session.name === "NAZRUL" || session.email?.includes("nazrul")) &&
      currentPassword === "NAZRUL";

    if (!user) {
      // If user was using initial session, create record with new password
      if (isNazrulInitial) {
        const newHash = await bcrypt.hash(newPassword, 10);
        try {
          user = await prisma.user.create({
            data: {
              name: session.name || "NAZRUL",
              email: "nazrul@rentpro.internal",
              passwordHash: newHash,
              role: session.role || "ADMIN",
              locale: session.locale || "bn",
            },
          });
          return NextResponse.json({
            success: true,
            message: "Password changed successfully!",
          });
        } catch (createErr) {
          console.error("Could not create user record in DB:", createErr);
        }
      }
      return NextResponse.json({ error: "User not found in system" }, { status: 404 });
    }

    // Verify current password
    const isHashMatch = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isHashMatch && !isNazrulInitial) {
      return NextResponse.json({ error: "Current password is incorrect" }, { status: 400 });
    }

    // Save new hashed password
    const newHash = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: newHash },
    });

    return NextResponse.json({
      success: true,
      message: "Password changed and saved successfully!",
    });
  } catch (error) {
    console.error("Change password route error:", error);
    return NextResponse.json({ error: "Failed to update password" }, { status: 500 });
  }
}
