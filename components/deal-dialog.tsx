"use client";

import { Check } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";
import { saveDealAction } from "@/lib/actions/crm";
import type { BoardDeal, PipelineData } from "@/types/view";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field, Input, Select } from "@/components/ui/form";
import { MoneyInput } from "@/components/ui/money-input";

export function DealDialog({
  open,
  onOpenChange,
  data,
  deal,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: PipelineData;
  deal: BoardDeal | null;
}) {
  const t = useTranslations("deals");
  const tp = useTranslations("pipeline");
  const tc = useTranslations("common");
  const [pipelineId, setPipelineId] = useState(deal?.stageId ? data.pipeline.id : data.pipeline.id);
  const stages = data.stages;
  const [pending, setPending] = useState(false);

  async function onSubmit(formData: FormData) {
    setPending(true);
    const tagIds = formData.getAll("tagIds").map(String);
    const result = await saveDealAction({
      id: deal?.id ?? null,
      title: String(formData.get("title") ?? ""),
      pipelineId,
      stageId: String(formData.get("stageId") ?? stages[0]?.id ?? ""),
      value: Number(formData.get("value") ?? 0),
      companyId: String(formData.get("companyId") ?? "") || null,
      contactId: String(formData.get("contactId") ?? "") || null,
      ownerId: String(formData.get("ownerId") ?? data.me.id),
      priority: Number(formData.get("priority") ?? 0),
      expectedCloseDate: String(formData.get("expectedCloseDate") ?? "") || null,
      tagIds,
    });
    setPending(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange} title={deal ? tc("edit") : tp("addDeal")} wide>
      <form action={onSubmit} className="grid gap-3 sm:grid-cols-2">
        <Field label={tc("name")}>
          <Input name="title" required defaultValue={deal?.title ?? ""} />
        </Field>
        <Field label={t("estimatedValue")}>
          <MoneyInput name="value" required defaultValue={deal?.value ?? null} />
        </Field>
        <Field label={tc("stage")}>
          <Select name="stageId" defaultValue={deal?.stageId ?? stages.find((stage) => stage.type === "open")?.id}>
            {stages.map((stage) => <option key={stage.id} value={stage.id}>{stage.name}</option>)}
          </Select>
        </Field>
        <Field label={t("picSales")}>
          <Select name="ownerId" defaultValue={deal?.ownerId ?? data.me.id} disabled={!data.me.canManage && Boolean(deal)}>
            {data.owners.map((owner) => <option key={owner.id} value={owner.id}>{owner.name}</option>)}
          </Select>
        </Field>
        <Field label={tc("company")}>
          <Select name="companyId" defaultValue={deal?.companyId ?? ""}>
            <option value="">—</option>
            {data.companies.map((company) => <option key={company.id} value={company.id}>{company.name}</option>)}
          </Select>
        </Field>
        <Field label={tc("contact")}>
          <Select name="contactId" defaultValue={deal?.contactId ?? ""}>
            <option value="">—</option>
            {data.contacts.map((contact) => <option key={contact.id} value={contact.id}>{contact.name}</option>)}
          </Select>
        </Field>
        <Field label={t("expectedClose")}>
          <Input name="expectedCloseDate" type="date" defaultValue={deal?.expectedCloseDate?.slice(0, 10) ?? ""} />
        </Field>
        <Field label={tc("priority")}>
          <Select name="priority" defaultValue={String(deal?.priority ?? 0)}>
            {(["0", "1", "2", "3"] as const).map((level) => <option key={level} value={level}>{tc(`priorities.${level}`)}</option>)}
          </Select>
        </Field>
        <fieldset className="sm:col-span-2">
          <legend className="mb-2 text-sm font-medium">{tc("tags")}</legend>
          <div className="flex flex-wrap gap-2">
            {data.tags.map((tag) => (
              <label key={tag.id} className="cursor-pointer">
                <input type="checkbox" name="tagIds" value={tag.id} defaultChecked={deal?.tags.some((item) => item.id === tag.id)} className="tag-toggle sr-only" />
                <span className="tag-option" style={{ "--tag": tag.color } as React.CSSProperties}>
                  <Check aria-hidden className="tag-check h-3.5 w-3.5" strokeWidth={3} />
                  <span aria-hidden className="tag-dot" />
                  {tag.name}
                </span>
              </label>
            ))}
          </div>
        </fieldset>
        <div className="flex justify-end gap-2 sm:col-span-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>{tc("cancel")}</Button>
          <Button type="submit" disabled={pending || !data.me.canCreate}>{tc("save")}</Button>
        </div>
      </form>
      <span className="hidden">{pipelineId}</span>
      <button type="button" className="hidden" onClick={() => setPipelineId(data.pipeline.id)} />
    </Dialog>
  );
}
