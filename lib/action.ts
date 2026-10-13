import { getTranslations } from "next-intl/server";
import { revalidatePath } from "next/cache";
import { getSession, sessionScope, type Session } from "@/lib/session";
import { mutate, type TableName } from "@/lib/store";
import type { Store } from "@/types/crm";

export type ActionResult<T = null> = { ok: true; data: T } | { ok: false; error: string; code?: string };

export class ActionError extends Error {
  code?: string;
  constructor(message: string, code?: string) {
    super(message);
    this.code = code;
  }
}

type Ctx = { session: Session; store: Store };

/** `tables`: what `fn` reads, so they load in one go (anything else loads on demand, see lib/store.ts). */
export async function runAction<T>(fn: (ctx: Ctx) => T, tables: readonly TableName[] = []): Promise<ActionResult<T>> {
  const t = await getTranslations("common");
  const session = await getSession();
  if (!session) return { ok: false, error: t("forbidden") };

  try {
    const data = await mutate((store) => fn({ session, store }), sessionScope(session), tables);
    revalidatePath("/", "layout");
    return { ok: true, data };
  } catch (error) {
    if (error instanceof ActionError) return { ok: false, error: error.message, code: error.code };
    console.error(error);
    return { ok: false, error: t("error") };
  }
}

export function touch(entity: { updated_at: string }) {
  entity.updated_at = new Date().toISOString();
}
