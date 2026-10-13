export const locales = ["en", "id"] as const;
export type AppLocale = (typeof locales)[number];

export function isLocale(value: string | null | undefined): value is AppLocale {
  return value === "en" || value === "id";
}
