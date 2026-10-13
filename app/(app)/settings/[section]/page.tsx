import { getLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { SettingsScreen } from "@/components/settings-screen";
import type { AppLocale } from "@/i18n/locale";
import { supabaseEnabled } from "@/lib/env";
import { preload, withStore, type TableName } from "@/lib/store";
import { buildSettings } from "@/lib/queries";
import { requireSession } from "@/lib/session";

/** Tables this page reads; fetched while the session is checked. */
const TABLES: readonly TableName[] = ["memberships", "profiles", "invitations", "pipelines", "stages", "tags", "lost_reasons", "products", "custom_fields", "sales_targets", "audit_logs"];

const sections = ["profile", "organization", "members", "targets", "pipelines", "tags", "lost-reasons", "custom-fields", "import", "audit"] as const;

export default async function SettingsPage({ params }: { params: Promise<{ section: string }> }) {
  preload(TABLES);
  const { section } = await params;
  const locale = await getLocale();
  if (!sections.includes(section as (typeof sections)[number])) notFound();
  const session = await requireSession();
  const data = await withStore(
    TABLES,
    (store) => buildSettings(store, session),
  );
  const key = section === "lost-reasons" ? "lostReasons" : section === "custom-fields" ? "customFields" : section;
  return <SettingsScreen section={key as "profile"} data={data} locale={locale as AppLocale} demo={!supabaseEnabled} />;
}
