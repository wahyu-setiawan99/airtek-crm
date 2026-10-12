"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { acceptInviteAction } from "@/lib/actions/auth";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/form";

export function AcceptInviteForm() {
  const t = useTranslations("auth");
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  return (
    <main className="grid min-h-dvh place-items-center px-6">
      <form
        className="grid w-full max-w-md gap-4"
        onSubmit={(event) => {
          event.preventDefault();
          const form = new FormData(event.currentTarget);
          setPending(true);
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
        <h1 className="text-2xl font-semibold">{t("inviteJoin")}</h1>
        <Field label={t("fullName")}><Input name="fullName" required /></Field>
        <Field label={t("newPassword")}><Input name="password" type="password" required minLength={8} /></Field>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        <Button type="submit" disabled={pending}>{t("signUp")}</Button>
      </form>
    </main>
  );
}
