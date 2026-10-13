import { getLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { DealWorkspace } from "@/components/deal-workspace";
import type { AppLocale } from "@/i18n/locale";
import { loadDealAudit, preload, withStore, type TableName } from "@/lib/store";
import { buildDeal } from "@/lib/queries";
import { requireSession } from "@/lib/session";

/** Tables this page reads; fetched while the session is checked. */
const TABLES: readonly TableName[] = ["pipelines", "stages", "deals", "deal_tags", "tags", "deal_contacts", "deal_products", "products", "companies", "contacts", "activities", "notes", "stage_history", "memberships", "profiles", "lost_reasons", "audit_logs", "attachments", "custom_fields", "custom_field_values"];

export default async function DealPage({ params }: { params: Promise<{ dealId: string }> }) {
  preload(TABLES);
  const { dealId } = await params;
  const locale = await getLocale();
  const session = await requireSession();
  const audit = await loadDealAudit(dealId);
  const { deal, files, fields } = await withStore(
    TABLES,
    (store) => ({
      deal: buildDeal(store, session, dealId, audit),
      files: store.attachments
        .filter((item) => item.deal_id === dealId)
        .map((item) => ({ id: item.id, fileName: item.file_name, size: item.size, mime: item.mime })),
      fields: store.custom_fields
        .filter((item) => item.organization_id === session.organizationId && item.entity === "deal")
        .map((item) => ({
          id: item.id,
          label: item.label,
          fieldType: item.field_type,
          options: item.options,
          value: store.custom_field_values.find((value) => value.field_id === item.id && value.entity_id === dealId)?.value ?? "",
        })),
    }),
  );
  if (!deal) notFound();
  return <DealWorkspace deal={deal} locale={locale as AppLocale} files={files} fields={fields} />;
}
