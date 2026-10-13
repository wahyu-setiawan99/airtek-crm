import { cookies } from "next/headers";
import { getRequestConfig } from "next-intl/server";
import { cache } from "react";
import { LOCALE_COOKIE } from "@/lib/constants";
import { getUserId } from "@/lib/session";
import { isLocale, type AppLocale } from "./locale";

/** Logged-in language wins over the cookie. Guests use the cookie, then English. */
const profileLocale = cache(async (): Promise<AppLocale | null> => {
  const userId = await getUserId();
  if (!userId) return null;
  const { supabaseEnabled } = await import("@/lib/env");
  if (supabaseEnabled) {
    // Same request-level profiles load the session uses, so no extra query.
    const { withStore } = await import("@/lib/store");
    const locale = await withStore(["profiles"], (store) => store.profiles.find((item) => item.id === userId)?.locale);
    return isLocale(locale) ? locale : null;
  }
  const { readStore } = await import("@/lib/demo/store");
  const locale = readStore().profiles.find((item) => item.id === userId)?.locale;
  return isLocale(locale) ? locale : null;
});

export default getRequestConfig(async () => {
  const fromProfile = await profileLocale();
  const saved = (await cookies()).get(LOCALE_COOKIE)?.value;
  const locale = fromProfile ?? (isLocale(saved) ? saved : "en");
  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
  };
});
