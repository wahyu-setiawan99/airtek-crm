"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { downloadCsv } from "@/lib/csv";
import { useRouter } from "next/navigation";
import type { AppLocale } from "@/i18n/locale";
import { formatCompact, formatDate, formatRupiah } from "@/lib/format";
import type { ReportData } from "@/types/view";
import { FilterBar, type FilterValues } from "@/components/filters/filter-bar";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/form";

export function ReportsView({
  data,
  locale,
  pipelineId,
  ownerId,
  period,
}: {
  data: ReportData;
  locale: AppLocale;
  pipelineId: string;
  ownerId: string;
  period: string;
}) {
  const t = useTranslations("reports");
  const td = useTranslations("dashboard");
  const tc = useTranslations("common");
  const router = useRouter();
  const [query, setQuery] = useState("");
  function go(next: { pipeline?: string; owner?: string; period?: string }) {
    const params = new URLSearchParams({
      pipeline: next.pipeline ?? pipelineId,
      owner: next.owner ?? ownerId,
      period: next.period ?? period,
    });
    router.push(`/reports?${params.toString()}`);
  }
  return (
    <div className="grid gap-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("subtitle")}</p>
        </div>
        <FilterBar
          values={{ q: query, owner: ownerId === "all" ? "" : ownerId }}
          owners={data.owners}
          showMine={false}
          onChange={(next: FilterValues) => {
            setQuery(next.q ?? "");
            if ((next.owner ?? "") !== (ownerId === "all" ? "" : ownerId)) go({ owner: next.owner || "all" });
          }}
        />
        <div className="flex flex-wrap gap-2">
          <Select className="w-auto" value={pipelineId} aria-label={tc("pipeline")} onChange={(event) => go({ pipeline: event.target.value })}>
            <option value="all">{td("allPipelines")}</option>
            {data.pipelines.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </Select>
          <Select className="w-auto" value={ownerId} aria-label={tc("owner")} onChange={(event) => go({ owner: event.target.value })}>
            <option value="all">{tc("all")}</option>
            {data.owners.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </Select>
          <Select className="w-auto" value={period} aria-label="Period" onChange={(event) => go({ period: event.target.value })}>
            <option value="month">{td("thisMonth")}</option>
            <option value="quarter">{td("thisQuarter")}</option>
            <option value="year">{td("thisYear")}</option>
          </Select>
          <Button variant="outline" onClick={() => downloadCsv("laporan.csv", [["title", "status", "value", "owner", "closed", "reason"], ...data.rows.map((row) => [row.title, row.status, row.value, row.owner, row.closed, row.reason])])}>{tc("export")}</Button>
        </div>
      </div>
      <section className="grid gap-3 sm:grid-cols-2">
        <article className="rounded-lg border bg-card p-4"><p className="text-xs text-muted-foreground">{tc("won")}</p><p className="mt-1 text-2xl font-semibold">{data.won}</p><p className="money text-sm">{formatCompact(data.wonValue)}</p></article>
        <article className="rounded-lg border bg-card p-4"><p className="text-xs text-muted-foreground">{tc("lost")}</p><p className="mt-1 text-2xl font-semibold">{data.lost}</p><p className="money text-sm">{formatCompact(data.lostValue)}</p></article>
      </section>
      <section className="grid gap-3 lg:grid-cols-2">
        <Chart title={t("lostReasons")} data={data.reasons.map((item) => ({ name: item.name, count: item.count }))} dataKey="count" empty={t("noData")} />
        <Chart title={t("stageDuration")} data={data.durations.map((item) => ({ name: item.name, count: item.days }))} dataKey="count" empty={t("noData")} />
      </section>
      <div className="overflow-x-auto rounded-lg border bg-card">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="text-left text-xs text-muted-foreground"><tr><th className="p-3">{tc("name")}</th><th className="p-3">{tc("status")}</th><th className="p-3">{tc("value")}</th><th className="p-3">{tc("owner")}</th><th className="p-3">{t("closed")}</th></tr></thead>
          <tbody>
            {data.rows.length === 0 ? <tr><td className="p-3 text-muted-foreground" colSpan={5}>{t("noData")}</td></tr> : null}
            {data.rows.filter((row) => !query.trim() || `${row.title} ${row.owner} ${row.reason}`.toLowerCase().includes(query.trim().toLowerCase())).map((row) => (
              <tr key={`${row.title}${row.closed}`} className="border-t">
                <td className="p-3">{row.title}</td>
                <td className="p-3">{row.status}</td>
                <td className="money p-3">{formatRupiah(Number(row.value))}</td>
                <td className="p-3">{row.owner}</td>
                <td className="p-3">{formatDate(row.closed, locale)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Chart({ title, data, dataKey, empty }: { title: string; data: { name: string; count: number }[]; dataKey: string; empty: string }) {
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);
  return (
    <article className="rounded-lg border bg-card p-4">
      <h2 className="text-sm font-semibold">{title}</h2>
      <div className="mt-3 h-56">
        {data.length === 0 || !ready ? <p className="text-sm text-muted-foreground">{data.length === 0 ? empty : ""}</p> : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data}>
              <CartesianGrid vertical={false} strokeDasharray="3 3" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey={dataKey} fill="var(--color-primary)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </article>
  );
}
