import { Check } from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";
import { LandingCta, LandingThemeToggle } from "@/components/landing-actions";
import { PipelinePreview } from "@/components/pipeline-preview";

const points = [
  "Weighted forecast per stage and per salesperson",
  "Owner, consultant and contractor on every project",
  "Follow-up reminders so no opportunity goes quiet",
];

/** Static home page; only the theme button and the sign-in link run on the client. */
export function LandingHome() {
  return (
    <div className="relative min-h-dvh overflow-hidden bg-background">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,var(--color-border)_1px,transparent_1px),linear-gradient(to_bottom,var(--color-border)_1px,transparent_1px)] bg-[size:48px_48px] opacity-40 [mask-image:radial-gradient(ellipse_at_top,black,transparent_70%)]"
      />
      <header className="relative z-10 mx-auto flex max-w-6xl items-center justify-between px-4 py-5 sm:px-6">
        <BrandLogo priority className="h-9 sm:h-10" />
        <LandingThemeToggle />
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
            <LandingCta />
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
