import { setRequestLocale } from "next-intl/server";
import { DealsTable } from "@/components/deals-table";
import type { AppLocale } from "@/i18n/routing";
import { loadStore } from "@/lib/store";
import { buildDealFilters, buildDeals } from "@/lib/queries";
import { requireSession } from "@/lib/session";

export default async function DealsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const session = await requireSession();
  const store = await loadStore();
  return <DealsTable rows={buildDeals(store, session)} filters={buildDealFilters(store, session)} locale={locale as AppLocale} />;
}
