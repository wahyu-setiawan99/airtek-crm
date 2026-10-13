import { getTranslations } from "next-intl/server";
import Link from "next/link";

export default async function NotFound() {
  const t = await getTranslations("common");
  return (
    <main className="grid min-h-dvh place-items-center px-6">
      <div className="max-w-md text-center">
        <p className="text-sm font-medium text-primary">404</p>
        <h1 className="mt-2 text-2xl font-semibold">{t("notFoundTitle")}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{t("notFoundBody")}</p>
        <Link href="/dashboard" className="mt-6 inline-flex h-9 items-center rounded-md bg-primary px-3 text-sm text-primary-foreground">
          {t("goDashboard")}
        </Link>
      </div>
    </main>
  );
}
