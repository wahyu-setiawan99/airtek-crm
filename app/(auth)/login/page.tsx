import { AuthScreen } from "@/components/auth-form";
import { DEV_ACCOUNTS, isLocalDevSupabase, supabaseEnabled } from "@/lib/env";

export default function LoginPage() {
  return <AuthScreen mode="login" demo={!supabaseEnabled} devAccounts={isLocalDevSupabase() ? DEV_ACCOUNTS : []} />;
}
