"use client";

import type { LegacyColumnDef } from "@tanstack/react-table/legacy";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { reassignDealsAction } from "@/lib/actions/phase9";
import { useRouter } from "@/i18n/navigation";
import { Link } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";
import { formatCompact, formatDate } from "@/lib/format";
import { cn, initials } from "@/lib/utils";
import type { BoardDeal, TagChip } from "@/types/view";
import { DataTable } from "@/components/data-table";
import { FilterBar, filtersFromSearch, matchDeal, useFilterQuery } from "@/components/filters/filter-bar";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/form";

type DealFilters = {
  owners: { id: string; name: string }[];
  tags: TagChip[];
  stageNames: Record<string, string>;
  meId: string;
};

function Summary({ rows }: { rows: BoardDeal[] }) {
  const t = useTranslations("deals");
  return (
    <span>
      {t("summary", {
        count: rows.length,
        value: formatCompact(rows.reduce((sum, deal) => sum + deal.value, 0)),
        weighted: formatCompact(rows.reduce((sum, deal) => sum + (deal.status === "open" ? deal.weighted : 0), 0)),
      })}
    </span>
  );
}

export function DealsTable({ rows, filters, locale, canManage = false }: { rows: BoardDeal[]; filters: DealFilters; locale: AppLocale; canManage?: boolean }) {
  const t = useTranslations("deals");
  const tc = useTranslations("common");
  const params = useSearchParams();
  const applyQuery = useFilterQuery();
  const router = useRouter();
  const values = filtersFromSearch(params);
  const grouped = params.get("group") === "owner";
  const [selected, setSelected] = useState<string[]>([]);
  const [ownerId, setOwnerId] = useState(filters.owners[0]?.id ?? "");

  const filtered = rows.filter((deal) => matchDeal(deal, values, filters.meId));

  const columns = useMemo<LegacyColumnDef<BoardDeal>[]>(
    () => [
      ...(canManage ? [{
        id: "pick",
        header: "",
        cell: ({ row }: { row: { original: BoardDeal } }) => (
          <input
            type="checkbox"
            aria-label={row.original.title}
            checked={selected.includes(row.original.id)}
            onChange={(event) => setSelected((current) => event.target.checked ? [...current, row.original.id] : current.filter((id) => id !== row.original.id))}
          />
        ),
      } satisfies LegacyColumnDef<BoardDeal>] : []),
      { accessorKey: "title", header: tc("name"), cell: ({ row }) => <Link className="font-medium hover:underline" href={`/deals/${row.original.id}`}>{row.original.title}</Link> },
      { accessorKey: "companyName", header: tc("company"), cell: ({ row }) => row.original.companyName ?? "—" },
      { accessorKey: "stageId", header: tc("stage"), cell: ({ row }) => <span className="text-muted-foreground">{filters.stageNames[row.original.stageId] ?? "—"}</span> },
      {
        accessorKey: "status",
        header: tc("status"),
        cell: ({ row }) => (
          <span
            className={cn(
              "rounded-full px-2 py-0.5 text-xs font-medium",
              row.original.status === "won" && "bg-success/15 text-success",
              row.original.status === "lost" && "bg-destructive/15 text-destructive",
              row.original.status === "open" && "bg-primary/10 text-primary",
            )}
          >
            {tc(row.original.status)}
          </span>
        ),
      },
      { accessorKey: "value", header: tc("value"), cell: ({ row }) => <span className="money whitespace-nowrap">{formatCompact(row.original.value)}</span> },
      { accessorKey: "weighted", header: tc("weighted"), cell: ({ row }) => <span className="money whitespace-nowrap">{formatCompact(row.original.weighted)}</span> },
      { accessorKey: "expectedCloseDate", header: t("expectedClose"), cell: ({ row }) => <span className="whitespace-nowrap">{formatDate(row.original.expectedCloseDate, locale)}</span> },
      {
        id: "tags",
        header: tc("tags"),
        cell: ({ row }) => (
          <span className="flex flex-wrap gap-1">
            {row.original.tags.map((tag) => (
              <span key={tag.id} className="rounded-full px-2 py-0.5 text-[11px] font-semibold" style={{ backgroundColor: `${tag.color}26`, color: tag.color }}>
                {tag.name}
              </span>
            ))}
          </span>
        ),
      },
      {
        accessorKey: "ownerName",
        header: t("salesperson"),
        cell: ({ row }) => (
          <span className="inline-flex items-center gap-2 whitespace-nowrap">
            <span className="grid h-6 w-6 place-items-center rounded-full bg-primary/15 text-[10px] font-semibold text-primary">{initials(row.original.ownerName)}</span>
            {row.original.ownerName}
          </span>
        ),
      },
    ],
    [canManage, filters.stageNames, locale, selected, t, tc],
  );

  const groups = grouped
    ? filters.owners
        .map((owner) => ({ owner, rows: filtered.filter((deal) => deal.ownerId === owner.id) }))
        .filter((group) => group.rows.length > 0)
        .sort((a, b) => b.rows.reduce((sum, deal) => sum + deal.value, 0) - a.rows.reduce((sum, deal) => sum + deal.value, 0))
    : [];

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("subtitle")}</p>
        </div>
        <p className="text-sm text-muted-foreground">
          <Summary rows={filtered} />
        </p>
      </div>
      <div className="grid gap-3 rounded-lg border bg-card p-3">
        <FilterBar
          values={values}
          owners={filters.owners}
          tags={filters.tags}
          statuses={(["open", "won", "lost"] as const).map((status) => ({ id: status, name: tc(status) }))}
          extras={["priority", "value", "condition", "close", "created"]}
          onChange={(next) => applyQuery(next, { group: grouped ? "owner" : "" })}
        />
        {canManage ? (
          <div className="flex flex-wrap items-center gap-2">
            <Select aria-label={t("salesperson")} value={ownerId} onChange={(event) => setOwnerId(event.target.value)}>
              {filters.owners.map((owner) => <option key={owner.id} value={owner.id}>{owner.name}</option>)}
            </Select>
            <Button
              size="sm"
              variant="outline"
              disabled={selected.length === 0}
              onClick={() => {
                void reassignDealsAction({ dealIds: selected, ownerId }).then((result) => {
                  if (!result.ok) return toast.error(result.error);
                  setSelected([]);
                  router.refresh();
                });
              }}
            >
              {tc("reassign")} ({selected.length})
            </Button>
          </div>
        ) : null}
        <label className="flex w-fit items-center gap-2 text-sm">
          <input type="checkbox" checked={grouped} onChange={(event) => applyQuery(values, { group: event.target.checked ? "owner" : "" })} />
          {t("groupByOwner")}
        </label>
      </div>
      {filtered.length === 0 ? <p className="text-sm text-muted-foreground">{tc("empty")}</p> : null}
      {filtered.length > 0 && !grouped ? <DataTable columns={columns} data={filtered} /> : null}
      {groups.map((group) => (
        <section key={group.owner.id} className="grid gap-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="inline-flex items-center gap-2 text-sm font-semibold">
              <span className="grid h-7 w-7 place-items-center rounded-full bg-primary/15 text-[11px] font-semibold text-primary">{initials(group.owner.name)}</span>
              {group.owner.name}
            </h2>
            <p className="text-xs text-muted-foreground">
              <Summary rows={group.rows} />
            </p>
          </div>
          <DataTable columns={columns} data={group.rows} />
        </section>
      ))}
    </div>
  );
}
