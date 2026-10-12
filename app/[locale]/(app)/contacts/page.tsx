import { setRequestLocale } from "next-intl/server";
import { ContactsScreen } from "@/components/directory";
import { canWrite } from "@/lib/permissions";
import { readStore } from "@/lib/demo/store";
import { buildContacts } from "@/lib/queries";
import { requireSession } from "@/lib/session";
import { contactName } from "@/lib/utils";

export default async function ContactsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ new?: string }>;
}) {
  const { locale } = await params;
  const query = await searchParams;
  setRequestLocale(locale);
  const session = await requireSession();
  const store = readStore();
  const org = session.organizationId;
  return (
    <ContactsScreen
      rows={buildContacts(store, session)}
      companies={store.companies.filter((item) => item.organization_id === org).map((item) => ({ id: item.id, name: item.name }))}
      owners={store.memberships.filter((item) => item.organization_id === org).map((item) => ({
        id: item.user_id,
        name: store.profiles.find((profile) => profile.id === item.user_id)?.full_name ?? contactName({ first_name: "User", last_name: "" }),
      }))}
      canCreate={canWrite(session.role)}
      openNew={query.new === "1"}
    />
  );
}
