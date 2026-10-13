import { getLocale } from "next-intl/server";
import { DashboardView } from "@/components/dashboard-view";
import type { AppLocale } from "@/i18n/locale";
import { loadStore } from "@/lib/store";
import { buildDashboard, defaultPipelineId } from "@/lib/queries";
import { requireSession } from "@/lib/session";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ pipeline?: string; period?: string }>;
}) {
  const locale = await getLocale();
  const query = await searchParams;
  const session = await requireSession();
  const store = await loadStore();
  const period = query.period === "quarter" || query.period === "year" ? query.period : "month";
  const pipeline = query.pipeline ?? defaultPipelineId(store, session.organizationId) ?? "all";
  const data = buildDashboard(store, session, pipeline, period);
  return <DashboardView data={data} locale={locale as AppLocale} />;
}
