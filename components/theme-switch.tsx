"use client";

import { useTranslations } from "next-intl";
import { ThemeMenu } from "@/components/theme-menu";

/** Theme picker for pages without the app topbar (login, register, accept invite). */
export function ThemeSwitch({ className }: { className?: string }) {
  const t = useTranslations("settings");
  const tc = useTranslations("common");
  return (
    <ThemeMenu
      variant="pill"
      className={className}
      labels={{ theme: tc("theme"), light: t("themeLight"), dark: t("themeDark"), system: t("themeSystem") }}
    />
  );
}
