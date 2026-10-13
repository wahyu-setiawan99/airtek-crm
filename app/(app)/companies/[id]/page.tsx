import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { AttachmentsPanel } from "@/components/attachments-panel";
import { ClientTypeChip } from "@/components/client-type-chip";
import { CustomFieldsPanel } from "@/components/custom-fields-panel";
import { OwnerPicker } from "@/components/owner-picker";
import Link from "next/link";
import { preload, withStore, type TableName } from "@/lib/store";
import { formatCompact } from "@/lib/format";
import { canManage } from "@/lib/permissions";
import { entityNotes, orgPeople, relatedDeals } from "@/lib/queries";
import { requireSession } from "@/lib/session";
import { contactName } from "@/lib/utils";

/** Tables this page reads; fetched while the session is checked. */
const TABLES: readonly TableName[] = ["companies", "contacts", "deals", "stages", "deal_tags", "tags", "activities", "notes", "memberships", "profiles", "attachments", "custom_fields", "custom_field_values"];

export default async function CompanyDetailPage({ params }: { params: Promise<{ id: string }> }) {
  preload(TABLES);
  const { id } = await params;
  const t = await getTranslations("companies");
  const session = await requireSession();
  const view = await withStore(
    TABLES,
    (store) => {
      const company = store.companies.find((item) => item.id === id && item.organization_id === session.organizationId);
      if (!company) return null;
      return {
        company,
        contacts: store.contacts.filter((item) => item.company_id === id),
        deals: relatedDeals(store, session, "company", id),
        notes: entityNotes(store, "company", id),
        owners: orgPeople(store, session.organizationId, session.role).map((person) => ({ id: person.id, name: person.full_name })),
        files: store.attachments.filter((item) => item.company_id === id).map((item) => ({ id: item.id, fileName: item.file_name, size: item.size, mime: item.mime })),
        fields: store.custom_fields.filter((item) => item.organization_id === session.organizationId && item.entity === "company").map((item) => ({
          id: item.id,
          label: item.label,
          fieldType: item.field_type,
          options: item.options,
          value: store.custom_field_values.find((value) => value.field_id === item.id && value.entity_id === id)?.value ?? "",
        })),
      };
    },
  );
  if (!view) notFound();
  const { company, contacts, deals, notes } = view;
  return (
    <div className="grid gap-5">
      <Link href="/companies" className="text-sm text-muted-foreground">←</Link>
      <div>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold">{company.name}</h1>
          <ClientTypeChip type={company.client_type} label={t(`types.${company.client_type}`)} />
        </div>
        <p className="text-sm text-muted-foreground">{[company.city, company.province].filter(Boolean).join(" · ")}</p>
        <div className="mt-3">
          <OwnerPicker kind="company" id={company.id} ownerId={company.owner_id} canEdit={canManage(session.role)} owners={view.owners} />
        </div>
        <div className="mt-3 flex flex-wrap gap-3 text-sm text-primary">
          {company.phone ? <a href={`tel:${company.phone}`}>{company.phone}</a> : null}
          {company.email ? <a href={`mailto:${company.email}`}>{company.email}</a> : null}
          {company.website ? <a href={company.website} target="_blank" rel="noreferrer">{company.website}</a> : null}
        </div>
      </div>
      <AttachmentsPanel
        canEdit={canManage(session.role) || company.owner_id === session.userId}
        companyId={company.id}
        files={view.files}
      />
      <CustomFieldsPanel
        entityId={company.id}
        canEdit={canManage(session.role) || company.owner_id === session.userId}
        fields={view.fields}
      />
      <section>
        <h2 className="text-sm font-semibold">{t("relatedContacts")}</h2>
        <ul className="mt-2 space-y-1 text-sm">{contacts.map((contact) => <li key={contact.id}><Link className="hover:underline" href={`/contacts/${contact.id}`}>{contactName(contact)}</Link></li>)}</ul>
      </section>
      <section>
        <h2 className="text-sm font-semibold">{t("relatedDeals")}</h2>
        <ul className="mt-2 space-y-1 text-sm">{deals.map((deal) => <li key={deal.id}><Link className="hover:underline" href={`/deals/${deal.id}`}>{deal.title} · {formatCompact(deal.value)}</Link></li>)}</ul>
      </section>
      {notes.map((note) => <article key={note.id} className="rounded-lg border bg-card p-3 text-sm">{note.body}</article>)}
    </div>
  );
}
