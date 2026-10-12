"use client";

import { Wind } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { forgotAction, loginAction, registerAction, resetAction } from "@/lib/actions/auth";
import { DEMO_PASSWORD } from "@/lib/constants";
import { Link, useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/form";

const demos = [
  { email: "adi@airtek.co.id", label: "asOwner" },
  { email: "sari@airtek.co.id", label: "asSales" },
  { email: "rina@airtek.co.id", label: "asViewer" },
] as const;

export function AuthScreen({
  mode,
  inviteToken = null,
}: {
  mode: "login" | "register" | "forgot" | "reset";
  inviteToken?: string | null;
}) {
  const t = useTranslations("auth");
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [resetLink, setResetLink] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function onSubmit(formData: FormData) {
    setPending(true);
    setError(null);
    const email = String(formData.get("email") ?? "");
    const password = String(formData.get("password") ?? "");
    if (mode === "login") {
      const result = await loginAction({ email, password });
      setPending(false);
      if (!result.ok) return setError(result.error);
      router.push("/dashboard");
      router.refresh();
      return;
    }
    if (mode === "register") {
      const result = await registerAction({
        fullName: String(formData.get("fullName") ?? ""),
        email,
        password,
        organizationName: String(formData.get("organizationName") ?? "Organisasi baru"),
        inviteToken,
      });
      setPending(false);
      if (!result.ok) return setError(result.error);
      router.push("/dashboard");
      router.refresh();
      return;
    }
    if (mode === "forgot") {
      const result = await forgotAction({ email });
      setPending(false);
      if (!result.ok) return setError(result.error);
      setResetLink(`/reset-password?token=${result.data}`);
      return;
    }
    const result = await resetAction({ token: String(formData.get("token") ?? ""), password });
    setPending(false);
    if (!result.ok) return setError(result.error);
    setDone(true);
  }

  async function demo(email: string) {
    setPending(true);
    const result = await loginAction({ email, password: DEMO_PASSWORD });
    setPending(false);
    if (!result.ok) return setError(result.error);
    router.push("/dashboard");
    router.refresh();
  }

  const title = mode === "login" ? t("loginTitle") : mode === "register" ? t("registerTitle") : mode === "forgot" ? t("forgotTitle") : t("resetTitle");
  const subtitle = mode === "login" ? t("loginSubtitle") : mode === "register" ? t("registerSubtitle") : mode === "forgot" ? t("forgotSubtitle") : t("resetTitle");

  return (
    <div className="grid min-h-dvh lg:grid-cols-2">
      <section className="relative hidden overflow-hidden bg-sidebar px-12 py-14 text-sidebar-foreground lg:flex lg:flex-col lg:justify-between">
        <div className="flex items-center gap-2">
          <span className="grid h-9 w-9 place-items-center rounded-md bg-primary text-primary-foreground">
            <Wind className="h-4 w-4" />
          </span>
          <span className="font-semibold">Airtek CRM</span>
        </div>
        <div>
          <h1 className="max-w-md text-4xl font-semibold tracking-tight">{t("heroTitle")}</h1>
          <p className="mt-4 max-w-md text-sm leading-6 text-sidebar-muted">{t("heroBody")}</p>
          <ul className="mt-8 space-y-3 text-sm">
            {[t("point1"), t("point2"), t("point3")].map((point) => (
              <li key={point} className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                {point}
              </li>
            ))}
          </ul>
        </div>
        <p className="text-xs text-sidebar-muted">PT. Airtek Solusi Nusantara</p>
      </section>
      <section className="grid place-items-center px-4 py-10">
        <div className="w-full max-w-md">
          <div className="mb-8 flex items-center gap-2 lg:hidden">
            <span className="grid h-8 w-8 place-items-center rounded-md bg-primary text-primary-foreground">
              <Wind className="h-4 w-4" />
            </span>
            <span className="font-semibold">Airtek CRM</span>
          </div>
          <h2 className="text-2xl font-semibold tracking-tight">{title}</h2>
          <p className="mt-2 text-sm text-muted-foreground">{subtitle}</p>
          {inviteToken ? <p className="mt-3 text-sm text-primary">{t("inviteJoin")}</p> : null}
          <form action={onSubmit} className="mt-6 grid gap-4">
            {mode === "register" ? (
              <Field label={t("fullName")}>
                <Input name="fullName" required autoComplete="name" />
              </Field>
            ) : null}
            {mode !== "reset" ? (
              <Field label="Email">
                <Input name="email" type="email" required autoComplete="email" />
              </Field>
            ) : (
              <input type="hidden" name="token" value={inviteToken ?? ""} />
            )}
            {mode === "register" && !inviteToken ? (
              <Field label={t("organizationName")}>
                <Input name="organizationName" required />
              </Field>
            ) : null}
            {mode !== "forgot" ? (
              <Field label={mode === "reset" ? t("newPassword") : t("password")}>
                <Input name="password" type="password" required minLength={8} autoComplete={mode === "login" ? "current-password" : "new-password"} />
              </Field>
            ) : null}
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
            {done ? <p className="text-sm text-success">{t("passwordUpdated")}</p> : null}
            {resetLink ? (
              <p className="text-sm">
                {t("resetReady")}{" "}
                <Link href={resetLink} className="text-primary underline">
                  {resetLink}
                </Link>
              </p>
            ) : null}
            <Button type="submit" disabled={pending}>
              {mode === "login" ? t("signIn") : mode === "register" ? t("signUp") : mode === "forgot" ? t("sendLink") : t("updatePassword")}
            </Button>
          </form>
          {mode === "login" ? (
            <div className="mt-6">
              <p className="text-xs text-muted-foreground">{t("demoHint")}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {demos.map((demoUser) => (
                  <Button key={demoUser.email} type="button" variant="outline" size="sm" disabled={pending} onClick={() => void demo(demoUser.email)}>
                    {t(demoUser.label)}
                  </Button>
                ))}
              </div>
            </div>
          ) : null}
          <p className="mt-6 text-sm text-muted-foreground">
            {mode === "login" ? (
              <>
                {t("noAccount")} <Link href="/register" className="text-primary">{t("signUp")}</Link>
                <span className="mx-2">·</span>
                <Link href="/forgot-password" className="text-primary">{t("forgot")}</Link>
              </>
            ) : (
              <Link href="/login" className="text-primary">{t("backToLogin")}</Link>
            )}
          </p>
        </div>
      </section>
    </div>
  );
}
