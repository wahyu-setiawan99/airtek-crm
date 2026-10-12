"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { acceptInviteAction } from "@/lib/actions/auth";
import { Link, useRouter } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/client";
import { BrandLogo } from "@/components/brand-logo";
import { ThemeSwitch } from "@/components/theme-switch";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/form";

type State = { status: "checking" } | { status: "ready"; email: string; name: string } | { status: "invalid" };

/**
 * Landing page of the invitation email. Supabase's default invite link puts the session in the
 * URL hash (`#access_token=…`), which never reaches the server, so it is picked up here.
 */
export function AcceptInviteForm() {
  const t = useTranslations("auth");
  const router = useRouter();
  const [state, setState] = useState<State>({ status: "checking" });
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    if (!supabase) {
      setState({ status: "ready", email: "", name: "" });
      return;
    }
    void (async () => {
      const hash = new URLSearchParams(window.location.hash.slice(1));
      const accessToken = hash.get("access_token");
      const refreshToken = hash.get("refresh_token");
      if (accessToken && refreshToken) {
        await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
        window.history.replaceState(null, "", window.location.pathname);
      }
      const { data } = await supabase.auth.getUser();
      if (!data.user) return setState({ status: "invalid" });
      const name = typeof data.user.user_metadata?.full_name === "string" ? data.user.user_metadata.full_name : "";
      setState({ status: "ready", email: data.user.email ?? "", name });
    })();
  }, []);

  return (
    <main className="relative grid min-h-dvh place-items-center px-6 py-16">
      <ThemeSwitch className="absolute right-4 top-4" />
      <div className="w-full max-w-md">
        <BrandLogo priority className="h-12" />
        {state.status === "checking" ? <p className="mt-8 text-sm text-muted-foreground">{t("acceptChecking")}</p> : null}
        {state.status === "invalid" ? (
          <div className="mt-8 grid gap-3">
            <h1 className="text-2xl font-semibold tracking-tight">{t("acceptTitle")}</h1>
            <p className="text-sm text-destructive">{t("acceptInvalid")}</p>
            <Link href="/login" className="text-sm text-primary">{t("backToLogin")}</Link>
          </div>
        ) : null}
        {state.status === "ready" ? (
          <form
            className="mt-8 grid gap-4"
            onSubmit={(event) => {
              event.preventDefault();
              const form = new FormData(event.currentTarget);
              setPending(true);
              setError(null);
              void acceptInviteAction({
                fullName: String(form.get("fullName") ?? ""),
                password: String(form.get("password") ?? ""),
              }).then((result) => {
                setPending(false);
                if (!result.ok) return setError(result.error);
                router.push("/dashboard");
                router.refresh();
              });
            }}
          >
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">{t("acceptTitle")}</h1>
              <p className="mt-2 text-sm text-muted-foreground">{t("acceptSubtitle", { email: state.email })}</p>
            </div>
            <Field label={t("fullName")}><Input name="fullName" required minLength={2} defaultValue={state.name} autoComplete="name" /></Field>
            <Field label={t("newPassword")}><Input name="password" type="password" required minLength={8} autoComplete="new-password" /></Field>
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
            <Button type="submit" disabled={pending}>{t("acceptSubmit")}</Button>
          </form>
        ) : null}
      </div>
    </main>
  );
}
