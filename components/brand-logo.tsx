import Image from "next/image";
import { cn } from "@/lib/utils";
import logo from "@/public/brand/airtek-logo.png";

/**
 * Airtek wordmark. The logo's deep indigo disappears on dark surfaces, so there it sits on a
 * white plate: always for `onDark` (sidebar, login hero), and in dark theme for `auto`.
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
  return (
    <span
      className={cn(
        "inline-flex shrink-0 self-start rounded-lg",
        variant === "onDark" ? "bg-white px-2.5 py-1.5" : "dark:bg-white dark:px-2.5 dark:py-1.5",
      )}
    >
      <Image src={logo} alt="Airtek Solusi Nusantara" priority={priority} className={cn("h-8 w-auto object-contain", className)} />
    </span>
  );
}
