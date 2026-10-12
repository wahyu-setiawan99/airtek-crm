import createMiddleware from "next-intl/middleware";
import { NextRequest, NextResponse } from "next/server";
import { routing } from "./i18n/routing";
import { ORG_COOKIE, SESSION_COOKIE } from "./lib/constants";

const handleI18n = createMiddleware(routing);

const PUBLIC_PATHS = new Set(["/login", "/register", "/forgot-password", "/reset-password"]);

export default function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/auth")) {
    return NextResponse.next();
  }

  const localeMatch = pathname.match(/^\/(id|en)(\/|$)/);
  if (!localeMatch) {
    return handleI18n(request);
  }

  const locale = localeMatch[1] ?? routing.defaultLocale;
  const rest = pathname.replace(/^\/(id|en)/, "") || "/";
  const session = request.cookies.get(SESSION_COOKIE)?.value;
  const isPublic = PUBLIC_PATHS.has(rest);

  if (rest === "/") {
    const dest = session ? "dashboard" : "login";
    return NextResponse.redirect(new URL(`/${locale}/${dest}`, request.url));
  }

  if (!session && !isPublic) {
    return NextResponse.redirect(new URL(`/${locale}/login`, request.url));
  }

  if (session && isPublic) {
    return NextResponse.redirect(new URL(`/${locale}/dashboard`, request.url));
  }

  const response = handleI18n(request);
  if (!request.cookies.get(ORG_COOKIE) && session) {
    response.headers.set("x-airtek-org", "missing");
  }
  return response;
}

export const config = {
  matcher: ["/((?!_next|.*\\..*).*)"],
};
