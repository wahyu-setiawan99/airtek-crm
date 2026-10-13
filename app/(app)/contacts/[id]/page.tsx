import { getLocale, getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { AttachmentsPanel } from "@/components/attachments-panel";
import { CustomFieldsPanel } from "@/components/custom-fields-panel";
import { OwnerPicker } from "@/components/owner-picker";
import Link from "next/link";
import type { AppLocale } from "@/i18n/locale";
import { canManage } from "@/lib/permissions";
import { preload, withStore, type TableName } from "@/lib/store";
import { entityNotes, orgPeople, relatedDeals } from "@/lib/queries";
import { requireSession } from "@/lib/session";
import { contactName } from "@/lib/utils";
import { formatCompact, formatDateTime } from "@/lib/format";

/** Tables this page reads; fetched while the session is checked. */
const TABLES: readonly TableName[] = ["contacts", "companies", "deals", "stages", "deal_tags", "tags", "activities", "notes", "memberships", "profiles", "attachments", "custom_fields", "custom_field_values"];

export default async function ContactDetailPage({ params }: { params: Promise<{ id: string }> }) {
  preload(TABLES);
  const { id } = await params;
  const locale = await getLocale();
  const t = await getTranslations("contacts");
  const session = await requireSession();
  const view = await withStore(
    TABLES,
    (store) => {
      const contact = store.contacts.find((item) => item.id === id && item.organization_id === session.organizationId);
      if (!contact) return null;
      return {
        contact,
        company: store.companies.find((item) => item.id === contact.company_id),
        deals: relatedDeals(store, session, "contact", id),
        notes: entityNotes(store, "contact", id),
        owners: orgPeople(store, session.organizationId, session.role).map((person) => ({ id: person.id, name: person.full_name })),
        files: store.attachments.filter((item) => item.contact_id === id).map((item) => ({ id: item.id, fileName: item.file_name, size: item.size, mime: item.mime })),
        fields: store.custom_fields.filter((item) => item.organization_id === session.organizationId && item.entity === "contact").map((item) => ({
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
  const { contact, company, deals, notes } = view;
  const appLocale = locale as AppLocale;
  return (
    <div className="grid gap-5">
      <Link href="/contacts" className="text-sm text-muted-foreground">←</Link>
      <div>
        <h1 className="text-2xl font-semibold">{contactName(contact)}</h1>
        <p className="text-sm text-muted-foreground">{contact.job_title}{company ? ` · ${company.name}` : ""}</p>
        <div className="mt-3">
          <OwnerPicker kind="contact" id={contact.id} ownerId={contact.owner_id} canEdit={canManage(session.role)} owners={view.owners} />
        </div>
        <div className="mt-3 flex flex-wrap gap-3 text-sm text-primary">
          {contact.phone ? <a href={`tel:${contact.phone}`}>{t("call")}</a> : null}
          {contact.email ? <a href={`mailto:${contact.email}`}>{t("mail")}</a> : null}
          {contact.whatsapp ? <a href={`https://wa.me/${contact.whatsapp}`} target="_blank" rel="noreferrer">{t("wa")}</a> : null}
        </div>
      </div>
      <section>
        <h2 className="text-sm font-semibold">{t("relatedDeals")}</h2>
        <ul className="mt-2 space-y-2">
          {deals.map((deal) => (
            <li key={deal.id}><Link className="text-sm hover:underline" href={`/deals/${deal.id}`}>{deal.title} · {formatCompact(deal.value)}</Link></li>
          ))}
        </ul>
      </section>
      <AttachmentsPanel
        canEdit={canManage(session.role) || contact.owner_id === session.userId}
        contactId={contact.id}
        files={view.files}
      />
      <CustomFieldsPanel
        entityId={contact.id}
        canEdit={canManage(session.role) || contact.owner_id === session.userId}
        fields={view.fields}
      />
      <section className="space-y-2">
        {notes.map((note) => <article key={note.id} className="rounded-lg border bg-card p-3 text-sm"><p>{note.body}</p><p className="mt-1 text-xs text-muted-foreground">{note.author} · {formatDateTime(note.createdAt, appLocale)}</p></article>)}
      </section>
    </div>
  );
}
