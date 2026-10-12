import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { Link } from "@/i18n/navigation";
import { readStore } from "@/lib/demo/store";
import { formatCompact } from "@/lib/format";
import { entityNotes, relatedDeals } from "@/lib/queries";
import { requireSession } from "@/lib/session";
import { contactName } from "@/lib/utils";

export default async function CompanyDetailPage({ params }: { params: Promise<{ locale: string; id: string }> }) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("companies");
  const session = await requireSession();
  const store = readStore();
  const company = store.companies.find((item) => item.id === id && item.organization_id === session.organizationId);
  if (!company) notFound();
  const contacts = store.contacts.filter((item) => item.company_id === id);
  const deals = relatedDeals(store, session, "company", id);
  const notes = entityNotes(store, "company", id);
  return (
    <div className="grid gap-5">
      <Link href="/companies" className="text-sm text-muted-foreground">←</Link>
      <div>
        <h1 className="text-2xl font-semibold">{company.name}</h1>
        <p className="text-sm text-muted-foreground">{[company.industry, company.city, company.province].filter(Boolean).join(" · ")}</p>
        <div className="mt-3 flex flex-wrap gap-3 text-sm text-primary">
          {company.phone ? <a href={`tel:${company.phone}`}>{company.phone}</a> : null}
          {company.email ? <a href={`mailto:${company.email}`}>{company.email}</a> : null}
          {company.website ? <a href={company.website} target="_blank" rel="noreferrer">{company.website}</a> : null}
        </div>
      </div>
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
