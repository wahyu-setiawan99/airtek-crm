"use server";

import { isLocale, type AppLocale } from "@/i18n/locale";
import { rememberLocale } from "@/lib/session-flags";
import { getSession, sessionScope } from "@/lib/session";
import { mutate } from "@/lib/store";

/** Public pages change the cookie only. A signed-in user also updates their profile. */
export async function setLocaleAction(locale: AppLocale) {
  if (!isLocale(locale)) return { ok: false as const, error: "Invalid" };
  await rememberLocale(locale);
  const session = await getSession();
  if (!session) return { ok: true as const, data: null };
  await mutate((store) => {
    const profile = store.profiles.find((item) => item.id === session.userId);
    if (!profile) return;
    profile.locale = locale;
    profile.updated_at = new Date().toISOString();
  }, sessionScope(session));
  return { ok: true as const, data: null };
}
