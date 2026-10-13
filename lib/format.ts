import type { AppLocale } from "@/i18n/locale";

// Building an Intl formatter is slow (tens of µs, more with a time zone); lists format
// thousands of values, so each formatter is created once and reused.
const formatters = new Map<string, Intl.DateTimeFormat | Intl.NumberFormat>();

function dateFormat(locale: string, options: Intl.DateTimeFormatOptions) {
  const key = `d|${locale}|${JSON.stringify(options)}`;
  let formatter = formatters.get(key) as Intl.DateTimeFormat | undefined;
  if (!formatter) {
    formatter = new Intl.DateTimeFormat(locale, options);
    formatters.set(key, formatter);
  }
  return formatter;
}

function numberFormat(locale: string, options: Intl.NumberFormatOptions) {
  const key = `n|${locale}|${JSON.stringify(options)}`;
  let formatter = formatters.get(key) as Intl.NumberFormat | undefined;
  if (!formatter) {
    formatter = new Intl.NumberFormat(locale, options);
    formatters.set(key, formatter);
  }
  return formatter;
}

/** Asia/Jakarta is UTC+7 all year (no daylight saving). */
const JAKARTA_OFFSET_MS = 7 * 60 * 60 * 1000;

export function formatRupiah(value: number) {
  const formatted = numberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
  return formatted.replace("Rp", "Rp ").replace(/\s+/g, " ").trim();
}

export function formatCompact(value: number) {
  const sign = value < 0 ? "-" : "";
  const abs = Math.abs(value);
  const fmt = (amount: number) => numberFormat("id-ID", { maximumFractionDigits: 1 }).format(amount);

  const rp = `${sign}Rp\u00A0`;
  if (abs >= 1_000_000_000_000) return `${rp}${fmt(abs / 1_000_000_000_000)}\u00A0T`;
  if (abs >= 1_000_000_000) return `${rp}${fmt(abs / 1_000_000_000)}\u00A0M`;
  if (abs >= 1_000_000) return `${rp}${fmt(abs / 1_000_000)}\u00A0jt`;
  if (abs >= 1_000) return `${rp}${fmt(abs / 1_000)}\u00A0rb`;
  return formatRupiah(value);
}

export function jakartaParts(date = new Date()) {
  const shifted = new Date(date.getTime() + JAKARTA_OFFSET_MS);
  if (Number.isNaN(shifted.getTime())) return { year: 1970, month: 1, day: 1 };
  return { year: shifted.getUTCFullYear(), month: shifted.getUTCMonth() + 1, day: shifted.getUTCDate() };
}

export function jakartaDate(dayOffset: number, hour = 9, minute = 0) {
  const { year, month, day } = jakartaParts(new Date());
  return new Date(Date.UTC(year, month - 1, day + dayOffset, hour - 7, minute, 0)).toISOString();
}

export function jakartaStart(dayOffset = 0) {
  return new Date(jakartaDate(dayOffset, 0)).getTime();
}

export function jakartaMonthKey(iso: string) {
  const { year, month } = jakartaParts(new Date(iso));
  return `${year}-${String(month).padStart(2, "0")}`;
}

export function formatDate(iso: string | null | undefined, locale: AppLocale) {
  if (!iso) return "—";
  return dateFormat(locale === "id" ? "id-ID" : "en-GB", {
    timeZone: "Asia/Jakarta",
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(iso));
}

export function formatDateTime(iso: string | null | undefined, locale: AppLocale) {
  if (!iso) return "—";
  return dateFormat(locale === "id" ? "id-ID" : "en-GB", {
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
  return dateFormat(locale === "id" ? "id-ID" : "en-GB", {
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

export function formatTime(iso: string, locale: AppLocale) {
  return dateFormat(locale === "id" ? "id-ID" : "en-GB", {
    timeZone: "Asia/Jakarta",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

/** Whole days from today (Jakarta) to the given date; negative when past. */
export function daysUntil(iso: string, now = new Date()) {
  const target = jakartaParts(new Date(iso));
  const today = jakartaParts(now);
  const a = Date.UTC(target.year, target.month - 1, target.day);
  const b = Date.UTC(today.year, today.month - 1, today.day);
  return Math.round((a - b) / 86_400_000);
}
