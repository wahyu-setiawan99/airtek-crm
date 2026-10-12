import { getTranslations } from "next-intl/server";
import { revalidatePath } from "next/cache";
import { getSession, sessionScope, type Session } from "@/lib/session";
import { mutate } from "@/lib/store";
import type { Store } from "@/types/crm";

export type ActionResult<T = null> = { ok: true; data: T } | { ok: false; error: string };

export class ActionError extends Error {}

type Ctx = { session: Session; store: Store };

export async function runAction<T>(fn: (ctx: Ctx) => T): Promise<ActionResult<T>> {
  const t = await getTranslations("common");
  const session = await getSession();
  if (!session) return { ok: false, error: t("forbidden") };

  try {
    const data = await mutate((store) => fn({ session, store }), sessionScope(session));
    revalidatePath("/", "layout");
    return { ok: true, data };
  } catch (error) {
    if (error instanceof ActionError) return { ok: false, error: error.message };
    console.error(error);
    return { ok: false, error: t("error") };
  }
}

export function touch(entity: { updated_at: string }) {
  entity.updated_at = new Date().toISOString();
}
