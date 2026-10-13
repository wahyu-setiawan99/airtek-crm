import { getLocale } from "next-intl/server";
import { DealsTable } from "@/components/deals-table";
import type { AppLocale } from "@/i18n/locale";
import { loadStore } from "@/lib/store";
import { buildDealFilters, buildDeals } from "@/lib/queries";
import { canManage } from "@/lib/permissions";
import { requireSession } from "@/lib/session";

export default async function DealsPage() {
  const locale = await getLocale();
  const session = await requireSession();
  const store = await loadStore();
  return <DealsTable rows={buildDeals(store, session)} filters={buildDealFilters(store, session)} locale={locale as AppLocale} canManage={canManage(session.role)} />;
}
