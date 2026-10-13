"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { ThemeMenu } from "@/components/theme-menu";
import { SIGNED_IN_COOKIE } from "@/lib/constants";

/** Sign in, or Open dashboard when the browser still has the signed-in marker cookie. */
export function LandingCta() {
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    const match = document.cookie.split("; ").find((item) => item.startsWith(`${SIGNED_IN_COOKIE}=`));
    setSignedIn(match?.slice(SIGNED_IN_COOKIE.length + 1) === "1");
  }, []);

  return (
    <Link
      href={signedIn ? "/dashboard" : "/login"}
      prefetch
      className="group inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-primary px-7 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/25 transition hover:bg-primary/90"
    >
      {signedIn ? "Open dashboard" : "Sign in"}
      <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
    </Link>
  );
}

export function LandingThemeToggle() {
  return <ThemeMenu variant="pill" labels={{ theme: "Theme", light: "Light", dark: "Dark", system: "System" }} />;
}
