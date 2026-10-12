import { setRequestLocale } from "next-intl/server";
import { DealsTable } from "@/components/deals-table";
import { readStore } from "@/lib/demo/store";
import { buildDeals } from "@/lib/queries";
import { requireSession } from "@/lib/session";

export default async function DealsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const session = await requireSession();
  return <DealsTable rows={buildDeals(readStore(), session)} />;
}
