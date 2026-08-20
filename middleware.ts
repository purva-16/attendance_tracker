import { NextRequest, NextResponse } from "next/server";

// Cookie-based auth gate (replaces the old native Basic Auth popup, which
// some embedded/preview browsers don't render properly). Set APP_USERNAME
// and APP_PASSWORD as Environment Variables in Vercel (or in .env.local
// for local dev). Never hardcode the real password here.

function expectedToken() {
  const user = process.env.APP_USERNAME || "admin";
  const pass = process.env.APP_PASSWORD || "changeme";
  return Buffer.from(`${user}:${pass}`).toString("base64");
}

const PUBLIC_PATHS = ["/login", "/api/login"];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  const session = req.cookies.get("session")?.value;

  if (session && session === expectedToken()) {
    return NextResponse.next();
  }

  const loginUrl = new URL("/login", req.url);
  loginUrl.searchParams.set("from", pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
