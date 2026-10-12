import { getTranslations } from "next-intl/server";
import { revalidatePath } from "next/cache";
import { mutateStore } from "@/lib/demo/store";
import { getSession, type Session } from "@/lib/session";
import type { Store } from "@/types/crm";

export type ActionResult<T = null> = { ok: true; data: T } | { ok: false; error: string };

export class ActionError extends Error {}

type Ctx = { session: Session; store: Store };

export async function runAction<T>(fn: (ctx: Ctx) => T): Promise<ActionResult<T>> {
  const t = await getTranslations("common");
  const session = await getSession();
  if (!session) return { ok: false, error: t("forbidden") };

  try {
    const data = mutateStore((store) => fn({ session, store }));
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
