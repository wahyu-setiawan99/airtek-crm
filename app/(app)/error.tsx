"use client";

import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";

export default function AppError({ reset }: { error: Error; reset: () => void }) {
  const t = useTranslations("common");
  return (
    <div className="grid min-h-[40vh] place-items-center text-center">
      <div>
        <h1 className="text-lg font-semibold">{t("error")}</h1>
        <Button className="mt-4" onClick={reset}>
          {t("retry")}
        </Button>
      </div>
    </div>
  );
}
