import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { ORG_COOKIE, SESSION_COOKIE } from "@/lib/constants";
import { clearSignedIn } from "@/lib/session-flags";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const supabase = await createClient();
  await supabase?.auth.signOut();
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
  jar.delete(ORG_COOKIE);
  await clearSignedIn();
  return NextResponse.redirect(new URL("/login", request.url));
}
