"use client";

import { Languages } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { devLoginAction, forgotAction, loginAction, registerAction, resendConfirmationAction, resetAction } from "@/lib/actions/auth";
import { DEMO_PASSWORD } from "@/lib/constants";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BrandLogo } from "@/components/brand-logo";
import { LocaleSwitch } from "@/components/locale-switch";
import { ThemeSwitch } from "@/components/theme-switch";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/form";

const demos = [
  { email: "admin.demo@airtek.my.id", label: "asOwner" },
  { email: "sales1.demo@airtek.my.id", label: "asSales" },
  { email: "direksi.demo@airtek.my.id", label: "asViewer" },
] as const;

const BLOCKED_NEXT = new Set(["/", "/login", "/register", "/forgot-password", "/reset-password", "/onboarding"]);

/** `?next=` on the login URL. Locale prefix is stripped; the router adds the active locale. */
function readNextParam() {
  const raw = new URLSearchParams(window.location.search).get("next");
  if (!raw) return null;
  const value = raw.trim();
  if (!value.startsWith("/") || value.startsWith("//") || value.includes("\\") || value.includes("://")) return null;
  const withoutHash = value.split("#")[0] ?? value;
  const queryAt = withoutHash.indexOf("?");
  const path = queryAt >= 0 ? withoutHash.slice(0, queryAt) : withoutHash;
  const search = queryAt >= 0 ? withoutHash.slice(queryAt) : "";
  if (path.includes("//")) return null;
  const stripped = path.replace(/^\/(id|en)(?=\/|$)/, "") || "/";
  if (BLOCKED_NEXT.has(stripped)) return null;
  return `${stripped}${search}`;
}

export function AuthScreen({
  mode,
  inviteToken = null,
  demo = false,
  devAccounts = [],
}: {
  mode: "login" | "register" | "forgot" | "reset";
  inviteToken?: string | null;
  demo?: boolean;
  /** Local Docker Supabase only (AGENTS.md §18). */
  devAccounts?: readonly { email: string; role: string }[];
}) {
  const t = useTranslations("auth");
  const locale = useLocale();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [resetLink, setResetLink] = useState<string | null>(null);
  const [confirmPath, setConfirmPath] = useState<string | null>(null);
  const [awaitingEmail, setAwaitingEmail] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [sent, setSent] = useState(false);

  async function onSubmit(formData: FormData) {
    setPending(true);
    setError(null);
    const email = String(formData.get("email") ?? "");
    const password = String(formData.get("password") ?? "");
    if (mode === "login") {
      const result = await loginAction({ email, password });
      setPending(false);
      if (!result.ok) return setError(result.error);
      router.replace(result.data?.next === "onboarding" ? "/onboarding" : (readNextParam() ?? "/dashboard"));
      return;
    }
    if (mode === "register") {
      const result = await registerAction({
        fullName: String(formData.get("fullName") ?? ""),
        email,
        password,
        inviteToken,
      });
      setPending(false);
      if (!result.ok) return setError(result.error);
      if (result.data && typeof result.data === "object" && "status" in result.data && result.data.status === "pending") {
        setAwaitingEmail(email);
        if ("demoConfirmPath" in result.data && result.data.demoConfirmPath) setConfirmPath(result.data.demoConfirmPath);
        return;
      }
      router.replace("/onboarding");
      return;
    }
    if (mode === "forgot") {
      const result = await forgotAction({ email });
      setPending(false);
      if (!result.ok) return setError(result.error);
      if (result.data) setResetLink(`/reset-password?token=${result.data}`);
      else setSent(true);
      return;
    }
    const result = await resetAction({ token: String(formData.get("token") ?? ""), password });
    setPending(false);
    if (!result.ok) return setError(result.error);
    setDone(true);
  }

  async function loginDemo(email: string) {
    setPending(true);
    const result = await loginAction({ email, password: DEMO_PASSWORD });
    setPending(false);
    if (!result.ok) return setError(result.error);
    router.replace(result.data?.next === "onboarding" ? "/onboarding" : (readNextParam() ?? "/dashboard"));
  }

  async function loginDev(email: string) {
    setPending(true);
    setError(null);
    const result = await devLoginAction(email);
    setPending(false);
    if (!result.ok) return setError(result.error);
    router.replace(result.data?.next === "onboarding" ? "/onboarding" : (readNextParam() ?? "/dashboard"));
  }

  const title = mode === "login" ? t("loginTitle") : mode === "register" ? t("registerTitle") : mode === "forgot" ? t("forgotTitle") : t("resetTitle");
  const subtitle = mode === "login" ? t("loginSubtitle") : mode === "register" ? t("registerSubtitle") : mode === "forgot" ? t("forgotSubtitle") : t("resetTitle");

  return (
    <div className="grid min-h-dvh lg:grid-cols-2">
      <section className="relative hidden overflow-hidden border-r bg-accent/60 px-12 py-14 text-foreground lg:flex lg:flex-col lg:justify-between dark:border-sidebar-border dark:bg-sidebar dark:text-sidebar-foreground">
        <BrandLogo priority className="h-14 self-start" />
        <div>
          <h1 className="max-w-md text-4xl font-semibold tracking-tight">{t("heroTitle")}</h1>
          <p className="mt-4 max-w-md text-sm leading-6 text-muted-foreground dark:text-sidebar-muted">{t("heroBody")}</p>
          <ul className="mt-8 space-y-3 text-sm">
            {[t("point1"), t("point2"), t("point3")].map((point) => (
              <li key={point} className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                {point}
              </li>
            ))}
          </ul>
        </div>
        <p className="text-xs text-muted-foreground dark:text-sidebar-muted">PT. Airtek Solusi Nusantara</p>
      </section>
      <section className="relative grid place-items-center px-4 py-16">
        <div className="absolute right-4 top-4 flex items-center gap-2">
          <LocaleSwitch className="inline-flex items-center gap-2 rounded-lg border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-accent hover:text-foreground">
            <Languages className="h-3.5 w-3.5" />
            {locale === "id" ? "EN" : "ID"}
          </LocaleSwitch>
          <ThemeSwitch />
        </div>
        <div className="w-full max-w-md">
          <div className="mb-8 lg:hidden">
            <BrandLogo className="h-10" />
          </div>
          <h2 className="text-2xl font-semibold tracking-tight">{title}</h2>
          <p className="mt-2 text-sm text-muted-foreground">{subtitle}</p>
          {inviteToken ? <p className="mt-3 text-sm text-primary">{t("inviteJoin")}</p> : null}
          {mode === "register" && !inviteToken ? <p className="mt-3 text-sm text-muted-foreground">{t("inviteOnly")}</p> : null}
          {awaitingEmail ? (
            <div className="mt-6 grid gap-3">
              <p className="text-sm">{t("checkEmail")}</p>
              {confirmPath ? (
                <p className="text-sm">
                  {t("confirmDemo")}{" "}
                  <a className="text-primary underline" href={confirmPath}>{confirmPath}</a>
                </p>
              ) : null}
              <Button type="button" variant="outline" disabled={pending} onClick={() => {
                setPending(true);
                void resendConfirmationAction(awaitingEmail).then((result) => {
                  setPending(false);
                  if (!result.ok) setError(result.error);
                });
              }}>{t("resend")}</Button>
            </div>
          ) : (
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
            {mode !== "forgot" ? (
              <Field label={mode === "reset" ? t("newPassword") : t("password")}>
                <Input name="password" type="password" required minLength={8} autoComplete={mode === "login" ? "current-password" : "new-password"} />
              </Field>
            ) : null}
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
            {done ? <p className="text-sm text-success">{t("passwordUpdated")}</p> : null}
            {sent ? <p className="text-sm text-success">{t("resetEmailSent")}</p> : null}
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
            {error === t("emailNotConfirmed") ? (
              <Button type="button" variant="outline" disabled={pending} onClick={() => {
                const email = (document.querySelector('input[name="email"]') as HTMLInputElement | null)?.value ?? "";
                setPending(true);
                void resendConfirmationAction(email).then((result) => {
                  setPending(false);
                  if (!result.ok) setError(result.error);
                });
              }}>{t("resend")}</Button>
            ) : null}
          </form>
          )}
          {mode === "login" && devAccounts.length > 0 ? (
            <div className="mt-6 rounded-lg border border-dashed p-3">
              <p className="text-xs font-medium text-muted-foreground">Masuk cepat (dev) — Supabase lokal, `pnpm dev:seed`</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {devAccounts.map((account) => (
                  <Button key={account.email} type="button" variant="outline" size="sm" disabled={pending} onClick={() => void loginDev(account.email)}>
                    {account.email.split("@")[0]} · {account.role}
                  </Button>
                ))}
              </div>
            </div>
          ) : null}
          {mode === "login" && demo ? (
            <div className="mt-6">
              <p className="text-xs text-muted-foreground">{t("demoHint")}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {demos.map((demoUser) => (
                  <Button key={demoUser.email} type="button" variant="outline" size="sm" disabled={pending} onClick={() => void loginDemo(demoUser.email)}>
                    {t(demoUser.label)}
                  </Button>
                ))}
              </div>
            </div>
          ) : null}
          <p className="mt-6 text-sm text-muted-foreground">
            {mode === "login" ? (
              <>
                {t("noAccountInvite")}
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
