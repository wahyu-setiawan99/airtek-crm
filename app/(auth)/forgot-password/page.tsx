import { AuthScreen } from "@/components/auth-form";
import { supabaseEnabled } from "@/lib/env";

export default function ForgotPage() {
  return <AuthScreen mode="forgot" demo={!supabaseEnabled} />;
}
