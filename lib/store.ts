import "server-only";
import { cache } from "react";
import { readStore, mutateStore } from "@/lib/demo/store";
import { supabaseEnabled } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import { commitSupabaseStore, loadSupabaseStore, type CommitScope } from "@/lib/supabase/store";
import type { Store } from "@/types/crm";

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
