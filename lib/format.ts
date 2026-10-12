import type { AppLocale } from "@/i18n/routing";

export function formatRupiah(value: number) {
  const formatted = new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
  return formatted.replace("Rp", "Rp ").replace(/\s+/g, " ").trim();
}

export function formatCompact(value: number) {
  const sign = value < 0 ? "-" : "";
  const abs = Math.abs(value);
  const fmt = (amount: number) =>
    amount.toLocaleString("id-ID", { maximumFractionDigits: 1 });

  if (abs >= 1_000_000_000_000) return `${sign}Rp ${fmt(abs / 1_000_000_000_000)} T`;
  if (abs >= 1_000_000_000) return `${sign}Rp ${fmt(abs / 1_000_000_000)} M`;
  if (abs >= 1_000_000) return `${sign}Rp ${fmt(abs / 1_000_000)} jt`;
  if (abs >= 1_000) return `${sign}Rp ${fmt(abs / 1_000)} rb`;
  return formatRupiah(value);
}

export function jakartaParts(date = new Date()) {
  const formatted = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
  const [year, month, day] = formatted.split("-").map(Number);
  return { year: year ?? 1970, month: month ?? 1, day: day ?? 1 };
}

export function jakartaDate(dayOffset: number, hour = 9, minute = 0) {
  const { year, month, day } = jakartaParts(new Date());
  return new Date(Date.UTC(year, month - 1, day + dayOffset, hour - 7, minute, 0)).toISOString();
}

export function jakartaStart(dayOffset = 0) {
  return new Date(jakartaDate(dayOffset, 0)).getTime();
}

export function jakartaMonthKey(iso: string) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
  }).format(new Date(iso));
}

export function formatDate(iso: string | null | undefined, locale: AppLocale) {
  if (!iso) return "—";
  return new Intl.DateTimeFormat(locale === "id" ? "id-ID" : "en-GB", {
    timeZone: "Asia/Jakarta",
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(iso));
}

export function formatDateTime(iso: string | null | undefined, locale: AppLocale) {
  if (!iso) return "—";
  return new Intl.DateTimeFormat(locale === "id" ? "id-ID" : "en-GB", {
    timeZone: "Asia/Jakarta",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

export function formatMonth(monthKey: string, locale: AppLocale) {
  const [year, month] = monthKey.split("-").map(Number);
  if (!year || !month) return monthKey;
  return new Intl.DateTimeFormat(locale === "id" ? "id-ID" : "en-GB", {
    timeZone: "Asia/Jakarta",
    month: "short",
    year: "numeric",
  }).format(new Date(Date.UTC(year, month - 1, 1, 0, 0, 0)));
}

export function inPeriod(iso: string | null, period: "month" | "quarter" | "year", now = new Date()) {
  if (!iso) return false;
  const current = jakartaParts(now);
  const target = jakartaParts(new Date(iso));
  if (target.year !== current.year) return false;
  if (period === "year") return true;
  if (period === "month") return target.month === current.month;
  const currentQuarter = Math.floor((current.month - 1) / 3);
  const targetQuarter = Math.floor((target.month - 1) / 3);
  return currentQuarter === targetQuarter;
}

export function addMonthsKey(offset: number, now = new Date()) {
  const { year, month } = jakartaParts(now);
  const date = new Date(Date.UTC(year, month - 1 + offset, 1));
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}
