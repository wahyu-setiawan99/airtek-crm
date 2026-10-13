"use client";

import {
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useLegacyTable,
  type LegacyColumnDef,
} from "@tanstack/react-table/legacy";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";

export function DataTable<T extends Record<string, unknown>>({ columns, data }: { columns: LegacyColumnDef<T>[]; data: T[] }) {
  const t = useTranslations("common");
  const table = useLegacyTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  return (
    <div className="overflow-hidden rounded-lg border bg-card">
      <ul className="divide-y md:hidden">
        {table.getRowModel().rows.map((row) => {
          const cells = row.getVisibleCells();
          const lead = cells.filter((cell) => !cell.column.columnDef.header);
          const [title, ...rest] = cells.filter((cell) => cell.column.columnDef.header);
          return (
            <li key={row.id} className="grid gap-2 p-3">
              <div className="flex items-start gap-3">
                {lead.map((cell) => <span key={cell.id} className="pt-0.5">{renderCell(cell.column.columnDef.cell, cell.getContext())}</span>)}
                {title ? <div className="min-w-0 flex-1 font-medium">{renderCell(title.column.columnDef.cell, title.getContext())}</div> : null}
              </div>
              <dl className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-sm">
                {rest.map((cell) => (
                  <div key={cell.id} className="min-w-0">
                    <dt className="text-xs text-muted-foreground">{renderHeader(cell.column.columnDef.header, cell.getContext())}</dt>
                    <dd className="truncate">{renderCell(cell.column.columnDef.cell, cell.getContext())}</dd>
                  </div>
                ))}
              </dl>
            </li>
          );
        })}
      </ul>
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full min-w-[680px] text-sm">
          <thead className="text-left text-xs text-muted-foreground">
            {table.getHeaderGroups().map((group) => (
              <tr key={group.id}>
                {group.headers.map((header) => (
                  <th key={header.id} className="p-3 font-medium">
                    {header.column.columnDef.header ? (
                      <button className="text-left" onClick={header.column.getToggleSortingHandler()}>
                        {renderHeader(header.column.columnDef.header, header.getContext())}
                      </button>
                    ) : (
                      <span className="sr-only">{t("select")}</span>
                    )}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map((row) => (
              <tr key={row.id} className="border-t">
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id} className="p-3 align-top">
                    {renderCell(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between border-t px-3 py-2 text-xs text-muted-foreground">
        <span>{t("pageOf", { page: table.getState().pagination.pageIndex + 1, total: Math.max(table.getPageCount(), 1) })}</span>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" disabled={!table.getCanPreviousPage()} onClick={() => table.previousPage()}>{t("previous")}</Button>
          <Button size="sm" variant="outline" disabled={!table.getCanNextPage()} onClick={() => table.nextPage()}>{t("next")}</Button>
        </div>
      </div>
    </div>
  );
}

function renderHeader(header: unknown, context: unknown) {
  if (typeof header === "function") return (header as (ctx: unknown) => React.ReactNode)(context);
  return header as React.ReactNode;
}

function renderCell(cell: unknown, context: unknown) {
  if (typeof cell === "function") return (cell as (ctx: unknown) => React.ReactNode)(context);
  return cell as React.ReactNode;
}
