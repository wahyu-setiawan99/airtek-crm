import { getLocale } from "next-intl/server";
import { DealsTable } from "@/components/deals-table";
import type { AppLocale } from "@/i18n/locale";
import { preload, withStore, type TableName } from "@/lib/store";
import { buildDealFilters, buildDeals } from "@/lib/queries";
import { canManage } from "@/lib/permissions";
import { requireSession } from "@/lib/session";

/** Tables this page reads; fetched while the session is checked. */
const TABLES: readonly TableName[] = ["pipelines", "stages", "deals", "deal_tags", "tags", "companies", "contacts", "activities", "memberships", "profiles"];

export default async function DealsPage() {
  preload(TABLES);
  const locale = await getLocale();
  const session = await requireSession();
  const { rows, filters } = await withStore(
    TABLES,
    (store) => ({ rows: buildDeals(store, session), filters: buildDealFilters(store, session) }),
  );
  return <DealsTable rows={rows} filters={filters} locale={locale as AppLocale} canManage={canManage(session.role)} />;
}
