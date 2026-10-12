import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { createSeed, STORE_VERSION } from "@/lib/demo/seed";
import type { Store } from "@/types/crm";

// Serverless file systems are read-only outside the temp dir, so demo data there is ephemeral.
const dataDir = process.env.VERCEL ? path.join(tmpdir(), "airtek-crm") : path.join(process.cwd(), ".data");
const dataFile = path.join(dataDir, "crm.json");

function persist(store: Store) {
  mkdirSync(dataDir, { recursive: true });
  writeFileSync(dataFile, JSON.stringify(store));
}

export function readStore(): Store {
  try {
    const parsed = JSON.parse(readFileSync(dataFile, "utf8")) as Store;
    if (parsed.version !== STORE_VERSION) {
      const fresh = createSeed();
      persist(fresh);
      return fresh;
    }
    parsed.attachments ??= [];
    parsed.custom_fields ??= [];
    parsed.custom_field_values ??= [];
    parsed.import_batches ??= [];
    return parsed;
  } catch {
    const fresh = createSeed();
    persist(fresh);
    return fresh;
  }
}

export function mutateStore<T>(fn: (store: Store) => T): T {
  const store = readStore();
  const result = fn(store);
  persist(store);
  return result;
}

export function resetStore() {
  const fresh = createSeed();
  persist(fresh);
  return fresh;
}

export function createId() {
  return crypto.randomUUID();
}
