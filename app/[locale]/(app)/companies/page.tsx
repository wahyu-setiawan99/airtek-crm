import { setRequestLocale } from "next-intl/server";
import { CompaniesScreen } from "@/components/directory";
import { loadStore } from "@/lib/store";
import { buildCompanies } from "@/lib/queries";
import { canWrite } from "@/lib/permissions";
import { requireSession } from "@/lib/session";

export default async function CompaniesPage({
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
  const store = await loadStore();
  return (
    <CompaniesScreen
      rows={buildCompanies(store, session)}
      owners={store.memberships.filter((item) => item.organization_id === session.organizationId).map((item) => ({
        id: item.user_id,
        name: store.profiles.find((profile) => profile.id === item.user_id)?.full_name ?? "—",
      }))}
      canCreate={canWrite(session.role)}
      openNew={query.new === "1"}
    />
  );
}
