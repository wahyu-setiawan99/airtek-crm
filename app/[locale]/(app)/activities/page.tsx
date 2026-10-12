import { setRequestLocale } from "next-intl/server";
import { ActivitiesScreen } from "@/components/directory";
import type { AppLocale } from "@/i18n/routing";
import { loadStore } from "@/lib/store";
import { buildActivities } from "@/lib/queries";
import { canManage, canWrite } from "@/lib/permissions";
import { requireSession } from "@/lib/session";

export default async function ActivitiesPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ scope?: string }>;
}) {
  const { locale } = await params;
  const query = await searchParams;
  setRequestLocale(locale);
  const session = await requireSession();
  const store = await loadStore();
  const scope = query.scope === "all" && (canManage(session.role) || session.role === "viewer") ? "all" : "mine";
  return (
    <ActivitiesScreen
      rows={buildActivities(store, session, scope)}
      locale={locale as AppLocale}
      scope={scope}
      canCreate={canWrite(session.role)}
      me={session.userId}
      owners={store.memberships.filter((item) => item.organization_id === session.organizationId).map((item) => ({
        id: item.user_id,
        name: store.profiles.find((profile) => profile.id === item.user_id)?.full_name ?? "—",
      }))}
      deals={store.deals.filter((item) => item.organization_id === session.organizationId && item.status === "open").map((item) => ({ id: item.id, name: item.title }))}
    />
  );
}
