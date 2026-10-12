import { createServerClient, type CookieOptions } from "@supabase/ssr";
import createMiddleware from "next-intl/middleware";
import { NextRequest, NextResponse } from "next/server";
import { routing } from "./i18n/routing";
import { SESSION_COOKIE } from "./lib/constants";
import { supabaseEnabled } from "./lib/env";

const handleI18n = createMiddleware(routing);

const PUBLIC_PATHS = new Set(["/login", "/register", "/forgot-password", "/reset-password"]);
/** Signed-in users are sent to the dashboard from these (reset-password stays reachable for recovery links). */
const GUEST_ONLY = new Set(["/login", "/register", "/forgot-password"]);

type PendingCookie = { name: string; value: string; options: CookieOptions };

/** Refreshes the Supabase session and returns whether a user is signed in. */
async function readUser(request: NextRequest, pending: PendingCookie[]) {
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
  const { data } = await supabase.auth.getUser();
  return Boolean(data.user);
}

function withCookies(response: NextResponse, pending: PendingCookie[]) {
  pending.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
  return response;
}

export default async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/auth")) {
    return NextResponse.next();
  }

  const localeMatch = pathname.match(/^\/(id|en)(\/|$)/);
  if (!localeMatch) {
    return handleI18n(request);
  }

  const pending: PendingCookie[] = [];
  const signedIn = await readUser(request, pending);
  const locale = localeMatch[1] ?? routing.defaultLocale;
  const rest = pathname.replace(/^\/(id|en)/, "") || "/";

  if (rest === "/") {
    const dest = signedIn ? "dashboard" : "login";
    return withCookies(NextResponse.redirect(new URL(`/${locale}/${dest}`, request.url)), pending);
  }

  if (!signedIn && !PUBLIC_PATHS.has(rest)) {
    return withCookies(NextResponse.redirect(new URL(`/${locale}/login`, request.url)), pending);
  }

  if (signedIn && GUEST_ONLY.has(rest)) {
    return withCookies(NextResponse.redirect(new URL(`/${locale}/dashboard`, request.url)), pending);
  }

  return withCookies(handleI18n(request), pending);
}

export const config = {
  matcher: ["/((?!_next|.*\\..*).*)"],
};
