"use client";

import { useState } from "react";
import { Input } from "@/components/ui/form";
import { cn } from "@/lib/utils";

/** Groups digits the Indonesian way: 850000000 → "850.000.000" (same as formatRupiah). */
export function groupDigits(digits: string) {
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

/**
 * Rupiah amount field: shows "Rp 850.000.000" while typing, strips leading zeros and
 * non-digits, and submits the plain number through a hidden input named `name`.
 */
export function CurrencyInput({
  name,
  defaultValue,
  required,
  className,
  placeholder = "0",
  ...rest
}: {
  name: string;
  defaultValue?: number | null;
  required?: boolean;
  className?: string;
  placeholder?: string;
  "aria-label"?: string;
  id?: string;
}) {
  const [digits, setDigits] = useState(defaultValue ? String(Math.round(defaultValue)) : "");
  return (
    <div className="relative">
      <span aria-hidden className="pointer-events-none absolute inset-y-0 left-3 grid place-items-center text-sm text-muted-foreground">Rp</span>
      <Input
        {...rest}
        inputMode="numeric"
        autoComplete="off"
        required={required}
        placeholder={placeholder}
        value={groupDigits(digits)}
        onChange={(event) => setDigits(event.target.value.replace(/\D/g, "").replace(/^0+(?=\d)/, "").slice(0, 15))}
        className={cn("pl-10 tabular-nums", className)}
      />
      <input type="hidden" name={name} value={digits || "0"} />
    </div>
  );
}
