"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { Input, Select } from "@/components/ui/form";
import type { PeriodFilter, PeriodKey } from "@/lib/period";

function today() {
  const now = new Date(Date.now() + 7 * 60 * 60 * 1000);
  return now.toISOString().slice(0, 10);
}

/**
 * Period filter: This month / quarter / year, or a custom date range picked on a calendar.
 * A custom range is applied once both dates are set.
 */
export function PeriodPicker({ value, onChange }: { value: PeriodFilter; onChange: (next: PeriodFilter) => void }) {
  const t = useTranslations("dashboard");
  const [key, setKey] = useState<PeriodKey>(value.key);
  const [from, setFrom] = useState(value.from ?? "");
  const [to, setTo] = useState(value.to ?? "");

  function applyRange(nextFrom: string, nextTo: string) {
    if (nextFrom && nextTo) onChange({ key: "custom", from: nextFrom <= nextTo ? nextFrom : nextTo, to: nextFrom <= nextTo ? nextTo : nextFrom });
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select
        className="w-auto"
        value={key}
        aria-label={t("period")}
        onChange={(event) => {
          const next = event.target.value as PeriodKey;
          setKey(next);
          if (next !== "custom") onChange({ key: next, from: null, to: null });
          else {
            const start = from || `${today().slice(0, 7)}-01`;
            const end = to || today();
            setFrom(start);
            setTo(end);
            applyRange(start, end);
          }
        }}
      >
        <option value="month">{t("thisMonth")}</option>
        <option value="quarter">{t("thisQuarter")}</option>
        <option value="year">{t("thisYear")}</option>
        <option value="custom">{t("customRange")}</option>
      </Select>
      {key === "custom" ? (
        <div className="flex items-center gap-2">
          <Input
            type="date"
            className="w-auto"
            aria-label={t("rangeFrom")}
            value={from}
            max={to || undefined}
            onChange={(event) => {
              setFrom(event.target.value);
              applyRange(event.target.value, to);
            }}
          />
          <span className="text-sm text-muted-foreground">–</span>
          <Input
            type="date"
            className="w-auto"
            aria-label={t("rangeTo")}
            value={to}
            min={from || undefined}
            onChange={(event) => {
              setTo(event.target.value);
              applyRange(from, event.target.value);
            }}
          />
        </div>
      ) : null}
    </div>
  );
}
