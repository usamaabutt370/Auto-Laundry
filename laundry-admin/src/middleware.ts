import { type NextRequest, NextResponse } from "next/server";

const SESSION_COOKIE = "admin_session";
const SESSION_SECRET =
  process.env.ADMIN_SESSION_SECRET ?? "auto-laundry-admin-dev-secret-change-in-prod";

const PUBLIC_PREFIXES = ["/login", "/api/auth", "/_next", "/favicon.ico", "/icons"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    return NextResponse.next();
  }

  const session = request.cookies.get(SESSION_COOKIE)?.value;

  if (session !== SESSION_SECRET) {
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
