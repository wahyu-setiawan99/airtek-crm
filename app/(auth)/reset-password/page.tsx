import { AuthScreen } from "@/components/auth-form";

export default async function ResetPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const query = await searchParams;
  return <AuthScreen mode="reset" inviteToken={query.token ?? null} />;
}
