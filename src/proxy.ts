import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  const sessionSecret = process.env.ADMIN_SESSION_SECRET;
  const adminSession = request.cookies.get("admin_session")?.value;

  if (!sessionSecret || adminSession !== sessionSecret) {
    return NextResponse.redirect(new URL("/admin-login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/instructor/:path*", "/review/:path*"],
};
