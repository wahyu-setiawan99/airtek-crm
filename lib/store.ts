import "server-only";
import { cache } from "react";
import { readStore, mutateStore } from "@/lib/demo/store";
import { supabaseEnabled } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import { commitSupabaseStore, loadSupabaseStore, type CommitScope } from "@/lib/supabase/store";
import type { AuditLog, Store } from "@/types/crm";

/** Store snapshot for the current request (shared by the layout, page and session). */
export const loadStore = cache(async (): Promise<Store> => {
  if (!supabaseEnabled) return readStore();
  const supabase = await createClient();
  if (!supabase) throw new Error("Supabase is not configured");
  return loadSupabaseStore(supabase);
});

/** Applies `fn` to a copy of the store and persists only what changed. */
export async function mutate<T>(fn: (store: Store) => T, scope: CommitScope): Promise<T> {
  if (!supabaseEnabled) return mutateStore(fn);
  const before = await loadStore();
  const after = structuredClone(before);
  const result = fn(after);
  await commitSupabaseStore(before, after, scope);
  return result;
}

/** Full change history of one deal (the store only keeps a recent audit window). */
export async function loadDealAudit(dealId: string): Promise<AuditLog[]> {
  if (!supabaseEnabled) {
    return (await loadStore()).audit_logs.filter((item) => item.entity === "deal" && item.entity_id === dealId);
  }
  const supabase = await createClient();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("audit_logs")
    .select("*")
    .eq("entity", "deal")
    .eq("entity_id", dealId)
    .order("created_at", { ascending: false })
    .limit(500);
  if (error) throw new Error(`load deal audit: ${error.message}`);
  return (data ?? []) as AuditLog[];
}
