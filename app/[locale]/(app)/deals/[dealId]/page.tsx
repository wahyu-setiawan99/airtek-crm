import { setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { DealWorkspace } from "@/components/deal-workspace";
import type { AppLocale } from "@/i18n/routing";
import { loadDealAudit, loadStore } from "@/lib/store";
import { buildDeal } from "@/lib/queries";
import { requireSession } from "@/lib/session";

export default async function DealPage({ params }: { params: Promise<{ locale: string; dealId: string }> }) {
  const { locale, dealId } = await params;
  setRequestLocale(locale);
  const session = await requireSession();
  const [store, audit] = await Promise.all([loadStore(), loadDealAudit(dealId)]);
  const deal = buildDeal(store, session, dealId, audit);
  if (!deal) notFound();
  return <DealWorkspace deal={deal} locale={locale as AppLocale} />;
}
