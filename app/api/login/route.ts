import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { username, password } = await req.json();

  const expectedUser = process.env.APP_USERNAME || "admin";
  const expectedPass = process.env.APP_PASSWORD || "changeme";

  if (username !== expectedUser || password !== expectedPass) {
    return NextResponse.json(
      { ok: false, error: "Wrong username or password." },
      { status: 401 }
    );
  }

  const token = Buffer.from(`${username}:${password}`).toString("base64");

  const res = NextResponse.json({ ok: true });
  res.cookies.set("session", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30 days
  });
  return res;
}
