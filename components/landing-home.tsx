"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BrandLogo } from "@/components/brand-logo";
import { setLocaleAction } from "@/lib/actions/locale";
import { SIGNED_IN_COOKIE } from "@/lib/constants";
import type { AppLocale } from "@/i18n/locale";

const copy = {
  en: {
    title: "A faster CRM for HVAC, pumps, and lifts",
    body: "Track every project from quotation to closing, with a clear forecast for the whole sales team.",
    signIn: "Sign in",
    open: "Open dashboard",
    language: "Bahasa Indonesia",
  },
  id: {
    title: "CRM yang lebih cepat untuk HVAC, pompa, dan lift",
    body: "Pantau setiap proyek dari penawaran sampai closing, dengan perkiraan yang jelas untuk seluruh tim sales.",
    signIn: "Masuk",
    open: "Buka dashboard",
    language: "English",
  },
} as const;

function readCookie(name: string) {
  const match = document.cookie.split("; ").find((item) => item.startsWith(`${name}=`));
  return match?.slice(name.length + 1) ?? "";
}

export function LandingHome() {
  const [locale, setLocale] = useState<AppLocale>("en");
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    const saved = readCookie("NEXT_LOCALE");
    const next = saved === "id" ? "id" : "en";
    setLocale(next);
    setSignedIn(readCookie(SIGNED_IN_COOKIE) === "1");
    document.documentElement.lang = next;
  }, []);

  const text = copy[locale];

  return (
    <main className="mx-auto grid min-h-dvh max-w-3xl content-center gap-8 px-6 py-16">
      <BrandLogo priority className="h-12" />
      <div>
        <h1 className="text-4xl font-semibold tracking-tight">{text.title}</h1>
        <p className="mt-4 max-w-xl text-base leading-7 text-muted-foreground">{text.body}</p>
      </div>
      <div className="flex items-center gap-4">
        <Link
          href={signedIn ? "/dashboard" : "/login"}
          prefetch
          className="inline-flex h-11 items-center rounded-md bg-primary px-5 text-sm font-medium text-primary-foreground"
        >
          {signedIn ? text.open : text.signIn}
        </Link>
        <button
          type="button"
          className="text-sm text-muted-foreground hover:text-foreground"
          onClick={() => {
            const next: AppLocale = locale === "en" ? "id" : "en";
            setLocale(next);
            document.documentElement.lang = next;
            void setLocaleAction(next);
          }}
        >
          {text.language}
        </button>
      </div>
      <p className="text-xs text-muted-foreground">PT. Airtek Solusi Nusantara</p>
    </main>
  );
}
