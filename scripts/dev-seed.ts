/**
 * Local development only: test logins + sample CRM data in the LOCAL Supabase (Docker).
 *
 *   pnpm db:start   # local Supabase in Docker
 *   pnpm dev:seed   # this script
 *
 * Refuses to run unless NEXT_PUBLIC_SUPABASE_URL points to localhost / 127.0.0.1, so it can never
 * create accounts in production. See AGENTS.md §18.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { existsSync, readFileSync } from "node:fs";
import { createSeed } from "@/lib/demo/seed";
import type { Role, Store } from "@/types/crm";

type Row = Record<string, unknown>;
type TableName = Exclude<keyof Store, "version" | "seeded_on">;

const ORG_NAME = "PT. Airtek Solusi Nusantara (DEV)";
const DEFAULT_PASSWORD = "airtek-dev-123";

/** Dev logins. Seed people are folded into these four (see PEOPLE). */
const ACCOUNTS: { key: string; email: string; name: string; role: Role }[] = [
  { key: "boss", email: "boss@airtek.test", name: "Boss Dev", role: "owner" },
  { key: "admin", email: "admin@airtek.test", name: "Administrator Dev", role: "admin" },
  { key: "sales1", email: "sales1@airtek.test", name: "Sales Satu", role: "sales" },
  { key: "sales2", email: "sales2@airtek.test", name: "Sales Dua", role: "sales" },
];
/** Seed profile email → dev account key. */
const PEOPLE: Record<string, string> = {
  "admin.demo@airtek.my.id": "boss",
  "manager.demo@airtek.my.id": "admin",
  "direksi.demo@airtek.my.id": "admin",
  "sales1.demo@airtek.my.id": "sales1",
  "presales.demo@airtek.my.id": "sales1",
  "sales2.demo@airtek.my.id": "sales2",
};

/** Insert order respects foreign keys. */
const TABLES: TableName[] = [
  "organizations",
  "teams",
  "memberships",
  "pipelines",
  "stages",
  "companies",
  "contacts",
  "lost_reasons",
  "tags",
  "products",
  "deals",
  "deal_contacts",
  "deal_tags",
  "activities",
  "notes",
  "deal_products",
  "stage_history",
  "audit_logs",
  "notifications",
  "saved_views",
  "custom_fields",
  "custom_field_values",
  "attachments",
  "import_batches",
  "sales_targets",
];
const STRIP: Partial<Record<TableName, string[]>> = { deal_products: ["subtotal"], deals: ["search"] };

function loadEnv() {
  for (const file of [".env.local", ".env"]) {
    if (!existsSync(file)) continue;
    for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
      const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
      if (!match?.[1] || process.env[match[1]] !== undefined) continue;
      process.env[match[1]] = (match[2] ?? "").replace(/^["']|["']$/g, "");
    }
  }
}

function assertLocal(url: string) {
  const host = new URL(url).hostname;
  if (host !== "127.0.0.1" && host !== "localhost") {
    throw new Error(`dev:seed hanya untuk Supabase lokal. NEXT_PUBLIC_SUPABASE_URL=${url} bukan localhost — dibatalkan.`);
  }
}

async function ensureUser(admin: SupabaseClient, email: string, password: string, fullName: string) {
  for (let page = 1; page < 20; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const user = data.users.find((item) => item.email?.toLowerCase() === email);
    if (user) {
      const { error: updateError } = await admin.auth.admin.updateUserById(user.id, { password, email_confirm: true });
      if (updateError) throw updateError;
      return user.id;
    }
    if (data.users.length < 200) break;
  }
  const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { full_name: fullName } });
  if (error || !data.user) throw error ?? new Error(`createUser ${email}`);
  return data.user.id;
}

async function main() {
  loadEnv();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  if (!url || !serviceKey) throw new Error("Isi NEXT_PUBLIC_SUPABASE_URL dan SUPABASE_SERVICE_ROLE_KEY di .env.local (lihat `pnpm db:start`).");
  assertLocal(url);
  const password = process.env.DEV_TEST_PASSWORD?.trim() || DEFAULT_PASSWORD;
  const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });

  // 1. Logins.
  const accountIds = new Map<string, string>();
  for (const account of ACCOUNTS) {
    const id = await ensureUser(admin, account.email, password, account.name);
    accountIds.set(account.key, id);
    await admin.from("profiles").upsert({ id, full_name: account.name, email: account.email, locale: "en" });
  }

  // 2. Sample data from the demo seed (demo organization only), people folded into the four logins.
  const seed = createSeed();
  const org = seed.organizations.find((item) => item.demo) ?? seed.organizations[0];
  if (!org) throw new Error("seed has no organization");
  const store = seed as unknown as Record<TableName, Row[]>;
  const dealIds = new Set(seed.deals.filter((deal) => deal.organization_id === org.id).map((deal) => deal.id));
  const idMap = new Map<string, string>();
  for (const profile of seed.profiles) {
    const key = PEOPLE[profile.email];
    const id = key ? accountIds.get(key) : undefined;
    if (id) idMap.set(profile.id, id);
  }
  const rows: Partial<Record<TableName, Row[]>> = {};
  for (const table of TABLES) {
    rows[table] = (store[table] ?? []).filter((row) => {
      if (table === "organizations") return row.id === org.id;
      if (table === "memberships") return false; // created below
      if ("organization_id" in row) return row.organization_id === org.id;
      if ("deal_id" in row) return dealIds.has(String(row.deal_id));
      return false;
    });
    for (const row of rows[table] ?? []) {
      if (typeof row.id === "string" && !idMap.has(row.id)) idMap.set(row.id, crypto.randomUUID());
    }
  }
  const remap = (value: unknown): unknown => {
    if (typeof value === "string") return idMap.get(value) ?? value;
    if (Array.isArray(value)) return value.map(remap);
    if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).map(([key, inner]) => [key, remap(inner)]));
    return value;
  };
  const orgId = idMap.get(org.id) ?? crypto.randomUUID();

  // 3. Replace the previous DEV organization (cascades to its data).
  const { error: deleteError } = await admin.from("organizations").delete().eq("name", ORG_NAME);
  if (deleteError) throw deleteError;

  for (const table of TABLES) {
    let payload = (rows[table] ?? []).map((row) => {
      const copy = remap(row) as Row;
      for (const column of STRIP[table] ?? []) delete copy[column];
      return copy;
    });
    if (table === "organizations") payload = payload.map((row) => ({ ...row, name: ORG_NAME, demo: true }));
    if (table === "memberships") {
      payload = ACCOUNTS.map((account) => ({
        organization_id: orgId,
        user_id: accountIds.get(account.key),
        role: account.role,
        created_by: accountIds.get("boss"),
      }));
    }
    if (payload.length === 0) continue;
    const { error } = await admin.from(table).insert(payload);
    if (error) throw new Error(`insert ${table}: ${error.message}`);
    console.log(`  ${table.padEnd(20)} ${payload.length}`);
  }

  console.log(`\nOrganisasi: ${ORG_NAME}`);
  console.log(`Kata sandi semua akun: ${password === DEFAULT_PASSWORD ? `${DEFAULT_PASSWORD} (default, ubah via DEV_TEST_PASSWORD)` : "nilai DEV_TEST_PASSWORD"}`);
  for (const account of ACCOUNTS) console.log(`  ${account.role.padEnd(6)} ${account.email}`);
  console.log("\nBuka http://localhost:3000/login → tombol \"Masuk cepat (dev)\" atau isi email di atas.");
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
