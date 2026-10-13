"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

export const settingsSections = [
  ["profile", "/settings/profile"],
  ["organization", "/settings/organization"],
  ["members", "/settings/members"],
  ["targets", "/settings/targets"],
  ["pipelines", "/settings/pipelines"],
  ["tags", "/settings/tags"],
  ["lostReasons", "/settings/lost-reasons"],
  ["customFields", "/settings/custom-fields"],
  ["import", "/settings/import"],
  ["audit", "/settings/audit"],
] as const;

/**
 * Lives in the settings layout, so it is not re-mounted when switching tabs and the
 * horizontal scroll position on phones stays where the user left it.
 */
export function SettingsNav({ canAdmin }: { canAdmin: boolean }) {
  const t = useTranslations("settings");
  const pathname = usePathname();
  const nav = useRef<HTMLElement>(null);

  // First visit straight to a later tab (e.g. a bookmark): bring that tab into view once.
  useEffect(() => {
    const active = nav.current?.querySelector<HTMLElement>("[aria-current=page]");
    active?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, []);

  return (
    <nav ref={nav} className="-mx-3 flex gap-2 overflow-x-auto px-3 lg:mx-0 lg:flex-col lg:px-0">
      {settingsSections.map(([key, href]) => {
        if (key === "targets" && !canAdmin) return null;
        const active = pathname === href;
        return (
          <Link
            key={key}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn("shrink-0 rounded-md px-3 py-2 text-sm", active ? "bg-accent font-medium text-accent-foreground" : "text-muted-foreground hover:text-foreground")}
          >
            {t(key)}
          </Link>
        );
      })}
    </nav>
  );
}
