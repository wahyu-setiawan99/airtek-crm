"use client";

import { Monitor, Moon, SunMedium } from "lucide-react";
import { useTranslations } from "next-intl";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

/** Light / dark / system segmented control for pages without the app topbar (login, register). */
export function ThemeSwitch({ className }: { className?: string }) {
  const t = useTranslations("settings");
  const tc = useTranslations("common");
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const options = [
    ["light", t("themeLight"), SunMedium],
    ["dark", t("themeDark"), Moon],
    ["system", t("themeSystem"), Monitor],
  ] as const;

  return (
    <div role="radiogroup" aria-label={tc("theme")} className={cn("inline-flex rounded-lg border bg-card p-0.5", className)}>
      {options.map(([value, label, Icon]) => {
        const active = mounted && (theme ?? "system") === value;
        return (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={active}
            title={label}
            onClick={() => setTheme(value)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
              active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent hover:text-foreground",
            )}
          >
            <Icon className="h-3.5 w-3.5" />
            {label}
          </button>
        );
      })}
    </div>
  );
}
