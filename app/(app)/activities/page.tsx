import { getLocale } from "next-intl/server";
import { ActivitiesScreen } from "@/components/directory";
import type { AppLocale } from "@/i18n/locale";
import { preload, withStore, type TableName } from "@/lib/store";
import { buildActivities } from "@/lib/queries";
import { canManage, canWrite } from "@/lib/permissions";
import { requireSession } from "@/lib/session";

/** Tables this page reads; fetched while the session is checked. */
const TABLES: readonly TableName[] = ["activities", "deals", "memberships", "profiles"];

export default async function ActivitiesPage({
  searchParams,
}: {
  searchParams: Promise<{ scope?: string }>;
}) {
  preload(TABLES);
  const locale = await getLocale();
  const query = await searchParams;
  const session = await requireSession();
  const scope = query.scope === "all" && (canManage(session.role) || session.role === "viewer") ? "all" : "mine";
  const { rows, owners, deals } = await withStore(TABLES, (store) => ({
    rows: buildActivities(store, session, scope),
    owners: store.memberships.filter((item) => item.organization_id === session.organizationId).map((item) => ({
      id: item.user_id,
      name: store.profiles.find((profile) => profile.id === item.user_id)?.full_name ?? "—",
    })),
    deals: store.deals.filter((item) => item.organization_id === session.organizationId && item.status === "open").map((item) => ({ id: item.id, name: item.title })),
  }));
  return (
    <ActivitiesScreen
      rows={rows}
      locale={locale as AppLocale}
      scope={scope}
      canCreate={canWrite(session.role)}
      me={session.userId}
      owners={owners}
      deals={deals}
    />
  );
}
