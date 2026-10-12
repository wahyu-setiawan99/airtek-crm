import { createServerClient, type CookieOptions } from "@supabase/ssr";
import createMiddleware from "next-intl/middleware";
import { NextRequest, NextResponse } from "next/server";
import { routing } from "./i18n/routing";
import { SESSION_COOKIE } from "./lib/constants";
import { supabaseEnabled } from "./lib/env";

const handleI18n = createMiddleware(routing);

// accept-invite is public: the invite link's session arrives in the URL hash and is set client-side.
const PUBLIC_PATHS = new Set(["/login", "/register", "/forgot-password", "/reset-password", "/accept-invite"]);
/** Signed-in users are sent to the dashboard from these (reset-password stays reachable for recovery links). */
const GUEST_ONLY = new Set(["/login", "/register", "/forgot-password"]);

type AppLocale = "id" | "en";
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

function preferredLocale(request: NextRequest): AppLocale {
  const value = request.cookies.get("NEXT_LOCALE")?.value;
  return value === "en" || value === "id" ? value : routing.defaultLocale;
}

function splitLocale(pathname: string): { locale: AppLocale; rest: string } | null {
  const match = pathname.match(/^\/(id|en)(\/.*)?$/);
  if (!match || (match[1] !== "id" && match[1] !== "en")) return null;
  let rest = match[2] ?? "/";
  if (rest.length > 1 && rest.endsWith("/")) rest = rest.slice(0, -1);
  return { locale: match[1], rest: rest || "/" };
}

function barePath(pathname: string) {
  if (pathname === "/") return "/";
  return pathname.length > 1 && pathname.endsWith("/") ? pathname.slice(0, -1) : pathname;
}

/**
 * One hop to the final page. `null` means the localized path can render as-is.
 * `/` goes straight to dashboard or login — never `/onboarding` (that page is only
 * for a signed-in user who still has no membership; `requireSession` sends them).
 */
function authTarget(locale: AppLocale, rest: string, signedIn: boolean): string | null {
  if (rest === "/") return `/${locale}/${signedIn ? "dashboard" : "login"}`;
  if (signedIn && GUEST_ONLY.has(rest)) return `/${locale}/dashboard`;
  if (!signedIn && !PUBLIC_PATHS.has(rest)) return `/${locale}/login`;
  return null;
}

function redirectTo(request: NextRequest, pathname: string, pending: PendingCookie[], search: string) {
  const url = request.nextUrl.clone();
  url.pathname = pathname;
  url.search = search;
  return withCookies(NextResponse.redirect(url), pending);
}

/** Remember the page the guest asked for, so login can `router.replace` it. */
function loginSearch(rest: string, request: NextRequest) {
  if (rest === "/" || rest === "/login") return "";
  return `?next=${encodeURIComponent(`${rest}${request.nextUrl.search}`)}`;
}

export default async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/auth") || pathname.startsWith("/api")) {
    return NextResponse.next();
  }

  const pending: PendingCookie[] = [];
  const signedIn = await readUser(request, pending);
  const localized = splitLocale(pathname);

  if (!localized) {
    const locale = preferredLocale(request);
    const rest = barePath(pathname);
    const localizedSamePath = `/${locale}${rest === "/" ? "" : rest}`;
    const target = authTarget(locale, rest, signedIn) ?? localizedSamePath;
    const search = target === localizedSamePath ? request.nextUrl.search : target.endsWith("/login") ? loginSearch(rest, request) : "";
    return redirectTo(request, target, pending, search);
  }

  const target = authTarget(localized.locale, localized.rest, signedIn);
  if (target) {
    const search = target.endsWith("/login") ? loginSearch(localized.rest, request) : "";
    return redirectTo(request, target, pending, search);
  }
  return withCookies(handleI18n(request), pending);
}

export const config = {
  matcher: ["/((?!_next|.*\\..*).*)"],
};
