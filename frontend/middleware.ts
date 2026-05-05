import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const OPERATOR_ROLES = new Set(["moderator", "admin", "superadmin"]);

export function middleware(request: NextRequest) {
  if (!request.nextUrl.pathname.startsWith("/admin-panel")) {
    return NextResponse.next();
  }

  const isLoggedIn = request.cookies.get("communitysite_logged_in")?.value === "1";
  const operatorRole = request.cookies.get("communitysite_operator_role")?.value ?? "none";

  if (!isLoggedIn) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (!OPERATOR_ROLES.has(operatorRole)) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin-panel/:path*"],
};
