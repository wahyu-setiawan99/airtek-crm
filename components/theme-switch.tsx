"use client";

import { Moon, SunMedium } from "lucide-react";
import { useTranslations } from "next-intl";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";

/**
 * Light/dark toggle for pages without the app topbar (login, register). Until someone picks,
 * the theme follows the device setting.
 */
export function ThemeSwitch({ className }: { className?: string }) {
  const t = useTranslations("settings");
  const tc = useTranslations("common");
  const { resolvedTheme, setTheme } = useTheme();
  return (
    <button
      type="button"
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
      aria-label={tc("theme")}
      className={cn("inline-flex items-center gap-2 rounded-lg border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-accent hover:text-foreground", className)}
    >
      <Moon className="h-3.5 w-3.5 dark:hidden" />
      <SunMedium className="hidden h-3.5 w-3.5 dark:block" />
      <span className="dark:hidden">{t("themeDark")}</span>
      <span className="hidden dark:inline">{t("themeLight")}</span>
    </button>
  );
}
