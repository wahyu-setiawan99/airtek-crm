"use client";

import type { LegacyColumnDef } from "@tanstack/react-table/legacy";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { deleteCompanyAction, deleteContactAction, deleteProductAction, importContactsAction, saveActivityAction, saveCompanyAction, saveContactAction, saveProductAction, completeActivityAction } from "@/lib/actions/crm";
import { downloadCsv, parseCsv } from "@/lib/csv";
import { Link, useRouter } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";
import { formatDateTime, formatRupiah } from "@/lib/format";
import type { ActivityRow, CompanyRow, ContactRow, Option } from "@/types/view";
import type { Product } from "@/types/crm";
import { DataTable } from "@/components/data-table";
import { FilterBar, filtersFromSearch, useFilterQuery } from "@/components/filters/filter-bar";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field, Input, Select, Textarea } from "@/components/ui/form";

export function ContactsScreen({
  rows,
  companies,
  owners,
  canCreate,
  openNew,
}: {
  rows: ContactRow[];
  companies: Option[];
  owners: Option[];
  canCreate: boolean;
  openNew: boolean;
}) {
  const t = useTranslations("contacts");
  const tc = useTranslations("common");
  const router = useRouter();
  const [open, setOpen] = useState(openNew);
  const [editing, setEditing] = useState<ContactRow | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [preview, setPreview] = useState<{ firstName: string; lastName: string; email: string; phone: string; company: string; jobTitle: string; duplicate: boolean }[]>([]);
  const params = useSearchParams();
  const apply = useFilterQuery();
  const values = filtersFromSearch(params);
  const visible = rows.filter((row) => {
    const q = values.q?.trim().toLowerCase();
    if (q && !`${row.name} ${row.email ?? ""} ${row.phone ?? ""} ${row.companyName ?? ""}`.toLowerCase().includes(q)) return false;
    if (values.owner && row.ownerId !== values.owner) return false;
    return true;
  });
  const columns = useMemo<LegacyColumnDef<ContactRow>[]>(() => [
    { accessorKey: "name", header: tc("name"), cell: ({ row }) => <Link className="font-medium hover:underline" href={`/contacts/${row.original.id}`}>{row.original.name}</Link> },
    { accessorKey: "companyName", header: tc("company"), cell: ({ row }) => row.original.companyName ?? "—" },
    { accessorKey: "jobTitle", header: t("jobTitle") },
    { accessorKey: "email", header: tc("email") },
    { accessorKey: "phone", header: tc("phone"), cell: ({ row }) => row.original.phone ? <a className="text-primary" href={`tel:${row.original.phone}`}>{row.original.phone}</a> : "—" },
    { accessorKey: "ownerName", header: tc("owner") },
    {
      id: "actions",
      header: tc("actions"),
      cell: ({ row }) => row.original.canEdit ? <button className="text-primary" onClick={() => { setEditing(row.original); setOpen(true); }}>{tc("edit")}</button> : null,
    },
  ], [t, tc]);

  return (
    <Screen title={t("title")} subtitle={t("subtitle")} actions={
      <>
        <Button variant="outline" onClick={() => downloadCsv("kontak.csv", [["name", "email", "phone", "company"], ...rows.map((row) => [row.name, row.email ?? "", row.phone ?? "", row.companyName ?? ""])])}>{tc("export")}</Button>
        {canCreate ? <Button variant="outline" onClick={() => setImportOpen(true)}>{tc("import")}</Button> : null}
        {canCreate ? <Button onClick={() => { setEditing(null); setOpen(true); }}>{t("new")}</Button> : null}
      </>
    }>
      <FilterBar values={values} owners={owners} showMine={false} onChange={apply} />
      {visible.length === 0 ? <p className="text-sm text-muted-foreground">{t("empty")}</p> : <DataTable columns={columns} data={visible} />}
      <PersonDialog
        open={open}
        title={editing ? tc("edit") : t("new")}
        companies={companies}
        owners={owners}
        contact={editing}
        onOpenChange={setOpen}
        onSaved={() => { setOpen(false); router.refresh(); }}
      />
      <Dialog open={importOpen} onOpenChange={setImportOpen} title={tc("import")} description={t("importHint")} wide>
        <Textarea onChange={(event) => {
          const grid = parseCsv(event.target.value);
          const [header, ...body] = grid;
          if (!header) return;
          const index = (name: string) => header.findIndex((cell) => cell.toLowerCase() === name);
          const mapped = body.map((cells) => {
            const email = cells[index("email")] ?? "";
            return {
              firstName: cells[index("first_name")] ?? "",
              lastName: cells[index("last_name")] ?? "",
              email,
              phone: cells[index("phone")] ?? "",
              company: cells[index("company")] ?? "",
              jobTitle: cells[index("job_title")] ?? "",
              duplicate: rows.some((row) => row.email && row.email.toLowerCase() === email.toLowerCase()),
            };
          }).filter((row) => row.firstName);
          setPreview(mapped);
        }} />
        <ul className="mt-3 max-h-40 space-y-1 overflow-auto text-sm">
          {preview.map((row) => <li key={`${row.email}${row.firstName}`}>{row.firstName} {row.lastName} {row.duplicate ? <span className="text-warning">{t("duplicate")}</span> : null}</li>)}
        </ul>
        <Button className="mt-3" disabled={preview.length === 0} onClick={() => {
          void importContactsAction({ rows: preview.filter((row) => !row.duplicate) }).then((result) => {
            if (!result.ok) toast.error(result.error);
            else { setImportOpen(false); router.refresh(); }
          });
        }}>{t("importConfirm", { count: preview.filter((row) => !row.duplicate).length })}</Button>
      </Dialog>
    </Screen>
  );
}

function PersonDialog({ open, onOpenChange, title, companies, owners, contact, onSaved }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  companies: Option[];
  owners: Option[];
  contact: ContactRow | null;
  onSaved: () => void;
}) {
  const t = useTranslations("contacts");
  const tc = useTranslations("common");
  return (
    <Dialog open={open} onOpenChange={onOpenChange} title={title}>
      <form className="grid gap-3" onSubmit={(event) => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        void saveContactAction({
          id: contact?.id ?? null,
          firstName: String(form.get("firstName") ?? ""),
          lastName: String(form.get("lastName") ?? ""),
          companyId: String(form.get("companyId") ?? "") || null,
          jobTitle: String(form.get("jobTitle") ?? "") || null,
          email: String(form.get("email") ?? "") || null,
          phone: String(form.get("phone") ?? "") || null,
          whatsapp: String(form.get("whatsapp") ?? "") || null,
          source: String(form.get("source") ?? "") || null,
          ownerId: String(form.get("ownerId") ?? owners[0]?.id ?? ""),
        }).then((result) => {
          if (!result.ok) toast.error(result.error);
          else onSaved();
        });
      }}>
        <Field label={t("firstName")}><Input name="firstName" required defaultValue={contact?.name.split(" ")[0] ?? ""} /></Field>
        <Field label={t("lastName")}><Input name="lastName" defaultValue={contact?.name.split(" ").slice(1).join(" ") ?? ""} /></Field>
        <Field label={tc("company")}>
          <Select name="companyId" defaultValue={contact?.companyId ?? ""}><option value="">—</option>{companies.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</Select>
        </Field>
        <Field label={t("jobTitle")}><Input name="jobTitle" defaultValue={contact?.jobTitle ?? ""} /></Field>
        <Field label={tc("email")}><Input name="email" type="email" defaultValue={contact?.email ?? ""} /></Field>
        <Field label={tc("phone")}><Input name="phone" defaultValue={contact?.phone ?? ""} /></Field>
        <Field label={t("whatsapp")}><Input name="whatsapp" defaultValue={contact?.whatsapp ?? ""} /></Field>
        <Field label={t("source")}><Input name="source" defaultValue={contact?.source ?? ""} /></Field>
        <Field label={tc("owner")}>
          <Select name="ownerId" defaultValue={contact?.ownerId ?? owners[0]?.id}>{owners.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</Select>
        </Field>
        <div className="flex justify-between">
          {contact?.canEdit ? <Button type="button" variant="destructive" onClick={() => void deleteContactAction(contact.id).then(() => onSaved())}>{tc("delete")}</Button> : <span />}
          <Button type="submit">{tc("save")}</Button>
        </div>
      </form>
    </Dialog>
  );
}

export function CompaniesScreen({ rows, owners, canCreate, openNew }: { rows: CompanyRow[]; owners: Option[]; canCreate: boolean; openNew: boolean }) {
  const t = useTranslations("companies");
  const tc = useTranslations("common");
  const router = useRouter();
  const [open, setOpen] = useState(openNew);
  const [editing, setEditing] = useState<CompanyRow | null>(null);
  const params = useSearchParams();
  const apply = useFilterQuery();
  const values = filtersFromSearch(params);
  const visible = rows.filter((row) => {
    const q = values.q?.trim().toLowerCase();
    if (q && !`${row.name} ${row.city ?? ""} ${row.province ?? ""} ${row.phone ?? ""}`.toLowerCase().includes(q)) return false;
    if (values.owner && row.ownerId !== values.owner) return false;
    if (values.city && !`${row.city ?? ""} ${row.province ?? ""}`.toLowerCase().includes(values.city.toLowerCase())) return false;
    return true;
  });
  const columns = useMemo<LegacyColumnDef<CompanyRow>[]>(() => [
    { accessorKey: "name", header: tc("name"), cell: ({ row }) => <Link className="font-medium hover:underline" href={`/companies/${row.original.id}`}>{row.original.name}</Link> },
    { accessorKey: "industry", header: t("industry") },
    { accessorKey: "city", header: t("city") },
    { accessorKey: "phone", header: tc("phone") },
    { accessorKey: "ownerName", header: tc("owner") },
    { id: "actions", header: tc("actions"), cell: ({ row }) => row.original.canEdit ? <button className="text-primary" onClick={() => { setEditing(row.original); setOpen(true); }}>{tc("edit")}</button> : null },
  ], [t, tc]);
  return (
    <Screen title={t("title")} subtitle={t("subtitle")} actions={
      <>
        <Button variant="outline" onClick={() => downloadCsv("perusahaan.csv", [["name", "city", "phone"], ...rows.map((row) => [row.name, row.city ?? "", row.phone ?? ""])])}>{tc("export")}</Button>
        {canCreate ? <Button onClick={() => { setEditing(null); setOpen(true); }}>{t("new")}</Button> : null}
      </>
    }>
      <FilterBar values={values} owners={owners} extras={["city"]} showMine={false} onChange={apply} />
      {visible.length === 0 ? <p className="text-sm text-muted-foreground">{t("empty")}</p> : <DataTable columns={columns} data={visible} />}
      <Dialog open={open} onOpenChange={setOpen} title={editing ? tc("edit") : t("new")} wide>
        <form className="grid gap-3 sm:grid-cols-2" onSubmit={(event) => {
          event.preventDefault();
          const form = new FormData(event.currentTarget);
          void saveCompanyAction({
            id: editing?.id ?? null,
            name: String(form.get("name") ?? ""),
            industry: String(form.get("industry") ?? "") || null,
            city: String(form.get("city") ?? "") || null,
            province: String(form.get("province") ?? "") || null,
            phone: String(form.get("phone") ?? "") || null,
            email: String(form.get("email") ?? "") || null,
            website: String(form.get("website") ?? "") || null,
            npwp: String(form.get("npwp") ?? "") || null,
            address: String(form.get("address") ?? "") || null,
            ownerId: String(form.get("ownerId") ?? owners[0]?.id ?? ""),
          }).then((result) => {
            if (!result.ok) toast.error(result.error);
            else { setOpen(false); router.refresh(); }
          });
        }}>
          <Field label={tc("name")}><Input name="name" required defaultValue={editing?.name ?? ""} /></Field>
          <Field label={t("industry")}><Input name="industry" defaultValue={editing?.industry ?? ""} /></Field>
          <Field label={t("city")}><Input name="city" defaultValue={editing?.city ?? ""} /></Field>
          <Field label={t("province")}><Input name="province" defaultValue={editing?.province ?? ""} /></Field>
          <Field label={tc("phone")}><Input name="phone" defaultValue={editing?.phone ?? ""} /></Field>
          <Field label={tc("email")}><Input name="email" type="email" defaultValue={editing?.email ?? ""} /></Field>
          <Field label={t("website")}><Input name="website" defaultValue={editing?.website ?? ""} /></Field>
          <Field label={t("npwp")}><Input name="npwp" defaultValue={editing?.npwp ?? ""} /></Field>
          <Field label={t("address")}><Input name="address" defaultValue={editing?.address ?? ""} /></Field>
          <Field label={tc("owner")}>
            <Select name="ownerId" defaultValue={editing?.ownerId}>{owners.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</Select>
          </Field>
          <div className="flex justify-between sm:col-span-2">
            {editing?.canEdit ? <Button type="button" variant="destructive" onClick={() => void deleteCompanyAction(editing.id).then(() => { setOpen(false); router.refresh(); })}>{tc("delete")}</Button> : <span />}
            <Button type="submit">{tc("save")}</Button>
          </div>
        </form>
      </Dialog>
    </Screen>
  );
}

export function ActivitiesScreen({
  rows,
  locale,
  scope,
  canCreate,
  deals,
  owners,
  me,
}: {
  rows: ActivityRow[];
  locale: AppLocale;
  scope: "mine" | "all";
  canCreate: boolean;
  deals: Option[];
  owners: Option[];
  me: string;
}) {
  const t = useTranslations("activities");
  const tc = useTranslations("common");
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const params = useSearchParams();
  const apply = useFilterQuery();
  const values = filtersFromSearch(params);
  const visibleRows = rows.filter((row) => {
    const q = values.q?.trim().toLowerCase();
    if (q && !`${row.subject} ${row.dealTitle ?? ""} ${row.assigneeName}`.toLowerCase().includes(q)) return false;
    if (values.owner && row.assigneeId !== values.owner) return false;
    if (values.condition === "overdue" && row.bucket !== "overdue") return false;
    return true;
  });
  const groups = [
    ["overdue", visibleRows.filter((row) => row.bucket === "overdue")],
    ["today", visibleRows.filter((row) => row.bucket === "today")],
    ["upcoming", visibleRows.filter((row) => row.bucket === "upcoming")],
  ] as const;
  return (
    <Screen title={t("title")} subtitle={t("subtitle")} actions={
      <>
        <Button size="sm" variant={scope === "mine" ? "default" : "outline"} onClick={() => router.push("/activities?scope=mine")}>{t("mine")}</Button>
        <Button size="sm" variant={scope === "all" ? "default" : "outline"} onClick={() => router.push("/activities?scope=all")}>{t("team")}</Button>
        {canCreate ? <Button onClick={() => setOpen(true)}>{t("new")}</Button> : null}
      </>
    }>
      <FilterBar values={values} owners={owners} extras={["condition"]} showMine={false} onChange={(next) => apply(next, { scope })} />
      <div className="grid gap-4 lg:grid-cols-3">
        {groups.map(([key, items]) => (
          <section key={key} className="rounded-lg border bg-card p-3">
            <h2 className="text-sm font-semibold">{t(key)}</h2>
            <div className="mt-3 space-y-2">
              {items.length === 0 ? <p className="text-sm text-muted-foreground">{t("empty")}</p> : null}
              {items.map((item) => (
                <article key={item.id} className="rounded-md border p-3 text-sm">
                  <p className="font-medium">{item.subject}</p>
                  <p className="text-xs text-muted-foreground">{t(item.type)} · {formatDateTime(item.dueAt, locale)}</p>
                  {item.dealTitle ? <Link href={`/deals/${item.dealId}`} className="text-xs text-primary">{item.dealTitle}</Link> : null}
                  <div className="mt-2">
                    <Button size="sm" variant="outline" onClick={() => void completeActivityAction(item.id, "").then((result) => { if (!result.ok) toast.error(result.error); else router.refresh(); })}>{t("markDone")}</Button>
                  </div>
                </article>
              ))}
            </div>
          </section>
        ))}
      </div>
      <Dialog open={open} onOpenChange={setOpen} title={t("new")}>
        <form className="grid gap-3" onSubmit={(event) => {
          event.preventDefault();
          const form = new FormData(event.currentTarget);
          void saveActivityAction({
            id: null,
            type: String(form.get("type")),
            subject: String(form.get("subject")),
            note: null,
            dueAt: new Date(String(form.get("dueAt"))).toISOString(),
            assignedTo: String(form.get("assignedTo") ?? me),
            dealId: String(form.get("dealId") ?? "") || null,
            contactId: null,
            companyId: null,
          }).then((result) => {
            if (!result.ok) toast.error(result.error);
            else { setOpen(false); router.refresh(); }
          });
        }}>
          <Field label={t("type")}>
            <Select name="type" defaultValue="task">{(["call", "meeting", "email", "task", "visit", "whatsapp"] as const).map((type) => <option key={type} value={type}>{t(type)}</option>)}</Select>
          </Field>
          <Field label={t("subject")}><Input name="subject" required /></Field>
          <Field label={t("due")}><Input name="dueAt" type="datetime-local" required /></Field>
          <Field label={t("assignee")}>
            <Select name="assignedTo" defaultValue={me}>{owners.map((owner) => <option key={owner.id} value={owner.id}>{owner.name}</option>)}</Select>
          </Field>
          <Field label={tc("pipeline")}>
            <Select name="dealId" defaultValue=""><option value="">—</option>{deals.map((deal) => <option key={deal.id} value={deal.id}>{deal.name}</option>)}</Select>
          </Field>
          <Button type="submit">{tc("save")}</Button>
        </form>
      </Dialog>
    </Screen>
  );
}

export function ProductsScreen({ products, tags, canCreate }: { products: Product[]; tags: { id: string; name: string; color: string }[]; canCreate: boolean }) {
  const t = useTranslations("products");
  const tc = useTranslations("common");
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const params = useSearchParams();
  const apply = useFilterQuery();
  const values = filtersFromSearch(params);
  const visible = products.filter((product) => {
    const q = values.q?.trim().toLowerCase();
    if (q && !`${product.name} ${product.sku ?? ""}`.toLowerCase().includes(q)) return false;
    if (values.tag && product.tag_id !== values.tag) return false;
    return true;
  });
  return (
    <Screen title={t("title")} subtitle={t("subtitle")} actions={canCreate ? <Button onClick={() => { setEditing(null); setOpen(true); }}>{t("new")}</Button> : null}>
      <FilterBar values={values} tags={tags} showMine={false} onChange={apply} />
      {visible.length === 0 ? <p className="text-sm text-muted-foreground">{t("empty")}</p> : (
        <div className="overflow-x-auto rounded-lg border bg-card">
          <table className="w-full text-sm">
            <thead className="text-left text-xs text-muted-foreground"><tr><th className="p-3">{tc("name")}</th><th className="p-3">{t("sku")}</th><th className="p-3">{t("category")}</th><th className="p-3">{t("unitPrice")}</th><th /></tr></thead>
            <tbody>
              {visible.map((product) => (
                <tr key={product.id} className="border-t">
                  <td className="p-3 font-medium">{product.name}</td>
                  <td className="p-3">{product.sku}</td>
                  <td className="p-3">{tags.find((tag) => tag.id === product.tag_id)?.name ?? "—"}</td>
                  <td className="money p-3">{formatRupiah(product.unit_price)}</td>
                  <td className="p-3">
                    {canCreate ? <button className="text-primary" onClick={() => { setEditing(product); setOpen(true); }}>{tc("edit")}</button> : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Dialog open={open} onOpenChange={setOpen} title={editing ? tc("edit") : t("new")}>
        <form className="grid gap-3" onSubmit={(event) => {
          event.preventDefault();
          const form = new FormData(event.currentTarget);
          void saveProductAction({
            id: editing?.id ?? null,
            name: String(form.get("name") ?? ""),
            sku: String(form.get("sku") ?? "") || null,
            unit: String(form.get("unit") ?? "unit"),
            unitPrice: Number(form.get("unitPrice") ?? 0),
            tagId: String(form.get("tagId") ?? ""),
          }).then((result) => {
            if (!result.ok) toast.error(result.error);
            else { setOpen(false); router.refresh(); }
          });
        }}>
          <Field label={tc("name")}><Input name="name" required defaultValue={editing?.name ?? ""} /></Field>
          <Field label={t("sku")}><Input name="sku" defaultValue={editing?.sku ?? ""} /></Field>
          <Field label={t("unit")}><Input name="unit" required defaultValue={editing?.unit ?? "unit"} /></Field>
          <Field label={t("unitPrice")}><Input name="unitPrice" type="number" min={0} required defaultValue={editing?.unit_price ?? 0} /></Field>
          <Field label={t("category")}>
            <Select name="tagId" required defaultValue={editing?.tag_id ?? tags[0]?.id}>
              {tags.map((tag) => <option key={tag.id} value={tag.id}>{tag.name}</option>)}
            </Select>
          </Field>
          <div className="flex justify-between">
            {editing ? <Button type="button" variant="destructive" onClick={() => void deleteProductAction(editing.id).then(() => { setOpen(false); router.refresh(); })}>{tc("delete")}</Button> : <span />}
            <Button type="submit">{tc("save")}</Button>
          </div>
        </form>
      </Dialog>
    </Screen>
  );
}

function Screen({ title, subtitle, actions, children }: { title: string; subtitle: string; actions?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="grid gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
        </div>
        <div className="flex flex-wrap gap-2">{actions}</div>
      </div>
      {children}
    </div>
  );
}
