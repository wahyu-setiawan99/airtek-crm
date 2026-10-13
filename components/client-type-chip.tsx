import { cn } from "@/lib/utils";
import type { ClientType } from "@/lib/client-type";

const tone: Record<ClientType, string> = {
  konsultan: "bg-violet-500/15 text-violet-800 dark:text-violet-200",
  kontraktor: "bg-sky-500/15 text-sky-900 dark:text-sky-200",
  owner: "bg-amber-500/15 text-amber-900 dark:text-amber-200",
};

export function ClientTypeChip({ type, label }: { type: ClientType; label: string }) {
  return <span className={cn("inline-flex rounded-full px-2 py-0.5 text-xs font-medium", tone[type])}>{label}</span>;
}
