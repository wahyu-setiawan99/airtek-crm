import "server-only";
import { cache } from "react";
import { STORE_VERSION } from "@/lib/demo/seed";
import { readStore, mutateStore } from "@/lib/demo/store";
import { supabaseEnabled } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import { commitSupabaseStore, fetchTable, TABLE_NAMES, type CommitScope, type TableName } from "@/lib/supabase/store";
import type { AuditLog, Store } from "@/types/crm";

export type { TableName };

/**
 * Pages and actions load only the tables they use (AGENTS.md §15.3). Reading a table that was
 * not requested throws `MissingTable`; `withStore` and `mutate` catch it, load that table and
 * run the (synchronous) callback again, so a short table list costs speed, never correctness.
 */
export class MissingTable extends Error {
  constructor(readonly table: TableName) {
    super(`table not loaded: ${table}`);
  }
}

const ALL = new Set<string>(TABLE_NAMES);
const MAX_ATTEMPTS = TABLE_NAMES.length + 1;

/** Tables every action needs to know who is acting. */
const ACTION_BASE: readonly TableName[] = ["organizations", "memberships", "profiles"];

const requestClient = cache(async () => {
  const supabase = await createClient();
  if (!supabase) throw new Error("Supabase is not configured");
  return supabase;
});

/** Table rows already requested in this request, shared by the layout, page and session. */
const requestTables = cache(() => new Map<TableName, Promise<unknown[]>>());

async function loadTables(names: Iterable<TableName>, fresh = false) {
  const client = await requestClient();
  const pending = requestTables();
  const list = [...new Set(names)];
  const rows = await Promise.all(
    list.map((name) => {
      let request = fresh ? undefined : pending.get(name);
      if (!request) {
        request = fetchTable(client, name);
        pending.set(name, request);
        request.catch(() => pending.delete(name));
      }
      return request;
    }),
  );
  const store = { version: STORE_VERSION, seeded_on: "" } as Store;
  list.forEach((name, index) => {
    (store as unknown as Record<TableName, unknown[]>)[name] = rows[index] ?? [];
  });
  return store;
}

/** An unloaded table inside an action: rows can be added (push/unshift); any read throws. */
function writeOnly(table: TableName, buffer: unknown[]) {
  return new Proxy(buffer, {
    get(target, property) {
      if (property === "push" || property === "unshift") return (...items: unknown[]) => target.push(...items);
      throw new MissingTable(table);
    },
  });
}

function guard(store: Store, loaded: Set<TableName>, writable: boolean): Store {
  return new Proxy(store, {
    get(target, property, receiver) {
      if (typeof property === "string" && ALL.has(property) && !loaded.has(property as TableName)) {
        const table = property as TableName;
        if (!writable) throw new MissingTable(table);
        return writeOnly(table, (target as unknown as Record<TableName, unknown[]>)[table]);
      }
      return Reflect.get(target, property, receiver);
    },
    set(target, property, value, receiver) {
      if (typeof property === "string" && ALL.has(property) && !loaded.has(property as TableName)) {
        throw new MissingTable(property as TableName);
      }
      return Reflect.set(target, property, value, receiver);
    },
  });
}

function onDemand(table: TableName, requested: Set<TableName>) {
  if (process.env.NODE_ENV !== "production" || process.env.STORE_TRACE) {
    console.warn(`[store] loaded "${table}" on demand; requested: ${[...requested].join(", ")}`);
  }
}

/** Tables the session needs; preloaded with every page. */
const SESSION_TABLES: readonly TableName[] = ["profiles", "memberships", "organizations"];

/**
 * Starts loading a page's tables (and the session's) without waiting, so the fetch runs
 * alongside the auth check instead of after it. Later `withStore` calls reuse the requests.
 */
export function preload(tables: readonly TableName[]) {
  if (!supabaseEnabled) return;
  void loadTables([...SESSION_TABLES, ...tables]).catch(() => {});
}

/**
 * Runs `fn` on a store holding `tables` (plus any it turns out to read). Use for pages.
 * The returned value must not keep the store itself, only data derived from it.
 */
export async function withStore<T>(tables: readonly TableName[], fn: (store: Store) => T): Promise<T> {
  if (!supabaseEnabled) return fn(readStore());
  const names = new Set(tables);
  for (let attempt = 0; ; attempt++) {
    const store = await loadTables(names);
    try {
      return fn(guard(store, names, false));
    } catch (error) {
      if (!(error instanceof MissingTable) || attempt >= MAX_ATTEMPTS) throw error;
      onDemand(error.table, names);
      names.add(error.table);
    }
  }
}

/**
 * Applies `fn` to a copy of the tables it uses and writes only the rows that changed. Tables
 * that `fn` only appends to (audit log, notes, notifications…) are never loaded.
 */
export async function mutate<T>(fn: (store: Store) => T, scope: CommitScope, tables: readonly TableName[] = []): Promise<T> {
  if (!supabaseEnabled) return mutateStore(fn);
  const names = new Set<TableName>([...ACTION_BASE, ...tables]);
  for (let attempt = 0; ; attempt++) {
    const before = await loadTables(names, true);
    const after = structuredClone(before);
    for (const table of TABLE_NAMES) {
      if (names.has(table)) continue;
      (before as unknown as Record<TableName, unknown[]>)[table] = [];
      (after as unknown as Record<TableName, unknown[]>)[table] = [];
    }
    let result: T;
    try {
      result = fn(guard(after, names, true));
    } catch (error) {
      if (!(error instanceof MissingTable) || attempt >= MAX_ATTEMPTS) throw error;
      onDemand(error.table, names);
      names.add(error.table);
      continue;
    }
    await commitSupabaseStore(before, after, scope);
    // Later reads in this request must see the new rows.
    const pending = requestTables();
    for (const table of TABLE_NAMES) {
      const written = (after as unknown as Record<TableName, unknown[]>)[table];
      if (names.has(table) || written.length > 0) pending.delete(table);
    }
    return result;
  }
}

/** Full change history of one deal (the store only keeps a recent audit window). */
export async function loadDealAudit(dealId: string): Promise<AuditLog[]> {
  if (!supabaseEnabled) {
    return readStore().audit_logs.filter((item) => item.entity === "deal" && item.entity_id === dealId);
  }
  const supabase = await requestClient();
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
