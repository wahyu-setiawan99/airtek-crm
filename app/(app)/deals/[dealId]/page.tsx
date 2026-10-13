import { getLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { DealWorkspace } from "@/components/deal-workspace";
import type { AppLocale } from "@/i18n/locale";
import { loadDealAudit, loadStore } from "@/lib/store";
import { buildDeal } from "@/lib/queries";
import { requireSession } from "@/lib/session";

export default async function DealPage({ params }: { params: Promise<{ dealId: string }> }) {
  const { dealId } = await params;
  const locale = await getLocale();
  const session = await requireSession();
  const [store, audit] = await Promise.all([loadStore(), loadDealAudit(dealId)]);
  const deal = buildDeal(store, session, dealId, audit);
  if (!deal) notFound();
  const files = store.attachments
    .filter((item) => item.deal_id === dealId)
    .map((item) => ({ id: item.id, fileName: item.file_name, size: item.size, mime: item.mime }));
  const fields = store.custom_fields
    .filter((item) => item.organization_id === session.organizationId && item.entity === "deal")
    .map((item) => ({
      id: item.id,
      label: item.label,
      fieldType: item.field_type,
      options: item.options,
      value: store.custom_field_values.find((value) => value.field_id === item.id && value.entity_id === dealId)?.value ?? "",
    }));
  return <DealWorkspace deal={deal} locale={locale as AppLocale} files={files} fields={fields} />;
}
