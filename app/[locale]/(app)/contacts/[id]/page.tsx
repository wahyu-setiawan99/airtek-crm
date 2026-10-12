import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { Link } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";
import { readStore } from "@/lib/demo/store";
import { entityNotes, relatedDeals } from "@/lib/queries";
import { requireSession } from "@/lib/session";
import { contactName } from "@/lib/utils";
import { formatCompact, formatDateTime } from "@/lib/format";

export default async function ContactDetailPage({ params }: { params: Promise<{ locale: string; id: string }> }) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("contacts");
  const session = await requireSession();
  const store = readStore();
  const contact = store.contacts.find((item) => item.id === id && item.organization_id === session.organizationId);
  if (!contact) notFound();
  const company = store.companies.find((item) => item.id === contact.company_id);
  const deals = relatedDeals(store, session, "contact", id);
  const notes = entityNotes(store, "contact", id);
  const appLocale = locale as AppLocale;
  return (
    <div className="grid gap-5">
      <Link href="/contacts" className="text-sm text-muted-foreground">←</Link>
      <div>
        <h1 className="text-2xl font-semibold">{contactName(contact)}</h1>
        <p className="text-sm text-muted-foreground">{contact.job_title}{company ? ` · ${company.name}` : ""}</p>
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
      <section className="space-y-2">
        {notes.map((note) => <article key={note.id} className="rounded-lg border bg-card p-3 text-sm"><p>{note.body}</p><p className="mt-1 text-xs text-muted-foreground">{note.author} · {formatDateTime(note.createdAt, appLocale)}</p></article>)}
      </section>
    </div>
  );
}
