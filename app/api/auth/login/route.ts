import { NextResponse } from "next/server";
import { login } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const identifier = (body.username || body.email || body.identifier || "").trim();
    const password = body.password;

    if (!identifier || !password) {
      return NextResponse.json(
        { error: "Username or Email and password are required" },
        { status: 400 }
      );
    }

    const result = await login(identifier, password);
    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Authentication failed" },
        { status: 401 }
      );
    }

    return NextResponse.json({ success: true, user: result.user });
  } catch (error) {
    console.error("Login route error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
