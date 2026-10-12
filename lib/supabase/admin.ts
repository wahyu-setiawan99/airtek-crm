import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/** Service-role client. Server only — bypasses RLS, so callers must check permissions first. */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("SUPABASE_SERVICE_ROLE_KEY is not configured");
  return createSupabaseClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

/** Anon client without cookies, used to verify a password without touching the session. */
export function createStatelessClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("Supabase is not configured");
  return createSupabaseClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
