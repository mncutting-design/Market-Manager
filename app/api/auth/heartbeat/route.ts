import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { recordUserActivity } from "@/lib/user-tracker";

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ ok: false }, { status: 401 });
    }

    recordUserActivity(session.name);
    if (session.id) {
      recordUserActivity(session.id);
    }

    return NextResponse.json({ ok: true, user: session.name });
  } catch (e) {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
