import Image from "next/image";
import { cn } from "@/lib/utils";
import logo from "@/public/brand/airtek-logo.png";
import logoOnDark from "@/public/brand/airtek-logo-ondark.png";

/**
 * Airtek wordmark, transparent. `auto` follows the light/dark theme; `onDark` is for surfaces
 * that are always dark (the app sidebar). The on-dark file has white "SOLUSI NUSANTARA" and a
 * lifted gradient so the deep indigo stays visible.
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
  const base = "h-8 w-auto shrink-0 self-start object-contain object-left";
  if (variant === "onDark") {
    return <Image src={logoOnDark} alt="Airtek Solusi Nusantara" priority={priority} className={cn(base, className)} />;
  }
  return (
    <>
      <Image src={logo} alt="Airtek Solusi Nusantara" priority={priority} className={cn(base, "dark:hidden", className)} />
      <Image src={logoOnDark} alt="Airtek Solusi Nusantara" priority={priority} className={cn(base, "hidden dark:block", className)} />
    </>
  );
}
