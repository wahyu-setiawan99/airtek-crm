import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { cookieOptions, SESSION_COOKIE } from "@/lib/constants";
import { mutateStore } from "@/lib/demo/store";

/** Local demo stand-in for the Supabase confirmation email. */
export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get("token");
  if (!token) return NextResponse.redirect(new URL("/id/login", request.url));
  const userId = mutateStore((store) => {
    const profile = store.profiles.find((item) => item.confirm_token === token);
    if (!profile) return null;
    profile.email_confirmed = true;
    profile.confirm_token = null;
    profile.updated_at = new Date().toISOString();
    return profile.id;
  });
  if (!userId) return NextResponse.redirect(new URL("/id/login", request.url));
  const jar = await cookies();
  jar.set(SESSION_COOKIE, userId, cookieOptions);
  return NextResponse.redirect(new URL("/id/onboarding", request.url));
}
