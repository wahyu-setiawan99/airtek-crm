import { setRequestLocale } from "next-intl/server";
import { AppShell } from "@/components/shell";
import type { AppLocale } from "@/i18n/routing";
import { buildShell } from "@/lib/queries";
import { supabaseEnabled } from "@/lib/env";
import { loadStore } from "@/lib/store";
import { requireSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function AppLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const session = await requireSession();
  const shell = { ...buildShell(await loadStore(), session), demo: !supabaseEnabled };
  return (
    <AppShell locale={locale as AppLocale} shell={shell}>
      {children}
    </AppShell>
  );
}
