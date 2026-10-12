/**
 * Creates (or recreates) the DEMO organization in Supabase with realistic data and login accounts.
 *
 *   pnpm seed:demo
 *
 * Reads NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, DEMO_PASSWORD (min 8 chars) and optionally
 * BOOTSTRAP_ADMIN_EMAIL (added as owner) and DEMO_EXTRA_ADMIN_EMAIL (an extra Administrator login).
 * Values come from the environment or from .env.seed.local / .env.local (in that order).
 * See AGENTS.md §11.3.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { existsSync, readFileSync } from "node:fs";
import { createSeed } from "@/lib/demo/seed";
import type { Store } from "@/types/crm";

type Row = Record<string, unknown>;
type TableName = Exclude<keyof Store, "version" | "seeded_on">;

/** Insert order respects foreign keys. */
const TABLES: TableName[] = [
  "organizations",
  "teams",
  "memberships",
  "invitations",
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
];
const STRIP: Partial<Record<TableName, string[]>> = { deal_products: ["subtotal"], deals: ["search"] };

function loadEnvFiles() {
  for (const file of [".env.seed.local", ".env.local"]) {
    if (!existsSync(file)) continue;
    for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
      const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (!match || !match[1] || process.env[match[1]] !== undefined) continue;
      process.env[match[1]] = (match[2] ?? "").replace(/^["']|["']$/g, "");
    }
  }
}

function required(name: string) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} belum diisi (lihat .env.example)`);
  return value;
}

async function findUserId(admin: SupabaseClient, email: string) {
  for (let page = 1; page < 50; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const user = data.users.find((item) => item.email?.toLowerCase() === email.toLowerCase());
    if (user) return user.id;
    if (data.users.length < 200) return null;
  }
  return null;
}

/** Creates the login (already confirmed) or resets its password; returns the auth user id. */
async function ensureUser(admin: SupabaseClient, email: string, password: string, fullName: string) {
  const existing = await findUserId(admin, email);
  if (existing) {
    const { error } = await admin.auth.admin.updateUserById(existing, { password, email_confirm: true });
    if (error) throw error;
    return existing;
  }
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName },
  });
  if (error || !data.user) throw error ?? new Error(`createUser ${email}`);
  return data.user.id;
}

async function main() {
  loadEnvFiles();
  const url = required("NEXT_PUBLIC_SUPABASE_URL");
  const serviceKey = required("SUPABASE_SERVICE_ROLE_KEY");
  const password = required("DEMO_PASSWORD");
  if (password.length < 8) throw new Error("DEMO_PASSWORD minimal 8 karakter");
  const bootstrapEmail = process.env.BOOTSTRAP_ADMIN_EMAIL?.trim().toLowerCase() || null;
  const extraAdminEmail = process.env.DEMO_EXTRA_ADMIN_EMAIL?.trim().toLowerCase() || null;

  const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  console.log(`Supabase: ${url}`);

  // 1. Only the demo organization from the seed.
  const seed = createSeed();
  const demoOrg = seed.organizations.find((org) => org.demo) ?? seed.organizations[0];
  if (!demoOrg) throw new Error("Seed tidak punya organisasi");
  const orgId = demoOrg.id;
  const store = seed as unknown as Record<TableName, Row[]>;
  const dealIds = new Set(seed.deals.filter((deal) => deal.organization_id === orgId).map((deal) => deal.id));
  const rows: Record<string, Row[]> = {};
  for (const table of TABLES) {
    rows[table] = (store[table] ?? []).filter((row) => {
      if (table === "organizations") return row.id === orgId;
      if ("organization_id" in row) return row.organization_id === orgId;
      if ("deal_id" in row) return dealIds.has(String(row.deal_id));
      return false;
    });
  }

  // 2. Logins for the people in the demo org.
  const idMap = new Map<string, string>();
  const people = seed.memberships.filter((item) => item.organization_id === orgId);
  for (const membership of people) {
    const profile = seed.profiles.find((item) => item.id === membership.user_id);
    if (!profile) continue;
    const email = profile.email;
    const userId = await ensureUser(admin, email, password, profile.full_name);
    idMap.set(profile.id, userId);
    await admin.from("profiles").upsert({ id: userId, full_name: profile.full_name, phone: profile.phone, email, locale: "id" });
    console.log(`  akun ${membership.role.padEnd(8)} ${email}`);
  }

  // 3. Fresh ids for every other record so the demo can be recreated any time.
  for (const table of TABLES) {
    for (const row of rows[table] ?? []) {
      if (typeof row.id === "string" && !idMap.has(row.id)) idMap.set(row.id, crypto.randomUUID());
    }
  }
  const remap = (value: unknown): unknown => {
    if (typeof value === "string") return idMap.get(value) ?? value;
    if (Array.isArray(value)) return value.map(remap);
    if (value && typeof value === "object") {
      return Object.fromEntries(Object.entries(value).map(([key, inner]) => [key, remap(inner)]));
    }
    return value;
  };

  // 4. Replace the previous demo organization (cascades to its data).
  const { error: deleteError } = await admin.from("organizations").delete().eq("demo", true);
  if (deleteError) throw deleteError;

  for (const table of TABLES) {
    const payload = (rows[table] ?? []).map((row) => {
      const copy = remap(row) as Row;
      for (const column of STRIP[table] ?? []) delete copy[column];
      return copy;
    });
    if (payload.length === 0) continue;
    const { error } = await admin.from(table).insert(payload);
    if (error) throw new Error(`insert ${table}: ${error.message}`);
    console.log(`  ${table.padEnd(14)} ${payload.length}`);
  }
  const newOrgId = idMap.get(orgId) ?? orgId;

  // 5. Main administrator and optional extra admin join the demo org.
  const extra: { email: string; role: "owner" | "admin" }[] = [];
  if (bootstrapEmail) extra.push({ email: bootstrapEmail, role: "owner" });
  if (extraAdminEmail && extraAdminEmail !== bootstrapEmail) extra.push({ email: extraAdminEmail, role: "admin" });
  for (const { email, role } of extra) {
    // The main administrator registers themselves; the extra admin is created here.
    const userId = role === "admin" ? await ensureUser(admin, email, password, "Admin Testing") : await findUserId(admin, email);
    if (!userId) {
      console.log(`  (lewati ${email}: belum mendaftar di aplikasi)`);
      continue;
    }
    const { error } = await admin.from("memberships").upsert(
      { organization_id: newOrgId, user_id: userId, role, created_by: userId },
      { onConflict: "organization_id,user_id" },
    );
    if (error) throw new Error(`membership ${email}: ${error.message}`);
    console.log(`  akun ${role.padEnd(8)} ${email}`);
  }

  console.log(`\nSelesai. Organisasi DEMO: ${demoOrg.name}. Login dengan email di atas + DEMO_PASSWORD.`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
