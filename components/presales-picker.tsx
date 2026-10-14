"use client";

import { Search, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import { Input } from "@/components/ui/form";
import type { PresalesOption } from "@/types/view";

/**
 * Search box for the Presales project a Sales deal comes from. Only projects that share at
 * least one product tag with the deal are offered (the server checks the same rule).
 */
export function PresalesPicker({
  options,
  tagIds,
  value,
  onChange,
  disabled = false,
}: {
  options: PresalesOption[];
  tagIds: string[];
  value: string | null;
  onChange: (id: string | null) => void;
  disabled?: boolean;
}) {
  const t = useTranslations("deals");
  const [query, setQuery] = useState("");
  const selected = options.find((item) => item.id === value) ?? null;
  const matches = useMemo(() => {
    const tags = new Set(tagIds);
    const q = query.trim().toLowerCase();
    return options
      .filter((item) => item.tagIds.some((id) => tags.has(id)))
      .filter((item) => !q || `${item.title} ${item.companyName ?? ""}`.toLowerCase().includes(q))
      .slice(0, 8);
  }, [options, tagIds, query]);

  if (selected) {
    return (
      <div className="flex min-h-10 items-center gap-2 rounded-md border bg-card px-3 py-2 text-sm">
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium">{selected.title}</p>
          <p className="truncate text-xs text-muted-foreground">{[selected.stageName, selected.companyName].filter(Boolean).join(" · ")}</p>
        </div>
        {disabled ? null : (
          <button type="button" aria-label={t("presalesRefClear")} className="grid h-8 w-8 shrink-0 place-items-center rounded-md text-muted-foreground hover:bg-accent" onClick={() => onChange(null)}>
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    );
  }

  if (disabled) return <span className="block py-2 text-sm text-muted-foreground/80">{t("notSet")}</span>;

  return (
    <div className="grid gap-1.5">
      <div className="relative">
        <Search aria-hidden className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={t("presalesRefSearch")}
          aria-label={t("presalesRefSearch")}
          className="pl-9"
          disabled={tagIds.length === 0}
        />
      </div>
      {tagIds.length === 0 ? (
        <p className="text-xs text-muted-foreground">{t("presalesRefPickTags")}</p>
      ) : matches.length === 0 ? (
        <p className="text-xs text-muted-foreground">{t("presalesRefNone")}</p>
      ) : (
        <ul className="grid max-h-48 gap-0.5 overflow-auto rounded-md border bg-card p-1">
          {matches.map((item) => (
            <li key={item.id}>
              <button type="button" className="w-full rounded px-2 py-1.5 text-left text-sm hover:bg-accent" onClick={() => onChange(item.id)}>
                <span className="block truncate font-medium">{item.title}</span>
                <span className="block truncate text-xs text-muted-foreground">{[item.stageName, item.companyName].filter(Boolean).join(" · ")}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
