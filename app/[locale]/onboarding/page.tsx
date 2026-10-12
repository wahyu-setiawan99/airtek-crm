import { setRequestLocale } from "next-intl/server";
import { redirect as nextRedirect } from "next/navigation";
import { BrandLogo } from "@/components/brand-logo";
import { Link, redirect } from "@/i18n/navigation";
import { getUserId, hasActiveMembership } from "@/lib/session";

export default async function OnboardingPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { locale } = await params;
  const { error } = await searchParams;
  setRequestLocale(locale);
  if (!(await getUserId())) redirect({ href: "/login", locale });
  if (await hasActiveMembership()) redirect({ href: "/dashboard", locale });
  // Provisioning sets cookies, which only a route handler may do.
  if (!error) nextRedirect("/auth/onboarding");

  return (
    <main className="grid min-h-dvh place-items-center px-6">
      <div className="max-w-md text-center">
        <BrandLogo className="mx-auto h-12" />
        <p className="mt-3 text-sm text-muted-foreground">{error}</p>
        <Link href="/login" className="mt-6 inline-flex text-sm text-primary">
          Masuk
        </Link>
        <form action="/auth/sign-out" className="mt-3">
          <button className="text-sm text-muted-foreground" type="submit">
            Keluar
          </button>
        </form>
      </div>
    </main>
  );
}
