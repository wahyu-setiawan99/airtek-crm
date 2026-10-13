import { CompaniesScreen } from "@/components/directory";
import { preload, withStore, type TableName } from "@/lib/store";
import { buildCompanies } from "@/lib/queries";
import { canWrite } from "@/lib/permissions";
import { requireSession } from "@/lib/session";

/** Tables this page reads; fetched while the session is checked. */
const TABLES: readonly TableName[] = ["companies", "memberships", "profiles"];

export default async function CompaniesPage({ searchParams }: { searchParams: Promise<{ new?: string }> }) {
  preload(TABLES);
  const query = await searchParams;
  const session = await requireSession();
  const { rows, owners } = await withStore(TABLES, (store) => ({
    rows: buildCompanies(store, session),
    owners: store.memberships.filter((item) => item.organization_id === session.organizationId).map((item) => ({
      id: item.user_id,
      name: store.profiles.find((profile) => profile.id === item.user_id)?.full_name ?? "—",
    })),
  }));
  return (
    <CompaniesScreen
      rows={rows}
      owners={owners}
      canCreate={canWrite(session.role)}
      openNew={query.new === "1"}
    />
  );
}
