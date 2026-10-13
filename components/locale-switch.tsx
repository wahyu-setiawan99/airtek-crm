"use client";

import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { setLocaleAction } from "@/lib/actions/locale";
import type { AppLocale } from "@/i18n/locale";

/** Switches language without changing the URL. */
export function LocaleSwitch({ className = "", children }: { className?: string; children?: React.ReactNode }) {
  const locale = useLocale();
  const t = useTranslations("common");
  const router = useRouter();
  const next: AppLocale = locale === "id" ? "en" : "id";

  return (
    <button
      type="button"
      aria-label={t("language")}
      className={className}
      onClick={() => {
        void setLocaleAction(next).then(() => router.refresh());
      }}
    >
      {children ?? (locale === "id" ? "EN" : "ID")}
    </button>
  );
}
