/** Compare company names without PT/CV/Tbk, dots, or extra spaces. */
export function normalizeCompanyName(name: string) {
  return name
    .toLowerCase()
    .replace(/\b(pt|cv|tbk|persero)\b\.?/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function companyNamesSimilar(left: string, right: string) {
  const a = normalizeCompanyName(left);
  const b = normalizeCompanyName(right);
  if (a.length < 3 || b.length < 3) return false;
  return a === b || a.includes(b) || b.includes(a);
}

export function normalizePhone(value: string | null | undefined) {
  const digits = (value ?? "").replace(/\D/g, "");
  if (digits.startsWith("62")) return digits;
  if (digits.startsWith("0")) return `62${digits.slice(1)}`;
  return digits;
}

export function phonesMatch(left: string | null | undefined, right: string | null | undefined) {
  const a = normalizePhone(left);
  const b = normalizePhone(right);
  return a.length >= 8 && a === b;
}
