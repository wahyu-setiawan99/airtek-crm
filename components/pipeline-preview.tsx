/** Static picture of a pipeline for the home and sign-in pages (no data, no client code). */

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

/** `rows` limits the cards per column (the sign-in page shows one to fit short screens). */
export function PipelinePreview({ className, rows = 2 }: { className?: string; rows?: number }) {
  return (
    <div aria-hidden className={`relative select-none ${className ?? ""}`}>
      <div className="pointer-events-none absolute -inset-12 bg-[radial-gradient(closest-side,color-mix(in_oklch,var(--color-primary)_22%,transparent),transparent)]" />
      <div className="relative overflow-hidden rounded-2xl border bg-card shadow-2xl shadow-primary/10">
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
                {column.cards.slice(0, rows).map((card) => (
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
