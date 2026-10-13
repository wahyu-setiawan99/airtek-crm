"use client";

import { useEffect } from "react";

/** Keeps `<html lang>` aligned with the active language after hydration. */
export function HtmlLang({ locale }: { locale: string }) {
  useEffect(() => {
    document.documentElement.lang = locale === "id" ? "id" : "en";
  }, [locale]);
  return null;
}
