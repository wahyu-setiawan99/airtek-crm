"use client";

import * as Dropdown from "@radix-ui/react-dropdown-menu";
import { Check, Monitor, Moon, SunMedium } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

export type ThemeChoice = "light" | "dark" | "system";

export type ThemeLabels = { theme: string; light: string; dark: string; system: string };

const icons = { light: SunMedium, dark: Moon, system: Monitor } as const;

/**
 * Light / Dark / System picker. "System" follows the phone or computer setting. The trigger shows
 * the saved choice after mount; before that it renders a neutral icon so the server HTML matches.
 */
export function ThemeMenu({
  labels,
  variant = "icon",
  className,
  onChange,
}: {
  labels: ThemeLabels;
  variant?: "icon" | "pill";
  className?: string;
  onChange?: (theme: ThemeChoice) => void;
}) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const current: ThemeChoice = mounted && (theme === "light" || theme === "dark") ? theme : "system";
  const Icon = mounted ? icons[current] : Monitor;

  return (
    <Dropdown.Root>
      <Dropdown.Trigger
        aria-label={`${labels.theme}: ${labels[current]}`}
        className={cn(
          variant === "icon"
            ? "grid h-9 w-9 place-items-center rounded-md hover:bg-accent"
            : "inline-flex h-9 items-center gap-2 rounded-lg border bg-card px-3 text-xs font-medium text-muted-foreground shadow-sm hover:bg-accent hover:text-foreground",
          className,
        )}
      >
        <Icon className={variant === "icon" ? "h-4 w-4" : "h-3.5 w-3.5"} />
        {variant === "pill" ? <span>{labels[current]}</span> : null}
      </Dropdown.Trigger>
      <Dropdown.Portal>
        <Dropdown.Content sideOffset={8} align="end" className="z-50 min-w-40 rounded-md border bg-popover p-1 text-sm text-popover-foreground shadow-lg">
          {(["light", "dark", "system"] as const).map((choice) => {
            const ItemIcon = icons[choice];
            return (
              <Dropdown.Item
                key={choice}
                onSelect={() => {
                  setTheme(choice);
                  onChange?.(choice);
                }}
                className="flex min-h-9 cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 outline-none data-[highlighted]:bg-accent"
              >
                <ItemIcon className="h-4 w-4" />
                <span className="flex-1">{labels[choice]}</span>
                {current === choice ? <Check className="h-4 w-4 text-primary" /> : null}
              </Dropdown.Item>
            );
          })}
        </Dropdown.Content>
      </Dropdown.Portal>
    </Dropdown.Root>
  );
}
