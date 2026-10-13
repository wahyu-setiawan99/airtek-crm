"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Check, Moon, SunMedium } from "lucide-react";
import { useTheme } from "next-themes";
import { BrandLogo } from "@/components/brand-logo";
import { SIGNED_IN_COOKIE } from "@/lib/constants";

const points = [
  "Weighted forecast per stage and per salesperson",
  "Owner, consultant and contractor on every project",
  "Follow-up reminders so no opportunity goes quiet",
];

type PreviewCard = { title: string; company: string; value: string; tag: string; tone: string; owner: string; late?: boolean; active?: boolean };

const columns: { name: string; total: string; weighted: string; cards: PreviewCard[] }[] = [
  {
    name: "Qualify",
    total: "Rp 4,1 M",
    weighted: "Rp 410 jt",
    cards: [
      { title: "Hospital chiller retrofit", company: "Owner · RS Bhakti", value: "Rp 2,6 M", tag: "HVAC", tone: "bg-sky-500/15 text-sky-700 dark:text-sky-300", owner: "RA" },
      { title: "Campus passenger lifts", company: "Contractor · PT Karya", value: "Rp 1,5 M", tag: "Lift", tone: "bg-violet-500/15 text-violet-700 dark:text-violet-300", owner: "DS", late: true },
    ],
  },
  {
    name: "Proposal",
    total: "Rp 6,8 M",
    weighted: "Rp 3,4 M",
    cards: [
      { title: "Mall fire pump system", company: "Consultant · Arcon", value: "Rp 3,9 M", tag: "Pump", tone: "bg-amber-500/15 text-amber-700 dark:text-amber-300", owner: "BW", active: true },
      { title: "Office VRF upgrade", company: "Owner · Graha Tower", value: "Rp 2,9 M", tag: "AC", tone: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300", owner: "RA" },
    ],
  },
  {
    name: "Closing",
    total: "Rp 9,2 M",
    weighted: "Rp 8,3 M",
    cards: [
      { title: "Hotel HVAC package", company: "Contractor · PT Nusa", value: "Rp 5,4 M", tag: "HVAC", tone: "bg-sky-500/15 text-sky-700 dark:text-sky-300", owner: "DS" },
      { title: "Port booster pumps", company: "Owner · Pelabuhan", value: "Rp 3,8 M", tag: "Pump", tone: "bg-amber-500/15 text-amber-700 dark:text-amber-300", owner: "BW" },
    ],
  },
];

function PipelinePreview() {
  return (
    <div aria-hidden className="relative select-none">
      <div className="pointer-events-none absolute -inset-10 rounded-[3rem] bg-[radial-gradient(closest-side,color-mix(in_oklch,var(--color-primary)_26%,transparent),transparent)] blur-2xl" />
      <div className="relative overflow-hidden rounded-2xl border bg-card/90 shadow-2xl shadow-primary/10 backdrop-blur">
        <div className="flex items-center gap-2 border-b px-4 py-3">
          <span className="h-2.5 w-2.5 rounded-full bg-red-400/80" />
          <span className="h-2.5 w-2.5 rounded-full bg-amber-400/80" />
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/80" />
          <span className="ml-3 text-xs font-medium text-muted-foreground">Pipeline · Sales</span>
        </div>
        <div className="grid grid-cols-3 divide-x border-b text-center">
          {[
            ["Pipeline", "Rp 20,1 M"],
            ["Weighted", "Rp 12,1 M"],
            ["Win rate", "64%"],
          ].map(([label, value]) => (
            <div key={label} className="px-2 py-3">
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
              <p className="mt-0.5 text-sm font-semibold tabular-nums sm:text-base">{value}</p>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-3 p-3 sm:grid-cols-3 sm:p-4">
          {columns.map((column, index) => (
            <div key={column.name} className={index === 2 ? "hidden sm:block" : undefined}>
              <div className="mb-2 px-1">
                <div className="flex items-center justify-between text-xs font-medium">
                  <span>{column.name}</span>
                  <span className="rounded bg-muted px-1.5 text-[10px] text-muted-foreground">{column.cards.length}</span>
                </div>
                <p className="mt-0.5 truncate text-[11px] text-muted-foreground tabular-nums">
                  {column.total} · <span className="text-primary">{column.weighted}</span>
                </p>
              </div>
              <div className="grid gap-2">
                {column.cards.map((card) => (
                  <div
                    key={card.title}
                    className={
                      card.active
                        ? "rounded-lg border border-primary/40 bg-background p-2.5 shadow-lg shadow-primary/15 ring-1 ring-primary/30 lg:-rotate-2"
                        : "rounded-lg border bg-background/70 p-2.5"
                    }
                  >
                    <p className="truncate text-xs font-medium">{card.title}</p>
                    <p className="mt-0.5 truncate text-[11px] text-muted-foreground">{card.company}</p>
                    <p className="mt-1.5 text-sm font-semibold tabular-nums">{card.value}</p>
                    <div className="mt-2 flex items-center justify-between">
                      <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${card.tone}`}>{card.tag}</span>
                      <span className="flex items-center gap-1.5">
                        <span className={`h-1.5 w-1.5 rounded-full ${card.late ? "bg-destructive" : "bg-success"}`} />
                        <span className="grid h-5 w-5 place-items-center rounded-full bg-primary/15 text-[9px] font-semibold text-primary">{card.owner}</span>
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function LandingHome() {
  const [signedIn, setSignedIn] = useState(false);
  const { resolvedTheme, setTheme } = useTheme();

  useEffect(() => {
    const match = document.cookie.split("; ").find((item) => item.startsWith(`${SIGNED_IN_COOKIE}=`));
    setSignedIn(match?.slice(SIGNED_IN_COOKIE.length + 1) === "1");
  }, []);

  return (
    <div className="relative min-h-dvh overflow-hidden bg-background">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,var(--color-border)_1px,transparent_1px),linear-gradient(to_bottom,var(--color-border)_1px,transparent_1px)] bg-[size:48px_48px] opacity-40 [mask-image:radial-gradient(ellipse_at_top,black,transparent_70%)]"
      />
      <header className="relative z-10 mx-auto flex max-w-6xl items-center justify-between px-4 py-5 sm:px-6">
        <BrandLogo priority className="h-9 sm:h-10" />
        <button
          type="button"
          aria-label="Switch light or dark theme"
          onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
          className="inline-flex h-9 items-center gap-2 rounded-lg border bg-card px-3 text-xs font-medium text-muted-foreground shadow-sm hover:bg-accent hover:text-foreground"
        >
          <Moon className="h-3.5 w-3.5 dark:hidden" />
          <SunMedium className="hidden h-3.5 w-3.5 dark:block" />
          <span className="dark:hidden">Dark</span>
          <span className="hidden dark:inline">Light</span>
        </button>
      </header>

      <main className="relative z-10 mx-auto grid max-w-6xl items-center gap-12 px-4 pb-16 pt-6 sm:px-6 lg:min-h-[calc(100dvh-10rem)] lg:grid-cols-[1fr_1.15fr] lg:gap-16 lg:pb-24">
        <section>
          <p className="inline-flex items-center gap-2 rounded-full border bg-card/80 px-3 py-1 text-xs font-medium text-muted-foreground">
            <span className="h-1.5 w-1.5 rounded-full bg-primary" />
            HVAC · Pumps · Fire · Lifts
          </p>
          <h1 className="mt-6 text-4xl font-semibold leading-[1.1] tracking-tight text-balance sm:text-5xl lg:text-[3.4rem]">
            Every sales opportunity, in <span className="text-primary">one pipeline.</span>
          </h1>
          <p className="mt-5 max-w-xl text-base leading-7 text-muted-foreground sm:text-lg">
            Follow each prospect from first contact to a closed agreement, with forecasts your team can act on.
          </p>
          <ul className="mt-7 grid gap-2.5">
            {points.map((point) => (
              <li key={point} className="flex items-start gap-2.5 text-sm text-foreground/90">
                <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-primary/15 text-primary">
                  <Check className="h-3 w-3" strokeWidth={3} />
                </span>
                {point}
              </li>
            ))}
          </ul>
          <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-5">
            <Link
              href={signedIn ? "/dashboard" : "/login"}
              prefetch
              className="group inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-primary px-7 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/25 transition hover:bg-primary/90"
            >
              {signedIn ? "Open dashboard" : "Sign in"}
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
            <p className="text-center text-xs text-muted-foreground sm:text-left">Access by invitation from your administrator.</p>
          </div>
        </section>
        <PipelinePreview />
      </main>

      <footer className="relative z-10 mx-auto max-w-6xl border-t px-4 py-6 text-xs text-muted-foreground sm:px-6">
        PT. Airtek Solusi Nusantara
      </footer>
    </div>
  );
}
