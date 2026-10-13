import Image from "next/image";
import { cn } from "@/lib/utils";
import logo from "@/public/brand/airtek-logo.png";
import logoOnDark from "@/public/brand/airtek-logo-ondark.png";

/**
 * Airtek wordmark, transparent. `auto` follows the light/dark theme; `onDark` is for surfaces
 * that stay dark in both themes. The on-dark file has white "SOLUSI NUSANTARA" and a
 * lifted gradient so the deep indigo stays visible.
 *
 * Both theme variants are rendered and one is hidden by CSS, so `priority` loads them eagerly
 * instead of preloading (a preload of the hidden one is wasted and flagged by Lighthouse).
 */
export function BrandLogo({
  variant = "auto",
  className,
  priority,
}: {
  variant?: "auto" | "onDark";
  className?: string;
  priority?: boolean;
}) {
  const base = "h-8 w-auto shrink-0 object-contain object-left";
  const props = { sizes: "240px", loading: priority ? ("eager" as const) : undefined };
  if (variant === "onDark") {
    return <Image src={logoOnDark} alt="Airtek Solusi Nusantara" {...props} className={cn(base, className)} />;
  }
  return (
    <>
      <Image src={logo} alt="Airtek Solusi Nusantara" {...props} className={cn(base, "dark:hidden", className)} />
      <Image src={logoOnDark} alt="Airtek Solusi Nusantara" {...props} className={cn(base, "hidden dark:block", className)} />
    </>
  );
}
