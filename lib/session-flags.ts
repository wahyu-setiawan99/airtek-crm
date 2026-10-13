import { cookies } from "next/headers";
import { isLocale } from "@/i18n/locale";
import { LOCALE_COOKIE, localeCookieOptions, SIGNED_IN_COOKIE, signedInCookieOptions } from "@/lib/constants";

/** Marks the browser as signed in and, when known, stores the profile language. */
export async function markSignedIn(locale?: string | null) {
  const jar = await cookies();
  jar.set(SIGNED_IN_COOKIE, "1", signedInCookieOptions);
  if (isLocale(locale)) jar.set(LOCALE_COOKIE, locale, localeCookieOptions);
}

export async function clearSignedIn() {
  const jar = await cookies();
  jar.delete(SIGNED_IN_COOKIE);
}

export async function rememberLocale(locale: string) {
  if (!isLocale(locale)) return;
  const jar = await cookies();
  jar.set(LOCALE_COOKIE, locale, localeCookieOptions);
}
