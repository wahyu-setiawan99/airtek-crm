import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/** Supabase email links (password recovery) land here with a PKCE code. */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next");
  // Only same-site relative paths.
  const destination = next && next.startsWith("/") && !next.startsWith("//") ? next : "/id/dashboard";

  if (code) {
    const supabase = await createClient();
    const result = await supabase?.auth.exchangeCodeForSession(code);
    if (!supabase || result?.error) {
      return NextResponse.redirect(new URL("/id/login", request.url));
    }
  }
  return NextResponse.redirect(new URL(destination, request.url));
}
