import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { isPublicModeServer } from "@/src/lib/publicMode";

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // In public mode, block /admin/*
  if (isPublicModeServer() && pathname.startsWith("/admin")) {
    return NextResponse.redirect(new URL("/chat", req.url));
  }

  // Allow login + API routes + Next static assets
  if (
    pathname.startsWith("/login") ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/_next") ||
    pathname === "/favicon.ico"
  ) {
    return NextResponse.next();
  }

  const authed = req.cookies.get("bw_authed")?.value === "1";
  if (!authed) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image).*)"],
};
