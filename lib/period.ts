import { inPeriod, jakartaParts } from "@/lib/format";

export type PeriodKey = "month" | "quarter" | "year" | "custom";

/** Reporting period: a preset, or a custom range of Jakarta calendar days (YYYY-MM-DD). */
export type PeriodFilter = { key: PeriodKey; from: string | null; to: string | null };

const DAY = /^\d{4}-\d{2}-\d{2}$/;

/** Reads `?period=&from=&to=`; anything invalid falls back to this month. */
export function parsePeriod(query: { period?: string; from?: string; to?: string }): PeriodFilter {
  if (query.period === "custom" && query.from && query.to && DAY.test(query.from) && DAY.test(query.to)) {
    const [from, to] = query.from <= query.to ? [query.from, query.to] : [query.to, query.from];
    return { key: "custom", from, to };
  }
  if (query.period === "quarter" || query.period === "year") return { key: query.period, from: null, to: null };
  return { key: "month", from: null, to: null };
}

/** URL query for a period, e.g. `period=custom&from=2026-01-01&to=2026-03-31`. */
export function periodQuery(period: PeriodFilter) {
  const params = new URLSearchParams({ period: period.key });
  if (period.key === "custom" && period.from && period.to) {
    params.set("from", period.from);
    params.set("to", period.to);
  }
  return params.toString();
}

function jakartaDay(iso: string) {
  const { year, month, day } = jakartaParts(new Date(iso));
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function inPeriodFilter(iso: string | null, period: PeriodFilter) {
  if (!iso) return false;
  if (period.key !== "custom") return inPeriod(iso, period.key);
  const day = jakartaDay(iso);
  return Boolean(period.from && period.to && day >= period.from && day <= period.to);
}

/** Month keys (YYYY-MM) the period covers, used for monthly sales targets. */
export function periodMonthKeys(period: PeriodFilter, now = new Date()): string[] {
  const { year, month } = jakartaParts(now);
  const key = (y: number, m: number) => `${y}-${String(m).padStart(2, "0")}`;
  if (period.key === "month") return [key(year, month)];
  if (period.key === "year") return Array.from({ length: 12 }, (_, index) => key(year, index + 1));
  if (period.key === "quarter") {
    const start = Math.floor((month - 1) / 3) * 3 + 1;
    return [0, 1, 2].map((offset) => key(year, start + offset));
  }
  if (!period.from || !period.to) return [];
  const keys: string[] = [];
  let [y, m] = period.from.slice(0, 7).split("-").map(Number) as [number, number];
  const last = period.to.slice(0, 7);
  while (key(y, m) <= last && keys.length < 240) {
    keys.push(key(y, m));
    m += 1;
    if (m > 12) {
      m = 1;
      y += 1;
    }
  }
  return keys;
}
