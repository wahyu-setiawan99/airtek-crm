"use client";

import type { LegacyColumnDef } from "@tanstack/react-table/legacy";
import { useTranslations } from "next-intl";
import { useMemo } from "react";
import { Link } from "@/i18n/navigation";
import { formatCompact } from "@/lib/format";
import type { BoardDeal } from "@/types/view";
import { DataTable } from "@/components/data-table";

export function DealsTable({ rows }: { rows: BoardDeal[] }) {
  const t = useTranslations("deals");
  const tc = useTranslations("common");
  const columns = useMemo<LegacyColumnDef<BoardDeal>[]>(() => [
    { accessorKey: "title", header: tc("name"), cell: ({ row }) => <Link className="font-medium hover:underline" href={`/deals/${row.original.id}`}>{row.original.title}</Link> },
    { accessorKey: "companyName", header: tc("company"), cell: ({ row }) => row.original.companyName ?? "—" },
    { accessorKey: "status", header: tc("status"), cell: ({ row }) => tc(row.original.status) },
    { accessorKey: "value", header: tc("value"), cell: ({ row }) => <span className="money">{formatCompact(row.original.value)}</span> },
    { accessorKey: "weighted", header: tc("weighted"), cell: ({ row }) => <span className="money">{formatCompact(row.original.weighted)}</span> },
    { accessorKey: "ownerName", header: tc("owner") },
  ], [tc]);
  return (
    <div className="grid gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("subtitle")}</p>
      </div>
      {rows.length === 0 ? <p className="text-sm text-muted-foreground">{tc("empty")}</p> : <DataTable columns={columns} data={rows} />}
    </div>
  );
}
