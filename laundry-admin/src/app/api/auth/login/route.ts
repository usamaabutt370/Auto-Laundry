import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { SESSION_COOKIE, SESSION_SECRET } from "@/lib/auth/session";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { username, password } = body as Record<string, unknown>;

  const expectedUsername = process.env.ADMIN_USERNAME ?? "admin";
  const expectedPassword = process.env.ADMIN_PASSWORD ?? "";

  if (!expectedPassword) {
    return NextResponse.json({ error: "Server misconfigured: ADMIN_PASSWORD not set" }, { status: 500 });
  }

  if (username !== expectedUsername || password !== expectedPassword) {
    return NextResponse.json({ error: "Invalid username or password" }, { status: 401 });
  }

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, SESSION_SECRET, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7, // 7 days
  });

  return NextResponse.json({ ok: true });
}
