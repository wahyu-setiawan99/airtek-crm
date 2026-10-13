import { AuthScreen } from "@/components/auth-form";

export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ invite?: string }> }) {
  const query = await searchParams;
  return <AuthScreen mode="register" inviteToken={query.invite ?? null} />;
}
