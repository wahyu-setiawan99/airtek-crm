import { setRequestLocale } from "next-intl/server";
import { AuthScreen } from "@/components/auth-form";
import { supabaseEnabled } from "@/lib/env";

export default async function ForgotPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <AuthScreen mode="forgot" demo={!supabaseEnabled} />;
}
