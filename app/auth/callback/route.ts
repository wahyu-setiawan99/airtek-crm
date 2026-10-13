import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/** Supabase email links (password recovery) land here with a PKCE code. */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type");
  const next = url.searchParams.get("next");
  const destination = next && next.startsWith("/") && !next.startsWith("//") ? next : "/onboarding";
  const supabase = await createClient();

  if (code) {
    const result = await supabase?.auth.exchangeCodeForSession(code);
    if (!supabase || result?.error) return NextResponse.redirect(new URL("/login", request.url));
  } else if (tokenHash && type) {
    const otpType = type === "signup" || type === "invite" || type === "recovery" || type === "email" ? type : "email";
    const result = await supabase?.auth.verifyOtp({ token_hash: tokenHash, type: otpType });
    if (!supabase || result?.error) return NextResponse.redirect(new URL("/login", request.url));
  }
  return NextResponse.redirect(new URL(destination, request.url));
}
