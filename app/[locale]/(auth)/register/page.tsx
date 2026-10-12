import { setRequestLocale } from "next-intl/server";
import { AuthScreen } from "@/components/auth-form";

export default async function RegisterPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ invite?: string }>;
}) {
  const { locale } = await params;
  const query = await searchParams;
  setRequestLocale(locale);
  return <AuthScreen mode="register" inviteToken={query.invite ?? null} />;
}
