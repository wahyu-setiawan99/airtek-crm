import { setRequestLocale } from "next-intl/server";
import { ReportsView } from "@/components/reports-view";
import type { AppLocale } from "@/i18n/routing";
import { readStore } from "@/lib/demo/store";
import { buildReports } from "@/lib/queries";
import { requireSession } from "@/lib/session";

export default async function ReportsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ pipeline?: string; owner?: string; period?: string }>;
}) {
  const { locale } = await params;
  const query = await searchParams;
  setRequestLocale(locale);
  const session = await requireSession();
  const period = query.period === "quarter" || query.period === "year" ? query.period : "month";
  const data = buildReports(readStore(), session, query.pipeline ?? "all", query.owner ?? "all", period);
  return <ReportsView data={data} locale={locale as AppLocale} pipelineId={query.pipeline ?? "all"} ownerId={query.owner ?? "all"} period={period} />;
}
