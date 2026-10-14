"use client";

import { ArrowLeft, ArrowRight, Check, Eye, EyeOff, KeyRound, Loader2, Lock, LogIn, Mail, ShieldCheck, UserRound, type LucideIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { devLoginAction, forgotAction, loginAction, registerAction, resendConfirmationAction, resetAction } from "@/lib/actions/auth";
import { DEMO_PASSWORD } from "@/lib/constants";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BrandLogo } from "@/components/brand-logo";
import { ThemeSwitch } from "@/components/theme-switch";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/form";
import { PipelinePreview } from "@/components/pipeline-preview";
import { cn } from "@/lib/utils";

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
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [resetLink, setResetLink] = useState<string | null>(null);
  const [confirmPath, setConfirmPath] = useState<string | null>(null);
  const [awaitingEmail, setAwaitingEmail] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [sent, setSent] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

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
    <main className="relative grid min-h-dvh overflow-hidden bg-background lg:grid-cols-[1.05fr_1fr]">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,var(--color-border)_1px,transparent_1px),linear-gradient(to_bottom,var(--color-border)_1px,transparent_1px)] bg-[size:48px_48px] opacity-40 [mask-image:radial-gradient(ellipse_at_top_left,black,transparent_70%)]"
      />
      <section className="relative hidden flex-col justify-between gap-8 border-r px-10 py-10 lg:flex xl:px-14">
        <Link href="/" className="inline-flex self-start rounded-md hover:opacity-80">
          <BrandLogo priority className="h-11" />
        </Link>
        <div className="max-w-2xl">
          <p className="inline-flex items-center gap-2 rounded-full border bg-card/80 px-3 py-1 text-xs font-medium text-muted-foreground">
            <span className="h-1.5 w-1.5 rounded-full bg-primary" />
            HVAC · Pumps · Fire · Lifts
          </p>
          <h1 className="mt-5 text-4xl font-semibold leading-[1.1] tracking-tight text-balance xl:text-[2.75rem]">
            {t("heroLead")} <span className="text-primary">{t("heroAccent")}</span>
          </h1>
          <p className="mt-4 max-w-lg text-base leading-7 text-muted-foreground">{t("heroBody")}</p>
          <ul className="mt-5 flex flex-wrap gap-2">
            {[t("point1"), t("point2"), t("point3")].map((point) => (
              <li key={point} className="inline-flex items-center gap-1.5 rounded-full border bg-card/70 px-2.5 py-1 text-xs text-foreground/90">
                <Check className="h-3 w-3 text-primary" strokeWidth={3} aria-hidden />
                {point}
              </li>
            ))}
          </ul>
          <PipelinePreview rows={1} className="mt-8 hidden max-w-xl [@media(min-height:760px)]:block" />
        </div>
        <p className="text-xs text-muted-foreground">PT. Airtek Solusi Nusantara</p>
      </section>

      <section className="relative grid place-items-center px-4 py-20 sm:px-6">
        <div
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-1/2 h-[28rem] w-[28rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(closest-side,color-mix(in_oklch,var(--color-primary)_18%,transparent),transparent)]"
        />
        <ThemeSwitch className="absolute right-4 top-4" />
        <div className="relative w-full max-w-md">
          <div className="mb-8 flex justify-center lg:hidden">
            <Link href="/" className="inline-flex rounded-md hover:opacity-80">
              <BrandLogo priority className="h-10" />
            </Link>
          </div>
          <div className="rounded-2xl border bg-card/85 p-6 shadow-2xl shadow-primary/10 backdrop-blur sm:p-8">
            <span className="grid h-11 w-11 place-items-center rounded-xl bg-primary/15 text-primary">
              {mode === "login" ? <LogIn className="h-5 w-5" aria-hidden /> : <KeyRound className="h-5 w-5" aria-hidden />}
            </span>
            <h2 className="mt-4 text-2xl font-semibold tracking-tight">{title}</h2>
            <p className="mt-1.5 text-sm text-muted-foreground">{subtitle}</p>
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
                  <IconInput icon={UserRound} name="fullName" required autoComplete="name" />
                </Field>
              ) : null}
              {mode !== "reset" ? (
                <Field label="Email">
                  <IconInput icon={Mail} name="email" type="email" required autoComplete="email" placeholder="name@company.com" />
                </Field>
              ) : (
                <input type="hidden" name="token" value={inviteToken ?? ""} />
              )}
              {mode !== "forgot" ? (
                <div className="grid gap-1.5 text-sm">
                  <div className="flex items-center justify-between gap-2">
                    <label htmlFor="auth-password" className="font-medium">{mode === "reset" ? t("newPassword") : t("password")}</label>
                    {mode === "login" ? <Link href="/forgot-password" className="text-xs font-medium text-primary hover:underline">{t("forgot")}</Link> : null}
                  </div>
                  <div className="relative">
                    <Lock aria-hidden className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="auth-password"
                      name="password"
                      type={showPassword ? "text" : "password"}
                      required
                      minLength={8}
                      autoComplete={mode === "login" ? "current-password" : "new-password"}
                      className="h-11 pl-10 pr-11"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((value) => !value)}
                      aria-label={showPassword ? t("hidePassword") : t("showPassword")}
                      aria-pressed={showPassword}
                      className="absolute right-1 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
              ) : null}
              {error ? <p role="alert" className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p> : null}
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
              <Button type="submit" disabled={pending} className="mt-1 h-11 text-sm font-semibold shadow-lg shadow-primary/20">
                {pending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
                {mode === "login" ? t("signIn") : mode === "register" ? t("signUp") : mode === "forgot" ? t("sendLink") : t("updatePassword")}
                {!pending && mode === "login" ? <ArrowRight className="h-4 w-4" aria-hidden /> : null}
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
            <div className="mt-6 border-t pt-5 text-sm text-muted-foreground">
              {mode === "login" ? (
                <p className="flex items-start gap-2">
                  <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
                  {t("noAccountInvite")}
                </p>
              ) : (
                <Link href="/login" className="inline-flex items-center gap-1.5 font-medium text-primary hover:underline">
                  <ArrowLeft className="h-4 w-4" aria-hidden /> {t("backToLogin")}
                </Link>
              )}
            </div>
          </div>
          <p className="mt-6 text-center text-xs text-muted-foreground lg:hidden">PT. Airtek Solusi Nusantara</p>
        </div>
      </section>
    </main>
  );
}

/** Text input with a leading icon, used on the sign-in screens. */
function IconInput({ icon: Icon, className, ...props }: React.ComponentProps<"input"> & { icon: LucideIcon }) {
  return (
    <span className="relative block">
      <Icon aria-hidden className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input {...props} className={cn("h-11 pl-10", className)} />
    </span>
  );
}
