import { setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { SettingsScreen } from "@/components/settings-screen";
import type { AppLocale } from "@/i18n/routing";
import { supabaseEnabled } from "@/lib/env";
import { loadStore } from "@/lib/store";
import { buildSettings } from "@/lib/queries";
import { requireSession } from "@/lib/session";

const sections = ["profile", "organization", "members", "pipelines", "tags", "lost-reasons", "audit"] as const;

export default async function SettingsPage({ params }: { params: Promise<{ locale: string; section: string }> }) {
  const { locale, section } = await params;
  setRequestLocale(locale);
  if (!sections.includes(section as (typeof sections)[number])) notFound();
  const session = await requireSession();
  const data = buildSettings(await loadStore(), session);
  const key = section === "lost-reasons" ? "lostReasons" : section;
  return <SettingsScreen section={key as "profile"} data={data} locale={locale as AppLocale} demo={!supabaseEnabled} />;
}
