import { setRequestLocale } from "next-intl/server";
import { AuthScreen } from "@/components/auth-form";
import { DEV_ACCOUNTS, isLocalDevSupabase, supabaseEnabled } from "@/lib/env";

export default async function LoginPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <AuthScreen mode="login" demo={!supabaseEnabled} devAccounts={isLocalDevSupabase() ? DEV_ACCOUNTS : []} />;
}
