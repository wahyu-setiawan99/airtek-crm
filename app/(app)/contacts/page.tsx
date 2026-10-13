import { ContactsScreen } from "@/components/directory";
import { canWrite } from "@/lib/permissions";
import { preload, withStore, type TableName } from "@/lib/store";
import { buildContacts } from "@/lib/queries";
import { requireSession } from "@/lib/session";
import { contactName } from "@/lib/utils";

/** Tables this page reads; fetched while the session is checked. */
const TABLES: readonly TableName[] = ["contacts", "companies", "memberships", "profiles"];

export default async function ContactsPage({ searchParams }: { searchParams: Promise<{ new?: string }> }) {
  preload(TABLES);
  const query = await searchParams;
  const session = await requireSession();
  const org = session.organizationId;
  const { rows, companies, owners } = await withStore(TABLES, (store) => ({
    rows: buildContacts(store, session),
    companies: store.companies.filter((item) => item.organization_id === org).map((item) => ({ id: item.id, name: item.name })),
    owners: store.memberships.filter((item) => item.organization_id === org).map((item) => ({
      id: item.user_id,
      name: store.profiles.find((profile) => profile.id === item.user_id)?.full_name ?? contactName({ first_name: "User", last_name: "" }),
    })),
  }));
  return (
    <ContactsScreen
      rows={rows}
      companies={companies}
      owners={owners}
      canCreate={canWrite(session.role)}
      openNew={query.new === "1"}
    />
  );
}
