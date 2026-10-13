import { getLocale } from "next-intl/server";
import { DashboardView } from "@/components/dashboard-view";
import type { AppLocale } from "@/i18n/locale";
import { preload, withStore, type TableName } from "@/lib/store";
import { buildDashboard, defaultPipelineId } from "@/lib/queries";
import { requireSession } from "@/lib/session";

/** Tables this page reads; fetched while the session is checked. */
const TABLES: readonly TableName[] = ["pipelines", "stages", "deals", "activities", "memberships", "profiles", "sales_targets"];

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ pipeline?: string; period?: string }>;
}) {
  preload(TABLES);
  const locale = await getLocale();
  const query = await searchParams;
  const session = await requireSession();
  const period = query.period === "quarter" || query.period === "year" ? query.period : "month";
  const data = await withStore(TABLES, (store) => {
    const pipeline = query.pipeline ?? defaultPipelineId(store, session.organizationId) ?? "all";
    return buildDashboard(store, session, pipeline, period);
  });
  return <DashboardView data={data} locale={locale as AppLocale} />;
}
