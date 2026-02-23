import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

const secret = new TextEncoder().encode(
  process.env.JWT_SECRET || "change-me-in-production-please"
);

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/admin") && !pathname.startsWith("/admin/login")) {
    const token = request.cookies.get("auth-token")?.value;
    if (!token) {
      return NextResponse.redirect(new URL("/admin/login", request.url));
    }
    try {
      await jwtVerify(token, secret);
      return NextResponse.next();
    } catch {
      const response = NextResponse.redirect(
        new URL("/admin/login", request.url)
      );
      response.cookies.delete("auth-token");
      return response;
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
