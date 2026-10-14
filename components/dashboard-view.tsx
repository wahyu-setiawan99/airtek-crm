"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { AppLocale } from "@/i18n/locale";
import { formatCompact, formatDate, formatMonth } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { DashboardData } from "@/types/view";
import { Select } from "@/components/ui/form";
import { PeriodPicker } from "@/components/period-picker";
import { periodQuery } from "@/lib/period";
import { UserAvatar } from "@/components/ui/user-avatar";

const SimpleBarChart = dynamic(() => import("@/components/charts/bar-chart"), {
  ssr: false,
  loading: () => <div className="h-full w-full animate-pulse rounded-md bg-muted" />,
});

export function DashboardView({ data, locale }: { data: DashboardData; locale: AppLocale }) {
  const t = useTranslations("dashboard");
  const router = useRouter();
  const funnel = data.funnel.map((item) => ({ ...item, label: item.name }));
  const forecast = data.forecast.map((item) => ({ ...item, label: formatMonth(item.key, locale) }));

  return (
    <div className="grid gap-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{t("greeting", { name: data.name })}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("subtitle")}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Select
            className="w-auto"
            value={data.pipelineId}
            aria-label="Pipeline"
            onChange={(event) => router.push(`/dashboard?pipeline=${event.target.value}&${periodQuery(data.period)}`)}
          >
            <option value="all">{t("allPipelines")}</option>
            {data.pipelines.map((pipeline) => <option key={pipeline.id} value={pipeline.id}>{pipeline.name}</option>)}
          </Select>
          <PeriodPicker value={data.period} onChange={(next) => router.push(`/dashboard?pipeline=${data.pipelineId}&${periodQuery(next)}`)} />
        </div>
      </div>
      <section className="grid grid-cols-2 gap-3 xl:grid-cols-5 [&>:last-child:nth-child(odd)]:col-span-2 xl:[&>:last-child:nth-child(odd)]:col-span-1">
        <Kpi label={t("pipelineValue")} value={formatCompact(data.pipelineValue)} hint={t("openDeals", { count: data.openCount })} />
        <Kpi label={t("weightedForecast")} value={formatCompact(data.weighted)} />
        <Kpi label={t("wonThisMonth")} value={formatCompact(data.wonValue)} />
        <Kpi label={t("winRate")} value={`${data.winRate}%`} />
        <Kpi label={t("avgCycle")} value={t("days", { count: data.avgCycle })} />
      </section>
      <section className="grid gap-3 xl:grid-cols-5">
        <ChartCard title={t("funnel")} className="xl:col-span-3" empty={funnel.every((item) => item.total === 0)} emptyLabel={t("noChart")}>
          <SimpleBarChart data={funnel} xKey="label" money allXTicks bars={[{ key: "total", color: "var(--color-primary)" }, { key: "weighted", color: "var(--color-success)" }]} />
        </ChartCard>
        <ChartCard title={t("forecast")} className="xl:col-span-2" empty={forecast.every((item) => item.weighted === 0)} emptyLabel={t("noChart")}>
          <SimpleBarChart data={forecast} xKey="label" money bars={[{ key: "weighted", color: "var(--color-primary)" }]} />
        </ChartCard>
      </section>
      <section className="grid gap-3 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="overflow-hidden rounded-lg border bg-card">
          <h2 className="px-4 pt-4 text-sm font-semibold">{t("salesPerformance")}</h2>
          {data.sales.length === 0 ? (
            <p className="px-4 py-3 text-sm text-muted-foreground">{t("noChart")}</p>
          ) : (
            <div className="overflow-x-auto">
            <table className="mt-3 w-full text-sm">
              <thead className="border-y bg-muted/40 text-xs text-muted-foreground">
                <tr>
                  <th className="px-4 py-2 text-left font-medium">{t("colSales")}</th>
                  <th className="px-2 py-2 text-right font-medium">{t("colOpen")}</th>
                  <th className="px-2 py-2 text-right font-medium">{t("colPipeline")}</th>
                  <th className="px-2 py-2 text-right font-medium">{t("colWeighted")}</th>
                  <th className="px-2 py-2 text-right font-medium">{t("colWon")}</th>
                  <th className="px-2 py-2 text-right font-medium">{t("colTarget")}</th>
                  <th className="px-2 py-2 text-right font-medium">{t("winRate")}</th>
                  <th className="px-4 py-2 text-right font-medium">{t("colOverdue")}</th>
                </tr>
              </thead>
              <tbody>
                {data.sales.map((person) => (
                  <tr key={person.id} className="border-b last:border-b-0 hover:bg-accent/40">
                    <td className="px-4 py-2.5">
                      <Link href={person.href} className="inline-flex items-center gap-2 font-medium hover:underline">
                        <UserAvatar avatar={person.avatar} className="h-6 w-6" />
                        {person.name}
                      </Link>
                    </td>
                    <td className="px-2 py-2.5 text-right tabular-nums">{person.open}</td>
                    <td className="money whitespace-nowrap px-2 py-2.5 text-right">{formatCompact(person.pipeline)}</td>
                    <td className="money whitespace-nowrap px-2 py-2.5 text-right">{formatCompact(person.weighted)}</td>
                    <td className="money whitespace-nowrap px-2 py-2.5 text-right font-medium">{formatCompact(person.won)}</td>
                    <td className="px-2 py-2.5">
                      <div className="ml-auto grid w-28 gap-1">
                        <span className="whitespace-nowrap text-right text-xs tabular-nums text-muted-foreground">{person.target == null ? "—" : formatCompact(person.target)}</span>
                        {person.target ? <span className="h-1.5 overflow-hidden rounded-full bg-muted"><span className="block h-full rounded-full bg-primary" style={{ width: `${Math.min(100, (person.won / person.target) * 100)}%` }} /></span> : null}
                      </div>
                    </td>
                    <td className="px-2 py-2.5 text-right tabular-nums">{person.winRate === null ? "—" : `${person.winRate}%`}</td>
                    <td className={cn("px-4 py-2.5 text-right tabular-nums", person.overdue > 0 && "font-medium text-destructive")}>{person.overdue}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          )}
        </div>
        <div className="rounded-lg border bg-card p-4">
          <h2 className="text-sm font-semibold">{t("overdue")}</h2>
          <ul className="mt-3 space-y-2">
            {data.overdue.length === 0 ? <li className="text-sm text-muted-foreground">{t("noOverdue")}</li> : null}
            {data.overdue.map((item) => (
              <li key={item.id}>
                <Link href={item.href} className="flex items-center justify-between gap-3 text-sm hover:underline">
                  <span>{item.subject}</span>
                  <span className="text-xs text-destructive">{formatDate(item.dueAt, locale)}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  );
}

function Kpi({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <article className="rounded-lg border bg-card p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="money mt-2 text-xl font-semibold tracking-tight">{value}</p>
      {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
    </article>
  );
}

function ChartCard({ title, children, className, empty, emptyLabel }: { title: string; children: React.ReactNode; className?: string; empty: boolean; emptyLabel: string }) {
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);
  return (
    <article className={`rounded-lg border bg-card p-4 ${className ?? ""}`}>
      <h2 className="text-sm font-semibold">{title}</h2>
      <div className="mt-3 h-64">
        {empty || !ready ? <p className="text-sm text-muted-foreground">{empty ? emptyLabel : ""}</p> : children}
      </div>
    </article>
  );
}
