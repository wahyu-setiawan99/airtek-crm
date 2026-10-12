import { setRequestLocale } from "next-intl/server";
import { DashboardView } from "@/components/dashboard-view";
import type { AppLocale } from "@/i18n/routing";
import { readStore } from "@/lib/demo/store";
import { buildDashboard, defaultPipelineId } from "@/lib/queries";
import { requireSession } from "@/lib/session";

export default async function DashboardPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ pipeline?: string; period?: string }>;
}) {
  const { locale } = await params;
  const query = await searchParams;
  setRequestLocale(locale);
  const session = await requireSession();
  const store = readStore();
  const period = query.period === "quarter" || query.period === "year" ? query.period : "month";
  const pipeline = query.pipeline ?? defaultPipelineId(store, session.organizationId) ?? "all";
  const data = buildDashboard(store, session, pipeline, period);
  return <DashboardView data={data} locale={locale as AppLocale} />;
}
