import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";
import { LOCALE_COOKIE, localeCookieOptions, SESSION_COOKIE } from "./lib/constants";
import { supabaseEnabled } from "./lib/env";

const PUBLIC_PATHS = new Set(["/login", "/register", "/forgot-password", "/reset-password", "/accept-invite"]);
/** Signed-in users leave these for the dashboard. Reset and accept-invite stay reachable. */
const GUEST_ONLY = new Set(["/login", "/register", "/forgot-password"]);

type PendingCookie = { name: string; value: string; options: CookieOptions };

async function readSignedIn(request: NextRequest, pending: PendingCookie[]) {
  if (!supabaseEnabled) return Boolean(request.cookies.get(SESSION_COOKIE)?.value);
  const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          request.cookies.set(name, value);
          pending.push({ name, value, options });
        });
      },
    },
  });
  const { data } = await supabase.auth.getClaims();
  const role = data?.claims?.role;
  return Boolean(data?.claims?.sub) && role !== "anon";
}

function withCookies(response: NextResponse, pending: PendingCookie[]) {
  pending.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
  return response;
}

function barePath(pathname: string) {
  if (pathname === "/") return "/";
  return pathname.length > 1 && pathname.endsWith("/") ? pathname.slice(0, -1) : pathname;
}

/** Old `/id` and `/en` bookmarks become the same path with no prefix. */
function legacyTarget(pathname: string): { locale: "id" | "en"; path: string } | null {
  const match = pathname.match(/^\/(id|en)(\/.*)?$/);
  if (!match || (match[1] !== "id" && match[1] !== "en")) return null;
  let rest = match[2] ?? "/";
  if (rest.length > 1 && rest.endsWith("/")) rest = rest.slice(0, -1);
  return { locale: match[1], path: rest || "/" };
}

export default async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (pathname.startsWith("/auth") || pathname.startsWith("/api")) return NextResponse.next();

  const legacy = legacyTarget(pathname);
  if (legacy) {
    const url = request.nextUrl.clone();
    url.pathname = legacy.path;
    const response = NextResponse.redirect(url, 308);
    response.cookies.set(LOCALE_COOKIE, legacy.locale, localeCookieOptions);
    return response;
  }

  const rest = barePath(pathname);
  if (PUBLIC_PATHS.has(rest) && !GUEST_ONLY.has(rest)) return NextResponse.next();

  const pending: PendingCookie[] = [];
  const signedIn = await readSignedIn(request, pending);

  if (signedIn && GUEST_ONLY.has(rest)) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    url.search = "";
    return withCookies(NextResponse.redirect(url), pending);
  }

  if (!signedIn && !PUBLIC_PATHS.has(rest)) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    const next = `${rest}${request.nextUrl.search}`;
    url.search = next && next !== "/login" ? `?next=${encodeURIComponent(next)}` : "";
    return withCookies(NextResponse.redirect(url), pending);
  }

  return withCookies(NextResponse.next(), pending);
}

export const config = {
  // `.+` skips `/` so the static home page never enters middleware.
  matcher: ["/((?!api|auth|_next|brand|.*\\..*).+)"],
};
