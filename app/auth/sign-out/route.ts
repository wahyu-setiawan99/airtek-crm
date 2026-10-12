import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { ORG_COOKIE, SESSION_COOKIE } from "@/lib/constants";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const supabase = await createClient();
  await supabase?.auth.signOut();
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
  jar.delete(ORG_COOKIE);
  return NextResponse.redirect(new URL("/id/login", request.url));
}
