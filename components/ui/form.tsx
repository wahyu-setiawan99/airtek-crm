import * as React from "react";
import { cn } from "@/lib/utils";

export function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <label className="grid gap-1.5 text-sm">
      <span className="font-medium">{label}</span>
      {children}
      {hint ? <span className="text-xs text-muted-foreground">{hint}</span> : null}
    </label>
  );
}

const control =
  "h-10 w-full rounded-md border bg-card px-3 text-base text-foreground shadow-sm placeholder:text-muted-foreground md:text-sm";

export function Input(props: React.ComponentProps<"input">) {
  return <input {...props} className={cn(control, props.className)} />;
}

export function Textarea(props: React.ComponentProps<"textarea">) {
  return <textarea {...props} className={cn(control, "h-auto min-h-24 py-2", props.className)} />;
}

export function Select(props: React.ComponentProps<"select">) {
  return <select {...props} className={cn(control, props.className)} />;
}
