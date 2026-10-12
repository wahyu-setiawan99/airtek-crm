import { setRequestLocale } from "next-intl/server";
import { AuthScreen } from "@/components/auth-form";

export default async function ResetPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ token?: string }>;
}) {
  const { locale } = await params;
  const query = await searchParams;
  setRequestLocale(locale);
  return <AuthScreen mode="reset" inviteToken={query.token ?? null} />;
}
