import { getLocale } from "next-intl/server";
import { ReportsView } from "@/components/reports-view";
import type { AppLocale } from "@/i18n/locale";
import { preload, withStore, type TableName } from "@/lib/store";
import { buildReports } from "@/lib/queries";
import { requireSession } from "@/lib/session";

/** Tables this page reads; fetched while the session is checked. */
const TABLES: readonly TableName[] = ["pipelines", "stages", "deals", "lost_reasons", "stage_history", "memberships", "profiles"];

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ pipeline?: string; owner?: string; period?: string }>;
}) {
  preload(TABLES);
  const locale = await getLocale();
  const query = await searchParams;
  const session = await requireSession();
  const period = query.period === "quarter" || query.period === "year" ? query.period : "month";
  const data = await withStore(TABLES, (store) =>
    buildReports(store, session, query.pipeline ?? "all", query.owner ?? "all", period),
  );
  return <ReportsView data={data} locale={locale as AppLocale} pipelineId={query.pipeline ?? "all"} ownerId={query.owner ?? "all"} period={period} />;
}
