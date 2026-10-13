import { cookies } from "next/headers";
import { getLocale } from "next-intl/server";
import { IntlProvider } from "@/components/intl-provider";
import { AppShell } from "@/components/shell";
import type { AppLocale } from "@/i18n/locale";
import { buildShell } from "@/lib/queries";
import { supabaseEnabled } from "@/lib/env";
import { preload, withStore, type TableName } from "@/lib/store";
import { requireSession } from "@/lib/session";

/** Tables this page reads; fetched while the session is checked. */
const TABLES: readonly TableName[] = ["organizations", "pipelines", "notifications", "deals", "companies", "contacts"];

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  preload(TABLES);
  const locale = await getLocale();
  const session = await requireSession();
  const shell = { ...(await withStore(TABLES, (store) => buildShell(store, session))), demo: !supabaseEnabled };
  const sidebar = (await cookies()).get("airtek_sidebar")?.value === "collapsed";
  return (
    <IntlProvider>
      <AppShell locale={locale as AppLocale} shell={shell} sidebarCollapsed={sidebar}>
        {children}
      </AppShell>
    </IntlProvider>
  );
}
