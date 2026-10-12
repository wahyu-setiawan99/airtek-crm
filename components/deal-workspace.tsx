"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";
import { addNoteAction, applyLineTotalAction, completeActivityAction, deleteLineAction, markLostAction, markWonAction, restoreDealAction, saveActivityAction, saveLineAction } from "@/lib/actions/crm";
import { Link, useRouter } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";
import { formatCompact, formatDate, formatDateTime, formatRupiah } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { DealDetailData } from "@/types/view";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field, Input, Select, Textarea } from "@/components/ui/form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export function DealWorkspace({ deal, locale }: { deal: DealDetailData; locale: AppLocale }) {
  const t = useTranslations("deals");
  const ta = useTranslations("activities");
  const tc = useTranslations("common");
  const router = useRouter();
  const [lostOpen, setLostOpen] = useState(false);
  const [reason, setReason] = useState(deal.lostReasons[0]?.id ?? "");
  const [activityOpen, setActivityOpen] = useState(false);

  async function run(action: Promise<{ ok: boolean; error?: string }>) {
    const result = await action;
    if (!result.ok) toast.error(result.error ?? tc("error"));
    else router.refresh();
  }

  return (
    <div className="grid gap-5">
      <div>
        <Link href={`/pipelines/${deal.pipelineId}`} className="text-sm text-muted-foreground hover:underline">{tc("back")}</Link>
        <div className="mt-2 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{deal.title}</h1>
            <p className="money mt-1 text-lg font-semibold">{formatRupiah(deal.value)}</p>
            <p className="text-sm text-muted-foreground">{deal.companyName ?? "—"} · {deal.ownerName} · {deal.probability}%</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {deal.canEdit && deal.status !== "won" ? <Button onClick={() => void run(markWonAction(deal.id))}>{tc("won")}</Button> : null}
            {deal.canEdit && deal.status !== "lost" ? <Button variant="outline" onClick={() => setLostOpen(true)}>{tc("lost")}</Button> : null}
            {deal.canEdit && deal.status !== "open" ? <Button variant="outline" onClick={() => void run(restoreDealAction(deal.id))}>{tc("restore")}</Button> : null}
          </div>
        </div>
      </div>
      <ol className="flex gap-1 overflow-x-auto pb-1" aria-label={t("stageBar")}>
        {deal.stages.filter((stage) => stage.type === "open").map((stage) => (
          <li key={stage.id}>
            <span className={cn("inline-flex whitespace-nowrap rounded-md px-3 py-1.5 text-xs", stage.id === deal.stageId ? "bg-primary text-primary-foreground" : "bg-muted")}>
              {stage.name}
            </span>
          </li>
        ))}
      </ol>
      <Tabs defaultValue="info">
        <TabsList>
          <TabsTrigger value="info">{t("info")}</TabsTrigger>
          <TabsTrigger value="products">{t("products")}</TabsTrigger>
          <TabsTrigger value="activity">{t("activity")}</TabsTrigger>
          <TabsTrigger value="notes">{t("notes")}</TabsTrigger>
          <TabsTrigger value="history">{t("history")}</TabsTrigger>
        </TabsList>
        <TabsContent value="info" className="mt-4 grid gap-4 lg:grid-cols-2">
          <article className="rounded-lg border bg-card p-4 text-sm">
            <dl className="grid grid-cols-2 gap-3">
              <div><dt className="text-muted-foreground">{tc("status")}</dt><dd className="font-medium">{tc(deal.status)}</dd></div>
              <div><dt className="text-muted-foreground">{tc("priority")}</dt><dd>{deal.priority}</dd></div>
              <div><dt className="text-muted-foreground">{t("expectedClose")}</dt><dd>{formatDate(deal.expectedCloseDate, locale)}</dd></div>
              <div><dt className="text-muted-foreground">{tc("company")}</dt><dd>{deal.companyName ? <Link className="hover:underline" href={`/companies/${deal.companyId}`}>{deal.companyName}</Link> : "—"}</dd></div>
              <div><dt className="text-muted-foreground">{tc("contact")}</dt><dd>{deal.contactName ? <Link className="hover:underline" href={`/contacts/${deal.contactId}`}>{deal.contactName}</Link> : "—"}</dd></div>
              <div><dt className="text-muted-foreground">{tc("weighted")}</dt><dd className="money">{formatCompact(deal.weighted)}</dd></div>
            </dl>
            <div className="mt-3 flex flex-wrap gap-1">
              {deal.tags.map((tag) => <span key={tag.id} className="rounded-full px-2 py-0.5 text-xs" style={{ backgroundColor: `${tag.color}22`, color: tag.color }}>{tag.name}</span>)}
            </div>
          </article>
          <article className="rounded-lg border bg-card p-4">
            <h2 className="text-sm font-semibold">{tc("contact")}</h2>
            <ul className="mt-3 space-y-3 text-sm">
              {deal.related.map((person) => (
                <li key={person.id}>
                  <Link href={`/contacts/${person.id}`} className="font-medium hover:underline">{person.name}</Link>
                  <p className="text-muted-foreground">{person.role}</p>
                  <div className="mt-1 flex gap-3 text-primary">
                    {person.phone ? <a href={`tel:${person.phone}`}>{person.phone}</a> : null}
                    {person.email ? <a href={`mailto:${person.email}`}>{person.email}</a> : null}
                    {person.whatsapp ? <a href={`https://wa.me/${person.whatsapp}`} target="_blank" rel="noreferrer">WhatsApp</a> : null}
                  </div>
                </li>
              ))}
            </ul>
          </article>
        </TabsContent>
        <TabsContent value="products" className="mt-4 rounded-lg border bg-card p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">{t("lineItems")}</h2>
            <p className="money text-sm">{t("lineTotal")} {formatRupiah(deal.lineTotal)}</p>
          </div>
          {deal.lines.length === 0 ? <p className="mt-3 text-sm text-muted-foreground">{t("noProducts")}</p> : (
            <table className="mt-3 w-full text-sm">
              <tbody>
                {deal.lines.map((line) => (
                  <tr key={line.id} className="border-t">
                    <td className="py-2">{line.name}</td>
                    <td>{line.qty}</td>
                    <td className="money">{formatRupiah(line.subtotal)}</td>
                    {deal.canEdit ? <td><button className="text-xs text-destructive" onClick={() => void run(deleteLineAction(line.id))}>{tc("delete")}</button></td> : null}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {deal.canEdit && deal.lines.length > 0 ? <Button className="mt-3" size="sm" variant="outline" onClick={() => void run(applyLineTotalAction(deal.id))}>{t("applyValue")}</Button> : null}
          {deal.canEdit ? (
            <form
              className="mt-4 grid gap-2 sm:grid-cols-4"
              onSubmit={(event) => {
                event.preventDefault();
                const form = new FormData(event.currentTarget);
                void run(saveLineAction({
                  dealId: deal.id,
                  productId: String(form.get("productId")),
                  qty: Number(form.get("qty") ?? 1),
                  unitPrice: Number(form.get("unitPrice") ?? 0),
                  discountPct: Number(form.get("discount") ?? 0),
                }));
                event.currentTarget.reset();
              }}
            >
              <Select name="productId" required defaultValue={deal.catalog[0]?.id}>
                {deal.catalog.map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}
              </Select>
              <Input name="qty" type="number" min={1} defaultValue={1} aria-label={t("qty")} />
              <Input name="unitPrice" type="number" min={0} defaultValue={deal.catalog[0]?.unitPrice ?? 0} aria-label={tc("value")} />
              <Button type="submit" size="sm">{t("addProduct")}</Button>
            </form>
          ) : null}
        </TabsContent>
        <TabsContent value="activity" className="mt-4 space-y-3">
          {deal.canEdit ? <Button size="sm" onClick={() => setActivityOpen(true)}>{ta("new")}</Button> : null}
          {deal.activities.map((activity) => (
            <article key={activity.id} className="rounded-lg border bg-card p-3 text-sm">
              <div className="flex items-center justify-between gap-2">
                <p className="font-medium">{activity.subject}</p>
                <span className="text-xs text-muted-foreground">{formatDateTime(activity.dueAt, locale)}</span>
              </div>
              <p className="text-xs text-muted-foreground">{ta(activity.type)}</p>
              {activity.note ? <p className="mt-2 whitespace-pre-wrap">{activity.note}</p> : null}
              {deal.canEdit && !activity.doneAt ? (
                <Button className="mt-2" size="sm" variant="outline" onClick={() => void run(completeActivityAction(activity.id, ""))}>{ta("markDone")}</Button>
              ) : null}
            </article>
          ))}
        </TabsContent>
        <TabsContent value="notes" className="mt-4 space-y-3">
          {deal.canEdit ? (
            <form
              className="grid gap-2"
              onSubmit={(event) => {
                event.preventDefault();
                const body = String(new FormData(event.currentTarget).get("body") ?? "");
                void run(addNoteAction({ body, dealId: deal.id, contactId: null, companyId: null }));
                event.currentTarget.reset();
              }}
            >
              <Textarea name="body" required placeholder={t("notePlaceholder")} />
              <Button type="submit" size="sm" className="w-fit">{t("addNote")}</Button>
            </form>
          ) : null}
          {deal.notes.length === 0 ? <p className="text-sm text-muted-foreground">{t("noNotes")}</p> : null}
          {deal.notes.map((note) => (
            <article key={note.id} className="rounded-lg border bg-card p-3 text-sm">
              <p className="whitespace-pre-wrap">{note.body}</p>
              <p className="mt-2 text-xs text-muted-foreground">{note.author} · {formatDateTime(note.createdAt, locale)}</p>
            </article>
          ))}
        </TabsContent>
        <TabsContent value="history" className="mt-4 space-y-2">
          {deal.history.length === 0 ? <p className="text-sm text-muted-foreground">{t("noHistory")}</p> : null}
          {deal.history.map((item) => (
            <p key={item.id} className="text-sm">
              {item.from ? `${item.from} → ${item.to}` : item.to} · {item.by} · {formatDateTime(item.at, locale)}
            </p>
          ))}
        </TabsContent>
      </Tabs>
      <Dialog open={lostOpen} onOpenChange={setLostOpen} title={tc("lost")}>
        <Field label={tc("status")}>
          <Select value={reason} onChange={(event) => setReason(event.target.value)}>
            {deal.lostReasons.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </Select>
        </Field>
        <Button className="mt-4" variant="destructive" onClick={() => void run(markLostAction(deal.id, reason)).then(() => setLostOpen(false))}>{tc("save")}</Button>
      </Dialog>
      <Dialog open={activityOpen} onOpenChange={setActivityOpen} title={ta("new")}>
        <form
          className="grid gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            const form = new FormData(event.currentTarget);
            void run(saveActivityAction({
              id: null,
              type: String(form.get("type")),
              subject: String(form.get("subject")),
              note: String(form.get("note") ?? "") || null,
              dueAt: new Date(String(form.get("dueAt"))).toISOString(),
              assignedTo: deal.ownerId,
              dealId: deal.id,
              contactId: deal.contactId,
              companyId: deal.companyId,
            })).then(() => setActivityOpen(false));
          }}
        >
          <Field label={ta("type")}>
            <Select name="type" defaultValue="call">
              {(["call", "meeting", "email", "task", "visit", "whatsapp"] as const).map((type) => <option key={type} value={type}>{ta(type)}</option>)}
            </Select>
          </Field>
          <Field label={ta("subject")}><Input name="subject" required /></Field>
          <Field label={ta("due")}><Input name="dueAt" type="datetime-local" required /></Field>
          <Field label={ta("result")}><Textarea name="note" /></Field>
          <Button type="submit">{tc("save")}</Button>
        </form>
      </Dialog>
    </div>
  );
}
