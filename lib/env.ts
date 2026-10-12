/** Supabase mode when the project keys are configured; otherwise the local demo store. */
export const supabaseEnabled = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

export function siteUrl() {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  return "http://localhost:3000";
}

/** The only email allowed to self-register. Empty means nobody can self-register. */
export function bootstrapAdminEmail() {
  return (process.env.BOOTSTRAP_ADMIN_EMAIL ?? "").trim().toLowerCase();
}

export function isBootstrapAdmin(email: string) {
  const bootstrap = bootstrapAdminEmail();
  return bootstrap.length > 0 && email.trim().toLowerCase() === bootstrap;
}
